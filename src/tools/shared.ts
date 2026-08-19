import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { CiqApiError } from "../errors.js";
import type { CiqCollectionResult, CiqResult } from "../client.js";
import type { LinkRelations, RateLimitInfo } from "../types.js";

/** `max`/`offset`/`sort`/`order`/`fields` are common to nearly every collection endpoint. */
export const maxSchema = z
  .number()
  .int()
  .min(1)
  .max(200)
  .optional()
  .describe("Maximum number of items to return (1-200). Defaults to 50.");

export const offsetSchema = z
  .number()
  .int()
  .min(0)
  .optional()
  .describe("Zero-based index of the first item to return. Defaults to 0.");

export const orderSchema = z.enum(["ASC", "DESC"]).optional().describe("Sort direction. Defaults to ASC.");

export const fieldsSchema = z
  .string()
  .optional()
  .describe("Comma-separated list of response properties to return. Omit to return all properties.");

/** Wraps arbitrary JSON as a single text content block, the conventional MCP tool result shape. */
export function jsonResult(payload: unknown): CallToolResult {
  return {
    content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  };
}

/** Converts a CiqApiError (or unknown error) into an MCP-error tool result instead of throwing. */
export function errorResult(error: unknown): CallToolResult {
  if (error instanceof CiqApiError) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: JSON.stringify(
            { status: error.status, endpoint: error.endpoint, message: error.message, trackingId: error.trackingId },
            null,
            2,
          ),
        },
      ],
    };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { isError: true, content: [{ type: "text", text: `Unexpected error: ${message}` }] };
}

/** Standard shape returned by every collection tool: items plus pagination/rate-limit metadata. */
export function collectionPayload<T>(result: CiqCollectionResult<T>): {
  items: T[];
  pagination: LinkRelations;
  rateLimit: RateLimitInfo;
} {
  return { items: result.items, pagination: result.link, rateLimit: result.rateLimit };
}

/** Standard shape returned by every single-resource tool: the resource plus rate-limit metadata. */
export function resourcePayload<T>(result: CiqResult<T>): { resource: T; rateLimit: RateLimitInfo } {
  return { resource: result.data, rateLimit: result.rateLimit };
}

/** Runs a tool handler, converting thrown errors into a structured MCP error result. */
export async function runTool(fn: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    return await fn();
  } catch (error) {
    return errorResult(error);
  }
}
