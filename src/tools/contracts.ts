import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CiqClient } from "../client.js";
import type { Contracts } from "../types.js";
import { collectionPayload, fieldsSchema, jsonResult, maxSchema, offsetSchema, orderSchema, resourcePayload, runTool } from "./shared.js";

const arrayOfStrings = () => z.array(z.string()).optional();
const epochMillis = (description: string) => z.number().int().optional().describe(description);

const CONTRACT_SORT_FIELDS = [
  "contractNumber",
  "contractStatus",
  "contractStartDate",
  "contractEndDate",
  "serviceLevel",
  "supportTier",
  "partnerName",
  "coveredAssetCount",
] as const;

export function registerContractTools(server: McpServer, client: CiqClient): void {
  server.registerTool(
    "list_contracts",
    {
      title: "List Cisco IQ contracts",
      description: "List support contracts with optional filtering, sorting, field selection, and pagination.",
      inputSchema: {
        contractNumber: arrayOfStrings().describe("Filter to contracts whose number matches any of the given values"),
        contractStatus: arrayOfStrings().describe("Filter to contracts whose status matches any of the given values (e.g. Active, Expired)"),
        serviceLevel: arrayOfStrings().describe("Filter to contracts whose service level matches any of the given values"),
        supportTier: arrayOfStrings().describe("Filter to contracts whose support tier matches any of the given values"),
        partnerName: arrayOfStrings().describe("Filter to contracts associated with any of the given partner names"),
        contractEndBefore: epochMillis("Filter to contracts ending before this timestamp (epoch ms UTC)"),
        contractEndAfter: epochMillis("Filter to contracts ending after this timestamp (epoch ms UTC)"),
        sort: z.enum(CONTRACT_SORT_FIELDS).optional().describe("Property to sort by. Defaults to contractStartDate."),
        order: orderSchema,
        max: maxSchema,
        offset: offsetSchema,
        fields: fieldsSchema,
      },
    },
    async (args) =>
      runTool(async () => {
        const result = await client.getCollection<Contracts>("/ciq-rest/api/v0/contracts", args);
        return jsonResult(collectionPayload(result));
      }),
  );

  server.registerTool(
    "get_contract",
    {
      title: "Get a Cisco IQ contract by number",
      description: "Return the contract matching the given contract number. Fails with a 404 error if no contract matches.",
      inputSchema: {
        contractNumber: z.string().describe("Contract number to retrieve"),
      },
    },
    async ({ contractNumber }) =>
      runTool(async () => {
        const result = await client.get<Contracts>(`/ciq-rest/api/v0/contracts/${encodeURIComponent(contractNumber)}`);
        return jsonResult(resourcePayload(result));
      }),
  );
}
