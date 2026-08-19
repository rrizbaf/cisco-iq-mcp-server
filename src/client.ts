import type { TokenManager } from "./auth.js";
import type { CiqConfig } from "./config.js";
import { CiqApiError, parseErrorBody } from "./errors.js";
import type { CollectionResponse, LinkRelations, RateLimitInfo } from "./types.js";

export type QueryValue = string | number | boolean | undefined | null;
export type QueryParams = Record<string, QueryValue | QueryValue[]>;

const MAX_BACKOFF_RETRIES = 3; // for 502 Bad Gateway
const MAX_RATE_LIMIT_WAIT_SECONDS = 30; // don't block a single tool call longer than this
const BASE_BACKOFF_MS = 400;

/** Builds a query string, repeating array-valued params (style=form, explode=true) per the documented contract. */
export function buildQueryString(params: QueryParams | undefined): string {
  if (!params) return "";
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null) continue;
        usp.append(key, String(item));
      }
    } else {
      usp.append(key, String(value));
    }
  }
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}

/** Parses RFC 8288 Link header entries for the `next`/`prev` relations Cisco IQ documents. */
export function parseLinkHeader(header: string | null): LinkRelations {
  const result: LinkRelations = {};
  if (!header) return result;
  for (const part of header.split(",")) {
    const match = part.trim().match(/^<([^>]+)>\s*;\s*rel="?(next|prev)"?$/i);
    if (!match) continue;
    const [, url, rel] = match;
    if (rel?.toLowerCase() === "next") result.next = url;
    else if (rel?.toLowerCase() === "prev") result.prev = url;
  }
  return result;
}

function parseIntHeader(headers: Headers, name: string): number | undefined {
  const raw = headers.get(name);
  if (raw === null) return undefined;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) ? value : undefined;
}

export function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  return {
    principalSecondLimit: parseIntHeader(headers, "x-principal-second-ratelimit-limit"),
    principalSecondRemaining: parseIntHeader(headers, "x-principal-second-ratelimit-remaining"),
    principalSecondResetSeconds: parseIntHeader(headers, "x-principal-second-ratelimit-reset"),
    principalDayLimit: parseIntHeader(headers, "x-principal-day-ratelimit-limit"),
    principalDayRemaining: parseIntHeader(headers, "x-principal-day-ratelimit-remaining"),
    principalDayResetSeconds: parseIntHeader(headers, "x-principal-day-ratelimit-reset"),
    accountSecondLimit: parseIntHeader(headers, "x-account-second-ratelimit-limit"),
    accountSecondRemaining: parseIntHeader(headers, "x-account-second-ratelimit-remaining"),
    accountSecondResetSeconds: parseIntHeader(headers, "x-account-second-ratelimit-reset"),
    accountDayLimit: parseIntHeader(headers, "x-account-day-ratelimit-limit"),
    accountDayRemaining: parseIntHeader(headers, "x-account-day-ratelimit-remaining"),
    accountDayResetSeconds: parseIntHeader(headers, "x-account-day-ratelimit-reset"),
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface CiqResult<T> {
  data: T;
  rateLimit: RateLimitInfo;
}

export interface CiqCollectionResult<T> {
  items: T[];
  link: LinkRelations;
  rateLimit: RateLimitInfo;
}

/**
 * Thin REST client for the Cisco IQ Assets/Assessments product APIs.
 *
 * Handles: Bearer + account_region auth (via TokenManager), one retry on an
 * unexpected 401 (in case the cached token was revoked/expired early),
 * bounded exponential backoff on 502, and bounded waiting on 429 using the
 * documented reset headers. Never retries 400/403/404/406, and never retries
 * indefinitely, per the documented error-handling guidance.
 */
export class CiqClient {
  private readonly config: CiqConfig;
  private readonly tokenManager: TokenManager;

  constructor(config: CiqConfig, tokenManager: TokenManager) {
    this.config = config;
    this.tokenManager = tokenManager;
  }

  /** GET a single-resource endpoint (e.g. `/ciq-rest/api/v0/assets/{id}`). */
  async get<T>(path: string, query?: QueryParams): Promise<CiqResult<T>> {
    const response = await this.request(`${path}${buildQueryString(query)}`);
    const data = (await response.json()) as T;
    return { data, rateLimit: parseRateLimitHeaders(response.headers) };
  }

  /** GET a collection endpoint (e.g. `/ciq-rest/api/v0/assets`), returning `items` plus pagination links. */
  async getCollection<T>(path: string, query?: QueryParams): Promise<CiqCollectionResult<T>> {
    const response = await this.request(`${path}${buildQueryString(query)}`);
    const body = (await response.json()) as CollectionResponse<T>;
    return {
      items: body.items,
      link: parseLinkHeader(response.headers.get("link")),
      rateLimit: parseRateLimitHeaders(response.headers),
    };
  }

  /** Follows a `Link` header URL (relative or absolute) returned by a previous collection call. */
  async getCollectionPage<T>(linkUrl: string): Promise<CiqCollectionResult<T>> {
    const resolved = new URL(linkUrl, this.config.baseUrl).toString();
    const path = resolved.slice(this.config.baseUrl.length);
    return this.getCollection<T>(path);
  }

  private async request(pathWithQuery: string, attempt = 0): Promise<Response> {
    const accessToken = await this.tokenManager.getAccessToken();
    const url = `${this.config.baseUrl}${pathWithQuery}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        Cookie: `account_region=${this.config.region}`,
      },
    });

    if (response.ok) {
      return response;
    }

    if (response.status === 401 && attempt === 0) {
      this.tokenManager.invalidate();
      return this.request(pathWithQuery, attempt + 1);
    }

    if (response.status === 502 && attempt < MAX_BACKOFF_RETRIES) {
      const backoffMs = BASE_BACKOFF_MS * 2 ** attempt + Math.floor(Math.random() * 200);
      await sleep(backoffMs);
      return this.request(pathWithQuery, attempt + 1);
    }

    if (response.status === 429 && attempt < MAX_BACKOFF_RETRIES) {
      const rateLimit = parseRateLimitHeaders(response.headers);
      const resetSeconds = [
        rateLimit.principalSecondResetSeconds,
        rateLimit.accountSecondResetSeconds,
        rateLimit.principalDayResetSeconds,
        rateLimit.accountDayResetSeconds,
      ].filter((v): v is number => typeof v === "number" && v >= 0);
      const waitSeconds = resetSeconds.length > 0 ? Math.min(...resetSeconds) : undefined;

      if (waitSeconds !== undefined && waitSeconds <= MAX_RATE_LIMIT_WAIT_SECONDS) {
        await sleep(waitSeconds * 1000 + 100);
        return this.request(pathWithQuery, attempt + 1);
      }
      // Reset window is unknown or too far out to block this call on; surface the error instead.
    }

    const { message, trackingId } = await parseErrorBody(response);
    throw new CiqApiError({ status: response.status, endpoint: pathWithQuery, message, trackingId });
  }
}
