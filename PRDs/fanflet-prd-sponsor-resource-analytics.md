# PRD: Sponsor Portal — Resource-Level Analytics

**Version:** 0.1  
**Date:** March 2026  
**Status:** Draft — Ready for external edit  
**Source:** [SPONSOR_ENGAGEMENT_STRATEGY.md](SPONSOR_ENGAGEMENT_STRATEGY.md), [SPONSOR_PORTAL_ARCHITECTURE.md](SPONSOR_PORTAL_ARCHITECTURE.md), [fanflet-prd-sponsor-engagement.md](fanflet-prd-sponsor-engagement.md)

This PRD defines **resource-level analytics** for the sponsor portal: per-resource and per-placement performance (clicks, leads) so sponsors see which content and which speakers drive engagement. It extends the existing sponsor dashboard, which today shows only aggregate totals (connections, total leads, total clicks).

---

## 1. Problem Statement

Sponsors on Fanflet can see aggregate metrics on their dashboard (active connections, total leads, total clicks) but cannot answer: *Which of my resources get the most engagement? Which speakers or fanflets drive the most clicks and leads?* Without this, sponsors cannot optimize content, justify spend to their marketing teams, or compare performance across placements. The core value proposition — "Know exactly which attendees engaged with your content — and how" — remains only partially delivered at the aggregate level.

**Who experiences this:** Sponsors (dental suppliers, tech vendors, etc.) who have connected with speakers and have content (resource blocks) tagged with their sponsor account on fanflets.

**Cost of not solving:** Sponsors under-value the platform; renewal and upsell to Pro/Enterprise analytics tiers are harder. Speakers have less leverage to sell sponsor placements when sponsors cannot see per-resource or per-speaker breakdown.

**Evidence:** Strategy and architecture docs call out "per-resource view" and "cross-speaker analytics" (Phase B/Phase 5). Feature flags `sponsor_resource_analytics` and `sponsor_lead_analytics` already exist and are assigned to Sponsor Pro/Enterprise; the UI to consume this data is missing.

---

## 2. Goals

**User goals**

- As a **sponsor**, I want to see performance (clicks, leads) per piece of content (resource) so that I know which assets resonate with audiences.
- As a **sponsor**, I want to see which speakers and fanflets drive the most engagement so that I can prioritize partnerships and content placement.
- As a **sponsor**, I want this view in my existing dashboard (or a clear path to it) so that I don’t depend on speakers to send reports.

**Business goals**

- Differentiate Sponsor Pro/Enterprise with analytics as the core value prop.
- Increase sponsor retention and upgrade from Free by making "see your content performance" a clear benefit.
- Align implementation with existing PRD (B3: per-fanflet or per-speaker breakdown) and architecture (Phase 5: sponsor dashboard with cross-speaker analytics).

**Success looks like:** Within 30 days of launch, sponsors on Pro/Enterprise can view a resource-level performance table; at least one sponsor uses it to compare content or speakers; Free-tier sponsors see a clear upgrade CTA for analytics.

---

## 3. Non-Goals

| Non-Goal | Why out of scope |
|----------|------------------|
| Clicks-over-time charts or trend analytics | Can be a follow-up (e.g. dedicated `/sponsor/analytics` page). This PRD focuses on a snapshot table. |
| Lead scoring or engagement quality metrics | Phase C in strategy; v1 is counts only. |
| Per-resource editing or content CRUD by sponsor | Out of scope; resources are speaker-managed or from sponsor_resources; this PRD is read-only analytics. |
| Real-time or live-updating dashboard | Snapshot on page load is sufficient for v1. |
| CRM push or automated exports | CSV export of the resource table can be P1/P2; not required for initial ship. |

---

## 4. User Stories

### Sponsor

- As a **sponsor**, I want to open my dashboard and see a "Content performance" (or "Resource analytics") section so that I don’t have to hunt for analytics.
- As a **sponsor**, I want each row to show resource title, speaker, fanflet, clicks, and leads so that I can compare placements at a glance.
- As a **sponsor**, I want to filter or sort by speaker or fanflet (optional) so that I can focus on specific partnerships or events.
- As a **sponsor** on Free tier, I want to see that analytics are available on upgrade so that I understand the value of Pro/Enterprise.
- As a **sponsor** with no placements yet, I want a clear empty state so that I know the table will populate when speakers add my content.

---

## 5. Requirements

### 5.1 Data and scoping

| ID | Requirement | Priority | Notes |
|----|-------------|----------|--------|
| D1 | Load all resource blocks where `resource_blocks.sponsor_account_id` = current sponsor and (if sponsor has `demo_environment_id`) restrict to fanflets whose speaker is in that demo environment. | P0 | Same scoping as existing dashboard counts. |
| D2 | For each such block, resolve fanflet (title) and speaker (name) via fanflets and speakers tables. | P0 | Required for table columns. |
| D3 | Count `analytics_events` rows with `event_type = 'resource_click'` and `resource_block_id` in the block set; aggregate per `resource_block_id`. | P0 | Clicks per resource. |
| D4 | Count `sponsor_leads` rows for current sponsor and `resource_block_id` in the block set (or match by resource_title if block id null); aggregate per block. | P0 | Leads per resource. |
| D5 | Return a list of rows: resource_block_id, title, block_type, fanflet_id, fanflet_title, speaker_id, speaker_name, clicks, leads; sort e.g. by clicks descending, then by speaker/fanflet. | P0 | Shape for UI. |

### 5.2 Sponsor dashboard UI

| ID | Requirement | Priority | Notes |
|----|-------------|----------|--------|
| U1 | Add a "Content performance" (or "Resource analytics") section to `/sponsor/dashboard` below the existing metric cards and quick links. | P0 | |
| U2 | If sponsor has no blocks tagged with their account (after demo scoping), show empty state: e.g. "No content is linked to your sponsor account yet. When speakers add your resources to their fanflets, you'll see clicks and leads here." | P0 | |
| U3 | If sponsor has blocks, render a table with columns: Resource (title), Speaker, Fanflet, Clicks, Leads. Use block title; fallback to "Untitled" or block type if title missing. | P0 | |
| U4 | Optional: filter dropdown by Speaker and/or Fanflet to narrow the list. | P1 | |
| U5 | Optional: Export CSV of the resource performance table. | P1 | |

### 5.3 Entitlement gating

| ID | Requirement | Priority | Notes |
|----|-------------|----------|--------|
| E1 | Use `getSponsorEntitlements(sponsorId)` (from `@fanflet/db` or equivalent) on the sponsor dashboard page. | P0 | |
| E2 | If sponsor does **not** have feature `sponsor_resource_analytics`, do not show the resource-level table; show a single card or message: e.g. "Upgrade to Pro to see per-resource analytics and which content drives engagement" with link to settings/upgrade. | P0 | Pro/Enterprise only for full table. |
| E3 | Optionally gate the "Leads" column behind `sponsor_lead_analytics` so Free sees only clicks in a teaser (if product chooses); otherwise same as E2. | P2 | Product decision. |

### 5.4 Demo environment

| ID | Requirement | Priority | Notes |
|----|-------------|----------|--------|
| M1 | When sponsor has `demo_environment_id` set, restrict resource_blocks to those whose fanflet belongs to a speaker in that demo environment; restrict analytics_events and sponsor_leads counts to the same fanflet set. | P0 | Matches existing dashboard behavior. |

---

## 6. Data Model (no schema changes)

This feature uses existing tables only.

- **resource_blocks**: `id`, `fanflet_id`, `sponsor_account_id`, `title`, `block_type`, …  
  Blocks with `sponsor_account_id` = sponsor are the "resources" in scope.
- **analytics_events**: `event_type = 'resource_click'`, `resource_block_id`, `fanflet_id`.  
  Count per `resource_block_id` for blocks in scope.
- **sponsor_leads**: `sponsor_id`, `fanflet_id`, `resource_block_id`, `resource_title`, `engagement_type`.  
  Count per `resource_block_id` (or by resource_title if needed for legacy rows with null block id).
- **fanflets**: `id`, `title`, `speaker_id`.
- **speakers**: `id`, `name`, `demo_environment_id` (for demo scoping).

Feature flags (already exist): `sponsor_resource_analytics`, `sponsor_lead_analytics` — assigned to Sponsor Pro/Enterprise in `sponsor_plan_features`.

---

## 7. Implementation Notes

### 7.1 Files to add or change

- **Sponsor dashboard page**  
  `apps/web/app/(sponsor)/sponsor/(dashboard)/dashboard/page.tsx`  
  Load entitlements; run queries for resource_blocks (with fanflet/speaker join), analytics_events counts, sponsor_leads counts; pass data to Content performance section. Apply demo_environment_id scoping same as existing connection/lead/click logic.

- **New component**  
  e.g. `apps/web/app/(sponsor)/sponsor/(dashboard)/dashboard/content-performance-section.tsx` (or `resource-analytics-table.tsx`).  
  Receives list of rows; renders table (Resource, Speaker, Fanflet, Clicks, Leads); empty state when list empty; when gated, render upgrade CTA instead of table.

- **Sidebar / nav**  
  No change required if the section lives only on the dashboard. Optional later: add "Analytics" nav item linking to a dedicated `/sponsor/analytics` page.

### 7.2 Query strategy

- Fetch blocks for sponsor (with demo scope) and join fanflets + speakers in one or two queries.
- Fetch click counts: e.g. `analytics_events` filtered by `event_type = 'resource_click'` and `resource_block_id in (block ids)`, then aggregate in application or via group-by in DB.
- Fetch lead counts: `sponsor_leads` where `sponsor_id` = sponsor and `resource_block_id in (block ids)` (and fanflet in demo set if applicable), then aggregate per resource_block_id.
- Assemble rows and sort (e.g. clicks desc, then speaker name, fanflet title).

### 7.3 Edge cases

- **Block with no title:** Display "Untitled" or humanized block_type (e.g. "Link", "File").
- **Lead with null resource_block_id:** If sponsor_leads has rows with only resource_title, consider grouping by resource_title for lead count when block id is null; or show in a separate "Legacy leads" row if needed.
- **Demo environment:** If sponsor has demo_environment_id, all block and event/lead queries must be limited to fanflets whose speaker has that demo_environment_id.

---

## 8. Success Metrics

### Leading (first 2–4 weeks)

- **Sponsor Pro/Enterprise with placements:** % who load the dashboard and see the Content performance section (i.e. section is rendered and has at least one row when they have blocks).
- **Free-tier sponsors with placements:** % who see the upgrade CTA for analytics (no table shown).

### Lagging (1–3 months)

- **Sponsor engagement:** Number of sponsors (Pro/Enterprise) who view the dashboard at least once per week after launch.
- **Upgrade attribution:** Number of Free-tier sponsors who upgrade to Pro/Enterprise after seeing the analytics CTA (if trackable).

### Measurement

- Dashboard page views and component render (with or without table) can be instrumented if needed.
- Feature flag usage: sponsor_resource_analytics already gates plan; no new flag required.

---

## 9. Open Questions

| Question | Owner | Blocking? | Notes |
|----------|--------|-----------|--------|
| Exact section title: "Content performance" vs "Resource analytics" vs "Placement performance" | Product | No | Pick one for consistency. |
| Should Free tier see a teaser (e.g. "3 resources placed — upgrade to see performance") or only a generic CTA? | Product | No | Affects conversion vs clarity. |
| CSV export of resource table in v1 or follow-up? | Product | No | P1 in this PRD. |
| Separate gating for "Leads" column (sponsor_lead_analytics) so Free sees clicks but not lead counts? | Product | No | P2 optional. |
| Dedicated `/sponsor/analytics` page with charts in v1 or later? | Product | No | This PRD keeps everything on dashboard. |

---

## 10. Timeline Considerations

- **Implementation:** ~1–2 weeks for data layer + dashboard section + entitlement gating + empty state and CTA. Depends on no new migrations; all data exists.
- **Dependencies:** None. Optional: design review for table layout and upgrade CTA copy.
- **Phasing:** Can ship behind existing `sponsor_resource_analytics` flag; no new feature flag required. Demo environment logic already exists on dashboard.

---

## 11. References

- [SPONSOR_ENGAGEMENT_STRATEGY.md](SPONSOR_ENGAGEMENT_STRATEGY.md) — Phase B: per-resource and per-speaker view.
- [SPONSOR_PORTAL_ARCHITECTURE.md](SPONSOR_PORTAL_ARCHITECTURE.md) — Phase 5: sponsor dashboard with cross-speaker analytics; analytics_events for resource clicks.
- [fanflet-prd-sponsor-engagement.md](fanflet-prd-sponsor-engagement.md) — B3: sponsor dashboard with per-fanflet or per-speaker breakdown.
- [supabase/migrations/20260313100000_sponsor_plan_features.sql](../../supabase/migrations/20260313100000_sponsor_plan_features.sql) — Feature flags `sponsor_resource_analytics`, `sponsor_lead_analytics`, `sponsor_cross_speaker_analytics`.
- [packages/db/src/sponsor-features.ts](../../packages/db/src/sponsor-features.ts) — `loadSponsorEntitlements` / `getSponsorEntitlements`.
- [apps/web/app/(sponsor)/sponsor/(dashboard)/dashboard/page.tsx](../../apps/web/app/(sponsor)/sponsor/(dashboard)/dashboard/page.tsx) — Current sponsor dashboard (aggregate metrics only).
- [apps/web/app/dashboard/fanflets/[id]/sponsors/page.tsx](../../apps/web/app/dashboard/fanflets/[id]/sponsors/page.tsx) — Speaker-side sponsor report (per-block clicks, per-sponsor breakdown); similar aggregation pattern for sponsor view.
