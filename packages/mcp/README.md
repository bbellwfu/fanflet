# @fanflet/mcp

MCP (Model Context Protocol) server for the Fanflet platform. Exposes platform functionality as MCP tools that AI agents (Claude, Cursor, ChatGPT, etc.) can discover and invoke.

## Architecture

```
packages/mcp/src/
├── index.ts              # Public API — re-exports for apps/web
├── server.ts             # McpServer factory — creates server + registers tools
├── auth.ts               # Authentication — API keys, OAuth tokens, Supabase JWTs
├── oauth.ts              # OAuth 2.1 + PKCE — token issuance, verification, refresh
├── types.ts              # Shared types — ToolContext, McpRole, errors
│
├── middleware/
│   ├── audit.ts          # Audit logging — writes to mcp_audit_log
│   └── rate-limit.ts     # Rate limiting — in-memory sliding window
│
└── tools/
    ├── index.ts          # Tool registry — dispatches by role
    ├── shared.ts         # Shared helpers — wrapTool(), ToolHandler type
    │
    ├── admin/            # platform_admin tools (33 tools)
    │   ├── index.ts      # registerAdminTools(server, ctx)
    │   ├── overview.ts
    │   ├── accounts.ts
    │   ├── sponsors.ts
    │   ├── fanflets.ts
    │   ├── subscribers.ts
    │   ├── analytics.ts
    │   ├── features.ts
    │   ├── waiting-list.ts
    │   └── settings.ts
    │
    ├── speaker/          # speaker tools
    │   └── index.ts      # registerSpeakerTools(server, ctx)
    │
    ├── sponsor/          # sponsor tools
    │   └── index.ts      # registerSponsorTools(server, ctx)
    │
    └── audience/         # audience tools
        └── index.ts      # registerAudienceTools(server, ctx)
```

## Roles

| Role | Description | Supabase Client | Tool Prefix |
|------|-------------|-----------------|-------------|
| `platform_admin` | Platform operator | `ctx.serviceClient` (bypasses RLS) | `admin_` |
| `speaker` | Speaker managing their fanflets | `ctx.supabase` (RLS-scoped) | `speaker_` |
| `sponsor` | Sponsor managing connections/resources | `ctx.supabase` (RLS-scoped) | `sponsor_` |
| `audience` | Attendee who subscribed to a fanflet | `ctx.supabase` (RLS-scoped) | `audience_` |

Role is resolved automatically at authentication time. The server only exposes tools appropriate for the authenticated user's role.

## How to add tools for a new role

This is the pattern to follow when building out speaker, sponsor, or audience tools (or any future role).

### Step 1: Create handler files

Create pure async functions in `tools/{role}/somefile.ts`. Each function takes a Supabase client and typed input, returns data or throws.

```typescript
// tools/speaker/fanflets.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export async function listFanflets(
  db: SupabaseClient,
  input: { status?: string; limit: number; offset: number }
) {
  let query = db
    .from("fanflets")
    .select("id, title, slug, status", { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(input.offset, input.offset + input.limit - 1);

  if (input.status && input.status !== "all") {
    query = query.eq("status", input.status);
  }

  const { data, count, error } = await query;
  if (error) throw new Error("Failed to fetch fanflets");
  return { fanflets: data ?? [], total: count ?? 0 };
}
```

### Step 2: Register tools in the role's index

Import your handler and register it with the MCP server using `wrapTool()`:

```typescript
// tools/speaker/index.ts
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext } from "../../types";
import { wrapTool } from "../shared";
import { listFanflets } from "./fanflets";

export function registerSpeakerTools(server: McpServer, ctx: ToolContext) {
  if (ctx.role !== "speaker") return;  // Guard: only register for correct role

  server.tool(
    "speaker_list_fanflets",                        // Tool name (role_action)
    "List all fanflets for the authenticated speaker", // Description for AI
    {                                                // Zod schema for inputs
      status: z.enum(["draft", "published", "all"]).optional(),
      limit: z.number().int().min(1).max(50).default(20),
      offset: z.number().int().min(0).default(0),
    },
    wrapTool(ctx, "speaker_list_fanflets", (input) =>
      listFanflets(ctx.supabase, {
        status: input.status as string | undefined,
        limit: (input.limit as number) ?? 20,
        offset: (input.offset as number) ?? 0,
      })
    )
  );
}
```

### Step 3: The registry does the rest

The tool is automatically available to speakers — the registry (`tools/index.ts`) dispatches by role.

## Key Rules

1. **Tool naming**: `{role}_{verb}_{noun}` — e.g., `speaker_list_fanflets`, `admin_suspend_account`
2. **Supabase client**: Use `ctx.supabase` for all non-admin tools (RLS enforced). Only admin tools use `ctx.serviceClient`.
3. **Handler files are pure functions**: They take a Supabase client + typed input, return data or throw. No MCP SDK types in handler files.
4. **`wrapTool()` handles everything else**: Rate limiting, audit logging, error serialization, MCP response formatting.
5. **Zod schemas on every tool**: All inputs validated. Add `.describe()` to help the AI agent understand each parameter.
6. **Guard clause at the top**: Every `register*Tools()` starts with `if (ctx.role !== '...') return;`

## Authentication

Three auth methods, tried in order:

1. **API key** (`Authorization: Bearer fan_...` or `fan_admin_...`) — hashed lookup in `mcp_api_keys`
2. **MCP OAuth token** — issued by our OAuth 2.1 + PKCE flow, verified via `mcp_oauth_tokens`
3. **Supabase JWT** — direct access token from Supabase Auth (dev/fallback)

Role resolution:
- Check `platform_admin` (app_metadata or user_roles table)
- Check `sponsor` (has sponsor_accounts row)
- Check `speaker` (has speakers row)
- Fallback to `audience`

## OAuth 2.1 + PKCE Flow

The standard MCP OAuth flow for browser-based login:

```
Client adds server URL → 401 + WWW-Authenticate
  → Client discovers /.well-known/oauth-protected-resource/api/mcp
  → Client discovers /.well-known/oauth-authorization-server
  → Client registers via POST /api/mcp/register
  → Client redirects user to GET /api/mcp/authorize (PKCE challenge)
  → User logs in via Supabase Auth
  → Callback issues authorization code
  → Client exchanges code at POST /api/mcp/token
  → Client uses access token for MCP requests
```

## Database Tables

| Table | Purpose |
|-------|---------|
| `mcp_api_keys` | API key storage (hash, role, expiration) |
| `mcp_audit_log` | Audit trail for all tool invocations |
| `mcp_oauth_clients` | Dynamically registered OAuth clients |
| `mcp_oauth_codes` | Authorization codes (10min TTL, single-use) |
| `mcp_oauth_tokens` | Access/refresh tokens (1h/30d TTL) |

All tables have RLS enabled. Service role has full access for the MCP server; authenticated users can manage their own API keys and read their own audit logs.
