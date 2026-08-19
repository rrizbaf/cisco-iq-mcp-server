import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CiqClient } from "../client.js";
import type { AffectedAssets, FieldNotices } from "../types.js";
import { collectionPayload, fieldsSchema, jsonResult, maxSchema, offsetSchema, orderSchema, resourcePayload, runTool } from "./shared.js";

const arrayOfStrings = () => z.array(z.string()).optional();

export function registerFieldNoticeTools(server: McpServer, client: CiqClient): void {
  server.registerTool(
    "list_field_notices",
    {
      title: "List Cisco IQ field notices",
      description: "List Cisco field notices relevant to the account, with optional filtering, sorting, and pagination.",
      inputSchema: {
        impact: arrayOfStrings().describe("Filter to field notices whose impact matches any of the given values"),
        sort: z.string().optional().describe("Property to sort by (e.g. fieldNoticeId, firstPublished, lastPublished). Defaults to fieldNoticeId."),
        order: orderSchema,
        max: maxSchema,
        offset: offsetSchema,
        fields: fieldsSchema,
      },
    },
    async (args) =>
      runTool(async () => {
        const result = await client.getCollection<FieldNotices>("/ciq-rest/api/v0/fieldNotices", args);
        return jsonResult(collectionPayload(result));
      }),
  );

  server.registerTool(
    "get_field_notice",
    {
      title: "Get a Cisco IQ field notice by ID",
      description: "Return a single field notice by its numeric ID. Fails with a 404 error if no field notice matches.",
      inputSchema: {
        fieldNoticeId: z.number().int().describe("Unique identifier of the field notice to retrieve"),
      },
    },
    async ({ fieldNoticeId }) =>
      runTool(async () => {
        const result = await client.get<FieldNotices>(`/ciq-rest/api/v0/fieldNotices/${fieldNoticeId}`);
        return jsonResult(resourcePayload(result));
      }),
  );

  server.registerTool(
    "list_field_notice_affected_assets",
    {
      title: "List assets affected by a field notice",
      description: "Return the assets in the account affected by a given field notice.",
      inputSchema: {
        fieldNoticeId: z.number().int().describe("Unique identifier of the field notice whose affected assets to retrieve"),
        sort: z.string().optional().describe("Property to sort by (e.g. assetId, productId, lastSignalDate). Defaults to assetId."),
        order: orderSchema,
        max: maxSchema,
        offset: offsetSchema,
        fields: fieldsSchema,
      },
    },
    async ({ fieldNoticeId, ...query }) =>
      runTool(async () => {
        const result = await client.getCollection<AffectedAssets>(`/ciq-rest/api/v0/fieldNotices/${fieldNoticeId}/assets`, query);
        return jsonResult(collectionPayload(result));
      }),
  );

  server.registerTool(
    "get_field_notice_affected_asset",
    {
      title: "Get a single asset affected by a field notice",
      description: "Return one asset affected by a given field notice. Fails with a 404 error if no matching affected asset exists.",
      inputSchema: {
        fieldNoticeId: z.number().int().describe("Unique identifier of the field notice"),
        assetId: z.string().describe("Unique identifier of the affected asset to retrieve"),
      },
    },
    async ({ fieldNoticeId, assetId }) =>
      runTool(async () => {
        const result = await client.get<AffectedAssets>(
          `/ciq-rest/api/v0/fieldNotices/${fieldNoticeId}/assets/${encodeURIComponent(assetId)}`,
        );
        return jsonResult(resourcePayload(result));
      }),
  );
}
