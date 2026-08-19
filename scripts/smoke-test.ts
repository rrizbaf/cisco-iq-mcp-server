#!/usr/bin/env node
/**
 * End-to-end smoke test: spawns the built MCP server over stdio (exactly as
 * Cursor would) and exercises a few tools against a real Cisco IQ account.
 *
 * Requires CISCO_IQ_PAT (or CISCO_IQ_SAT), CISCO_IQ_ACCOUNT_ID, and
 * CISCO_IQ_REGION to already be set in the environment (e.g. via `.env`
 * loaded by your shell, or exported directly) - this script never reads or
 * writes credential values to disk itself.
 *
 * Usage: npm run build && npm run smoke-test
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverEntry = path.resolve(__dirname, "../dist/index.js");

function assertConfigured(): void {
  const hasPat = Boolean(process.env["CISCO_IQ_PAT"]);
  const hasSat = Boolean(process.env["CISCO_IQ_SAT"]);
  if (!hasPat && !hasSat) {
    console.error(
      "Missing credentials: export CISCO_IQ_PAT (or CISCO_IQ_SAT), CISCO_IQ_ACCOUNT_ID, and CISCO_IQ_REGION before running the smoke test.",
    );
    process.exit(1);
  }
}

function textOf(result: { content: Array<{ type: string; text?: string }> }): string {
  return result.content.map((c) => (c.type === "text" ? c.text ?? "" : `[${c.type}]`)).join("\n");
}

async function main(): Promise<void> {
  assertConfigured();

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverEntry],
    env: process.env as Record<string, string>,
  });

  const client = new Client({ name: "cisco-iq-mcp-smoke-test", version: "0.1.0" });
  await client.connect(transport);

  try {
    const tools = await client.listTools();
    console.log(`Connected. Server exposes ${tools.tools.length} tools:`);
    for (const tool of tools.tools) console.log(`  - ${tool.name}`);
    if (tools.tools.length !== 16) {
      throw new Error(`Expected 16 tools, found ${tools.tools.length}`);
    }

    console.log("\n--- list_assets (max=3) ---");
    const listResult = await client.callTool({ name: "list_assets", arguments: { max: 3 } });
    if (listResult.isError) throw new Error(`list_assets failed: ${textOf(listResult as never)}`);
    const listPayload = JSON.parse(textOf(listResult as never)) as { items: Array<{ assetId: string }> };
    console.log(`Received ${listPayload.items.length} asset(s).`);
    if (listPayload.items.length === 0) {
      console.log("No assets returned for this account; skipping asset-scoped follow-up calls.");
      return;
    }

    const sampleAssetId = listPayload.items[0]!.assetId;
    console.log(`\n--- get_asset (assetId=${sampleAssetId}) ---`);
    const getResult = await client.callTool({ name: "get_asset", arguments: { assetId: sampleAssetId } });
    if (getResult.isError) throw new Error(`get_asset failed: ${textOf(getResult as never)}`);
    console.log("OK - resource retrieved.");

    console.log(`\n--- list_asset_security_advisories (assetId=${sampleAssetId}) ---`);
    const advisoriesResult = await client.callTool({
      name: "list_asset_security_advisories",
      arguments: { assetId: sampleAssetId, max: 5 },
    });
    if (advisoriesResult.isError) {
      throw new Error(`list_asset_security_advisories failed: ${textOf(advisoriesResult as never)}`);
    }
    const advisoriesPayload = JSON.parse(textOf(advisoriesResult as never)) as { items: unknown[] };
    console.log(`OK - ${advisoriesPayload.items.length} security advisor(y/ies) returned.`);

    console.log("\nSmoke test passed.");
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  console.error("Smoke test failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
