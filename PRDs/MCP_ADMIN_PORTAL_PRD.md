# PRD: MCP Admin Portal Interface & Authentication

**Author:** Brian Bell
**Date:** 2026-03-08
**Status:** In Progress (Phase 1 implemented)
**Companion docs:** `docs/ADR_MCP_ARCHITECTURE.md` (general MCP architecture), `PRDs/MCP_INTEGRATION_VISION.md` (speaker/sponsor vision)

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Goals & Non-Goals](#2-goals--non-goals)
3. [Authentication Scheme](#3-authentication-scheme)
4. [Admin Tool Inventory](#4-admin-tool-inventory)
5. [Admin MCP Resources](#5-admin-mcp-resources)
6. [Architecture & Data Flow](#6-architecture--data-flow)
7. [Database Migration](#7-database-migration)
8. [Security Model](#8-security-model)
9. [Agent Configuration Examples](#9-agent-configuration-examples)
10. [Phased Implementation Plan](#10-phased-implementation-plan)
11. [Risks & Mitigations](#11-risks--mitigations)
12. [Success Criteria](#12-success-criteria)
13. [Open Questions](#13-open-questions)

---

## 1. Problem Statement

The Fanflet admin portal (`apps/admin/`) exposes a full-featured back-office for platform management: accounts, sponsors, fanflets, subscribers, analytics, feature flags, plans, waiting list, impersonation, and settings. Today, accessing any of this requires opening the web dashboard and navigating through pages manually.

As the platform operator, you want to manage the platform through an AI agent of your choice (Claude, ChatGPT, Cursor, etc.) — asking natural-language questions like "how many speakers signed up this week?" or issuing commands like "suspend Dr. Chen's account" without leaving your AI workflow.

The existing MCP ADR (`docs/ADR_MCP_ARCHITECTURE.md`) defines a general MCP server architecture for speakers and sponsors, with only four lightweight admin tools (`admin_accounts_overview`, `admin_platform_metrics`, `admin_speaker_lookup`, `admin_feature_override`). That is insufficient for real admin operations. This PRD defines the **complete admin MCP interface** — a full mapping of every admin portal capability to MCP tools, plus a dedicated authentication scheme that enforces the `platform_admin` role.

### Why a Separate Admin MCP Scope

Admin operations are fundamentally different from speaker/sponsor operations:

- **Service-role access:** Admin queries bypass RLS using `createServiceClient()`. Speaker/sponsor tools use user-scoped clients where RLS enforces data isolation.
- **Cross-tenant visibility:** Admins see all speakers, all fanflets, all subscribers. Speaker tools are scoped to `speaker_id = auth.uid()`.
- **Destructive capabilities:** Suspend accounts, reset accounts, change plans, toggle feature flags — operations that affect other users.
- **Audit sensitivity:** Every admin action via MCP must be logged with the admin's identity and the action taken.

These properties mean admin tools need a distinct authentication flow, a different Supabase client strategy, and stricter audit requirements.

---

## 2. Goals & Non-Goals

### Goals

1. **Full admin portal parity via MCP.** Every operation available in the admin web dashboard should be available as an MCP tool, so the AI agent is a complete alternative interface (not a subset).
2. **Secure admin authentication.** Only users with `platform_admin` role can access admin tools. Authentication must work with any MCP-compatible client (Claude Desktop, Cursor, ChatGPT, etc.).
3. **Comprehensive audit trail.** Every admin MCP action is logged to `mcp_audit_log` with the admin's identity, tool name, sanitized input, result status, and duration.
4. **Agent-friendly responses.** Tool outputs should be structured JSON that AI agents can reason about and present naturally — not raw database rows.
5. **Zero new infrastructure (Phase 1).** Deploy within the existing Vercel serverless setup at `/api/mcp`, sharing the same `packages/mcp` package defined in the ADR.

### Non-Goals

- **Building a separate admin MCP server.** Admin tools are a role-gated subset within the single Fanflet MCP server. The same endpoint serves speakers, sponsors, and admins — tools are exposed based on the authenticated user's role.
- **Replacing the admin web dashboard.** The dashboard remains the primary admin interface. MCP is an alternative for AI-assisted workflows.
- **Implementing speaker/sponsor tools.** Those are covered in the existing ADR and Vision PRD. This document focuses exclusively on admin capabilities.
- **Real-time notifications/streaming.** Admin MCP is request/response. Webhooks or SSE for admin alerts are out of scope.

---

## 3. Authentication Scheme

### 3.1 Overview

Admin MCP authentication must solve a specific challenge: the general MCP server uses user-scoped Supabase clients (RLS enforced), but admin operations require the service-role client (RLS bypassed). The authentication flow must:

1. Verify the user is authenticated (valid Supabase session)
2. Verify the user has the `platform_admin` role
3. Create a service-role Supabase client for the request
4. Bind the admin's identity to the audit log

### 3.2 Authentication Methods (in Priority Order)

#### Method A: OAuth 2.1 + PKCE (Production)

The same OAuth flow defined in the ADR, with an additional role check after authentication:

```
MCP Client (Claude Desktop, Cursor, etc.)
  |
  1. Connect to https://mcp.fanflet.com (or /api/mcp)
  |
  2. Server responds with 401 + Protected Resource Metadata
  |
  3. Client initiates OAuth 2.1 + PKCE
  |
  4. User authenticates via Supabase Auth
     (same credentials as admin dashboard)
  |
  5. MCP server verifies platform_admin role:
     a. Check user.app_metadata.role === 'platform_admin'
     b. Fallback: query user_roles table for platform_admin
  |
  6. If admin: issue access token with admin scope
     If not admin: reject with 403 (not authorized for admin tools)
  |
  7. Access token includes role claim: { role: 'platform_admin' }
  |
  8. On each tool call:
     - Validate token
     - Extract admin identity
     - Use createServiceClient() for queries
     - Log to mcp_audit_log with admin's auth_user_id
```

The access token issued to admin users includes a `role: 'platform_admin'` claim. The MCP server inspects this claim to decide which tools to expose. Admin tools are only listed in `tools/list` responses when the authenticated user has the admin role.

#### Method B: Admin API Keys (Beta / Development)

For development and early testing, admin API keys provide a simpler auth path:

```
1. Admin generates an API key in the admin dashboard
   (Settings > AI Agent Access > Generate Admin Key)

2. Key is stored as SHA-256 hash in mcp_api_keys with role='admin'

3. Admin configures their MCP client with:
   {
     "mcpServers": {
       "fanflet-admin": {
         "url": "https://mcp.fanflet.com",
         "headers": {
           "Authorization": "Bearer fan_admin_..."
         }
       }
     }
   }

4. MCP server validates the key:
   a. Hash the bearer token
   b. Look up in mcp_api_keys where role='admin' and revoked_at IS NULL
   c. Verify the linked user has platform_admin role
   d. Create service-role client
   e. Bind admin identity to audit log
```

Admin API keys have additional constraints compared to speaker/sponsor keys:

| Property | Speaker/Sponsor Keys | Admin Keys |
|----------|---------------------|------------|
| `role` column | `'speaker'` or `'sponsor'` | `'admin'` |
| Max keys per user | 5 | 2 |
| Default expiration | None (optional) | 90 days (mandatory) |
| IP allowlist | No | Yes (future, Phase 2) |
| Supabase client | User-scoped (RLS) | Service-role (bypasses RLS) |
| Audit level | Standard | Enhanced (full input logging) |

#### Method C: Cursor / Local Agent Headers (Development Only)

For local development with Cursor or similar tools that support custom headers:

```
1. Admin starts the dev server: npm run dev (apps/web)

2. Admin sets env var: MCP_ADMIN_DEV_TOKEN=<supabase-access-token>

3. Cursor config (.cursor/mcp.json):
   {
     "mcpServers": {
       "fanflet-admin-dev": {
         "url": "http://localhost:3000/api/mcp",
         "headers": {
           "Authorization": "Bearer <supabase-access-token>"
         }
       }
     }
   }

4. MCP server detects development mode:
   a. Validates the Supabase JWT directly
   b. Checks platform_admin role
   c. Proceeds as normal
```

This method is only available when `NODE_ENV !== 'production'`. In production, only Methods A and B are accepted.

### 3.3 Role Resolution Flow

The admin role check mirrors the admin middleware (`apps/admin/middleware.ts`):

```typescript
async function resolveAdminRole(userId: string): Promise<boolean> {
  // 1. Fast path: check app_metadata (set by Supabase Admin API)
  // The access token JWT already contains app_metadata.role
  // This is checked during token validation

  // 2. Fallback: query user_roles table
  const { data: roleRow } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("auth_user_id", userId)
    .eq("role", "platform_admin")
    .maybeSingle();

  return !!roleRow;
}
```

### 3.4 Token Scoping and Tool Visibility

The MCP server dynamically filters the tool list based on the authenticated user's role:

| User Role | Tools Visible | Supabase Client |
|-----------|---------------|-----------------|
| `speaker` | Speaker tools only (per Phase) | User-scoped (RLS) |
| `sponsor` | Sponsor tools only (per Phase) | User-scoped (RLS) |
| `platform_admin` | Admin tools + speaker tools (admin may also be a speaker) | Service-role for admin tools, user-scoped for speaker tools |

When an admin calls a speaker tool (e.g., to manage their own fanflets as a speaker), the server uses the user-scoped client — not the service role. The service role is reserved exclusively for admin tools.

---

## 4. Admin Tool Inventory

### 4.1 Platform Overview

These tools map to the admin dashboard home page (`/`).

| Tool | Description | Inputs | Output |
|------|-------------|--------|--------|
| `admin_platform_overview` | Platform-wide stats: total speakers, fanflets, subscribers, page views, signups, active fanflets | None | `{ speakers: number, fanflets: number, subscribers: number, pageViews: number, signups: number, activeFanflets: number }` |
| `admin_recent_signups` | Most recent speaker signups | `{ limit?: number }` (default 10, max 50) | `[{ id, name, email, createdAt, status }]` |
| `admin_recent_fanflets` | Recently published fanflets | `{ limit?: number }` (default 10, max 50) | `[{ id, title, speakerName, publishedAt, viewCount }]` |

### 4.2 Account Management

These tools map to `/accounts` and `/accounts/[id]`.

| Tool | Description | Inputs | Output |
|------|-------------|--------|--------|
| `admin_list_accounts` | List speaker accounts with search and filters | `{ search?: string, status?: 'active' \| 'suspended' \| 'new', createdSince?: string, limit?: number, offset?: number }` | `{ accounts: [...], total: number }` |
| `admin_get_account` | Get detailed account info: profile, fanflets, stats, plan, subscription | `{ speakerId: string }` | Full account object with nested fanflets, stats, plan info |
| `admin_suspend_account` | Suspend a speaker account | `{ speakerId: string, reason?: string }` | `{ success: boolean }` |
| `admin_reactivate_account` | Reactivate a suspended speaker account | `{ speakerId: string }` | `{ success: boolean }` |
| `admin_reset_account` | Reset account to new state (deletes all content, preserves identity) | `{ speakerId: string, confirmName: string }` | `{ success: boolean }` |
| `admin_change_speaker_plan` | Change a speaker's plan (or remove subscription for Free) | `{ speakerId: string, planId: string \| null }` | `{ success: boolean }` |
| `admin_lookup_speaker` | Find a speaker by email or slug | `{ email?: string, slug?: string }` | Account object or null |

**Safety notes:**
- `admin_reset_account` requires the speaker's name as a `confirmName` parameter to prevent accidental resets. The MCP server compares this against the speaker's actual name (case-insensitive).
- `admin_suspend_account` and `admin_reactivate_account` are separate tools (not a toggle) so the AI agent expresses clear intent.

### 4.3 Sponsor Management

These tools map to `/sponsors` and `/sponsors/[id]`.

| Tool | Description | Inputs | Output |
|------|-------------|--------|--------|
| `admin_list_sponsors` | List sponsor accounts with search and verification filter | `{ search?: string, verificationStatus?: 'verified' \| 'unverified' \| 'all', limit?: number, offset?: number }` | `{ sponsors: [...], total: number }` |
| `admin_get_sponsor` | Get detailed sponsor info: company profile, connections, leads | `{ sponsorId: string }` | Full sponsor object |
| `admin_toggle_sponsor_verification` | Verify or unverify a sponsor account | `{ sponsorId: string, verified: boolean }` | `{ success: boolean }` |

### 4.4 Fanflet Management

These tools map to `/fanflets`.

| Tool | Description | Inputs | Output |
|------|-------------|--------|--------|
| `admin_list_fanflets` | List all fanflets platform-wide with status filter | `{ status?: 'published' \| 'draft' \| 'all', search?: string, limit?: number, offset?: number }` | `{ fanflets: [...], total: number }` |
| `admin_get_fanflet` | Get full fanflet details including blocks, speaker info, analytics summary | `{ fanfletId: string }` | Full fanflet object |

### 4.5 Subscriber Management

These tools map to `/subscribers`.

| Tool | Description | Inputs | Output |
|------|-------------|--------|--------|
| `admin_list_subscribers` | List platform-wide email subscribers with search | `{ search?: string, sourceFanfletId?: string, limit?: number, offset?: number }` | `{ subscribers: [...], total: number }` |
| `admin_subscriber_stats` | Subscriber summary: total count, this week's signups, source breakdown | None | `{ total: number, thisWeek: number, bySource: [...] }` |

### 4.6 Platform Analytics

These tools map to `/analytics` and its sub-pages (engagement, content, growth).

| Tool | Description | Inputs | Output |
|------|-------------|--------|--------|
| `admin_platform_kpis` | Key performance indicators for a date range | `{ from: string, to: string }` | `{ totalViews, uniqueVisitors, newSubscribers, resourceClicks, qrScans, conversionRate }` |
| `admin_platform_timeseries` | Time series of page views, visitors, subscribers, clicks | `{ from: string, to: string, granularity?: 'day' \| 'week' \| 'month' }` | `[{ date, pageViews, uniqueVisitors, subscribers, resourceClicks }]` |
| `admin_device_breakdown` | Device type breakdown for a date range | `{ from: string, to: string }` | `[{ device: string, count: number }]` |
| `admin_referrer_breakdown` | Traffic source breakdown | `{ from: string, to: string }` | `[{ category: string, count: number }]` |
| `admin_event_distribution` | Event type distribution | `{ from: string, to: string }` | `[{ eventType: string, count: number }]` |
| `admin_top_fanflets` | Top fanflets by views, clicks, or subscribers | `{ from: string, to: string, sortBy?: 'views' \| 'clicks' \| 'subscribers', limit?: number }` | `[{ id, title, speakerName, views, clicks, subscribers, conversionRate }]` |
| `admin_activity_heatmap` | Activity heatmap (day-of-week x hour) | `{ from: string, to: string }` | `[{ dayOfWeek, hour, count }]` |
| `admin_engagement_table` | Per-fanflet engagement metrics | `{ from: string, to: string, limit?: number, offset?: number }` | `{ rows: [...], total: number }` |
| `admin_resource_click_breakdown` | Resource clicks by type and fanflet | `{ from: string, to: string, fanfletId?: string }` | `[{ resourceTitle, resourceType, clicks }]` |
| `admin_speaker_leaderboard` | Speakers ranked by engagement | `{ from: string, to: string, limit?: number }` | `[{ speakerName, totalViews, totalClicks, totalSubscribers }]` |
| `admin_resource_type_performance` | Aggregate performance by resource type | `{ from: string, to: string }` | `[{ type, totalClicks, avgClicksPerFanflet }]` |
| `admin_growth_metrics` | Growth trends: new speakers, new fanflets, new subscribers | `{ from: string, to: string, granularity?: 'day' \| 'week' \| 'month' }` | Time series with growth data |
| `admin_activation_rate` | Percentage of speakers who published at least one fanflet | `{ from: string, to: string }` | `{ totalSpeakers, activatedSpeakers, activationRate }` |

### 4.7 Features & Plans

These tools map to `/features`, `/features/plans/new`, and `/features/plans/[planId]`.

| Tool | Description | Inputs | Output |
|------|-------------|--------|--------|
| `admin_list_features` | List all feature flags with global status and plan associations | None | `[{ id, key, name, description, isGlobal, plans: [...] }]` |
| `admin_toggle_feature_global` | Enable or disable a feature flag globally | `{ featureFlagId: string, isGlobal: boolean }` | `{ success: boolean }` |
| `admin_list_plans` | List all plans with features and limits | None | `[{ id, name, displayName, price, limits, features: [...], speakerCount }]` |
| `admin_get_plan` | Get a single plan's full details | `{ planId: string }` | Plan object with features |
| `admin_create_plan` | Create a new plan | `{ name: string, displayName: string, description?: string, price?: number, billingPeriod?: string, limits: object, featureFlagIds: string[], isVisible?: boolean }` | `{ plan: { id, name } }` |
| `admin_update_plan` | Update an existing plan's details and features | `{ planId: string, displayName?: string, description?: string, price?: number, limits?: object, featureFlagIds?: string[], isVisible?: boolean }` | `{ success: boolean }` |
| `admin_refresh_entitlements` | Refresh entitlement snapshots for all speakers on a plan | `{ planId: string }` | `{ updated: number }` |
| `admin_override_speaker_feature` | Grant or revoke a feature flag override for a specific speaker | `{ speakerId: string, featureKey: string, enabled: boolean }` | `{ success: boolean }` |

### 4.8 Waiting List (Marketing Subscribers)

These tools map to `/waiting-list`.

| Tool | Description | Inputs | Output |
|------|-------------|--------|--------|
| `admin_list_waiting_list` | List marketing subscribers (pricing page signups) with optional tier filter | `{ tier?: string, search?: string, limit?: number, offset?: number }` | `{ subscribers: [...], total: number }` |
| `admin_waiting_list_stats` | Total count and breakdown by interest tier | None | `{ total: number, byTier: [...] }` |

### 4.9 Impersonation

These tools map to `/impersonation-log` and the impersonation API.

| Tool | Description | Inputs | Output |
|------|-------------|--------|--------|
| `admin_impersonation_log` | List impersonation sessions (active and past) | `{ limit?: number, offset?: number }` | `{ sessions: [...], total: number }` |
| `admin_start_impersonation` | Start an impersonation session for a speaker or sponsor | `{ targetUserId: string, reason: string }` | `{ sessionId: string, redirectUrl: string }` |

**Note:** `admin_start_impersonation` returns a `redirectUrl` that the admin would open in a browser. The AI agent should present this as a link, not attempt to use it programmatically. The `reason` parameter is required for the audit trail.

### 4.10 Admin Settings

| Tool | Description | Inputs | Output |
|------|-------------|--------|--------|
| `admin_get_settings` | Get admin notification preferences and timezone | None | `{ notifications: {...}, timezone: string }` |
| `admin_update_settings` | Update notification preferences or timezone | `{ notifications?: object, timezone?: string }` | `{ success: boolean }` |

### Tool Count Summary

| Category | Tools | Phase |
|----------|-------|-------|
| Platform Overview | 3 | 1 |
| Account Management | 7 | 1 |
| Sponsor Management | 3 | 1 |
| Fanflet Management | 2 | 1 |
| Subscriber Management | 2 | 1 |
| Platform Analytics | 13 | 1-2 |
| Features & Plans | 8 | 1 |
| Waiting List | 2 | 1 |
| Impersonation | 2 | 2 |
| Admin Settings | 2 | 1 |
| **Total** | **42** | |

---

## 5. Admin MCP Resources

MCP Resources provide read-only snapshots that help the AI agent understand context without multiple tool calls.

| Resource URI | Description | Data |
|-------------|-------------|------|
| `fanflet://admin/overview` | Platform summary snapshot | Speaker count, fanflet count, subscriber count, active fanflets, today's views |
| `fanflet://admin/plans` | All plans with feature lists and subscriber counts | Plan name, price, feature keys, active speaker count per plan |
| `fanflet://admin/features` | Feature flag registry | Flag key, name, description, global status |
| `fanflet://admin/recent-activity` | Last 24 hours of platform activity | New signups, published fanflets, subscriber additions, notable events |

Admin resources are only returned in `resources/list` when the authenticated user has `platform_admin` role. They are cached for 60 seconds (server-side) to avoid excessive queries.

---

## 6. Architecture & Data Flow

### 6.1 Request Flow for Admin Tools

```
MCP Client (Claude Desktop, Cursor, etc.)
  |
  | HTTPS + OAuth access token (or API key)
  v
+-----------------------------------------------+
| MCP Server (/api/mcp on Vercel)               |
|                                               |
| 1. Authenticate (OAuth token or API key)      |
| 2. Extract user identity                      |
| 3. Resolve role:                              |
|    - app_metadata.role === 'platform_admin'   |
|    - OR user_roles table lookup               |
| 4. If admin: expose admin tools               |
|    If not: expose speaker/sponsor tools only  |
| 5. On tool call:                              |
|    a. Validate input (Zod schema)             |
|    b. Create service-role Supabase client     |
|    c. Execute query                           |
|    d. Log to mcp_audit_log (enhanced)         |
|    e. Return structured JSON                  |
+-----------------------------------------------+
         |                        |
         v                        v
  Supabase (service role)    mcp_audit_log
  - Bypasses RLS             - admin identity
  - Cross-tenant queries     - tool + input
  - Full platform access     - result + duration
```

### 6.2 Supabase Client Strategy

```typescript
function getClientForTool(ctx: ToolContext, toolCategory: string): SupabaseClient {
  if (toolCategory === 'admin') {
    // Admin tools use service role — full cross-tenant access
    return createServiceClient();
  }
  // Speaker/sponsor tools use the user-scoped client
  return ctx.supabase; // Created from OAuth/API key session
}
```

### 6.3 Tool Registration Pattern

```typescript
// packages/mcp/src/tools/admin/index.ts

import { McpServer } from "@modelcontextprotocol/sdk/server";

export function registerAdminTools(server: McpServer, ctx: ToolContext) {
  // Only register if the user is a platform_admin
  if (ctx.role !== 'platform_admin') return;

  server.tool(
    "admin_platform_overview",
    "Get platform-wide stats: total speakers, fanflets, subscribers, page views",
    {},
    withAdminAudit(ctx, adminPlatformOverviewHandler)
  );

  server.tool(
    "admin_list_accounts",
    "List speaker accounts with optional search, status filter, and date filter",
    {
      search: z.string().optional().describe("Search by name or email"),
      status: z.enum(["active", "suspended", "new"]).optional(),
      createdSince: z.string().date().optional(),
      limit: z.number().int().min(1).max(100).default(20),
      offset: z.number().int().min(0).default(0),
    },
    withAdminAudit(ctx, adminListAccountsHandler)
  );

  // ... register all admin tools
}
```

### 6.4 Enhanced Admin Audit Logging

Admin tool calls receive enhanced audit logging compared to speaker/sponsor tools:

```typescript
async function withAdminAudit(
  ctx: ToolContext,
  handler: ToolHandler
): ToolHandler {
  return async (input) => {
    const start = Date.now();
    const serviceClient = createServiceClient();

    try {
      const result = await handler(input, serviceClient);

      await serviceClient.from('mcp_audit_log').insert({
        auth_user_id: ctx.userId,
        api_key_id: ctx.apiKeyId ?? null,
        tool_name: ctx.currentTool,
        input_summary: sanitizeAdminInput(input),
        result_status: 'success',
        duration_ms: Date.now() - start,
        // Admin-specific fields (added by migration):
        admin_action: true,
        target_entity_type: extractEntityType(ctx.currentTool),
        target_entity_id: extractEntityId(input),
      });

      return result;
    } catch (err) {
      await serviceClient.from('mcp_audit_log').insert({
        auth_user_id: ctx.userId,
        api_key_id: ctx.apiKeyId ?? null,
        tool_name: ctx.currentTool,
        input_summary: sanitizeAdminInput(input),
        result_status: 'error',
        error_message: err instanceof Error ? err.message : 'Unknown error',
        duration_ms: Date.now() - start,
        admin_action: true,
        target_entity_type: extractEntityType(ctx.currentTool),
        target_entity_id: extractEntityId(input),
      });
      throw err;
    }
  };
}
```

Admin audit log entries include:
- `admin_action: true` flag for easy filtering
- `target_entity_type`: e.g., `'speaker'`, `'sponsor'`, `'fanflet'`, `'plan'`, `'feature_flag'`
- `target_entity_id`: the UUID of the affected entity (for traceability)

### 6.5 Package Structure Addition

The admin tools extend the `packages/mcp/` structure defined in the ADR:

```
packages/mcp/src/tools/admin/
  index.ts            -- Registers all admin tools, gated by role
  overview.ts         -- admin_platform_overview, admin_recent_signups, admin_recent_fanflets
  accounts.ts         -- admin_list_accounts, admin_get_account, admin_suspend_account, etc.
  sponsors.ts         -- admin_list_sponsors, admin_get_sponsor, admin_toggle_sponsor_verification
  fanflets.ts         -- admin_list_fanflets, admin_get_fanflet
  subscribers.ts      -- admin_list_subscribers, admin_subscriber_stats
  analytics.ts        -- All 13 analytics tools
  features.ts         -- admin_list_features, admin_toggle_feature_global, plan management
  waiting-list.ts     -- admin_list_waiting_list, admin_waiting_list_stats
  impersonation.ts    -- admin_impersonation_log, admin_start_impersonation
  settings.ts         -- admin_get_settings, admin_update_settings

packages/mcp/src/middleware/
  admin-auth.ts       -- Admin role verification and service-role client creation
  admin-audit.ts      -- Enhanced audit logging for admin actions
```

---

## 7. Database Migration

### Migration: `20260310100000_mcp_admin_audit_columns.sql`

This migration extends the `mcp_audit_log` table (created by the base MCP migration) with admin-specific columns:

```sql
-- Add admin-specific columns to mcp_audit_log
ALTER TABLE public.mcp_audit_log
  ADD COLUMN IF NOT EXISTS admin_action BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS target_entity_type TEXT,
  ADD COLUMN IF NOT EXISTS target_entity_id UUID;

-- Index for admin audit queries
CREATE INDEX IF NOT EXISTS idx_mcp_audit_log_admin
  ON public.mcp_audit_log(admin_action, created_at)
  WHERE admin_action = true;

CREATE INDEX IF NOT EXISTS idx_mcp_audit_log_target
  ON public.mcp_audit_log(target_entity_type, target_entity_id)
  WHERE target_entity_id IS NOT NULL;

-- Admin users can read all audit logs (not just their own)
DROP POLICY IF EXISTS "Admins can read all MCP audit logs" ON public.mcp_audit_log;
CREATE POLICY "Admins can read all MCP audit logs"
  ON public.mcp_audit_log FOR SELECT TO authenticated
  USING (
    (SELECT auth.jwt()->'app_metadata'->>'role') = 'platform_admin'
  );
```

**Note:** The base `mcp_api_keys` and `mcp_audit_log` tables are created by the migration defined in the ADR (`20260310000000_mcp_api_keys_and_audit.sql`). This migration only adds admin-specific columns and policies.

---

## 8. Security Model

### 8.1 Threat Model

| Threat | Mitigation |
|--------|------------|
| **Stolen API key used for admin access** | 90-day mandatory expiration on admin keys. IP allowlisting (Phase 2). Key revocation in dashboard. Rate limiting. |
| **Non-admin user attempting admin tools** | Role check at authentication time and per-tool invocation. Admin tools are not listed in `tools/list` for non-admins. |
| **Prompt injection causing destructive admin action** | Destructive tools (`admin_reset_account`, `admin_suspend_account`) require confirmation parameters. All inputs validated with Zod. No dynamic SQL. |
| **AI agent autonomously performing sensitive operations** | `admin_reset_account` requires the speaker's name as confirmation. `admin_start_impersonation` requires a reason string. Audit log records all actions. |
| **Service-role key exposure** | The service-role key is only used server-side in the MCP handler. It is never sent to the client or included in tool responses. Standard Vercel server-side env var handling. |
| **Audit log tampering** | Audit logs are written with the service-role client. The authenticated admin has SELECT-only access via RLS. No DELETE or UPDATE policy for authenticated users. |

### 8.2 Rate Limiting

Admin API keys have dedicated rate limits, separate from speaker/sponsor tiers:

| Metric | Limit |
|--------|-------|
| Requests per minute | 60 |
| Requests per day | 10,000 |
| Destructive actions per hour | 20 |

Destructive actions are: `admin_suspend_account`, `admin_reactivate_account`, `admin_reset_account`, `admin_change_speaker_plan`, `admin_toggle_feature_global`, `admin_toggle_sponsor_verification`, `admin_create_plan`, `admin_update_plan`.

### 8.3 Input Validation

Every admin tool validates inputs with Zod schemas. Examples of constraints:

- `speakerId`, `sponsorId`, `planId`, `featureFlagId`: `z.string().uuid()`
- `search`: `z.string().max(200)`
- `reason`: `z.string().min(1).max(500)`
- `limit`: `z.number().int().min(1).max(100)`
- `offset`: `z.number().int().min(0)`
- Date strings: `z.string().date()` (ISO format)
- `confirmName`: `z.string().min(1).max(200)` (for reset confirmation)

### 8.4 Response Sanitization

Admin tool responses follow these rules:

- Never include raw SQL errors or stack traces
- Truncate large text fields (descriptions, bios) to 500 chars
- Include pagination metadata (`total`, `limit`, `offset`) for list endpoints
- Subscriber email addresses are included (admin has access) but phone numbers are never stored or returned (only hashes exist for SMS rate limiting)

---

## 9. Agent Configuration Examples

### 9.1 Claude Desktop (OAuth — Production)

```json
{
  "mcpServers": {
    "fanflet-admin": {
      "url": "https://mcp.fanflet.com",
      "transport": "streamable-http"
    }
  }
}
```

On first connection, Claude initiates the OAuth flow. The admin authenticates with their Supabase credentials (same as the admin dashboard). The MCP server detects the `platform_admin` role and exposes admin tools.

### 9.2 Claude Desktop (API Key — Beta)

```json
{
  "mcpServers": {
    "fanflet-admin": {
      "url": "https://mcp.fanflet.com",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer fan_admin_k8x2..."
      }
    }
  }
}
```

### 9.3 Cursor (Local Development)

```json
{
  "mcpServers": {
    "fanflet-admin-dev": {
      "url": "http://localhost:3000/api/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer <supabase-access-token>"
      }
    }
  }
}
```

### 9.4 ChatGPT / Other MCP Clients

Any MCP-compatible client that supports remote Streamable HTTP servers and OAuth 2.1 + PKCE can connect. The admin authenticates through the standard OAuth flow — no client-specific configuration beyond the server URL.

---

## 10. Phased Implementation Plan

### Phase 1: Core Admin Tools (3-4 weeks)

This phase delivers the most frequently used admin operations and the authentication infrastructure.

**Infrastructure:**
- Admin role detection in MCP auth flow (extends base MCP auth from ADR)
- Admin API key generation (role='admin') in admin dashboard Settings page
- Service-role client creation for admin tool context
- Enhanced audit logging middleware with admin-specific columns
- Database migration for admin audit columns

**Tools (30 tools):**
- Platform Overview: `admin_platform_overview`, `admin_recent_signups`, `admin_recent_fanflets`
- Account Management: all 7 tools
- Sponsor Management: all 3 tools
- Fanflet Management: all 2 tools
- Subscriber Management: all 2 tools
- Features & Plans: all 8 tools
- Waiting List: all 2 tools
- Admin Settings: all 2 tools
- Analytics (basic): `admin_platform_kpis`, `admin_platform_timeseries`, `admin_top_fanflets`, `admin_growth_metrics`

**Deliverables:**
- Admin tools functional and tested with Claude Desktop via API key
- Admin API key management UI in admin dashboard Settings
- Database migration applied
- Integration tests for all Phase 1 tools

**Depends on:** Base MCP server infrastructure from ADR Phase 1 (packages/mcp setup, Streamable HTTP transport, API key auth, base migration).

### Phase 2: Full Analytics + Impersonation (2-3 weeks)

**Tools (12 tools):**
- Remaining analytics: `admin_device_breakdown`, `admin_referrer_breakdown`, `admin_event_distribution`, `admin_activity_heatmap`, `admin_engagement_table`, `admin_resource_click_breakdown`, `admin_speaker_leaderboard`, `admin_resource_type_performance`, `admin_activation_rate`
- Impersonation: `admin_impersonation_log`, `admin_start_impersonation`
- Admin MCP Resources: all 4 resource URIs

**Additional features:**
- OAuth 2.1 support for admin (when base MCP OAuth is ready)
- Audit log viewer in admin dashboard (new page: `/mcp-audit`)

### Phase 3: Advanced Admin Capabilities (2-3 weeks, future)

These tools extend beyond current dashboard parity:

| Tool | Description |
|------|-------------|
| `admin_export_accounts_csv` | Export speaker accounts as CSV |
| `admin_export_analytics_csv` | Export analytics data as CSV |
| `admin_bulk_change_plans` | Change plans for multiple speakers at once |
| `admin_send_platform_announcement` | Send email to all active speakers |
| `admin_audit_search` | Search MCP and impersonation audit logs |
| `admin_health_check` | System health: Supabase connection, storage quotas, API latency |

### Phase Summary

| Phase | Timeline | Tools | Key Deliverable |
|-------|----------|-------|-----------------|
| 1: Core Admin | 3-4 weeks | 30 | Auth + most-used admin tools |
| 2: Full Analytics + Impersonation | 2-3 weeks | +12 (42) | Complete dashboard parity |
| 3: Advanced | 2-3 weeks | +6 (48) | Beyond dashboard capabilities |

**Total:** 7-10 weeks for full admin MCP parity and beyond.

**Dependency:** Phases 1-2 depend on the base MCP infrastructure from ADR Phase 1 being at least partially complete (the `packages/mcp` package, Streamable HTTP transport, API key auth, and base database migration). Admin tool development can proceed in parallel with speaker tool development since they share infrastructure but not business logic.

---

## 11. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Service-role client abuse via admin MCP** | Low | Very High | 90-day key expiration, rate limiting, destructive action caps, comprehensive audit logging. Key revocation available immediately. |
| **Admin tool used to access data beyond intended scope** | Low | High | Tools return specific, structured data — not raw table dumps. Each tool queries only the columns it needs. |
| **OAuth token with admin scope stolen** | Low | Very High | Short token lifetime (1h). Refresh token rotation. Token includes only what admin needs. Revocable via Supabase. |
| **AI agent performs unintended destructive action** | Medium | High | Confirmation parameters on destructive tools. AI agents must explicitly provide speaker name or reason. |
| **Admin MCP access from untrusted network** | Medium | Medium | Phase 2: IP allowlisting for admin API keys. Phase 1: rely on key secrecy + short expiration. |
| **Performance: admin analytics queries are expensive** | Medium | Low | Caching on MCP Resources (60s TTL). Analytics queries use same optimized SQL as the dashboard. |
| **Scope creep: admin tools become a maintenance burden** | Low | Medium | Tools are thin wrappers over existing server actions. Shared business logic layer between dashboard and MCP. |

---

## 12. Success Criteria

### Phase 1

- Admin can connect Claude Desktop (or equivalent) to the MCP server with an admin API key and successfully invoke all 30 Phase 1 tools.
- Admin can perform a complete "morning check" workflow via AI: platform overview, recent signups, any suspended accounts, top-performing fanflets, plan distribution — without opening the web dashboard.
- All admin MCP actions are logged in `mcp_audit_log` with correct admin identity, tool name, and target entity.
- Median admin tool response time < 2 seconds.
- Zero security incidents (no unauthorized access, no data leaks).

### Phase 2

- Full admin dashboard parity: every operation available in the web UI is available via MCP.
- OAuth flow works end-to-end for admin users with at least Claude Desktop and one other MCP client.
- Audit log viewer in admin dashboard shows both impersonation and MCP admin actions.

### Phase 3

- Admin can perform operations via MCP that are not available in the web dashboard (bulk operations, CSV exports, health checks).
- MCP becomes the preferred interface for routine admin tasks (>50% of daily admin operations via MCP).

---

## 13. Open Questions

1. **Should admin MCP access require a separate "admin key" or can regular OAuth tokens with admin role suffice?**
   Recommendation: Both. OAuth is the primary mechanism. Admin API keys exist for beta testing and for MCP clients that do not support OAuth (some early clients). Admin keys have stricter constraints (shorter expiration, lower limit).

2. **Should destructive admin actions require 2FA or a second confirmation step?**
   Recommendation: Not in Phase 1. The `confirmName` parameter on `admin_reset_account` and the mandatory `reason` on impersonation provide a lightweight confirmation. If incidents occur, add time-delayed execution for destructive actions (e.g., "account will be suspended in 5 minutes, cancel with `admin_cancel_pending_action`").

3. **Should there be a read-only admin role for MCP?**
   Recommendation: Not initially. Phase 3 could introduce `platform_admin_readonly` that only accesses read tools (overview, analytics, lists) without write capabilities. This would be useful for giving team members or VAs limited admin visibility.

4. **How should admin MCP access interact with the impersonation system?**
   `admin_start_impersonation` returns a browser URL, not an MCP session. The admin cannot "impersonate and then use speaker MCP tools" through MCP alone — they would need to open the URL in a browser. This is a deliberate safety boundary.

5. **Should admin MCP tools be available in the development/preview environment?**
   Yes. Development uses the same `NODE_ENV` check. Admin tools work against the dev Supabase project (separate from production). This enables testing the full admin MCP flow before production deployment.

---

## References

- `docs/ADR_MCP_ARCHITECTURE.md` — General MCP architecture, OAuth flow, API keys, tool design patterns
- `PRDs/MCP_INTEGRATION_VISION.md` — Speaker/sponsor MCP use cases, pricing integration, phased rollout
- `apps/admin/middleware.ts` — Admin role verification logic (to be mirrored in MCP auth)
- `apps/admin/app/(dashboard)/` — Admin dashboard pages (source of truth for tool inventory)
- `ENGINEERING_GUIDELINES_MEMO_v2.md` — Security requirements, API patterns, audit standards
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) — Official SDK
- [MCP Specification (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25) — Protocol specification
- [MCP Authorization Tutorial](https://modelcontextprotocol.io/docs/tutorials/security/authorization) — OAuth 2.1 + PKCE guide
