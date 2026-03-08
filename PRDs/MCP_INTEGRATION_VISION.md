# Fanflet MCP Integration -- Vision & PRD

**Author:** Brian Bell (with Vision Architect)
**Date:** 2026-03-07
**Status:** Draft -- Discovery & Planning
**Document Version:** 1.0

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [What is MCP and Why It Matters for Fanflet](#2-what-is-mcp-and-why-it-matters-for-fanflet)
3. [Speaker / KOL Use Cases](#3-speaker--kol-use-cases)
4. [Sponsor Use Cases](#4-sponsor-use-cases)
5. [Pricing Integration](#5-pricing-integration)
6. [Interaction Examples by Tier](#6-interaction-examples-by-tier)
7. [Competitive Advantage](#7-competitive-advantage)
8. [Technical Architecture](#8-technical-architecture)
9. [Phased Rollout](#9-phased-rollout)
10. [Risks & Mitigations](#10-risks--mitigations)
11. [Success Metrics](#11-success-metrics)
12. [Appendix: MCP Tool Inventory](#appendix-mcp-tool-inventory)

---

## 1. Executive Summary

This document defines the vision for making Fanflet fully MCP (Model Context Protocol) compatible, enabling speakers, sponsors, and eventually attendees to interact with the platform through AI agents (Claude, ChatGPT, Gemini, and any MCP-compatible client).

**The core thesis:** Speakers and sponsors are increasingly using AI assistants as their primary work interface. By exposing Fanflet's capabilities as MCP tools, we meet users where they already are -- inside their AI workflow -- rather than asking them to context-switch to yet another dashboard. This transforms Fanflet from a "tool you visit" into a "capability your AI has."

**Why now:** The MCP ecosystem has matured rapidly. The MCP specification hit stable v1.x in late 2025, the TypeScript SDK is production-ready, major platforms (Atlassian, Linear, Notion) ship remote MCP servers, and MCP gateways provide enterprise-grade auth, rate limiting, and observability. Early movers in vertical SaaS are establishing MCP as a differentiation axis.

**Expected outcomes:**
- Reduced friction for power users (create a fanflet in 30 seconds via conversation)
- New upgrade triggers (MCP analytics queries gated behind Pro)
- Defensible moat (competitors would need to replicate the protocol layer)
- Enterprise readiness signal for healthcare conference organizers evaluating platforms

---

## 2. What is MCP and Why It Matters for Fanflet

### MCP in 60 Seconds

The Model Context Protocol is an open standard that lets AI assistants call tools, read resources, and use prompts exposed by external servers. Think of it as "USB-C for AI" -- a universal plug that lets any AI client talk to any MCP-compatible service.

An MCP server exposes three primitive types:

| Primitive | Purpose | Fanflet Example |
|-----------|---------|-----------------|
| **Tools** | Actions the AI can take (with side effects) | `create_fanflet`, `add_resource_block` |
| **Resources** | Read-only data the AI can surface | `fanflet://{id}/analytics`, `speaker://profile` |
| **Prompts** | Reusable conversation templates | "Draft a follow-up email to my subscribers" |

### Why MCP (Not Just a REST API)

Fanflet already has server actions and API routes. A REST API would let developers integrate, but MCP goes further:

1. **No developer required.** Speakers say "create a fanflet for my talk next Tuesday" and the AI handles the API calls, validation, and error handling.
2. **Context-aware.** The AI can combine Fanflet data with the user's calendar, email, and other MCP services in a single conversation.
3. **Discovery built in.** MCP clients auto-discover available tools -- no documentation reading required.
4. **Auth handled by the protocol.** MCP's OAuth 2.1 + PKCE flow means users authenticate once; the AI handles token refresh.

### How Users Would Connect

1. Speaker opens Claude Desktop (or any MCP client)
2. Adds Fanflet as a remote MCP server: `https://mcp.fanflet.com`
3. Authenticates via OAuth (same Supabase Auth credentials)
4. AI now has access to their Fanflet tools, gated by their plan

---

## 3. Speaker / KOL Use Cases

### 3.1 Read-Only / Information Retrieval

| # | Use Case | Description | Complexity |
|---|----------|-------------|------------|
| S1 | List my fanflets | "Show me all my fanflets with their status" | Low |
| S2 | View fanflet details | "What resources are on my Southwest Dental Conference fanflet?" | Low |
| S3 | Subscriber count | "How many subscribers did my last fanflet get?" | Low |
| S4 | View my profile | "What does my public speaker profile look like?" | Low |
| S5 | Check plan & limits | "What plan am I on? How many fanflets can I create?" | Low |

### 3.2 Content Management

| # | Use Case | Description | Complexity |
|---|----------|-------------|------------|
| S6 | Create fanflet | "Create a new fanflet called 'Digital Dentistry 2026' for the ADA Annual Meeting on October 15" | Medium |
| S7 | Add resource block | "Add a link to my CE credit form: https://example.com/ce-credit" | Medium |
| S8 | Add library resource to fanflet | "Add my 'Clinical Protocol PDF' from my library to the ADA fanflet" | Medium |
| S9 | Publish / unpublish | "Publish my ADA fanflet" or "Take down the March conference page" | Low |
| S10 | Update fanflet details | "Change the event date to October 17 and update the title to include '2026'" | Medium |
| S11 | Reorder blocks | "Move the CE credit link above the slides download" | Medium |
| S12 | Delete resource block | "Remove the product recommendations link from my fanflet" | Low |
| S13 | Manage resource library | "Show my resource library" / "Create a new link resource for my practice website" | Medium |

### 3.3 Analytics & Insights

| # | Use Case | Description | Complexity |
|---|----------|-------------|------------|
| S14 | Fanflet performance | "How many page views did my Southwest Dental fanflet get this week?" | Medium |
| S15 | Resource click ranking | "Which resources get the most clicks across all my fanflets?" | Medium |
| S16 | Subscriber growth | "Show me subscriber growth over the last 30 days" | Medium |
| S17 | QR scan tracking | "How many people scanned the QR code for my latest talk?" | Medium |

### 3.4 Subscriber Engagement

| # | Use Case | Description | Complexity |
|---|----------|-------------|------------|
| S18 | List subscribers | "Show me all subscribers from my March talk" | Low |
| S19 | Draft follow-up | "Draft a follow-up email to subscribers from my Southwest Dental talk thanking them for attending" | Medium |
| S20 | Export subscribers | "Export my subscriber list as CSV" | Low |

### 3.5 Configuration & Settings

| # | Use Case | Description | Complexity |
|---|----------|-------------|------------|
| S21 | Update profile | "Update my bio to mention my new book" | Low |
| S22 | Change theme | "Change my default theme to Ocean Blue" | Low |
| S23 | Manage sponsor connections | "Show my sponsor connections" / "End my connection with ApexDental" | Medium |

---

## 4. Sponsor Use Cases

### 4.1 Read-Only / Reporting

| # | Use Case | Description | Complexity |
|---|----------|-------------|------------|
| P1 | View company profile | "Show me my sponsor account details" | Low |
| P2 | List connections | "Which speakers have accepted my connection requests?" | Low |
| P3 | Connection status | "Show me all pending connection requests" | Low |
| P4 | View my resources | "List all my active sponsor resources" | Low |
| P5 | Resource placement | "Which fanflets are currently displaying my Q2 promo?" | Medium |

### 4.2 Resource Management

| # | Use Case | Description | Complexity |
|---|----------|-------------|------------|
| P6 | Create resource | "Create a new promotional link for our Q2 whitepaper: https://example.com/whitepaper" | Medium |
| P7 | Update resource | "Update the CTA text on my product brochure to 'Download Now'" | Low |
| P8 | Pause / retire resource | "Pause my Q1 promotion -- it's expired" | Low |
| P9 | Resource lifecycle | "Retire all resources that expired before March 1" | Medium |

### 4.3 Connection Management

| # | Use Case | Description | Complexity |
|---|----------|-------------|------------|
| P10 | Send connection request | "Send a connection request to Dr. Sarah Mitchell with a message about our new product line" | Medium |
| P11 | Accept/decline requests | "Accept the connection request from Dr. Chen" | Low |
| P12 | Browse available speakers | "Show me verified speakers in the dental industry" | Medium |

### 4.4 Campaign Insights (Pro/Enterprise)

| # | Use Case | Description | Complexity |
|---|----------|-------------|------------|
| P13 | Resource performance | "Which of my resources generated the most clicks this month?" | Medium |
| P14 | Lead attribution | "Show me leads attributed to my resources across all connected speakers" | High |
| P15 | Speaker engagement | "Which speakers are driving the most engagement for my content?" | High |
| P16 | Monthly engagement report | "Generate a monthly engagement report for March 2026" | High |

### 4.5 Enterprise Features

| # | Use Case | Description | Complexity |
|---|----------|-------------|------------|
| P17 | Bulk resource update | "Update CTA text on all active resources to 'Learn More at Booth 412'" | High |
| P18 | Cross-speaker analytics | "Compare engagement metrics across all my connected speakers for Q1" | High |

---

## 5. Pricing Integration

### 5.1 Design Philosophy

MCP access itself should NOT be a separately gated feature. The protocol is the delivery mechanism, not the product. Instead, each MCP tool enforces the same entitlement checks that the web dashboard uses. This means:

- A Free user can create fanflets via MCP (just like the dashboard), but hits the same 5-fanflet limit
- A Free user cannot query click-through analytics via MCP because they do not have the `click_through_analytics` feature flag
- MCP becomes a reason to upgrade because it makes Pro features effortlessly accessible

This approach avoids the awkward "you need Pro to use MCP at all" gate that would throttle adoption, while preserving the existing monetization model.

### 5.2 Speaker Tool-to-Plan Matrix

| Use Case | Tool Name | Free | Pro / Early Access | Enterprise |
|----------|-----------|------|-------------------|------------|
| S1: List fanflets | `list_fanflets` | Yes | Yes | Yes |
| S2: View fanflet | `get_fanflet` | Yes | Yes | Yes |
| S3: Subscriber count | `get_subscriber_count` | Yes | Yes | Yes |
| S4: View profile | `get_speaker_profile` | Yes | Yes | Yes |
| S5: Check plan | `get_plan_info` | Yes | Yes | Yes |
| S6: Create fanflet | `create_fanflet` | Yes (limit: 5) | Yes (unlimited) | Yes |
| S7: Add resource block | `add_resource_block` | Yes (limit: 20/fanflet) | Yes (unlimited) | Yes |
| S8: Add from library | `add_library_resource_to_fanflet` | Yes | Yes | Yes |
| S9: Publish/unpublish | `publish_fanflet` / `unpublish_fanflet` | Yes | Yes | Yes |
| S10: Update fanflet | `update_fanflet` | Yes | Yes | Yes |
| S11: Reorder blocks | `reorder_block` | Yes | Yes | Yes |
| S12: Delete block | `delete_resource_block` | Yes | Yes | Yes |
| S13: Library CRUD | `list_library` / `create_library_resource` | Yes | Yes | Yes |
| S14: Fanflet analytics | `get_fanflet_analytics` | Basic stats | Full analytics | Full + export |
| S15: Resource ranking | `get_resource_rankings` | No | Yes | Yes |
| S16: Subscriber growth | `get_subscriber_growth` | No | Yes | Yes |
| S17: QR scan stats | `get_qr_scan_stats` | Basic count | Trend data | Full breakdown |
| S18: List subscribers | `list_subscribers` | Yes | Yes | Yes |
| S19: Draft email | `draft_subscriber_email` | Yes | Yes | Yes + templates |
| S20: Export CSV | `export_subscribers_csv` | Yes | Yes | Yes |
| S21: Update profile | `update_speaker_profile` | Yes | Yes | Yes |
| S22: Change theme | `update_default_theme` | Default only | All themes | All + custom |
| S23: Sponsor connections | `list_sponsor_connections` / `end_connection` | Yes | Yes | Yes |

**Key gating decisions:**

- **Free tier gets full content management via MCP.** This is critical for adoption. If a speaker's AI can create and manage fanflets for them, that is the "aha moment" that hooks them.
- **Analytics queries are the primary upgrade trigger.** Free users see basic stats (total views, total subscribers). Pro unlocks click-through analytics, resource rankings, growth trends -- the data that makes speakers say "I need this."
- **Enterprise gets export, bulk operations, and advanced reporting.** These are the features conference organizers and speaker bureaus care about.

### 5.3 Sponsor Tool-to-Plan Matrix

| Use Case | Tool Name | Sponsor Free | Sponsor Pro | Sponsor Enterprise |
|----------|-----------|-------------|------------|-------------------|
| P1: View profile | `get_sponsor_profile` | Yes | Yes | Yes |
| P2: List connections | `list_sponsor_connections` | Yes | Yes | Yes |
| P3: Connection status | `get_connection_status` | Yes | Yes | Yes |
| P4: List resources | `list_sponsor_resources` | Yes | Yes | Yes |
| P5: Resource placement | `get_resource_placements` | No | Yes | Yes |
| P6: Create resource | `create_sponsor_resource` | Yes (limit: 5) | Yes (unlimited) | Yes |
| P7: Update resource | `update_sponsor_resource` | Yes | Yes | Yes |
| P8: Pause/retire | `update_resource_status` | Yes | Yes | Yes |
| P9: Bulk lifecycle | `bulk_update_resource_status` | No | No | Yes |
| P10: Send request | `send_connection_request` | Yes (limit: 3) | Yes (unlimited) | Yes |
| P11: Accept/decline | `respond_to_connection` | Yes | Yes | Yes |
| P12: Browse speakers | `browse_speakers` | Yes | Yes | Yes |
| P13: Resource clicks | `get_sponsor_resource_analytics` | No | Yes | Yes |
| P14: Lead attribution | `get_sponsor_leads` | No | Yes | Yes |
| P15: Speaker engagement | `get_speaker_engagement_metrics` | No | No | Yes |
| P16: Monthly report | `generate_engagement_report` | No | No | Yes |
| P17: Bulk update | `bulk_update_resources` | No | No | Yes |
| P18: Cross-speaker analytics | `get_cross_speaker_analytics` | No | No | Yes |

**Key gating decisions for sponsors:**

- **Free sponsors get profile, basic connections, and resource CRUD.** Enough to get started and see the value of being on the platform.
- **Sponsor Pro unlocks analytics.** Lead attribution and resource click data are the core value proposition for sponsors -- this is how they justify spend to their marketing teams.
- **Enterprise is for multi-speaker campaigns.** Cross-speaker analytics, bulk operations, and generated reports are what pharma/device companies need for quarterly business reviews.

---

## 6. Interaction Examples by Tier

### 6.1 Free Tier -- Speaker

**Example 1: Creating a fanflet via conversation**

> **Speaker:** "I'm speaking at the Southwest Dental Conference on April 15. Create a fanflet for my talk on digital impressions."
>
> **AI:** I'll create that for you. [Calls `create_fanflet` with title "Digital Impressions", event_name "Southwest Dental Conference", event_date "2026-04-15"]
>
> Your fanflet "Digital Impressions" has been created for the Southwest Dental Conference on April 15, 2026. It's currently in draft status. Here's what you can do next:
> - Add resources (slides, links, downloads)
> - Set a theme
> - Publish it when you're ready
>
> Would you like to add any resources now?

**Example 2: Adding resources in a flow**

> **Speaker:** "Yes, add a link to my CE credit form at https://dentalce.org/credit/mitchell-2026 and add my clinical protocol PDF from my library."
>
> **AI:** Done. [Calls `add_resource_block` for the link, then `add_library_resource_to_fanflet` for the PDF]
>
> I've added two resources to your "Digital Impressions" fanflet:
> 1. Link: "CE Credit Form" -- https://dentalce.org/credit/mitchell-2026
> 2. File: "Clinical Protocol PDF" (linked from your library)
>
> Your fanflet now has 2 resources. Want to publish it or add more?

**Example 3: Quick status check**

> **Speaker:** "How many subscribers do I have total?"
>
> **AI:** [Calls `get_subscriber_count`]
>
> You have 47 subscribers across 3 fanflets:
> - Southwest Dental Conference 2025: 28 subscribers
> - ADA Annual Meeting: 12 subscribers
> - Regional Dental Forum: 7 subscribers

**Example 4: Checking upgrade-gated features**

> **Speaker:** "Which of my resources gets the most clicks?"
>
> **AI:** [Calls `get_resource_rankings` -- receives entitlement error]
>
> Resource click rankings require the Pro plan. Your current Free plan includes basic engagement stats (total page views and subscriber counts). Upgrading to Pro ($12/month) would unlock:
> - Click-through analytics per resource
> - Resource performance rankings
> - Subscriber growth trends
>
> Would you like to learn more about upgrading?

### 6.2 Pro Tier -- Speaker

**Example 1: Analytics deep dive**

> **Speaker:** "Show me how my Southwest Dental fanflet performed last month."
>
> **AI:** [Calls `get_fanflet_analytics` with date range and fanflet ID]
>
> Here's your Southwest Dental Conference fanflet performance for February 2026:
> - Page views: 342 (up 15% from January)
> - Unique visitors: 289
> - QR scans: 156
> - Email signups: 34 (9.9% conversion rate)
> - SMS bookmarks: 12
>
> Top resources by clicks:
> 1. CE Credit Form -- 98 clicks
> 2. Clinical Protocol PDF -- 67 downloads
> 3. Product Recommendations -- 45 clicks

**Example 2: Subscriber engagement prep**

> **Speaker:** "Draft a follow-up email to subscribers from my Southwest Dental talk. Mention that I've uploaded the full slide deck and the CE credits are available until April 30."
>
> **AI:** [Calls `list_subscribers` filtered by fanflet, then uses prompt template `draft_subscriber_email`]
>
> Here's a draft for your 28 subscribers from the Southwest Dental Conference:
>
> ---
> Subject: Slides & CE Credits Now Available -- Southwest Dental Conference
>
> Hi [Name],
>
> Thank you for attending my session on digital impressions at the Southwest Dental Conference. I wanted to let you know that:
>
> - The full slide deck is now available on your resource page
> - CE credits can be claimed through April 30, 2026
>
> Visit your resource page anytime: fanflet.com/drmitchell/southwest-dental-2026
>
> Best,
> Dr. Sarah Mitchell
> ---
>
> Want me to adjust the tone or add anything?

**Example 3: Preparing for a new conference**

> **Speaker:** "I have the ADA Annual Meeting coming up in October. Clone my Southwest Dental fanflet as a starting point."
>
> **AI:** [Calls `create_fanflet` with similar structure, then `add_library_resource_to_fanflet` for each shared library resource]
>
> I've created a new fanflet "ADA Annual Meeting 2026" based on your Southwest Dental setup. I carried over 3 resources from your library:
> 1. Clinical Protocol PDF
> 2. Practice Website link
> 3. CE Credit Form (you'll want to update the URL)
>
> The event date is not set yet. What date is your ADA talk?

### 6.3 Pro Tier -- Sponsor

**Example 1: Checking lead attribution**

> **Sponsor:** "How many leads did our resources generate last month?"
>
> **AI:** [Calls `get_sponsor_leads` with date range]
>
> Your sponsor resources generated 23 attributed leads in February 2026 across 4 connected speakers:
> - Dr. Sarah Mitchell (Southwest Dental): 12 leads
> - Dr. James Chen (Pacific Dental Summit): 7 leads
> - Dr. Emily Wong (Northeast Conference): 3 leads
> - Dr. Robert Kim (Texas Dental Forum): 1 lead
>
> Top-performing resource: "Q1 Product Brochure" with 14 of the 23 leads.

**Example 2: Resource management**

> **Sponsor:** "Our Q1 promotion is over. Retire that brochure and create a new one for Q2 with the URL https://apexdental.com/q2-whitepaper."
>
> **AI:** [Calls `update_resource_status` to retire Q1 resource, then `create_sponsor_resource` for Q2]
>
> Done. I've:
> 1. Retired "Q1 Product Brochure" -- any fanflets displaying it will now show "This content is no longer available"
> 2. Created "Q2 Whitepaper" as a new active link resource
>
> The Q2 Whitepaper is now available for connected speakers to add to their fanflets. Would you like to notify your connected speakers about the new resource?

### 6.4 Enterprise Tier -- Sponsor

**Example 1: Monthly engagement report**

> **Sponsor:** "Generate our monthly engagement report for February."
>
> **AI:** [Calls `generate_engagement_report` with date range]
>
> Here's your February 2026 Engagement Report:
>
> **Summary:**
> - Active connections: 8 speakers
> - Resources displayed: 12 across 15 fanflets
> - Total impressions (page views on fanflets with your resources): 1,247
> - Resource clicks: 189 (15.2% CTR)
> - Attributed leads: 23
> - Cost per lead (based on your plan): $4.35
>
> **Top speakers by engagement:**
> | Speaker | Fanflets | Impressions | Clicks | Leads |
> |---------|----------|-------------|--------|-------|
> | Dr. Sarah Mitchell | 3 | 456 | 72 | 12 |
> | Dr. James Chen | 2 | 312 | 48 | 7 |
> | Dr. Emily Wong | 1 | 189 | 31 | 3 |
>
> **Resource performance:**
> | Resource | Type | Placements | Clicks | CTR |
> |----------|------|------------|--------|-----|
> | Q1 Product Brochure | Link | 8 | 98 | 18.2% |
> | CE Accreditation Guide | File | 6 | 67 | 12.4% |
> | Booth Video | Link | 3 | 24 | 9.1% |
>
> Would you like me to export this as a CSV or PDF?

---

## 7. Competitive Advantage

### 7.1 Market Positioning

None of Fanflet's direct competitors (Talkadot, Linktree, SpeakerHub) offer MCP integration. This creates a window of opportunity to establish Fanflet as the "AI-native speaker platform."

**For speakers already using AI tools:**
"You already use Claude/ChatGPT to draft talks, create outlines, and prepare materials. Now your AI can also set up your post-talk resource page, track engagement, and draft follow-ups -- all in the same conversation. No tab-switching, no dashboard-hunting."

**For sponsors looking for modern engagement:**
"Your competitors are still emailing PDFs to speakers and hoping they get shared. With Fanflet's MCP integration, your marketing team can manage sponsor resources, track attribution, and pull engagement reports through the AI tools they already use. It's programmatic sponsorship activation."

**For the broader 'agentic platforms' trend:**
"Every SaaS tool will eventually need to be AI-accessible. Fanflet is building that layer now, not retrofitting it later. When conference organizers evaluate platforms, MCP compatibility signals that Fanflet is built for how people will work in 2027, not how they worked in 2023."

### 7.2 Competitive Moat Analysis

| Dimension | Fanflet + MCP | Talkadot | Linktree | SpeakerHub |
|-----------|---------------|----------|----------|------------|
| AI-native management | Full MCP server | None | None | None |
| Voice/chat creation | "Create a fanflet for..." | Manual form | Manual form | Manual form |
| Analytics via AI | Natural language queries | Dashboard only | Basic stats | N/A |
| Sponsor integration | AI-managed resource lifecycle | N/A | N/A | N/A |
| Multi-tool orchestration | Combine with calendar, email, CRM | Siloed | Siloed | Siloed |

### 7.3 The Network Effect

MCP creates a flywheel:
1. Speaker connects Fanflet to their AI client
2. AI can now combine Fanflet data with their calendar, email, CRM
3. Speaker creates fanflets faster, adds more resources, engages more
4. More engagement data makes analytics features more valuable
5. Speaker upgrades to Pro for analytics
6. Sponsors see higher engagement, invest more in the platform
7. More sponsors make the platform more valuable for speakers

---

## 8. Technical Architecture

### 8.1 Transport & Hosting

The MCP server will be a **remote HTTP server** using the Streamable HTTP transport (recommended by the MCP spec for production remote servers). It will be deployed as a separate service from the main Next.js app to ensure clean separation of concerns.

```
                     MCP Client (Claude, ChatGPT, etc.)
                              |
                              | HTTPS + OAuth 2.1 + PKCE
                              v
                    +-----------------------+
                    | mcp.fanflet.com       |
                    | (MCP Server)          |
                    | - TypeScript SDK      |
                    | - Streamable HTTP     |
                    | - Tool definitions    |
                    | - Auth middleware      |
                    +-----------------------+
                              |
                              | Supabase client (user-scoped)
                              v
                    +-----------------------+
                    | Supabase              |
                    | - PostgreSQL + RLS    |
                    | - Auth (JWT verify)   |
                    | - Storage             |
                    +-----------------------+
```

### 8.2 Authentication Flow

The MCP server will act as both an OAuth authorization server (for MCP clients) and a resource server (validating Supabase JWTs):

1. MCP client connects to `https://mcp.fanflet.com`
2. Server responds with `401` and Protected Resource Metadata pointing to `https://mcp.fanflet.com/.well-known/oauth-authorization-server`
3. Client initiates OAuth 2.1 + PKCE flow
4. User authenticates via Supabase Auth (same login as web app)
5. MCP server issues access token (wrapping Supabase session)
6. Subsequent tool calls include the access token; server creates a user-scoped Supabase client
7. RLS policies enforce data isolation (same as the web app)

**Key security property:** The MCP server never uses the service role key for user-initiated operations. Every query goes through RLS, exactly like the web dashboard.

### 8.3 Entitlement Enforcement

Every tool call follows this pattern:

```
Tool invoked
    |
    v
Authenticate user (OAuth token -> Supabase session)
    |
    v
Resolve speaker/sponsor identity
    |
    v
Check entitlement (getSpeakerEntitlements / getSponsorEntitlements)
    |
    v
[If gated feature and user lacks entitlement]
    Return structured error:
    {
      "error": "upgrade_required",
      "feature": "click_through_analytics",
      "current_plan": "free",
      "required_plan": "pro",
      "message": "Resource click rankings require Pro. Upgrade at fanflet.com/dashboard/settings."
    }
    |
[If entitled]
    Execute tool logic
    |
    v
Return structured result
```

This reuses the existing `getSpeakerEntitlements()` and the `feature_flags` / `plan_features` tables. No new entitlement infrastructure needed.

### 8.4 Deployment Options

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Vercel Edge Function** | Same infra, easy deploy | Cold starts, 30s timeout, no persistent connections | Phase 1 (MVP) |
| **Cloudflare Workers** | Low latency, MCP gateway support, OAuth built-in | Separate infra | Phase 2+ |
| **Standalone Node.js** (Railway/Fly) | Full control, no timeouts | Separate deploy pipeline | If needed |

**Phase 1 recommendation:** Deploy as a Vercel serverless function at `api/mcp/` within the existing web app. This avoids new infrastructure while validating the approach. Move to dedicated service when traffic justifies it.

### 8.5 Monorepo Integration

```
packages/
  mcp/                      # NEW: MCP server package
    src/
      server.ts              # McpServer setup and transport
      auth.ts                # OAuth provider + Supabase session bridge
      tools/
        speaker/
          fanflets.ts        # create, list, get, update, publish, unpublish
          resources.ts       # library CRUD, block management
          subscribers.ts     # list, count, export
          analytics.ts       # fanflet stats, resource rankings
          profile.ts         # get/update profile, theme, settings
          connections.ts     # sponsor connection management
        sponsor/
          profile.ts         # get/update sponsor profile
          resources.ts       # CRUD, lifecycle management
          connections.ts     # send/accept/decline requests
          analytics.ts       # leads, attribution, engagement
          reports.ts         # monthly reports, cross-speaker analytics
      resources/             # MCP resources (read-only data)
        speaker-resources.ts # fanflet URIs, profile data
        sponsor-resources.ts # resource catalog, connection list
      prompts/               # MCP prompt templates
        email-drafts.ts      # subscriber follow-up templates
        report-templates.ts  # engagement report templates
      middleware/
        entitlements.ts      # plan-gated tool wrapper
        rate-limit.ts        # per-user rate limiting
        audit.ts             # tool call logging (reuses impersonation audit infra)
    package.json
    tsconfig.json
```

### 8.6 Shared Code Reuse

The MCP server will import directly from existing packages:

- `@fanflet/db` -- Supabase clients, `getSpeakerEntitlements()`, `getSponsorEntitlements()`
- `@fanflet/types` -- Database types (fully generated from Supabase schema)
- `@fanflet/db/config` -- `getSiteUrl()` and environment config

Much of the business logic in the existing server actions (e.g., `addResourceBlock`, `publishFanflet`) can be extracted into shared functions that both the Next.js server actions and MCP tools call. This avoids duplicating validation, entitlement checks, and error handling.

---

## 9. Phased Rollout

### Phase 1: MVP -- Read-Only + Basic Management (4-6 weeks)

**Goal:** Prove the concept. Let speakers manage fanflets via AI.

**Scope:**
- MCP server infrastructure (TypeScript SDK, Streamable HTTP transport)
- OAuth 2.1 authentication bridge to Supabase Auth
- Entitlement enforcement middleware

**Speaker tools (10 tools):**
- `list_fanflets` -- list all speaker's fanflets with status
- `get_fanflet` -- get fanflet details including resource blocks
- `get_speaker_profile` -- view speaker profile
- `get_plan_info` -- check current plan and limits
- `get_subscriber_count` -- total and per-fanflet subscriber counts
- `create_fanflet` -- create new fanflet (with entitlement limit check)
- `publish_fanflet` / `unpublish_fanflet` -- toggle fanflet status
- `add_resource_block` -- add a link, text, or sponsor block
- `delete_resource_block` -- remove a block

**No sponsor tools in Phase 1** (sponsor portal UI is not yet built).

**Deliverables:**
- Working MCP server deployed on Vercel
- OAuth flow tested with Claude Desktop
- 10 speaker tools with entitlement gating
- Integration test suite

**Complexity:** Medium
**Business Value:** High -- validates the concept, creates demo material, early adopter feedback

**Go/No-Go Gate:** At least 3 speakers successfully connect and create a fanflet via AI agent. User feedback is positive on workflow improvement.

---

### Phase 2: Core -- Content Library, Analytics, Subscribers (4-6 weeks)

**Goal:** Make the MCP server genuinely useful for daily speaker workflow.

**Scope -- additional speaker tools (10 tools):**
- `list_library_resources` -- browse resource library
- `create_library_resource` -- add to library
- `update_library_resource` -- edit library items
- `delete_library_resource` -- remove from library
- `add_library_resource_to_fanflet` -- link library item to fanflet
- `update_fanflet_details` -- edit title, event name, date, theme, expiration
- `reorder_block` -- move blocks up/down
- `get_fanflet_analytics` -- page views, signups, QR scans (Pro-gated)
- `get_resource_rankings` -- top resources by clicks (Pro-gated)
- `list_subscribers` -- full subscriber list with filtering

**MCP Resources:**
- `fanflet://{id}` -- structured fanflet data for AI context
- `speaker://profile` -- speaker profile data

**MCP Prompts:**
- `draft_subscriber_email` -- template for follow-up emails

**Complexity:** Medium
**Business Value:** High -- completes the speaker experience, analytics gating drives upgrades

**Go/No-Go Gate:** MCP-originated fanflet creations represent >10% of new fanflets. At least one upgrade triggered by analytics gating.

---

### Phase 3: Sponsor Portal + Advanced Features (6-8 weeks)

**Goal:** Bring sponsors into the MCP ecosystem. Add enterprise-grade features.

**Prerequisites:** Sponsor portal UI must be live (or at least sponsor auth and resource management).

**Scope -- sponsor tools (12 tools):**
- `get_sponsor_profile` / `update_sponsor_profile`
- `list_sponsor_resources` / `create_sponsor_resource` / `update_sponsor_resource` / `update_resource_status`
- `list_sponsor_connections` / `send_connection_request` / `respond_to_connection`
- `get_resource_placements` -- where resources appear (Pro-gated)
- `get_sponsor_leads` -- lead attribution (Pro-gated)
- `get_sponsor_resource_analytics` -- click data (Pro-gated)

**Additional speaker tools:**
- `update_speaker_profile` -- full profile management
- `get_subscriber_growth` -- growth trends (Pro-gated)
- `export_subscribers_csv` -- CSV export
- `get_qr_scan_stats` -- QR analytics

**Complexity:** High (new user type, new entitlement model)
**Business Value:** High -- opens sponsor revenue stream through MCP

**Go/No-Go Gate:** At least 2 sponsors connect via MCP. Lead attribution data flowing.

---

### Phase 4: Ecosystem -- Enterprise, Bulk Ops, Integrations (8-12 weeks)

**Goal:** Enterprise readiness and ecosystem expansion.

**Scope:**
- Bulk operations: `bulk_update_resources`, `bulk_update_resource_status`
- Report generation: `generate_engagement_report` (structured data for sponsor QBRs)
- Cross-speaker analytics: `get_cross_speaker_analytics`
- Webhook subscriptions: MCP notifications for new subscribers, resource clicks, connection requests
- Rate limiting and usage metering per plan tier
- Audit logging and compliance reporting

**Ecosystem integrations (future):**
- Calendar MCP integration (auto-create fanflets from speaking engagements)
- Email MCP integration (send subscriber emails directly)
- CRM MCP integration (sync leads to HubSpot/Salesforce)

**Complexity:** Very High
**Business Value:** Very High -- enterprise contracts, stickiness

**Go/No-Go Gate:** Enterprise pilot with at least one conference organization or speaker bureau.

---

### Phase Summary

| Phase | Timeline | Tools | Complexity | Business Value | Key Metric |
|-------|----------|-------|------------|----------------|------------|
| 1: MVP | 4-6 weeks | 10 | Medium | High | 3+ speakers connected |
| 2: Core | 4-6 weeks | +10 (20 total) | Medium | High | >10% fanflets via MCP |
| 3: Sponsors | 6-8 weeks | +16 (36 total) | High | High | 2+ sponsors connected |
| 4: Enterprise | 8-12 weeks | +8 (44 total) | Very High | Very High | Enterprise pilot |

**Total estimated timeline:** 22-32 weeks (5-8 months) for full rollout.

---

## 10. Risks & Mitigations

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| MCP spec changes (v2 breaking changes) | Medium | High | Pin to stable v1.x. SDK handles backward compat. Monitor spec repo. |
| OAuth complexity with Supabase Auth bridge | Medium | Medium | Start with simplified auth (API key) for beta, migrate to full OAuth. Cloudflare's MCP auth library handles edge cases. |
| Vercel serverless cold starts affecting UX | Medium | Low | MCP clients handle latency gracefully. Move to Cloudflare Workers if needed. |
| Tool sprawl making maintenance burdensome | Low | Medium | Shared business logic layer. Tools are thin wrappers over existing server actions. |

### Business Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Low adoption (speakers don't use AI agents) | Medium | High | Target early-adopter speakers. Healthcare KOLs trend tech-forward. Track adoption funnel. |
| Cannibalization of web dashboard engagement | Low | Low | MCP users are incremental (they'd otherwise not engage). Dashboard remains primary for complex tasks like file uploads. |
| Competitors copy the approach | Low | Medium | First-mover advantage + deep integration with sponsor portal. Protocol layer is defensible only if combined with product depth. |
| Security incident via MCP | Low | Very High | RLS enforcement identical to web app. OAuth token scoping. Rate limiting. Audit logging. No service role in user paths. |

### Regulatory Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Healthcare data handling via AI agents | Medium | High | Fanflet handles engagement data, not PHI. Clear data classification. Privacy policy update for MCP access. |
| EU AI Act compliance for agentic features | Low | Medium | Fanflet is a tool provider, not an AI provider. Document MCP as a transport layer, not an AI system. |

---

## 11. Success Metrics

### Phase 1 Metrics (MVP)

- **Adoption:** Number of speakers who connect MCP server to an AI client
- **Activation:** % of connected speakers who create at least one fanflet via MCP
- **Retention:** Weekly active MCP users (at least one tool call per week)
- **Quality:** Error rate on MCP tool calls < 2%

### Phase 2 Metrics (Core)

- **Channel mix:** % of total fanflet creations via MCP vs. web dashboard
- **Upgrade conversion:** Number of Pro upgrades attributed to MCP analytics gating
- **Engagement depth:** Average tool calls per session
- **Time to value:** Time from "speaker has idea" to "published fanflet" (target: < 2 minutes via MCP)

### Phase 3 Metrics (Sponsors)

- **Sponsor adoption:** Number of sponsors connected via MCP
- **Lead attribution:** Volume of sponsor leads captured through MCP-managed resources
- **Revenue impact:** Incremental sponsor plan upgrades attributed to MCP features

### Phase 4 Metrics (Enterprise)

- **Enterprise pipeline:** Number of enterprise prospects citing MCP as evaluation criteria
- **Contract value:** Average deal size for MCP-enabled enterprise contracts
- **Platform stickiness:** Churn rate for MCP-connected accounts vs. web-only accounts

---

## Appendix: MCP Tool Inventory

### Speaker Tools (Complete List)

| Tool | Category | Phase | Plan Gate | Description |
|------|----------|-------|-----------|-------------|
| `list_fanflets` | Read | 1 | None | List all speaker fanflets with status, dates, resource count |
| `get_fanflet` | Read | 1 | None | Get full fanflet details including all resource blocks |
| `get_speaker_profile` | Read | 1 | None | View speaker profile (name, bio, slug, photo, social links) |
| `get_plan_info` | Read | 1 | None | Current plan, limits, available features |
| `get_subscriber_count` | Read | 1 | None | Total and per-fanflet subscriber counts |
| `create_fanflet` | Write | 1 | Limit check | Create a new fanflet with title, event, date |
| `publish_fanflet` | Write | 1 | None | Set fanflet status to published |
| `unpublish_fanflet` | Write | 1 | None | Set fanflet status to draft |
| `add_resource_block` | Write | 1 | Limit check | Add link/text/sponsor block to a fanflet |
| `delete_resource_block` | Write | 1 | None | Remove a block from a fanflet |
| `list_library_resources` | Read | 2 | None | Browse resource library with usage stats |
| `create_library_resource` | Write | 2 | None | Add a new resource to the library |
| `update_library_resource` | Write | 2 | None | Edit a library resource |
| `delete_library_resource` | Write | 2 | None | Remove from library (with linked block handling) |
| `add_library_resource_to_fanflet` | Write | 2 | None | Link a library item to a fanflet (static or dynamic) |
| `update_fanflet_details` | Write | 2 | Theme/expiration gated | Edit title, event, date, theme, expiration |
| `reorder_block` | Write | 2 | None | Move a block up or down |
| `get_fanflet_analytics` | Read | 2 | Pro | Page views, signups, QR scans, trends |
| `get_resource_rankings` | Read | 2 | Pro | Resources ranked by click count |
| `list_subscribers` | Read | 2 | None | Full subscriber list with source fanflet |
| `update_speaker_profile` | Write | 3 | Theme gated | Update name, bio, slug, social links, theme |
| `get_subscriber_growth` | Read | 3 | Pro | Subscriber growth over time |
| `export_subscribers_csv` | Read | 3 | None | Export subscriber data as CSV |
| `get_qr_scan_stats` | Read | 3 | Pro | QR scan analytics per fanflet |
| `draft_subscriber_email` | Prompt | 2 | None | Generate follow-up email draft |

### Sponsor Tools (Complete List)

| Tool | Category | Phase | Plan Gate | Description |
|------|----------|-------|-----------|-------------|
| `get_sponsor_profile` | Read | 3 | None | View sponsor account details |
| `update_sponsor_profile` | Write | 3 | None | Update company name, logo, description |
| `list_sponsor_resources` | Read | 3 | None | List all sponsor resources with status |
| `create_sponsor_resource` | Write | 3 | Limit check | Create a new sponsor resource |
| `update_sponsor_resource` | Write | 3 | None | Edit resource title, URL, CTA |
| `update_resource_status` | Write | 3 | None | Pause, activate, or retire a resource |
| `list_sponsor_connections` | Read | 3 | None | View all connections with status |
| `send_connection_request` | Write | 3 | Limit check | Request connection with a speaker |
| `respond_to_connection` | Write | 3 | None | Accept or decline a connection request |
| `browse_speakers` | Read | 3 | None | Search verified speakers by industry |
| `get_resource_placements` | Read | 3 | Pro | Which fanflets display each resource |
| `get_sponsor_leads` | Read | 3 | Pro | Lead attribution data |
| `get_sponsor_resource_analytics` | Read | 3 | Pro | Click and engagement data per resource |
| `get_speaker_engagement_metrics` | Read | 4 | Enterprise | Per-speaker engagement breakdown |
| `generate_engagement_report` | Read | 4 | Enterprise | Structured monthly report |
| `get_cross_speaker_analytics` | Read | 4 | Enterprise | Comparative analytics across speakers |
| `bulk_update_resources` | Write | 4 | Enterprise | Update multiple resources at once |
| `bulk_update_resource_status` | Write | 4 | Enterprise | Mass pause/retire operations |

---

## References

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) -- Official SDK for building MCP servers
- [MCP Specification (2025-11-25)](https://modelcontextprotocol.io/specification/2025-11-25) -- Protocol specification
- [MCP Authorization Tutorial](https://modelcontextprotocol.io/docs/tutorials/security/authorization) -- OAuth 2.1 + PKCE implementation guide
- [MCP OAuth Security Considerations](https://www.obsidiansecurity.com/blog/when-mcp-meets-oauth-common-pitfalls-leading-to-one-click-account-takeover) -- Security pitfalls to avoid
- [Cloudflare MCP Auth](https://developers.cloudflare.com/agents/model-context-protocol/authorization/) -- Reference implementation for MCP OAuth
- [Remote MCP Server with Auth (Template)](https://github.com/coleam00/remote-mcp-server-with-auth) -- GitHub OAuth template for remote MCP
- [MCP Server Economics](https://zeo.org/resources/blog/mcp-server-economics-tco-analysis-business-models-roi) -- TCO analysis and business models

---

*This document is a living PRD. Update as the MCP specification evolves and as user feedback from Phase 1 informs subsequent phases.*
