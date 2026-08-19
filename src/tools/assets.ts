import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CiqClient } from "../client.js";
import type { AssetLifecycle, AssetRelationships, Assets, FieldNotices, SecurityAdvisories } from "../types.js";
import { fieldsSchema, jsonResult, maxSchema, offsetSchema, orderSchema, runTool, collectionPayload, resourcePayload } from "./shared.js";

const arrayOfStrings = () => z.array(z.string()).optional();
const epochMillis = (description: string) => z.number().int().optional().describe(description);

const ASSET_SORT_FIELDS = [
  "serialNumber",
  "productFamily",
  "productId",
  "hostname",
  "lastSignalDate",
  "coverageEndDate",
  "contractNumber",
  "location",
  "equipmentType",
  "productType",
  "supportTier",
  "partnerName",
] as const;

export function registerAssetTools(server: McpServer, client: CiqClient): void {
  server.registerTool(
    "list_assets",
    {
      title: "List Cisco IQ assets",
      description:
        "List entitled Cisco IQ assets with optional filtering, sorting, field selection, and pagination. " +
        "Defaults to ordering by serialNumber ascending when sort is omitted.",
      inputSchema: {
        productFamily: arrayOfStrings().describe("Filter to assets in any of the given product families"),
        productId: arrayOfStrings().describe("Filter to assets whose product identifier matches any of the given values"),
        serialNumber: arrayOfStrings().describe("Filter to assets whose serial number matches any of the given values"),
        contractNumber: arrayOfStrings().describe("Filter to assets whose contract number matches any of the given values"),
        contractId: z.array(z.number().int()).optional().describe("Filter to assets whose contract ID matches any of the given values"),
        contractStatus: arrayOfStrings().describe("Filter to assets whose contract status matches any of the given values (e.g. Active, Expired)"),
        coverageStatus: arrayOfStrings().describe("Filter to assets whose coverage status matches any of the given values"),
        assetTags: arrayOfStrings().describe("Filter to assets that have any of the specified tags"),
        location: arrayOfStrings().describe("Filter to assets at any of the given physical locations"),
        lastSignalAfter: epochMillis("Filter to assets whose last signal date is on or after this timestamp (epoch ms UTC)"),
        lastSignalBefore: epochMillis("Filter to assets whose last signal date is before this timestamp (epoch ms UTC)"),
        dataSource: arrayOfStrings().describe("Filter to assets from any of the given data sources"),
        softwareVersion: arrayOfStrings().describe("Filter to assets running any of the given software versions"),
        role: arrayOfStrings().describe("Filter to assets whose device role matches any of the given values"),
        importance: arrayOfStrings().describe("Filter to assets whose importance level matches any of the given values"),
        hostname: arrayOfStrings().describe("Filter to assets whose hostname matches any of the given values"),
        ipAddress: arrayOfStrings().describe("Filter to assets whose IP address matches any of the given values"),
        equipmentType: arrayOfStrings().describe("Filter to assets whose equipment type matches any of the given values"),
        productType: arrayOfStrings().describe("Filter to assets whose product type matches any of the given values"),
        softwareType: arrayOfStrings().describe("Filter to assets whose software type matches any of the given values"),
        supportType: arrayOfStrings().describe("Filter to assets whose support type matches any of the given values"),
        supportTier: arrayOfStrings().describe("Filter to assets whose support tier matches any of the given values"),
        partnerName: arrayOfStrings().describe("Filter to assets associated with any of the given partner names"),
        telemetryStatus: arrayOfStrings().describe("Filter to assets whose telemetry status matches any of the given values (CONNECTED, NOT_CONNECTED)"),
        lastSignalType: arrayOfStrings().describe("Filter to assets whose last signal type matches any of the given values"),
        hasCriticalOrHighSecurityAdvisories: z
          .boolean()
          .optional()
          .describe("When true, filter to assets with critical or high security advisories; when false, filter to assets without"),
        coverageEndBefore: epochMillis("Filter to assets whose coverage end date is before this timestamp (epoch ms UTC)"),
        coverageEndAfter: epochMillis("Filter to assets whose coverage end date is after this timestamp (epoch ms UTC)"),
        warrantyEndBefore: epochMillis("Filter to assets whose warranty end date is before this timestamp (epoch ms UTC)"),
        warrantyEndAfter: epochMillis("Filter to assets whose warranty end date is after this timestamp (epoch ms UTC)"),
        shipDateBefore: epochMillis("Filter to assets whose ship date is before this timestamp (epoch ms UTC)"),
        shipDateAfter: epochMillis("Filter to assets whose ship date is after this timestamp (epoch ms UTC)"),
        endOfSoftwareMaintenanceBefore: epochMillis("Filter to assets whose end of software maintenance date is before this timestamp (epoch ms UTC)"),
        endOfSoftwareMaintenanceAfter: epochMillis("Filter to assets whose end of software maintenance date is after this timestamp (epoch ms UTC)"),
        currentHardwareMilestone: arrayOfStrings().describe("Filter to assets at any of the given current hardware end-of-life milestones"),
        currentSoftwareMilestone: arrayOfStrings().describe("Filter to assets at any of the given current software end-of-life milestones"),
        nextHardwareMilestone: arrayOfStrings().describe("Filter to assets at any of the given next hardware end-of-life milestones"),
        nextSoftwareMilestone: arrayOfStrings().describe("Filter to assets at any of the given next software end-of-life milestones"),
        nextHardwareMilestoneDateBefore: epochMillis("Filter to assets whose next hardware milestone date is before this timestamp (epoch ms UTC)"),
        nextHardwareMilestoneDateAfter: epochMillis("Filter to assets whose next hardware milestone date is after this timestamp (epoch ms UTC)"),
        nextSoftwareMilestoneDateBefore: epochMillis("Filter to assets whose next software milestone date is before this timestamp (epoch ms UTC)"),
        nextSoftwareMilestoneDateAfter: epochMillis("Filter to assets whose next software milestone date is after this timestamp (epoch ms UTC)"),
        hardwareLastDateOfSupportBefore: epochMillis("Filter to assets whose hardware last date of support is before this timestamp (epoch ms UTC)"),
        hardwareLastDateOfSupportAfter: epochMillis("Filter to assets whose hardware last date of support is after this timestamp (epoch ms UTC)"),
        softwareLastDateOfSupportBefore: epochMillis("Filter to assets whose software last date of support is before this timestamp (epoch ms UTC)"),
        softwareLastDateOfSupportAfter: epochMillis("Filter to assets whose software last date of support is after this timestamp (epoch ms UTC)"),
        sort: z.enum(ASSET_SORT_FIELDS).optional().describe("Property to sort by. Defaults to serialNumber."),
        order: orderSchema,
        max: maxSchema,
        offset: offsetSchema,
        fields: fieldsSchema,
      },
    },
    async (args) =>
      runTool(async () => {
        const result = await client.getCollection<Assets>("/ciq-rest/api/v0/assets", args);
        return jsonResult(collectionPayload(result));
      }),
  );

  server.registerTool(
    "get_asset",
    {
      title: "Get a Cisco IQ asset by ID",
      description: "Return a single Cisco IQ asset by its assetId. Fails with a 404 error if no asset matches.",
      inputSchema: {
        assetId: z.string().describe("Unique identifier of the asset to retrieve"),
      },
    },
    async ({ assetId }) =>
      runTool(async () => {
        const result = await client.get<Assets>(`/ciq-rest/api/v0/assets/${encodeURIComponent(assetId)}`);
        return jsonResult(resourcePayload(result));
      }),
  );

  server.registerTool(
    "get_asset_lifecycle",
    {
      title: "Get a Cisco IQ asset's lifecycle milestones",
      description:
        "Return end-of-life lifecycle milestones (hardware or software) for a single asset. Fails with a 404 error if no asset matches.",
      inputSchema: {
        assetId: z.string().describe("Unique identifier of the asset whose lifecycle to retrieve"),
        milestoneType: z.enum(["hardware", "software"]).optional().describe("Which lifecycle to retrieve. Defaults to hardware."),
      },
    },
    async ({ assetId, milestoneType }) =>
      runTool(async () => {
        const result = await client.get<AssetLifecycle>(`/ciq-rest/api/v0/assets/${encodeURIComponent(assetId)}/lifecycle`, {
          milestoneType,
        });
        return jsonResult(resourcePayload(result));
      }),
  );

  server.registerTool(
    "get_asset_relationships",
    {
      title: "List a Cisco IQ asset's parent/child relationships",
      description: "Return the parent and child asset relationships for a given asset (e.g. chassis-to-module).",
      inputSchema: {
        assetId: z.string().describe("Unique identifier of the asset whose relationships to retrieve"),
        sort: z.string().optional().describe("Property to sort by (e.g. assetId, productId, serialNumber). Defaults to assetId."),
        order: orderSchema,
        max: maxSchema,
        offset: offsetSchema,
        fields: fieldsSchema,
      },
    },
    async ({ assetId, ...query }) =>
      runTool(async () => {
        const result = await client.getCollection<AssetRelationships>(
          `/ciq-rest/api/v0/assets/${encodeURIComponent(assetId)}/relationships`,
          query,
        );
        return jsonResult(collectionPayload(result));
      }),
  );

  server.registerTool(
    "list_asset_security_advisories",
    {
      title: "List security advisories affecting a Cisco IQ asset",
      description: "Return the security advisories that impact a given asset.",
      inputSchema: {
        assetId: z.string().describe("Unique identifier of the asset to retrieve security advisories for"),
        impact: arrayOfStrings().describe("Filter to advisories whose impact matches any of the given values (e.g. Critical, High)"),
        vulnerabilityStatus: arrayOfStrings().describe("Filter to advisories whose vulnerability status matches any of the given values (e.g. VUL, POTVUL)"),
        sort: z.string().optional().describe("Property to sort by (e.g. psirtId, firstPublished, lastPublished). Defaults to psirtId."),
        order: orderSchema,
        max: maxSchema,
        offset: offsetSchema,
        fields: fieldsSchema,
      },
    },
    async ({ assetId, ...query }) =>
      runTool(async () => {
        const result = await client.getCollection<SecurityAdvisories>(
          `/ciq-rest/api/v0/assets/${encodeURIComponent(assetId)}/securityAdvisories`,
          query,
        );
        return jsonResult(collectionPayload(result));
      }),
  );

  server.registerTool(
    "list_asset_field_notices",
    {
      title: "List field notices affecting a Cisco IQ asset",
      description: "Return the field notices that impact a given asset.",
      inputSchema: {
        assetId: z.string().describe("Unique identifier of the asset to retrieve field notices for"),
        impact: arrayOfStrings().describe("Filter to field notices whose impact matches any of the given values"),
        vulnerabilityStatus: arrayOfStrings().describe("Filter to field notices whose vulnerability status matches any of the given values (e.g. VUL, POTVUL)"),
        sort: z.string().optional().describe("Property to sort by (e.g. fieldNoticeId, firstPublished, lastPublished). Defaults to fieldNoticeId."),
        order: orderSchema,
        max: maxSchema,
        offset: offsetSchema,
        fields: fieldsSchema,
      },
    },
    async ({ assetId, ...query }) =>
      runTool(async () => {
        const result = await client.getCollection<FieldNotices>(`/ciq-rest/api/v0/assets/${encodeURIComponent(assetId)}/fieldNotices`, query);
        return jsonResult(collectionPayload(result));
      }),
  );
}
