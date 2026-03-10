# Fanflet Parking Lot

## 2026-03-08
- Login page MCP OAuth redirect: detect `mcp_state`/`mcp_callback` params, redirect to `/api/mcp/callback?state=...` after successful auth instead of dashboard
- API key management UI in admin dashboard Settings page (generate, revoke, view prefix)
- API key management UI in speaker dashboard Settings page
- MCP audit log viewer page in admin dashboard
- Token cleanup cron: delete expired `mcp_oauth_codes` and revoked `mcp_oauth_tokens`
- Audience role: define RLS policies for subscriber-scoped read access to fanflets and resources
- Consider using `createUserScopedClient()` from `@fanflet/db/user-client` for speaker/sponsor MCP tools instead of service client (true RLS enforcement vs. current service-client-with-role-check approach)

## 2026-03-10
- Cross-KOL comparison view for sponsors: let sponsors compare engagement metrics across their KOLs (Ryan Walsh interview line 95-101)
- Integration exports: connect sponsor lead data to HubSpot, Salesforce, or Google Sheets (Ryan Walsh interview line 151)
- Per-resource-type breakdown in sponsor reports: show clicks vs. downloads vs. views broken out by type (PDF, link, video)
- Separate download vs. click lead counts in sponsor_leads (currently only resource_click creates leads; download route skips it to avoid double-counting)
- Speaker landing page / portfolio: public page listing all upcoming/active fanflets for a speaker (mentioned in Brian's demo walkthrough)
