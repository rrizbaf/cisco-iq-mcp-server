# Cisco IQ MCP Server

A local [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server that exposes
[Cisco IQ](https://iq.cisco.com)'s Assets and Assessments REST APIs as MCP tools, so an
AI assistant (e.g. Cursor, Claude Desktop) can query your entitled asset inventory,
contracts, end-of-life lifecycle data, security advisories, and field notices directly.

> [!WARNING]
> **Cisco IQ APIs are in beta (public preview).** Endpoint paths, request/response
> schemas, authentication, pagination, and error handling may change between
> releases without maintaining backward compatibility. **Do not use this server
> for production integrations.**

## What this server does

It wraps the 16 documented Cisco IQ operations (as of the `2026-07-24` beta release,
API version `0.1.0`) as read-only MCP tools:

| Resource | Tools |
| --- | --- |
| Assets | `list_assets`, `get_asset`, `get_asset_lifecycle`, `get_asset_relationships`, `list_asset_security_advisories`, `list_asset_field_notices` |
| Contracts | `list_contracts`, `get_contract` |
| Security Advisories | `list_security_advisories`, `get_security_advisory`, `list_security_advisory_affected_assets`, `get_security_advisory_affected_asset` |
| Field Notices | `list_field_notices`, `get_field_notice`, `list_field_notice_affected_assets`, `get_field_notice_affected_asset` |

All tools are GET-only; this server never performs write operations against Cisco IQ.

The server also transparently handles Cisco IQ's two-step auth flow: it exchanges your
long-lived Personal Access Token (PAT) or Service Account Token (SAT) for a short-lived
Bearer access token, caches it in memory, and refreshes it automatically before it
expires — so tool calls never require you to think about tokens.

## Prerequisites

- Node.js 18 or later
- A [Cisco IQ](https://iq.cisco.com) account with permission to view the data you want to retrieve
- A Personal Access Token (PAT) or Service Account Token (SAT) (see below)
- Your Cisco IQ **Account ID** and **Data Storage Region** (`US`, `EMEA`, or `APJC`) — find both at
  **Cisco IQ → Home → System Settings → Account Details**

## Generating a token

### Personal Access Token (recommended for individual use)

1. Log in to [Cisco IQ](https://iq.cisco.com).
2. Click your name (top right) → **User Settings**.
3. Under **Personal Token Management**, click **Generate Token**.
4. Give it a name (e.g. `mcp-server`), optionally a description, then click **Generate Token**.
5. **Copy the token immediately** — Cisco IQ will not show it again.

### Service Account Token (for shared/automation use, Administrators only)

1. Log in to Cisco IQ as an Administrator.
2. **Home → System Settings → Identity and Access → Add User**.
3. Select **Service Account**, name it, choose a role (**Administrator** or **Viewer** + resource groups), and save.
4. **Copy the generated token immediately** — it is not shown again.

See Cisco's own [Token Security Best Practices](#security-notes) below before storing it.

## Setup

```bash
npm install
npm run build
```

Copy `.env.example` to `.env` and fill in your values (this file is gitignored and
must never be committed):

```bash
cp .env.example .env
```

```dotenv
# Exactly one of these:
CISCO_IQ_PAT=your-personal-access-token
# CISCO_IQ_SAT=your-service-account-token

# Required for PAT auth; optional (but must match) for SAT auth
CISCO_IQ_ACCOUNT_ID=your-account-id

# Required: US, EMEA, or APJC
CISCO_IQ_REGION=APJC
```

Run it directly to confirm it starts:

```bash
npm start
```

You should see a line on stderr like:

```
[cisco-iq-mcp-server] Ready (region=APJC, auth=PAT). Cisco IQ APIs are beta/public preview - do not use for production integrations.
```

## Using it from Cursor

Add an entry to your `mcp.json` (Cursor Settings → MCP, or `~/.cursor/mcp.json` /
`.cursor/mcp.json` in a project). **Do not hardcode the token value in this file** if
it will be committed to a shared/synced location — prefer a local, gitignored config,
or reference an environment variable already set in your shell profile.

```json
{
  "mcpServers": {
    "cisco-iq": {
      "command": "node",
      "args": ["/absolute/path/to/cisco-iq-mcp-server/dist/index.js"],
      "env": {
        "CISCO_IQ_PAT": "your-personal-access-token",
        "CISCO_IQ_ACCOUNT_ID": "your-account-id",
        "CISCO_IQ_REGION": "APJC"
      }
    }
  }
}
```

For local development without building, you can instead run `npm run dev`
(`tsx src/index.ts`) as the `command`/`args`.

## Example tool calls

List up to 5 assets with critical/high security advisories:

```json
{ "name": "list_assets", "arguments": { "hasCriticalOrHighSecurityAdvisories": true, "max": 5 } }
```

Get lifecycle milestones for a specific asset:

```json
{ "name": "get_asset_lifecycle", "arguments": { "assetId": "85f9981e37312238b5c73020031a7b36", "milestoneType": "software" } }
```

List security advisories affecting a given asset:

```json
{ "name": "list_asset_security_advisories", "arguments": { "assetId": "85f9981e37312238b5c73020031a7b36", "impact": ["Critical", "High"] } }
```

## Pagination, filtering, and field selection

- `max` (1-200, default 50) and `offset` control page size/position on every collection tool.
- Collection tool results include a `pagination` object (`{ next?, prev? }`) taken from
  Cisco IQ's `Link` response header — pass the `next` URL's `offset`/`max` back in for
  the next page. Cisco IQ does not return a total result count.
- Most list tools accept a `fields` parameter (comma-separated) to request only the
  properties you need, which keeps responses small and LLM-context-friendly.
- Array filters (e.g. `productFamily`, `serialNumber`) accept multiple values.

## Rate limits and error handling

Cisco IQ enforces both per-user and per-account rate limits:

| Scope | Requests/second | Requests/24h |
| --- | --- | --- |
| User (PAT/SAT) | 10 | 5,000 |
| Cisco IQ Account | 25 | 25,000 |

This server automatically retries `502 Bad Gateway` with bounded exponential backoff,
and `429 Too Many Requests` by waiting for the shortest documented reset window (capped
at 30 seconds so a single tool call never blocks indefinitely). It does **not** retry
`400`, `401` (beyond one token refresh attempt), `403`, `404`, or `406` — those are
returned to the caller as a structured error (`status`, `message`, `trackingId` when
present) instead of being retried blindly.

## Security notes

- **Credentials live only in environment variables**, read once at startup and held in
  memory. They are never logged, written to disk, or included in error messages.
- `.env` is gitignored; only `.env.example` (with empty placeholders) is committed.
- Short-lived access tokens are cached in memory only and refreshed automatically
  before they expire; they are never persisted.
- Per Cisco's own guidance:
  - Store tokens in a secrets manager or other secure credential store.
  - Do not put tokens in URLs, screenshots, log files, source code, or shared documents.
  - Rotate tokens before they expire; revoke tokens immediately if exposed.
  - Use the least-privileged role and resource group access required for the integration
    (prefer a Viewer-role SAT scoped to specific resource groups for read-only automation).

## Project structure

```
src/
  config.ts             # env-var loading & validation (no hardcoded secrets)
  auth.ts               # TokenManager: PAT/SAT -> short-lived Bearer token
  client.ts             # CiqClient: query building, pagination, retry/backoff
  errors.ts             # CiqApiError + error-body parsing
  types.ts              # TS interfaces for documented response schemas
  tools/
    shared.ts           # common Zod schemas & MCP result helpers
    assets.ts            # 6 asset-related tools
    contracts.ts         # 2 contract-related tools
    securityAdvisories.ts # 4 security-advisory tools
    fieldNotices.ts       # 4 field-notice tools
  index.ts              # MCP server entrypoint (stdio transport)
```

## License

MIT
