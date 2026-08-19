#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TokenManager } from "./auth.js";
import { CiqClient } from "./client.js";
import { ConfigError, loadConfig } from "./config.js";
import { registerAssetTools } from "./tools/assets.js";
import { registerContractTools } from "./tools/contracts.js";
import { registerFieldNoticeTools } from "./tools/fieldNotices.js";
import { registerSecurityAdvisoryTools } from "./tools/securityAdvisories.js";

async function main(): Promise<void> {
  let config;
  try {
    config = loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) {
      // MCP clients typically surface stderr in logs; never print credential values here.
      console.error(`[cisco-iq-mcp-server] Configuration error: ${error.message}`);
      process.exit(1);
    }
    throw error;
  }

  const tokenManager = new TokenManager(config);
  const client = new CiqClient(config, tokenManager);

  const server = new McpServer({
    name: "cisco-iq-mcp-server",
    version: "0.1.0",
  });

  registerAssetTools(server, client);
  registerContractTools(server, client);
  registerSecurityAdvisoryTools(server, client);
  registerFieldNoticeTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(
    `[cisco-iq-mcp-server] Ready (region=${config.region}, auth=${config.tokenKind}). ` +
      "Cisco IQ APIs are beta/public preview - do not use for production integrations.",
  );
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`[cisco-iq-mcp-server] Fatal error: ${message}`);
  process.exit(1);
});
