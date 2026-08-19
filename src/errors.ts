/**
 * Error raised for any non-2xx response from a Cisco IQ endpoint (IAM token
 * exchange or the product API). Carries the HTTP status and, when present,
 * the documented `message` / `trackingId` fields so callers (and MCP tool
 * responses) can surface actionable detail without ever including secrets.
 */
export class CiqApiError extends Error {
  readonly status: number;
  readonly trackingId?: string;
  readonly endpoint: string;

  constructor(params: { status: number; endpoint: string; message: string; trackingId?: string }) {
    super(`Cisco IQ API error (${params.status}) on ${params.endpoint}: ${params.message}`);
    this.name = "CiqApiError";
    this.status = params.status;
    this.endpoint = params.endpoint;
    this.trackingId = params.trackingId;
  }
}

/** Best-effort parse of the documented `{ message, trackingId? }` error body. Never throws. */
export async function parseErrorBody(response: Response): Promise<{ message: string; trackingId?: string }> {
  let text = "";
  try {
    text = await response.text();
  } catch {
    return { message: response.statusText || "Unknown error" };
  }

  try {
    const body = JSON.parse(text) as { message?: unknown; trackingId?: unknown };
    if (typeof body.message === "string") {
      return {
        message: body.message,
        trackingId: typeof body.trackingId === "string" ? body.trackingId : undefined,
      };
    }
  } catch {
    // Not JSON - fall through to raw text below.
  }

  return { message: text || response.statusText || "Unknown error" };
}
