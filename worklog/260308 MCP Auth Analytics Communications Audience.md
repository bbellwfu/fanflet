# Daily Work Log — March 8, 2026

## Release Summary

Major infrastructure day: the platform gained AI agent access via MCP with full OAuth 2.1 authentication, a new admin analytics dashboard, a platform communications system for sending release announcements to speakers, audience member accounts, and the integration framework for sponsor CRM connections.

### New Features

**MCP Agent Authentication (OAuth 2.1 + PKCE)**
AI assistants like Claude Desktop and Cursor can now connect to Fanflet by simply adding a server URL. A browser opens, the user logs in with their existing credentials, and the agent gets access automatically — no manual token copying required. Admin tools are at admin.fanflet.com/api/mcp (33 tools), speaker/sponsor/audience tools at fanflet.com/api/mcp. Each role sees only the tools they're authorized for.

**MCP Access in Settings**
Speakers, sponsors, and admins now see "Use Fanflet in AI Assistants" sections in their Settings pages with connection instructions and their MCP server URL. The login pages also support the OAuth redirect flow end-to-end.

**Admin Analytics Dashboard**
A new Analytics section in the admin portal surfaces platform health, engagement, content, and growth metrics from existing data — no schema changes needed. Includes KPI cards with period comparison, trend charts, device/referrer breakdowns, per-fanflet engagement tables, resource type comparisons, speaker leaderboards, and cumulative growth charts.

**Platform Communications**
Admins can now compose and send release announcements to opted-in speakers directly from the admin portal. The system includes a compose/preview/send flow, branded email template, delivery audit logging, and full privacy controls — speakers manage their notification preferences in Settings, and every email includes one-click unsubscribe. The email provider is abstracted so we can migrate from Resend to Mailchimp (or another ESP) later without changing the feature.

**Audience Accounts**
Audience members (attendees) can now create accounts via email or LinkedIn OAuth, save fanflets to a personal library at /my, and switch roles if they also have a speaker or sponsor account.

**Integration Framework**
New @fanflet/core package extracts framework-agnostic business logic with full test coverage (49 tests). Includes the integration adapter registry, a Zapier webhook adapter, and Inngest-powered background event processing. Sponsor Integration Hub UI at /sponsor/integrations with webhook management and status tracking.

**Analytics Source Tracking**
Analytics events now include a source column (direct, qr, portfolio, share) so traffic from different entry points can be distinguished.

### Bug Fixes

- Fixed duplicate migration timestamp (20260307150000 was used by both impersonation and show_event_name migrations)

### Infrastructure

- Promoted all features to main for production release
- Applied platform_communications migration to both dev and prod Supabase
- New database tables: mcp_api_keys, mcp_audit_log, mcp_oauth_clients, mcp_oauth_codes, mcp_oauth_tokens, platform_communications, platform_communication_variants, communication_deliveries, platform_communication_preferences, platform_communication_unsubscribes, audience_accounts, audience_saved_fanflets, integration_connections, integration_events
- New package: packages/mcp/ (MCP server, OAuth, auth, tools, audit middleware)
- New package: packages/core/ (service layer, domain events, integration adapters)
- Design doc: docs/PLATFORM_COMMUNICATIONS_AND_RELEASE_ANNOUNCEMENTS.md

---

## Technical Details

### Pull Requests Merged

| PR | Title |
|----|-------|
| #71 | feat(admin): platform communications system for speaker announcements |
| #70 | feat(mcp): OAuth login redirect and MCP access cards in Settings |
| #69 | MCP agent authentication (OAuth 2.1 + PKCE, 33 admin tools, role-based architecture) |
| #68 | promote: develop to main |
| #67 | feat(admin): analytics dashboard with platform health, engagement, content, and growth |
| #66 | fix(db): rename show_event_name migration to resolve duplicate timestamp |
| #65 | feat: timezone preferences, PRDs, audience accounts, integration framework, source tracking |

### Commits

```
b23ff07 feat(admin): add platform communications system for speaker announcements
0efea6f feat(mcp): add OAuth login redirect and MCP access cards in Settings
499ff02 docs: session handoff 2026-03-08 21:16
b412460 refactor(mcp): split MCP endpoints across admin and web apps
8a93120 refactor(mcp): establish replicable role-based tool pattern
a199f68 docs(prd): update MCP admin PRD status to in-progress
8c7bcf4 feat(mcp): add OAuth 2.1 + PKCE authentication flow
1adc591 feat(mcp): implement MCP admin portal server with API key auth
4a9c994 docs(prd): add MCP Admin Portal Interface & Authentication PRD
c7de9e3 feat(admin): add analytics dashboard with platform health, engagement, content, and growth pages
76ca0de fix(db): rename show_event_name migration to resolve duplicate timestamp
0d09794 fix(db): rename show_event_name migration to resolve duplicate timestamp
e47ae7c docs: add PRDs and architecture decision records
2b518a8 feat(analytics): add source tracking column to analytics events
60ff593 feat(integrations): add @fanflet/core service layer, Zapier adapter, and Integration Hub UI
dd83c3a feat(audience): add audience accounts with save-to-library and role-based auth
```

### Database Migrations

| Migration | Purpose |
|-----------|---------|
| `20260310000000_integration_framework.sql` | Integration connections/events tables, enterprise_integrations feature flag |
| `20260310000000_mcp_api_keys_and_audit.sql` | MCP API keys, audit log, OAuth clients/codes/tokens |
| `20260310100000_analytics_source_column.sql` | Source attribution column on analytics_events |
| `20260311100000_platform_communications.sql` | Platform communications, variants, deliveries, preferences, unsubscribes |

### Key Files Changed

**New packages:**
- `packages/mcp/` — MCP server, OAuth 2.1, auth, 33 admin tools, role-based architecture
- `packages/core/` — Service layer, domain events, integration adapters, Zapier webhook

**New admin pages:**
- `apps/admin/app/(dashboard)/communications/` — Communications list, new/edit, detail with delivery log
- `apps/admin/app/(dashboard)/analytics/` — Platform health, engagement, content, growth dashboards
- `apps/admin/app/api/mcp/` — MCP OAuth endpoints (authorize, callback, register, token)

**New web pages:**
- `apps/web/app/api/communications/unsubscribe/` — One-click email unsubscribe
- `apps/web/app/api/mcp/` — Speaker/sponsor/audience MCP endpoints
- `apps/web/app/(audience)/my/` — Audience saved fanflets library

**New shared code:**
- `apps/admin/lib/email-provider*.ts` — Email provider abstraction (Resend impl, future Mailchimp)
- `apps/admin/lib/email-template.ts` — Branded announcement email template
- `apps/web/components/dashboard/notification-preferences.tsx` — Speaker opt-in toggle

**Modified:**
- `apps/admin/components/admin-sidebar.tsx` — Added Communications nav item
- `apps/web/app/dashboard/settings/page.tsx` — Added notification preferences card
- `apps/web/app/(auth)/login/page.tsx` — MCP OAuth redirect support
- `apps/admin/app/login/page.tsx` — MCP OAuth redirect support
