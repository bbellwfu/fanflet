# ADR: Fanflet MCP (Model Context Protocol) Server Architecture

**Status:** Proposed
**Date:** 2026-03-07 (revised)
**Author:** Systems Architect (revised with Vision Architect input)
**Deciders:** Engineering Lead, Product
**Companion doc:** `PRDs/MCP_INTEGRATION_VISION.md` (use cases, pricing, interaction examples)

---

## 1. Context and Requirements

Fanflet is a web-hosted platform (fanflet.com) for speaker engagement. We want to allow speakers, sponsors, and admins to interact with the platform through AI agents (Claude, ChatGPT, Gemini, and any MCP-compatible client). MCP provides a standardized protocol for AI agents to discover and invoke tools against external services.

### Validated Requirements

- Speakers should be able to manage fanflets, resources, subscribers, and analytics through an AI agent
- Sponsors should be able to manage connections, resources, and view engagement data
- Admins should have platform-level visibility
- All actions must respect existing RLS policies and plan entitlements
- Audit trail for all MCP-initiated actions
- Rate limiting per user and per plan tier
- **The MCP server must be hosted and reachable over the internet** — this is a web platform, not a local desktop tool

### Constraints

- Team is small; operational overhead must be minimal
- Supabase is the sole data store; RLS is the security boundary
- Vercel is the deployment platform for the web app
- The `api_access` feature flag already exists in the plans seed data (Enterprise tier)
- Sponsor portal UI is not yet built, but schema is complete

---

## 2. Deployment Model Decision

### Options Considered

| Option | Pros | Cons |
|--------|------|------|
| **A. Remote Streamable HTTP server** | Production-grade, OAuth support, works with all MCP clients (web and desktop), discoverable via `.well-known` | Requires hosting separate from Vercel serverless |
| **B. Next.js API route (Vercel serverless)** | Single deployment, shares auth middleware | 30s timeout (60s Pro), no persistent connections, cold starts |
| **C. Supabase Edge Function** | Close to data, low latency | Deno runtime, MCP SDK compatibility uncertain, separate deployment |
| **D. stdio package (`npx @fanflet/mcp`)** | Works with Claude Desktop locally | Only works locally, requires npm install, no web agent support, wrong model for a hosted platform |

### Recommendation: Option A — Remote Streamable HTTP Server

**Rationale:**

1. **Fanflet is a web platform.** Users interact via browsers and AI agents over the internet. The MCP server must be reachable at a public URL (e.g., `https://mcp.fanflet.com`) without requiring users to install anything locally.

2. **Streamable HTTP is the recommended transport** for production remote MCP servers per the MCP specification. It supports stateless request/response (fits serverless) and optional server-sent events for streaming results.

3. **OAuth 2.1 + PKCE** is the MCP-standard authentication mechanism for remote servers. This integrates naturally with Fanflet's existing Supabase Auth — users authenticate with the same credentials they use on the web dashboard.

4. **Universal client compatibility.** Desktop clients (Claude Desktop, Cursor) and web-based agents both connect via HTTPS. No separate transport or distribution mechanism needed.

5. **Discoverability.** Remote MCP servers support `/.well-known/mcp.json` for automatic tool discovery by AI clients.

### Phase 1 Hosting Strategy

Deploy as a **Vercel serverless function** at `apps/web/app/api/mcp/route.ts` within the existing web app. Streamable HTTP is request/response based, which fits Vercel's execution model. This avoids new infrastructure while validating the approach.

**When to move to dedicated hosting:** If session-based features (stateful tool context, long-running operations) or traffic volume justify it, migrate to Cloudflare Workers or Railway. Cloudflare Workers is the preferred target because of built-in MCP auth support and global edge deployment.

---

## 3. Authentication and Authorization

### Authentication Flow: OAuth 2.1 + PKCE

The MCP server acts as both an OAuth authorization server (for MCP clients) and a resource server (validating Supabase sessions):

```
MCP Client (Claude, ChatGPT, etc.)
  |
  1. Connects to https://mcp.fanflet.com (or /api/mcp)
  |
  2. Server responds with 401 + Protected Resource Metadata
     pointing to /.well-known/oauth-authorization-server
  |
  3. Client initiates OAuth 2.1 + PKCE flow
  |
  4. User authenticates via Supabase Auth
     (same login as web dashboard — email/password or social)
  |
  5. MCP server issues access token (wrapping Supabase session)
  |
  6. Subsequent tool calls include the access token
  |
  7. Server creates a user-scoped Supabase client per request
  |
  8. RLS policies enforce data isolation
```

**Key security property:** The MCP server never uses the service role key for user-initiated operations. Every query goes through RLS, exactly like the web dashboard.

### OAuth Implementation Detail

1. **Authorization endpoint:** `/api/mcp/authorize` — redirects to Supabase Auth login, then back with an authorization code
2. **Token endpoint:** `/api/mcp/token` — exchanges authorization code for an access token (which wraps the Supabase session tokens)
3. **Token refresh:** The access token includes the Supabase refresh token (encrypted). When the access token expires, the MCP client uses the standard OAuth refresh flow.

### Fallback: API Keys (Beta/Development)

For beta testing before the full OAuth flow is built, support API key authentication:

```sql
CREATE TABLE IF NOT EXISTS public.mcp_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,       -- SHA-256 of the raw key
  key_prefix TEXT NOT NULL,            -- First 8 chars for display (e.g., "fan_k8x2...")
  name TEXT NOT NULL DEFAULT 'Default',-- User-chosen label
  scopes TEXT[] DEFAULT '{}',          -- Future: restrict to specific tool categories
  role TEXT NOT NULL DEFAULT 'speaker'
    CHECK (role IN ('speaker', 'sponsor', 'admin')),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  expires_at TIMESTAMPTZ               -- Optional expiration
);

CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_hash ON public.mcp_api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_mcp_api_keys_user ON public.mcp_api_keys(auth_user_id);

ALTER TABLE public.mcp_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can manage their own keys
DROP POLICY IF EXISTS "Users can manage own API keys" ON public.mcp_api_keys;
CREATE POLICY "Users can manage own API keys"
  ON public.mcp_api_keys FOR ALL TO authenticated
  USING (auth_user_id = (SELECT auth.uid()))
  WITH CHECK (auth_user_id = (SELECT auth.uid()));

-- Service role for key validation (MCP server uses this once per connection)
DROP POLICY IF EXISTS "Service role manages API keys" ON public.mcp_api_keys;
CREATE POLICY "Service role manages API keys"
  ON public.mcp_api_keys FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

API key flow: key is sent in the `Authorization: Bearer fan_...` header. The server hashes it, looks up the user, and creates a user-scoped Supabase client. This is a stepping stone to full OAuth — the API key table remains useful for programmatic integrations even after OAuth is live.

### Rate Limiting

Rate limits are enforced per user, tracked via a sliding window counter. In the Vercel deployment, use Supabase to persist rate limit state across serverless invocations (or upgrade to Upstash Redis for lower latency).

| Plan | Requests/minute | Requests/day |
|------|----------------|--------------|
| Free | MCP tools available, same limits as dashboard | Same as dashboard |
| Pro / Early Access | 30 | 5,000 |
| Enterprise | 120 | 50,000 |

Per the vision PRD, MCP access itself is NOT separately gated by `api_access`. Instead, each tool enforces the same entitlement checks the web dashboard uses. This maximizes adoption — a Free user can create fanflets via MCP but hits the same 5-fanflet limit. Analytics tools are gated by `click_through_analytics`, not by MCP access.

**Note:** The `api_access` flag can still gate advanced MCP-specific features (bulk operations, export, API key management) if needed.

---

## 4. Tool Design

### Design Principles

1. **Tools map 1:1 to existing server actions** where possible — the MCP tool is a thin wrapper calling the same Supabase queries the dashboard uses
2. **Input schemas use Zod** — same validation library already used across the codebase
3. **No destructive bulk operations** via MCP (no "delete all fanflets") — safety by design
4. **Read-heavy tools are cheap to build** — they just query Supabase with RLS
5. **Write tools mirror the dashboard** — same validation, same entitlement checks

### 4.1 Speaker Tools

#### Fanflet Management

| Tool | Description | RLS Policy | Plan Gate | Complexity |
|------|-------------|-----------|-----------|------------|
| `list_fanflets` | List all fanflets for the speaker | `speakers.auth_user_id = auth.uid()` | None | 1 |
| `get_fanflet` | Get fanflet details with blocks | Same | None | 1 |
| `create_fanflet` | Create a new fanflet | Same + limit check | Limit check | 2 |
| `update_fanflet` | Update title, description, theme, expiration | Same | Theme/expiration gated | 3 |
| `publish_fanflet` | Publish a fanflet | Same | None | 2 |
| `unpublish_fanflet` | Unpublish (set to draft) | Same | None | 1 |

**`list_fanflets`**
```typescript
// Input
z.object({
  status: z.enum(['draft', 'published', 'archived']).optional(),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
})

// Query
supabase.from('fanflets')
  .select('id, title, slug, status, event_name, published_at, created_at, updated_at')
  .eq('speaker_id', speakerId)
  .order('updated_at', { ascending: false })
  .range(offset, offset + limit - 1)
```

**`get_fanflet`**
```typescript
// Input
z.object({
  id: z.string().uuid(),
})

// Query
supabase.from('fanflets')
  .select(`
    *,
    resource_blocks(
      id, type, title, description, url, display_order,
      section_name, sponsor_account_id, library_item_id
    ),
    survey_questions(id, question_text)
  `)
  .eq('id', id)
  .single()
// RLS ensures the speaker can only see their own
```

**`create_fanflet`**
```typescript
// Input
z.object({
  title: z.string().min(1).max(200),
  event_name: z.string().min(1).max(200),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  event_date: z.string().date().optional(),
})

// Pre-check: entitlement limit on max_fanflets
// Query: insert into fanflets with speaker_id
```

#### Resource Management

| Tool | Description | Complexity |
|------|-------------|------------|
| `list_library_resources` | List speaker's resource library | 1 |
| `create_library_resource` | Add a link/text resource to library | 2 |
| `update_library_resource` | Update a library item | 2 |
| `add_resource_block` | Add a block to a fanflet (direct or from library) | 2 |
| `delete_resource_block` | Remove a block from a fanflet | 1 |
| `reorder_block` | Reorder blocks | 2 |

Note: File upload is excluded from Phase 1. The MCP protocol does not have native file upload support. File resources must be created through the dashboard.

#### Analytics

| Tool | Description | Plan Gate | Complexity |
|------|-------------|-----------|------------|
| `get_fanflet_analytics` | Page views, signups, QR scans | Pro (full) / Free (basic counts) | 2 |
| `get_resource_rankings` | Top resources by click count | Pro | 2 |
| `get_subscriber_growth` | Subscriber growth over time | Pro | 3 |
| `get_qr_scan_stats` | QR scan analytics | Pro (trends) / Free (basic count) | 2 |

#### Subscriber Management

| Tool | Description | Complexity |
|------|-------------|------------|
| `list_subscribers` | List subscribers with optional search/filter | 1 |
| `get_subscriber_count` | Count subscribers, optionally by source fanflet | 1 |
| `export_subscribers_csv` | Export subscribers as CSV text | 2 |

Note: Subscriber deletion is intentionally excluded from MCP tools. This is a destructive action better performed in the dashboard with visual confirmation.

#### Settings

| Tool | Description | Complexity |
|------|-------------|------------|
| `get_speaker_profile` | Get speaker profile (name, bio, photo URL, slug) | 1 |
| `update_speaker_profile` | Update name, bio, slug | 2 |
| `get_plan_info` | Current plan, limits, available features | 1 |

### 4.2 Sponsor Tools

| Tool | Description | Plan Gate | Complexity |
|------|-------------|-----------|------------|
| `get_sponsor_profile` | Get sponsor account details | None | 1 |
| `update_sponsor_profile` | Update company name, description, website | None | 2 |
| `list_sponsor_connections` | List connections with status filter | None | 1 |
| `send_connection_request` | Send connection request to a speaker | Limit check | 2 |
| `respond_to_connection` | Accept/decline a connection request | None | 2 |
| `browse_speakers` | Search verified speakers by industry | None | 2 |
| `list_sponsor_resources` | List sponsor's resources | None | 1 |
| `create_sponsor_resource` | Create a link/text resource | Limit check | 2 |
| `update_sponsor_resource` | Update resource details or status | None | 2 |
| `update_resource_status` | Pause, activate, or retire a resource | None | 1 |
| `get_resource_placements` | Which fanflets display each resource | Pro | 2 |
| `get_sponsor_leads` | Lead attribution stats | Pro | 3 |
| `get_sponsor_resource_analytics` | Click and engagement data per resource | Pro | 3 |
| `get_speaker_engagement_metrics` | Per-speaker engagement breakdown | Enterprise | 3 |
| `generate_engagement_report` | Structured monthly report | Enterprise | 3 |
| `get_cross_speaker_analytics` | Comparative analytics across speakers | Enterprise | 3 |
| `bulk_update_resources` | Update multiple resources at once | Enterprise | 3 |
| `bulk_update_resource_status` | Mass pause/retire operations | Enterprise | 2 |

### 4.3 Admin Tools

| Tool | Description | Complexity |
|------|-------------|------------|
| `admin_accounts_overview` | Count of speakers, sponsors, fanflets | 1 |
| `admin_platform_metrics` | Total events, subscribers, active fanflets over time | 2 |
| `admin_speaker_lookup` | Look up a speaker by email or slug | 1 |
| `admin_feature_override` | Grant/revoke a feature flag for a speaker | 2 |

Admin tools require `platform_admin` role in `app_metadata`. The MCP server checks this at authentication time and only exposes admin tools to admin users.

---

## 5. MCP Resources (Read-Only Data)

MCP Resources provide structured, read-only data that AI agents can reference without calling a tool.

| Resource URI | Description | Format |
|-------------|-------------|--------|
| `fanflet://profile` | Speaker/sponsor profile | JSON |
| `fanflet://fanflets` | List of all fanflets with status | JSON |
| `fanflet://fanflet/{id}` | Single fanflet with blocks | JSON |
| `fanflet://analytics/summary` | Recent analytics snapshot | JSON |
| `fanflet://subscribers/stats` | Subscriber counts and trends | JSON |
| `fanflet://plan` | Current plan, features, limits | JSON |

Resources are populated on request and can be cached by the client. They help the AI agent understand context without multiple tool calls.

---

## 6. Data Flow and Security

### Request Flow

```
                     MCP Client (Claude, ChatGPT, etc.)
                              |
                              | HTTPS + OAuth 2.1 access token
                              v
                    +---------------------------+
                    | mcp.fanflet.com            |
                    | (or /api/mcp on Vercel)    |
                    |                           |
                    |  1. Validate OAuth token   |
                    |  2. Create user-scoped     |
                    |     Supabase client        |
                    |  3. Resolve speaker/       |
                    |     sponsor identity       |
                    |  4. Check plan             |
                    |     entitlements           |
                    |  5. Execute tool           |----> Supabase (PostgreSQL + RLS)
                    |  6. Audit log              |
                    |  7. Return JSON result     |
                    +---------------------------+
```

### Prompt Injection Mitigation

MCP tools receive structured, typed inputs validated by Zod schemas. The risk surface is limited because:

1. **No SQL construction from user input.** All queries use the Supabase client (parameterized queries).
2. **No eval or dynamic code execution.** Tool handlers are static functions.
3. **Input lengths are bounded.** All string inputs have `max()` constraints.
4. **Tool outputs are structured JSON.** The AI agent cannot inject instructions back into the MCP server.

The primary prompt injection risk is on the AI agent side (the user tricking the agent into calling dangerous tools). Mitigation:
- Destructive operations (delete, bulk operations) are either excluded or require explicit confirmation parameters
- All write operations are audited
- The MCP server never returns data from one tenant to another (RLS enforces this at the database level)

### File Upload Handling

File uploads are **excluded from MCP Phase 1**. MCP does not have a native binary upload mechanism. Workaround options for future phases:
- Return a pre-signed upload URL from a tool, and have the agent instruct the user to upload via browser
- Accept base64-encoded files in tool input (limited to small files, poor UX)
- Use a separate HTTP endpoint for uploads, referenced by the MCP tool

### Audit Logging

```sql
CREATE TABLE IF NOT EXISTS public.mcp_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  api_key_id UUID REFERENCES public.mcp_api_keys(id) ON DELETE SET NULL,
  tool_name TEXT NOT NULL,
  input_summary JSONB DEFAULT '{}',    -- Sanitized input (no PII, truncated)
  result_status TEXT NOT NULL CHECK (result_status IN ('success', 'error', 'denied')),
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mcp_audit_log_user ON public.mcp_audit_log(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_mcp_audit_log_created ON public.mcp_audit_log(created_at);

ALTER TABLE public.mcp_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own audit logs
DROP POLICY IF EXISTS "Users can read own MCP audit logs" ON public.mcp_audit_log;
CREATE POLICY "Users can read own MCP audit logs"
  ON public.mcp_audit_log FOR SELECT TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

-- Service role for inserts (MCP server writes logs)
DROP POLICY IF EXISTS "Service role manages MCP audit logs" ON public.mcp_audit_log;
CREATE POLICY "Service role manages MCP audit logs"
  ON public.mcp_audit_log FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

**Input sanitization rules for audit log:**
- Strip any field over 200 chars to the first 200 chars + "[truncated]"
- Never log email addresses, phone numbers, or subscriber PII
- Log UUIDs, counts, and action types

---

## 7. Feature Gating Implementation

### Pattern: `withEntitlements` Wrapper

Every tool handler is wrapped in a middleware chain:

```typescript
type ToolHandler<TInput, TOutput> = (
  ctx: ToolContext,
  input: TInput
) => Promise<TOutput>;

interface ToolContext {
  supabase: SupabaseClient;  // Authenticated as the user (via OAuth or API key)
  userId: string;
  speakerId?: string;
  sponsorId?: string;
  entitlements: SpeakerEntitlements; // or SponsorEntitlements
}

function withGating(
  requiredFeature: string | null,
  handler: ToolHandler<unknown, unknown>
): ToolHandler<unknown, unknown> {
  return async (ctx, input) => {
    // 1. Check tool-specific feature (e.g., analytics tools need click_through_analytics)
    if (requiredFeature && !ctx.entitlements.features.has(requiredFeature)) {
      throw new McpError(
        `This feature requires the "${requiredFeature}" entitlement. ` +
        'Check your plan at fanflet.com/dashboard/settings.'
      );
    }

    // 2. Check rate limit
    await checkRateLimit(ctx.userId, ctx.entitlements);

    // 3. Execute and audit
    const start = Date.now();
    try {
      const result = await handler(ctx, input);
      await auditLog(ctx, 'success', input, Date.now() - start);
      return result;
    } catch (err) {
      await auditLog(ctx, 'error', input, Date.now() - start, err);
      throw err;
    }
  };
}
```

### Feature-to-Tool Mapping

| Feature Flag | Tools Gated |
|-------------|-------------|
| `basic_engagement_stats` | `get_fanflet_analytics` (basic mode), `get_subscriber_count` |
| `click_through_analytics` | `get_resource_rankings`, `get_subscriber_growth`, `get_qr_scan_stats` (trends) |
| `advanced_reporting` | `get_speaker_engagement_metrics`, `generate_engagement_report`, `get_cross_speaker_analytics` |
| `email_list_building` | `list_subscribers`, `export_subscribers_csv` |
| `surveys_session_feedback` | Survey-related tools (future) |
| `sponsor_visibility` | All sponsor connection/resource tools |

### Plan Limit Enforcement

For create operations, check limits before execution:

```typescript
// Example: create_fanflet checks max_fanflets limit
const limit = ctx.entitlements.limits.max_fanflets;
if (limit !== -1) { // -1 = unlimited
  const { count } = await ctx.supabase
    .from('fanflets')
    .select('id', { count: 'exact', head: true })
    .eq('speaker_id', ctx.speakerId);
  if ((count ?? 0) >= limit) {
    throw new McpError(
      `You've reached your plan limit of ${limit} fanflets. ` +
      'Upgrade your plan to create more.'
    );
  }
}
```

---

## 8. Package Structure

```
packages/mcp/
  package.json
  tsconfig.json
  src/
    server.ts             -- McpServer setup, Streamable HTTP transport
    auth.ts               -- OAuth 2.1 provider + Supabase session bridge
    auth-api-key.ts       -- API key fallback authentication
    context.ts            -- Build ToolContext from authenticated session
    types.ts              -- Shared types (ToolContext, McpError, etc.)

    middleware/
      entitlements.ts     -- withGating wrapper
      rate-limit.ts       -- Per-user rate limiting (Supabase or Redis backed)
      audit.ts            -- Audit log writer

    tools/
      index.ts            -- Tool registry (registers all tools with server)
      speaker/
        fanflets.ts       -- list_fanflets, get_fanflet, create_fanflet, etc.
        resources.ts      -- library CRUD, block management
        analytics.ts      -- get_fanflet_analytics, get_resource_rankings, etc.
        subscribers.ts    -- list_subscribers, get_subscriber_count, export
        profile.ts        -- get_speaker_profile, update_speaker_profile
      sponsor/
        profile.ts        -- get/update_sponsor_profile
        connections.ts    -- list, send, respond
        resources.ts      -- CRUD, lifecycle
        analytics.ts      -- leads, attribution, engagement
        reports.ts        -- generate_engagement_report, cross-speaker
      admin/
        overview.ts       -- admin_accounts_overview, admin_platform_metrics
        management.ts     -- admin_speaker_lookup, admin_feature_override

    resources/
      index.ts            -- Resource registry
      speaker.ts          -- fanflet://profile, fanflet://fanflets, etc.
      sponsor.ts          -- sponsor resource URIs

    prompts/
      index.ts            -- Prompt registry
      email-drafts.ts     -- draft_subscriber_email template

-- Vercel integration (Phase 1):
apps/web/app/api/mcp/
  route.ts              -- HTTP handler that delegates to packages/mcp server
```

### Key Dependencies

```json
{
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.x",
    "@fanflet/db": "workspace:*",
    "@fanflet/types": "workspace:*",
    "zod": "^4.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "tsx": "^4.x"
  }
}
```

### Shared Code Reuse

The MCP server imports directly from existing packages:

- `@fanflet/db` — Supabase clients, `getSpeakerEntitlements()`, `getSponsorEntitlements()`
- `@fanflet/types` — Database types (fully generated from Supabase schema)
- `@fanflet/db/config` — `getSiteUrl()` and environment config

Business logic in existing server actions (e.g., `addResourceBlock`, `publishFanflet`) should be extracted into shared functions that both the Next.js server actions and MCP tools call. This avoids duplicating validation, entitlement checks, and error handling.

---

## 9. Complexity Assessment

### Speaker Tools

| Tool Category | Impl. Complexity | Query Complexity | Security Sensitivity | Business Value |
|--------------|----------------:|----------------:|--------------------:|---------------:|
| Fanflet CRUD | 2 | 2 | 3 | 5 |
| Resource mgmt | 3 | 3 | 3 | 4 |
| Analytics queries | 3 | 4 | 2 | 5 |
| Subscriber mgmt | 2 | 2 | 4 | 4 |
| Settings/Profile | 1 | 1 | 3 | 3 |

### Sponsor Tools

| Tool Category | Impl. Complexity | Query Complexity | Security Sensitivity | Business Value |
|--------------|----------------:|----------------:|--------------------:|---------------:|
| Profile mgmt | 1 | 1 | 3 | 3 |
| Connection mgmt | 3 | 3 | 4 | 5 |
| Resource mgmt | 2 | 2 | 3 | 4 |
| Lead/attribution | 4 | 4 | 4 | 5 |
| Engagement reports | 4 | 5 | 3 | 4 |

### Admin Tools

| Tool Category | Impl. Complexity | Query Complexity | Security Sensitivity | Business Value |
|--------------|----------------:|----------------:|--------------------:|---------------:|
| Platform overview | 1 | 2 | 5 | 3 |
| Speaker management | 2 | 2 | 5 | 3 |

Scale: 1 = Low, 5 = High

---

## 10. Integration Points

### Discoverability

The MCP server exposes standard discovery endpoints:

- **`https://mcp.fanflet.com/.well-known/mcp.json`** — MCP server metadata (name, description, available tools, auth info)
- **`https://mcp.fanflet.com/.well-known/oauth-authorization-server`** — OAuth server metadata for MCP clients
- **Dashboard settings page** — Setup instructions, connection status, API key management (for beta)

### How Users Connect

1. Open any MCP-compatible AI client (Claude Desktop, ChatGPT, Cursor, etc.)
2. Add Fanflet as a remote MCP server: `https://mcp.fanflet.com`
3. Authenticate via OAuth (same Supabase Auth credentials used on the web)
4. AI now has access to Fanflet tools, gated by their plan

No npm install, no local binary, no config file editing required.

### Dashboard Integration

The Settings page (`/dashboard/settings`) gets a new "AI Agent Access" section:

- Connection status (whether the user has an active MCP session)
- API key management (generate, revoke, view prefix) — for beta and programmatic use
- Recent MCP activity log (from `mcp_audit_log`)
- Setup instructions with links to supported AI clients

### Development vs Production

| Concern | Development | Production |
|---------|------------|------------|
| MCP endpoint | `http://localhost:3000/api/mcp` | `https://mcp.fanflet.com` (or `/api/mcp`) |
| Supabase URL | `localhost:54321` (local Supabase) | `NEXT_PUBLIC_SUPABASE_URL` |
| Auth | API key (skip OAuth in dev) | OAuth 2.1 + PKCE |
| Rate limits | Disabled or very high | Enforced per plan |
| Audit logging | Console output | `mcp_audit_log` table |

---

## 11. Phased Implementation Plan

Aligned with the vision PRD (`PRDs/MCP_INTEGRATION_VISION.md`).

### Phase 1: MVP — Read-Only + Basic Management (4-6 weeks)

**Deliverables:**
1. `packages/mcp/` package with Streamable HTTP transport
2. Vercel serverless deployment at `/api/mcp`
3. API key authentication (OAuth deferred to Phase 1b)
4. Database migration for `mcp_api_keys` and `mcp_audit_log`
5. 10 speaker tools: `list_fanflets`, `get_fanflet`, `get_speaker_profile`, `get_plan_info`, `get_subscriber_count`, `create_fanflet`, `publish_fanflet`, `unpublish_fanflet`, `add_resource_block`, `delete_resource_block`
6. Entitlement enforcement middleware
7. Basic audit logging
8. Dashboard UI: API key generation in Settings

**Risk:** Low. Read-heavy tools with RLS are inherently safe.

**Go/No-Go Gate:** At least 3 speakers successfully connect and create a fanflet via AI agent.

### Phase 1b: OAuth (2 weeks, can overlap with Phase 2)

**Deliverables:**
1. OAuth 2.1 + PKCE flow bridged to Supabase Auth
2. `/.well-known/oauth-authorization-server` and `/.well-known/mcp.json`
3. Token refresh flow

### Phase 2: Core — Content Library, Analytics, Subscribers (4-6 weeks)

**Deliverables:**
1. 10 additional speaker tools: library CRUD, `update_fanflet_details`, `reorder_block`, `get_fanflet_analytics`, `get_resource_rankings`, `list_subscribers`
2. MCP Resources (read-only data URIs)
3. MCP Prompts (`draft_subscriber_email`)
4. Rate limiting middleware (Supabase-backed or Redis)
5. Audit log viewer in dashboard

**Risk:** Medium. Write tools need careful validation to match dashboard behavior.

**Go/No-Go Gate:** MCP-originated fanflet creations represent >10% of new fanflets.

### Phase 3: Sponsor + Advanced Features (6-8 weeks)

**Prerequisites:** Sponsor portal UI must be at least partially built.

**Deliverables:**
1. 16 sponsor tools (profile, connections, resources, analytics)
2. Additional speaker tools: `update_speaker_profile`, `get_subscriber_growth`, `export_subscribers_csv`, `get_qr_scan_stats`

**Risk:** High — new user type, new entitlement model.

**Go/No-Go Gate:** At least 2 sponsors connected via MCP.

### Phase 4: Enterprise + Ecosystem (8-12 weeks)

**Deliverables:**
1. Enterprise tools: bulk operations, engagement reports, cross-speaker analytics
2. Webhook/notification subscriptions (new subscribers, resource clicks)
3. Evaluate dedicated hosting (Cloudflare Workers) if traffic justifies it
4. Usage metering and billing integration

**Risk:** SSE/streaming features may require moving off Vercel serverless.

### Phase Summary

| Phase | Timeline | Tools | Key Deliverable |
|-------|----------|-------|-----------------|
| 1: MVP | 4-6 weeks | 10 | Working MCP server, API key auth |
| 1b: OAuth | 2 weeks | — | OAuth 2.1 + PKCE, discovery endpoints |
| 2: Core | 4-6 weeks | +10 (20) | Library, analytics, subscribers |
| 3: Sponsors | 6-8 weeks | +16 (36) | Full sponsor tool suite |
| 4: Enterprise | 8-12 weeks | +8 (44) | Bulk ops, reports, ecosystem |

**Total estimated timeline:** 24-34 weeks (6-9 months) for full rollout.

---

## 12. Database Migration Summary

New migration: `20260310000000_mcp_api_keys_and_audit.sql`

Tables:
- `mcp_api_keys` — API key storage with hash, scopes, role, expiration
- `mcp_audit_log` — Audit trail for all MCP tool invocations

Both tables have RLS enabled. Users can manage their own keys and read their own audit logs. Service role has full access for the MCP server to validate keys and write logs.

No changes to existing tables. The `api_access` feature flag already exists in the seed data.

---

## 13. Cost Analysis

### Phase 1 Development Cost

- Package setup + Streamable HTTP transport: 3-4 days
- API key auth: 2 days
- Read tools (5 tools) + write tools (5 tools): 5-6 days
- Dashboard API key UI: 2 days
- Migration + testing: 2 days
- **Total: ~14-16 days of engineering**

### Phase 1b (OAuth)

- OAuth 2.1 provider + Supabase bridge: 4-5 days
- Discovery endpoints: 1 day
- **Total: ~5-6 days of engineering**

### Operational Cost

- Phase 1-2: Zero additional infrastructure cost (Vercel serverless, included in existing plan)
- Phase 3+: If migrating to Cloudflare Workers, ~$5/month for Workers Paid plan
- Supabase: No additional cost (queries use existing project, audit logs are small)

### Business Considerations

- Per the vision PRD, MCP access should NOT be gated behind `api_access` — tools enforce existing plan entitlements. This maximizes adoption.
- MCP compatibility is a differentiator — being early matters more than feature completeness.
- Start with read tools + basic create/publish. Speakers asking AI "show me my fanflets" or "create a fanflet for my next talk" is high-value, low-risk.

---

## 14. Alternatives Rejected

### stdio Transport as Primary

A locally-run MCP binary (`npx @fanflet/mcp`) was considered but rejected because:
- Fanflet is a web-hosted platform; requiring local installation creates unnecessary friction
- Desktop-only access excludes web-based AI agents (ChatGPT, web Claude)
- OAuth 2.1 is the MCP standard for remote servers; API keys are a stepping stone
- Remote Streamable HTTP supports all clients — desktop clients connect to the remote URL just like web clients

### REST API instead of MCP

A traditional REST API would serve non-AI clients too, but:
- MCP is the emerging standard for AI agent integration
- MCP provides tool discovery, structured I/O, and resource caching for free
- A REST API is a bigger surface area to maintain
- If REST is needed later, the MCP tool handlers can be trivially wrapped as REST endpoints

### GraphQL

Over-engineered for this use case. The query flexibility of GraphQL adds complexity without clear benefit when the tool schemas are pre-defined.

### Supabase Edge Functions as MCP Host

Deno runtime, limited MCP SDK support, harder to test locally. Not worth the tradeoff when the TypeScript SDK targets Node.js.

---

## 15. Open Questions

1. **Should MCP access be available on Free plans?** The vision PRD recommends yes (tools enforce existing entitlements, MCP is just a delivery channel). The ADR originally gated on `api_access` (Enterprise only). **Recommendation:** Follow the vision — no separate MCP gate. Maximum adoption, existing plan limits prevent abuse.

2. **Should API keys support scoping?** The schema includes a `scopes` array, but Phase 1 does not enforce it. Leave the column in place for future use.

3. **When should we migrate from Vercel to Cloudflare Workers?** When either (a) Vercel's 30s timeout causes tool call failures, or (b) the OAuth implementation benefits from Cloudflare's built-in MCP auth library.

4. **What is the maximum number of API keys per user?** Recommendation: 5 per user, enforced at the application level.

5. **Should audit logs have a retention policy?** Recommendation: 90 days for Free/Pro, 1 year for Enterprise. Implement via a scheduled Supabase function or cron job.

---

## References

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) — Official SDK for building MCP servers
- [MCP Specification (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25) — Protocol specification
- [MCP Authorization Tutorial](https://modelcontextprotocol.io/docs/tutorials/security/authorization) — OAuth 2.1 + PKCE implementation guide
- [Cloudflare MCP Auth](https://developers.cloudflare.com/agents/model-context-protocol/authorization/) — Reference implementation for MCP OAuth
- [Remote MCP Server with Auth (Template)](https://github.com/coleam00/remote-mcp-server-with-auth) — GitHub OAuth template for remote MCP
- [MCP Server Economics](https://zeo.org/resources/blog/mcp-server-economics-tco-analysis-business-models-roi) — TCO analysis and business models
