# PRD: Sponsor Content Hub
**Version:** 1.1 — Draft  
**Date:** March 2026  
**Author:** Brian (Product) / Claude (Documentation)  
**Status:** Draft for Review  
**Supersedes:** `fanflet-prd-sponsor-resource-analytics.md` (v0.1)

---

## 1. Overview & Strategic Context

### What This Feature Does

The Sponsor Content Hub is a three-phase expansion of the Sponsor Portal that transforms Fanflet from a passive analytics viewer into an active content and campaign management platform for sponsors. It gives sponsors:

1. **Resource-level analytics** — per-content and per-speaker performance (clicks, engagement rate, leads) across all fanflet placements, gated by plan tier.
2. **A sponsor-owned resource library** — sponsors upload and manage their own content assets (product sheets, videos, one-pagers, brand materials), which connected KOLs can discover and pull into their fanflets from a sponsor catalog.
3. **Campaign management** — a lightweight campaign layer that groups KOLs, resources, and a time window into a named campaign, enabling rollup analytics and a natural bridge to CRM and marketing automation integrations.

### Why It Matters

Today, sponsors on Fanflet can see aggregate metrics — total connections, total clicks, total leads — but cannot answer the questions that drive marketing investment decisions:

- *Which of my content assets actually resonates with audiences?*
- *Which KOLs are delivering ROI and which aren't?*
- *How do I get my content in front of more audiences without manually coordinating with each speaker?*
- *How do I tie my Fanflet activity back to a campaign in HubSpot or Salesforce?*

Without answers to these questions, Fanflet is a reporting tool. With them, it becomes a channel sponsors actively invest in and renew.

### Strategic Significance

This feature connects three existing Fanflet systems into a coherent sponsor-side product:

- **The KOL resource library** (Content Resource Library PRD) — already built for speakers. The sponsor resource library is a parallel, sponsor-owned system with a distinct catalog and distribution model.
- **The analytics infrastructure** (`analytics_events`, `sponsor_leads` tables) — already capturing the data. This PRD builds the interface to consume it meaningfully.
- **The CRM integrations layer** (Sponsor Portal CRM & Marketing Platform Integrations PRD) — already designed for HubSpot, Salesforce, Mailchimp, Marketo, and LinkedIn. Campaigns provide the unit of data those integrations are meant to sync.

### Build Priority & Phasing

| Phase | Feature | Demo Relevance | Schema Changes |
|-------|---------|----------------|----------------|
| **1** | Resource-level analytics (enhanced) | Primary demo anchor | None |
| **2** | Sponsor resource library | Differentiated value prop | New table + storage bucket |
| **3** | Campaign management | CRM integration bridge | New table |

---

## 2. User Stories

### Sponsor (All Phases)

- **As a sponsor**, I want to see which of my content assets get the most clicks and leads across all my connected KOLs, so I know what to invest in and what to retire.
- **As a sponsor**, I want to compare KOL performance side-by-side, so I can prioritize my best-performing partnerships at renewal time.
- **As a sponsor**, I want to upload my own content into Fanflet and make it available to my connected speakers, so my assets are consistently used without manual coordination.
- **As a sponsor**, I want KOLs to be able to pull my content into their fanflets from a catalog, so placement feels collaborative rather than forced.
- **As a sponsor**, I want to organize my activity into campaigns with a name, date range, and assigned KOLs, so I can report on sponsorship ROI by initiative rather than just in aggregate.
- **As a sponsor**, I want my campaign data to flow into my CRM, so Fanflet activity is visible alongside the rest of my marketing stack.
- **As a sponsor on a Free plan**, I want to understand what analytics I'm missing, so the upgrade value proposition is clear.

### KOL (Phase 2)

- **As a KOL**, I want to browse a catalog of resources my connected sponsors have made available, so I can easily include their materials in my fanflets without asking for files.
- **As a KOL**, I want to choose which sponsor resources I include — nothing is placed without my action — so I maintain control over my fanflet content.
- **As a KOL**, I want sponsor resources in my fanflet to be clearly identified as sponsor content, so the distinction is transparent to my audience.
- **As a KOL**, I want to be informed when a sponsor removes a resource I've already placed on a fanflet, so I can replace it before my audience hits a dead end.

---

## 3. Phase 1: Resource-Level Analytics

### 3.1 What's Changing

The existing sponsor dashboard shows aggregate totals only. Phase 1 adds a **Content Performance** section that breaks down clicks, engagement rate, and leads per resource, per speaker, and per fanflet — and introduces a cross-KOL comparison view.

This is an enhancement of `fanflet-prd-sponsor-resource-analytics.md` (v0.1), which is superseded by this document. All requirements from that PRD are carried forward and expanded here.

### 3.2 Content Performance Section

**Location:** Added to `/sponsor/dashboard` below the existing metric cards.

**Entitlement gating:**
- `sponsor_resource_analytics` feature flag required for the full resource table (Pro/Enterprise).
- Sponsors without the flag see a locked state: *"Upgrade to Pro to see per-resource performance — which content and which speakers drive the most engagement."*
- Free-tier sponsors with placements may optionally see a teaser: *"You have X resources placed — upgrade to see performance breakdown."* (Product decision; see Open Questions.)

**Table columns:**

| Column | Source | Notes |
|--------|--------|-------|
| Resource | `resource_blocks.title` | Fallback to humanized `block_type` if null |
| Speaker | `speakers.name` | Via `fanflets.speaker_id` |
| Fanflet | `fanflets.title` | — |
| Impressions | `analytics_events` count where `event_type = 'page_view'` and `fanflet_id` matches | Fanflet-level, not resource-level |
| Clicks | `analytics_events` count where `event_type = 'resource_click'` and `resource_block_id` matches | Per resource |
| Engagement Rate | Clicks ÷ Impressions | Computed; displayed as percentage |
| Leads | `sponsor_leads` count where `resource_block_id` matches | Per resource |

**Sorting:** Default clicks descending, then speaker name, then fanflet title. User can re-sort by any column.

**Filtering (P1):** Filter dropdown by Speaker and/or Fanflet to narrow the table.

**Export (P0 for Pro/Enterprise):** CSV export of the full table. Required for enterprise sponsors who need to pull data into their own reporting.

**Empty state:** If the sponsor has no resource blocks tagged to their account: *"No content is linked to your sponsor account yet. When speakers add your resources to their fanflets, you'll see clicks and leads here."*

### 3.3 Cross-KOL Comparison View

A second table (or tab within the section) showing **per-speaker rollup** rather than per-resource. This is the view Pearl.ai's team would use to evaluate KOL partnerships at renewal time.

**Table columns:**

| Column | Source |
|--------|--------|
| Speaker | `speakers.name` |
| Fanflets | Count of distinct `fanflet_id` values with this sponsor's blocks |
| Total Impressions | Sum of page_view events across those fanflets |
| Total Clicks | Sum of resource_click events for this sponsor's blocks on this speaker's fanflets |
| Avg. Engagement Rate | Mean of per-fanflet engagement rates |
| Total Leads | Sum of sponsor_leads for this speaker's fanflets |

**Entitlement:** Gated behind `sponsor_cross_speaker_analytics` feature flag (already exists; Enterprise only).

### 3.4 Demo Environment Scoping

When a sponsor has `demo_environment_id` set, all queries — resource blocks, analytics events, leads — are restricted to fanflets whose speaker belongs to that demo environment. This matches existing dashboard behavior and requires no new logic.

### 3.5 Implementation Notes

No schema changes required for Phase 1. All data exists in:
- `resource_blocks` (sponsor_account_id, fanflet_id, title, block_type)
- `analytics_events` (event_type, resource_block_id, fanflet_id)
- `sponsor_leads` (sponsor_id, resource_block_id, fanflet_id, resource_title)
- `fanflets` (id, title, speaker_id)
- `speakers` (id, name, demo_environment_id)

Query strategy: fetch blocks for sponsor (with demo scope) → join fanflets + speakers → aggregate analytics_events and sponsor_leads per block in a single pass → assemble rows → sort.

**Files to change:**
- `apps/web/app/(sponsor)/sponsor/(dashboard)/dashboard/page.tsx` — load entitlements; run aggregation queries; pass to new section component.
- New: `content-performance-section.tsx` — table, cross-KOL tab, empty state, upgrade CTA, CSV export.

---

## 4. Phase 2: Sponsor Resource Library

### 4.1 Concept

Sponsors own and manage a library of content assets that they make available to their connected KOLs. KOLs see a **Sponsor Catalog** section when building fanflets and pull from it directly — no file requests, no email attachments, no version confusion.

This is architecturally parallel to the KOL resource library (described in the Content Resource Library PRD) but distinct in ownership model, access pattern, and distribution mechanism. A shared code foundation is desirable where possible; the data model is intentionally separate.

### 4.1.1 Storage Ownership Principle

**Storage is debited to the owner of the file, never to the referencer.**

This is a foundational rule for the entire resource system and must be enforced at every layer — application logic, quota queries, and UI display:

- A file uploaded to the sponsor resource library lives in `sponsor-file-uploads` under the sponsor's path. It counts against the **sponsor's storage quota only**.
- When a KOL places a sponsor resource on a fanflet, no file is copied. A `resource_blocks` entry is created that references the `sponsor_resource_library` record. **The KOL's storage quota is unaffected.**
- A sponsor resource placed on 50 different fanflets by 20 different KOLs still occupies storage exactly once, debited entirely to the sponsor.
- KOL storage quota queries must never touch `sponsor_resource_library`. Sponsor storage quota queries must never touch `resource_library`. These are completely independent accounting systems.

This principle also governs file replacement: when a sponsor replaces a file, the old file is deleted from storage and the new file takes its place. The quota delta is applied to the sponsor only. All fanflet placements automatically serve the new file on their next request — because they resolve through the single `sponsor_resource_library` record, not a copy.

### 4.2 Sponsor Resource Library — What Sponsors Do

**Upload and manage assets:**
- Upload files (PDF, PPTX, DOCX, images — same accepted types as KOL library).
- Add linked resources: URLs, video links (YouTube, Loom, Wistia), and structured sponsor blocks (name, logo, URL, CTA text).
- Set a title, description, and optional campaign tag (Phase 3) per resource.
- See which connected KOLs have placed each resource and on how many fanflets.
- Delete or update assets; updates propagate to all fanflet placements (same file reference model as KOL library).

**Availability settings per resource:**

| Setting | Behavior |
|---------|----------|
| Available to all connected KOLs | Any KOL connected to this sponsor can pull it into a fanflet |
| Available to specific KOLs | Sponsor selects which connected KOLs can see the resource in their catalog |
| Draft (not yet available) | Uploaded but not visible to any KOL |

**Storage quota:** Sponsor storage is separate from KOL storage. Initial quota and per-file limits are configurable via the sponsors table or a `sponsor_plans` table — same `plans.limits` JSONB pattern used elsewhere. Proposed initial defaults:

| Setting | Initial Value |
|---------|--------------|
| Total storage per sponsor account | 1 GB |
| Max file size per upload | 100 MB |
| Signed URL duration | 60 minutes |

### 4.3 KOL Experience — Sponsor Catalog

When a KOL is building or editing a fanflet, the "Add Resource" flow includes a new entry point: **Sponsor Catalog**.

**Catalog contents:** All resources that any of the KOL's connected sponsors have made available to them. Resources are grouped by sponsor.

**Pull model:** The KOL selects resources they want to include. Nothing appears on a fanflet without the KOL's action. There is no push or auto-placement.

**What the KOL sees per resource:** Title, description, sponsor name, file type/size (for hosted files), thumbnail (for video links). The sponsor's identity is always visible — there is no anonymous placement.

**On-fanflet display:** Sponsor resources placed by a KOL render as sponsor-type resource blocks, consistent with how sponsor blocks already display. They are visually identified as sponsor content on the public-facing fanflet page.

**Relationship to KOL's own library:** Sponsor catalog resources do not appear in the KOL's personal library. They are a distinct section in the fanflet assembly UI. When a KOL places a sponsor resource on a fanflet, a `resource_blocks` entry is created with `sponsor_account_id` set — enabling sponsor analytics attribution.

### 4.4 File Delivery

Hosted sponsor files follow the same scoped download mechanism as KOL files:
- Stored in a new private Supabase Storage bucket: `sponsor-file-uploads`.
- Delivered through a server-side route: `/api/download/sponsor/[fanflet_id]/[resource_block_id]`.
- Authorization check (in order): fanflet is published + not expired → resource block belongs to this fanflet → `sponsor_resource_library.status` is `available` or `unpublished` (not `removed`) → generate signed URL. If status is `removed`, return a styled tombstone response (not a 404 or server error).
- Short-lived signed URL generated on each valid request (60-minute expiry, configurable).
- Downloads logged to `analytics_events` with `event_type = 'resource_download'`.

**Status-to-download-outcome mapping:**

| `sponsor_resource_library.status` | Download result |
|-----------------------------------|----------------|
| `draft` | 403 — not yet available |
| `available` | ✅ Signed URL generated |
| `unpublished` | ✅ Signed URL generated — existing placements still work |
| `removed` | Tombstone response: "This content is no longer available" |

### 4.5 Data Model

**New table: `sponsor_resource_library`**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `sponsor_id` | UUID | FK to sponsors table |
| `type` | TEXT | `file`, `link`, `video`, `sponsor_block` |
| `title` | TEXT | Display title |
| `description` | TEXT, nullable | Optional description |
| `url` | TEXT, nullable | For link/video/sponsor_block types |
| `file_path` | TEXT, nullable | Supabase Storage path (private bucket) |
| `file_size_bytes` | BIGINT, nullable | For storage quota calculation |
| `file_type` | TEXT, nullable | MIME type or extension |
| `image_url` | TEXT, nullable | Logo/thumbnail URL (public bucket) |
| `media_metadata` | JSONB, nullable | oEmbed data for video links |
| `campaign_id` | UUID, nullable | FK to sponsor_campaigns (Phase 3) |
| `availability` | TEXT | `all`, `specific`, `draft` — default `draft` |
| `available_to` | UUID[], nullable | Array of speaker_ids when availability = `specific` |
| `status` | TEXT | `draft`, `available`, `unpublished`, `removed` — default `draft`. Controls lifecycle state independently of availability. See §4.6. |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ | — |

**Changes to `resource_blocks`:**

Add `sponsor_library_item_id` (UUID, nullable) — FK to `sponsor_resource_library`. Used when a KOL places a sponsor catalog resource on a fanflet. Kept separate from the existing `library_item_id` (which references the KOL's own `resource_library`) to keep attribution logic unambiguous in all queries.

**New Supabase Storage bucket:**

| Bucket | Access | Contents |
|--------|--------|----------|
| `sponsor-file-uploads` | Private | Hosted files uploaded by sponsors |

Path convention: `sponsor-file-uploads/{sponsor_id}/{sponsor_resource_library_id}/{original_filename}`

**Storage quota query:**

```sql
SELECT COALESCE(SUM(file_size_bytes), 0) as total_usage_bytes
FROM sponsor_resource_library
WHERE sponsor_id = :sponsor_id
  AND type = 'file'
  AND file_size_bytes IS NOT NULL;
```

### 4.6 Resource Lifecycle

Sponsor resources move through a defined set of states that control visibility to KOLs and download behavior for audiences. State is stored in `sponsor_resource_library.status` and evaluated at request time — no background jobs or cascade updates to `resource_blocks` are required.

**Resource states:**

| State | Catalog visible to KOLs | New placements allowed | Existing fanflet placements |
|-------|------------------------|----------------------|----------------------------|
| `draft` | No | No | N/A |
| `available` | Yes | Yes | Downloads work normally |
| `unpublished` | No | No | Downloads continue to work |
| `removed` | No | No | Downloads return tombstone |

**State transitions and their effects:**

- **Draft → Available:** Sponsor publishes the resource. It appears in the sponsor catalog visible to connected KOLs. No placements exist yet.
- **Available → Unpublished:** Sponsor temporarily pulls the resource from the catalog. KOLs can no longer add it to new fanflets. Existing placements are unaffected — audiences can still download from fanflets where it was already placed.
- **Any → Removed:** Sponsor permanently removes the resource. The file is deleted from `sponsor-file-uploads` storage. Existing `resource_blocks` entries are not deleted, but the download route returns a tombstone: *"This content is no longer available."* The tombstone is styled consistently with the fanflet expired page — intentional and branded, not an error.
- **Removed → (any):** Removal is intended to be permanent. Restoring a removed resource is not supported in v1 (the file has been deleted from storage). If a sponsor needs to re-publish equivalent content, they upload a new resource.

**File replacement (update in place):**

When a sponsor replaces the file on an existing resource (without changing its status), the new file is stored at a new path in `sponsor-file-uploads`, the old file is deleted, and `sponsor_resource_library.file_path` is updated. All existing fanflet placements automatically serve the new file on their next download request. Storage quota reflects only the new file size. The resource's `status` is unchanged — if it was `available`, it remains `available`.

**KOL visibility of lifecycle changes:**

Sponsors do not send notifications to KOLs when they change a resource's state. However, all sponsor actions against a resource are logged to a `sponsor_resource_events` table (see §4.7 below). KOLs who have placed an affected resource can view this changelog from their fanflet editor, surfaced as a per-resource history panel. Tombstoned resource blocks are visually flagged in the KOL's editor with a warning: *"This resource has been removed by [Sponsor] and is no longer available to your audience. Consider replacing it."*

### 4.7 Resource Activity Log

All sponsor actions against a resource are recorded for transparency and auditability.

**New table: `sponsor_resource_events`**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `sponsor_resource_id` | UUID | FK to `sponsor_resource_library` |
| `sponsor_id` | UUID | FK to sponsors table (denormalized for query efficiency) |
| `event_type` | TEXT | `published`, `unpublished`, `removed`, `file_replaced`, `availability_changed` |
| `actor_id` | UUID | FK to the sponsor user who performed the action |
| `metadata` | JSONB, nullable | Context: e.g., previous/new status, affected fanflet count at time of action |
| `created_at` | TIMESTAMPTZ | When the action occurred |

**Who can see this log:**

- **Sponsors** — full event history per resource, visible in the Library tab resource detail view.
- **KOLs** — filtered view showing only events for resources they have placed on their fanflets. Surfaced in the fanflet editor as a per-resource changelog. Helps KOLs understand why a previously working resource is now tombstoned.

**What is not logged:** Routine metadata edits (title, description changes) are not logged as lifecycle events in v1. Only state transitions and file replacements are captured.

### 4.8 Sponsor Portal UI — Resource Library

**Location:** New **Library** tab in the Sponsor Portal sidebar navigation.

**Library view:** Grid or list of resources with: type icon, title, file size (for hosted), "Placed on X fanflets" count, status badge (`draft` / `available` / `unpublished` / `removed`), campaign tag (Phase 3), and upload date.

**Storage bar:** Usage indicator at top of view (e.g., "340 MB of 1 GB used"). Reflects only files owned by this sponsor — placements by KOLs do not affect this figure.

**Add resource flow:** Upload file or add link — same conceptual UX as KOL library. Availability setting and status transition to `available` are required steps before a resource is visible to KOLs.

**Placement visibility:** Clicking "Placed on X fanflets" shows which fanflets reference this resource, which KOL placed it, and when — the sponsor's view of content distribution.

**Remove action:** Presented as a destructive action with a confirmation dialog: *"Removing this resource will immediately make it unavailable to audiences on X fanflets where it has been placed. This cannot be undone."* Requires explicit confirmation before proceeding.

---

## 5. Phase 3: Campaign Management

### 5.1 Concept

A campaign is a named, time-bounded initiative that groups a set of KOLs and a set of sponsor resources. Everything — placements, clicks, leads, engagement — rolls up to the campaign, producing a single view of sponsorship ROI for that initiative. Campaigns are also the natural unit for CRM and marketing automation sync, as designed in the Sponsor Portal CRM Integrations PRD.

### 5.2 Campaign Object

A campaign has:
- **Name** — e.g., "Pearl Spring Dental Conference Series 2026"
- **Date range** — start and end date (the campaign's active window)
- **Assigned KOLs** — the connected speakers participating in this campaign
- **Resources** — which resources from the sponsor's library are associated with this campaign
- **Status** — `draft`, `active`, `ended` (computed from date range + manual override)

Campaigns do not control content access or delivery. They are a tagging and reporting layer — the underlying resource availability and fanflet delivery system is unchanged.

### 5.3 Campaign Analytics

When viewing a campaign, the sponsor sees a rollup of all activity attributable to that campaign:

| Metric | Definition |
|--------|-----------|
| KOLs participating | Count of assigned KOLs with at least one fanflet in the campaign window |
| Fanflets | Count of distinct fanflets from assigned KOLs published during campaign date range |
| Total Impressions | Sum of `page_view` events on those fanflets |
| Resource Clicks | Sum of `resource_click` events for campaign-tagged resources |
| Engagement Rate | Resource clicks ÷ impressions |
| Leads | Sum of `sponsor_leads` attributed to campaign-tagged resources |
| Top Resource | Resource with highest clicks |
| Top KOL | Speaker with highest combined clicks + leads |

### 5.4 Campaign Tagging

**On resources:** When adding or editing a resource in the sponsor library, the sponsor can assign it to a campaign. A resource belongs to at most one campaign at a time in v1 (see Future Considerations §10.3 for many-to-many).

**On activity:** Analytics attribution follows the resource. If a resource is tagged to Campaign X and a KOL places it on a fanflet, all clicks and leads on that resource block are attributed to Campaign X — regardless of when the fanflet was created.

**On placements:** When a KOL places a sponsor resource tagged to a campaign, the `resource_blocks` entry inherits the campaign reference via `sponsor_resource_library.campaign_id`. No additional action required from the KOL.

### 5.5 CRM Integration Bridge

Campaigns are the integration unit for the CRM connections defined in the Sponsor Portal CRM Integrations PRD:

- A Fanflet campaign maps to a **HubSpot Deal** or pipeline stage.
- A Fanflet campaign maps to a **Salesforce Opportunity** or Campaign object.
- A Fanflet campaign maps to a **Marketo Program**.
- Campaign-level audience contacts map to **Mailchimp Audiences** or **LinkedIn Matched Audiences**.

When CRM integrations are active, campaign creation in Fanflet can optionally trigger record creation in connected platforms. Campaign end (or manual close) can trigger a final sync of rollup metrics.

### 5.6 Data Model

**New table: `sponsor_campaigns`**

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `sponsor_id` | UUID | FK to sponsors table |
| `name` | TEXT | Campaign name |
| `description` | TEXT, nullable | Optional campaign brief |
| `start_date` | DATE | Campaign start |
| `end_date` | DATE, nullable | Campaign end (null = open-ended) |
| `status` | TEXT | `draft`, `active`, `ended` |
| `crm_reference` | JSONB, nullable | External CRM IDs: `{ "hubspot_deal_id": "...", "salesforce_opportunity_id": "..." }` |
| `created_at` | TIMESTAMPTZ | — |
| `updated_at` | TIMESTAMPTZ | — |

**Note on KOL assignment:** Campaign-to-KOL membership is stored in a separate junction table `sponsor_campaign_kols` (`campaign_id`, `speaker_id`, `added_at`) rather than a UUID array on the campaign. This enables proper indexing, clean membership queries, and avoids array management complexity as campaigns scale.

**`sponsor_resource_library.campaign_id`** — FK to `sponsor_campaigns`. Column is added as nullable in the Phase 2 migration so Phase 3 has no breaking schema change.

### 5.7 Campaign UI

**Location:** New **Campaigns** tab in the Sponsor Portal sidebar.

**Campaign list view:** Cards or table showing each campaign with: name, status badge, date range, KOL count, and top-line metrics (impressions, clicks, leads).

**Campaign detail view:** Full analytics rollup (§5.3), per-KOL breakdown table, per-resource breakdown table, and timeline of activity during the campaign window.

**Create/edit campaign:** Name, date range, assigned KOLs (multi-select from connected speakers), and associated resources (multi-select from sponsor library). Resources can also be tagged to a campaign from the library view.

---

## 6. Feature Flag & Plan Tier Summary

| Feature | Flag | Plan Tier |
|---------|------|-----------|
| Resource performance table | `sponsor_resource_analytics` | Pro + Enterprise |
| Leads column in resource table | `sponsor_lead_analytics` | Pro + Enterprise |
| Cross-KOL comparison | `sponsor_cross_speaker_analytics` | Enterprise |
| CSV export | Tied to `sponsor_resource_analytics` | Pro + Enterprise |
| Sponsor resource library | `sponsor_resource_library` | Pro + Enterprise |
| Campaign management | `sponsor_campaigns` | Enterprise |
| CRM sync for campaigns | `enterprise_integrations` (existing) | Enterprise |

Flags are stored in `sponsors.feature_flags` JSONB, consistent with the existing pattern.

---

## 7. Data Model Summary

### New Tables

| Table | Phase | Purpose |
|-------|-------|---------|
| `sponsor_resource_library` | 2 | Sponsor-owned content assets |
| `sponsor_resource_events` | 2 | Audit log of sponsor lifecycle actions per resource |
| `sponsor_campaigns` | 3 | Campaign objects |
| `sponsor_campaign_kols` | 3 | Campaign-to-KOL membership (junction) |

### Modified Tables

| Table | Change | Phase |
|-------|--------|-------|
| `resource_blocks` | Add `sponsor_library_item_id` (UUID, nullable FK to `sponsor_resource_library`) | 2 |
| `sponsor_resource_library` | Add `campaign_id` (UUID, nullable FK to `sponsor_campaigns`) | Column added in Phase 2 migration; populated in Phase 3 |

### New Storage Buckets

| Bucket | Access | Phase |
|--------|--------|-------|
| `sponsor-file-uploads` | Private | 2 |

### No Changes Required (Phase 1)

`analytics_events`, `sponsor_leads`, `fanflets`, `speakers` — no changes. All Phase 1 data already exists.

---

## 8. UX/UI Navigation Summary

The Sponsor Portal sidebar gains two new tabs across these phases:

| Tab | Phase | Content |
|-----|-------|---------|
| Dashboard (existing) | — | Aggregate metrics + Content Performance section (Phase 1) |
| Library | 2 | Sponsor resource library — upload, manage, track placements |
| Campaigns | 3 | Campaign list and detail views |
| Integrations (existing) | — | CRM connections (receives campaign data in Phase 3) |

---

## 9. Implementation Sequence

### Phase 1 — Resource Analytics (build first, ~1–2 weeks)

1. Add Content Performance section to sponsor dashboard page.
2. Implement aggregation queries (resource blocks → analytics events + leads → per-row assembly).
3. Build `content-performance-section.tsx`: table, cross-KOL tab, empty state, upgrade CTA, CSV export.
4. Apply entitlement gating from existing `getSponsorEntitlements`.

No migrations required.

### Phase 2 — Sponsor Resource Library (~3–4 weeks)

1. Create `sponsor-file-uploads` private storage bucket.
2. Migration: create `sponsor_resource_library` table (with `status` field and nullable `campaign_id`); create `sponsor_resource_events` table; add `sponsor_library_item_id` to `resource_blocks`.
3. Build sponsor Library tab UI: upload flow, resource list, status badges, availability settings, placement count, storage bar.
4. Implement resource lifecycle state transitions: publish, unpublish, remove (with confirmation dialog).
5. Build Sponsor Catalog in KOL fanflet assembly UI: browse by sponsor, pull into fanflet.
6. Implement `/api/download/sponsor/[fanflet_id]/[resource_block_id]` route with status-aware authorization check, signed URL generation, and tombstone response for removed resources.
7. Wire download events to `analytics_events`.
8. Build resource activity log: sponsor-facing history view; KOL-facing filtered changelog in fanflet editor with tombstone warning for removed resources.

### Phase 3 — Campaign Management (~2–3 weeks)

1. Migration: create `sponsor_campaigns` and `sponsor_campaign_kols` tables.
2. Build Campaigns tab UI: list, create/edit, detail with analytics rollup.
3. Build campaign tagging in resource library.
4. Wire campaign attribution into analytics queries.
5. Add `crm_reference` support in CRM integration sync events.

---

## 10. Future Considerations

### 10.1 Sponsor-Initiated KOL Notifications
When a sponsor adds a new resource and marks it available, connected KOLs receive an in-app or email notification. Increases placement rate without requiring manual coordination.

### 10.2 Campaign Goals & Progress Tracking
A future iteration adds a goal (target lead count, target engagement rate) to campaigns with a progress bar. Natural upgrade for enterprise sponsors running structured programs.

### 10.3 Many-to-Many Campaign Resource Tagging
Phase 3 limits a resource to one campaign. A resource that spans multiple campaigns would benefit from a junction table. Deferred for v1 simplicity.

### 10.4 Sponsored Content Disclosure
As Fanflet grows, a standardized "Sponsored" disclosure on sponsor resource blocks — configurable by the KOL — becomes important for audience trust and potential regulatory compliance.

### 10.5 Sponsor-Side Resource Expiration
Allow sponsors to set an independent expiration on individual resources (e.g., a limited-time promotional asset), independent of the fanflet's own lifecycle.

### 10.6 KOL Ratings in Campaign View
When the Speaker Ratings & Sponsor Marketplace feature ships, campaign views could surface per-KOL audience ratings alongside engagement analytics.

### 10.7 Trend Analytics & Charts
Phase 1 is a snapshot table. A future `/sponsor/analytics` page adds time-series charts: clicks over the campaign window, lead velocity, engagement rate trends.

### 10.8 Zapier / Webhook Integration
Campaigns and resource events are natural webhook trigger points for sponsors connecting Fanflet to tools not covered by native CRM integrations.

---

## 11. Out of Scope (v1 Across All Phases)

- Bidirectional CRM sync (pull from CRM into Fanflet)
- Sponsor-to-KOL direct messaging or negotiation workflow
- Campaign budgets or financial tracking
- Revenue attribution or ROI in dollar terms
- Automated KOL recommendations for campaign assignment
- Sponsor resource versioning (v1 replaces-in-place)
- Bulk resource operations (bulk tag, bulk availability update)
- Sponsor-controlled resource expiration independent of fanflet lifecycle
- Real-time / live-updating analytics
- Trend charts or time-series views
- Many-to-many campaign resource tagging

---

## 12. Open Questions

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| 1 | `resource_blocks` attribution: new `sponsor_library_item_id` column or extend existing `library_item_id`? | Separate column vs. shared with owner_type flag | Separate `sponsor_library_item_id` — keeps KOL and sponsor attribution unambiguous in all query logic. |
| 2 | Free-tier analytics CTA: generic upgrade message or teaser with resource count? | Generic vs. teaser showing "X resources placed" | Teaser — gives the sponsor a concrete reason to act. |
| 3 | Leads column gating: same flag as resource table or separate `sponsor_lead_analytics` flag? | Same (simpler) vs. separate (more granular upsell) | Separate — preserves the ability to show clicks on a lower tier and leads only on a higher tier. Confirm before building. |
| 4 | Sponsor resource availability — specific KOLs: UUID array on resource or junction table? | Array (simpler for v1) vs. junction table (more scalable) | Array for v1; plan to migrate if availability logic grows complex. |
| 5 | Section title in dashboard UI: "Content Performance," "Resource Analytics," or "Placement Performance"? | — | "Content Performance" — most intuitive for a non-technical sponsor audience. |
