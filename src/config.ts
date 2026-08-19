/**
 * Runtime configuration, loaded exclusively from environment variables.
 *
 * Security note: credentials (PAT/SAT) must never be hardcoded, logged, or
 * written to disk by this process. They are read once at startup and held
 * only in memory for the lifetime of the process.
 */

export type AccountRegion = "US" | "EMEA" | "APJC";

const ALLOWED_REGIONS: readonly AccountRegion[] = ["US", "EMEA", "APJC"];

export interface CiqConfig {
  /** Raw long-lived credential value, sent as `Authorization: Basic <token>` during exchange. */
  readonly token: string;
  /** Which kind of long-lived credential `token` is. Affects the exchange request body. */
  readonly tokenKind: "PAT" | "SAT";
  /** Cisco IQ account identifier (System Settings > Account Details). */
  readonly accountId: string | undefined;
  /** Data storage region; sent as the `account_region` cookie on every request. */
  readonly region: AccountRegion;
  /** Base URL for both the IAM token-exchange endpoint and the product API. */
  readonly baseUrl: string;
}

export class ConfigError extends Error {}

function isAccountRegion(value: string): value is AccountRegion {
  return (ALLOWED_REGIONS as readonly string[]).includes(value);
}

/**
 * Loads and validates configuration from process.env. Throws ConfigError with
 * an actionable message (never including secret values) if anything required
 * is missing or malformed.
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): CiqConfig {
  const pat = env["CISCO_IQ_PAT"]?.trim();
  const sat = env["CISCO_IQ_SAT"]?.trim();

  if (pat && sat) {
    throw new ConfigError(
      "Both CISCO_IQ_PAT and CISCO_IQ_SAT are set. Provide exactly one long-lived credential.",
    );
  }
  if (!pat && !sat) {
    throw new ConfigError(
      "Missing credential: set CISCO_IQ_PAT (Personal Access Token) or CISCO_IQ_SAT (Service Account Token) in the environment.",
    );
  }

  const token = (pat ?? sat) as string;
  const tokenKind: "PAT" | "SAT" = pat ? "PAT" : "SAT";

  const accountId = env["CISCO_IQ_ACCOUNT_ID"]?.trim() || undefined;
  if (tokenKind === "PAT" && !accountId) {
    throw new ConfigError(
      "Missing CISCO_IQ_ACCOUNT_ID: required when authenticating with a Personal Access Token (CISCO_IQ_PAT). Find it at Cisco IQ: Home > System Settings > Account Details.",
    );
  }

  const regionRaw = env["CISCO_IQ_REGION"]?.trim().toUpperCase();
  if (!regionRaw) {
    throw new ConfigError(
      "Missing CISCO_IQ_REGION: set it to one of US, EMEA, APJC (Home > System Settings > Account Details in Cisco IQ).",
    );
  }
  if (!isAccountRegion(regionRaw)) {
    throw new ConfigError(
      `Invalid CISCO_IQ_REGION "${regionRaw}": must be one of ${ALLOWED_REGIONS.join(", ")}.`,
    );
  }

  const baseUrl = (env["CISCO_IQ_BASE_URL"]?.trim() || "https://iq.cisco.com").replace(/\/+$/, "");

  return { token, tokenKind, accountId, region: regionRaw, baseUrl };
}
