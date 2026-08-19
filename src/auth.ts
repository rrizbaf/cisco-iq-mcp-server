import type { CiqConfig } from "./config.js";
import { CiqApiError, parseErrorBody } from "./errors.js";

const TOKEN_EXCHANGE_PATH = "/cxp-iam/api/v1/auth/issueToken";

/** Refresh this many seconds before the documented expiry to avoid a request racing expiration mid-flight. */
const REFRESH_SKEW_SECONDS = 60;

interface IssueTokenResponse {
  accessToken: string;
  expiresInSeconds: number;
}

function isIssueTokenResponse(value: unknown): value is IssueTokenResponse {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Record<string, unknown>)["accessToken"] === "string" &&
    typeof (value as Record<string, unknown>)["expiresInSeconds"] === "number"
  );
}

/**
 * Exchanges a long-lived PAT/SAT for short-lived Bearer access tokens and
 * caches the result in memory only, refreshing proactively before expiry.
 *
 * Never logs, persists, or otherwise exposes the long-lived credential or
 * the short-lived access token; callers should treat `getAccessToken()`'s
 * return value the same way.
 */
export class TokenManager {
  private readonly config: CiqConfig;
  private cachedToken: string | undefined;
  private expiresAtMs = 0;
  private inFlight: Promise<string> | undefined;

  constructor(config: CiqConfig) {
    this.config = config;
  }

  /** Returns a valid short-lived Bearer token, refreshing it first if necessary. */
  async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.expiresAtMs) {
      return this.cachedToken;
    }
    // Coalesce concurrent refreshes into a single exchange call.
    if (!this.inFlight) {
      this.inFlight = this.exchangeToken().finally(() => {
        this.inFlight = undefined;
      });
    }
    return this.inFlight;
  }

  /** Forces the next getAccessToken() call to re-exchange, e.g. after an unexpected 401. */
  invalidate(): void {
    this.cachedToken = undefined;
    this.expiresAtMs = 0;
  }

  private async exchangeToken(): Promise<string> {
    const url = `${this.config.baseUrl}${TOKEN_EXCHANGE_PATH}`;
    const body: Record<string, string> = {};
    if (this.config.accountId) {
      body["accountId"] = this.config.accountId;
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${this.config.token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        Cookie: `account_region=${this.config.region}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const { message, trackingId } = await parseErrorBody(response);
      throw new CiqApiError({ status: response.status, endpoint: TOKEN_EXCHANGE_PATH, message, trackingId });
    }

    const payload: unknown = await response.json();
    if (!isIssueTokenResponse(payload)) {
      throw new CiqApiError({
        status: response.status,
        endpoint: TOKEN_EXCHANGE_PATH,
        message: "Token exchange response did not match the documented shape (accessToken/expiresInSeconds).",
      });
    }

    this.cachedToken = payload.accessToken;
    this.expiresAtMs = Date.now() + Math.max(payload.expiresInSeconds - REFRESH_SKEW_SECONDS, 0) * 1000;
    return this.cachedToken;
  }
}
