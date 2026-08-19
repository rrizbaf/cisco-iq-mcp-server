import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CiqClient } from "../client.js";
import type { AffectedAssets, SecurityAdvisories } from "../types.js";
import { collectionPayload, fieldsSchema, jsonResult, maxSchema, offsetSchema, orderSchema, resourcePayload, runTool } from "./shared.js";

const arrayOfStrings = () => z.array(z.string()).optional();

export function registerSecurityAdvisoryTools(server: McpServer, client: CiqClient): void {
  server.registerTool(
    "list_security_advisories",
    {
      title: "List Cisco IQ security advisories",
      description: "List Cisco security advisories (PSIRT) relevant to the account, with optional filtering, sorting, and pagination.",
      inputSchema: {
        impact: arrayOfStrings().describe("Filter to advisories whose impact matches any of the given values (e.g. Critical, High)"),
        sort: z.string().optional().describe("Property to sort by (e.g. psirtId, firstPublished, lastPublished). Defaults to psirtId."),
        order: orderSchema,
        max: maxSchema,
        offset: offsetSchema,
        fields: fieldsSchema,
      },
    },
    async (args) =>
      runTool(async () => {
        const result = await client.getCollection<SecurityAdvisories>("/ciq-rest/api/v0/securityAdvisories", args);
        return jsonResult(collectionPayload(result));
      }),
  );

  server.registerTool(
    "get_security_advisory",
    {
      title: "Get a Cisco IQ security advisory by PSIRT ID",
      description: "Return a single security advisory by its numeric PSIRT ID. Fails with a 404 error if no advisory matches.",
      inputSchema: {
        psirtId: z.number().int().describe("PSIRT ID of the security advisory to retrieve"),
      },
    },
    async ({ psirtId }) =>
      runTool(async () => {
        const result = await client.get<SecurityAdvisories>(`/ciq-rest/api/v0/securityAdvisories/${psirtId}`);
        return jsonResult(resourcePayload(result));
      }),
  );

  server.registerTool(
    "list_security_advisory_affected_assets",
    {
      title: "List assets affected by a security advisory",
      description: "Return the assets in the account affected by a given security advisory.",
      inputSchema: {
        psirtId: z.number().int().describe("PSIRT ID of the security advisory whose affected assets to retrieve"),
        sort: z.string().optional().describe("Property to sort by (e.g. assetId, productId, lastSignalDate). Defaults to assetId."),
        order: orderSchema,
        max: maxSchema,
        offset: offsetSchema,
        fields: fieldsSchema,
      },
    },
    async ({ psirtId, ...query }) =>
      runTool(async () => {
        const result = await client.getCollection<AffectedAssets>(`/ciq-rest/api/v0/securityAdvisories/${psirtId}/assets`, query);
        return jsonResult(collectionPayload(result));
      }),
  );

  server.registerTool(
    "get_security_advisory_affected_asset",
    {
      title: "Get a single asset affected by a security advisory",
      description:
        "Return one asset affected by a given security advisory. Fails with a 404 error if no matching affected asset exists.",
      inputSchema: {
        psirtId: z.number().int().describe("PSIRT ID of the security advisory"),
        assetId: z.string().describe("Unique identifier of the affected asset to retrieve"),
      },
    },
    async ({ psirtId, assetId }) =>
      runTool(async () => {
        const result = await client.get<AffectedAssets>(
          `/ciq-rest/api/v0/securityAdvisories/${psirtId}/assets/${encodeURIComponent(assetId)}`,
        );
        return jsonResult(resourcePayload(result));
      }),
  );
}
