# PRD: Sponsor Engagement and Lead Generation

**Version:** 0.1  
**Date:** February 2026  
**Status:** Draft — Ready for Review  
**Source:** [SPONSOR_ENGAGEMENT_STRATEGY.md](SPONSOR_ENGAGEMENT_STRATEGY.md), [SPONSOR_PORTAL_ARCHITECTURE.md](SPONSOR_PORTAL_ARCHITECTURE.md)

This PRD covers **Phase A (Speaker-Managed Lead Capture)** and **Phase B (Sponsor Self-Serve Dashboard)** from the sponsor engagement strategy. It builds on the existing sponsor portal schema (`sponsor_accounts`, `sponsor_connections`, `sponsor_resources`, `resource_blocks.sponsor_resource_id`) and analytics infrastructure.

---

## 1. Problem Statement

Conference sponsors invest heavily in booth space, swag, and materials but leave with little more than a fishbowl of business cards and no data on who actually engaged with their content. Speakers, in turn, have no structured way to demonstrate ROI to sponsors — they cannot answer "who clicked your resources?" or "how many leads did my placement generate?"

**Who experiences this:** Sponsors (dental suppliers, tech vendors, etc.) and speakers who include sponsor content on their fanflets. The problem recurs for every event where sponsor blocks are used.

**Cost of not solving:** Sponsors under-value speaker partnerships; speakers lose leverage to attract and retain sponsors. Fanflet's differentiation (measurable sponsor touchpoints) remains unrealized.

**Evidence:** Strategy doc positions lead capture as the core value proposition: "Know exactly which attendees engaged with your content — and how." Today we have sponsor blocks, analytics events, and subscriber collection, but no consent layer, no sponsor-attributed leads, and no sponsor-facing or speaker-facing report.

---

## 2. Goals

**User goals**

- Speakers can generate sponsor engagement reports (impressions, clicks, consented leads) per fanflet and share them with sponsors without requiring sponsors to log in.
- Attendees can opt in once to share their info with event sponsors and see that choice respected (only consented subscribers become leads).
- Sponsors can log in and view their own lead and engagement data across all connected speakers, and manage connection requests.

**Business goals**

- Increase perceived value of sponsor placements so speakers can justify and renew sponsor relationships.
- Create a path to sponsor accounts and future monetization (Phase C/D) without blocking on sponsor adoption for v1.
- Establish consent-based lead capture as a differentiator (no fishbowl; explicit opt-in).

**Success looks like:** Within 30 days of launch, speakers with sponsor blocks can generate at least one sponsor report per fanflet; consent opt-in rate is measurable; at least one sponsor account is created and used to view leads.

---

## 3. Non-Goals

| Non-Goal | Why out of scope |
|----------|------------------|
| Sponsor resource CRUD (sponsors creating/editing their own content) | Phase C. Foundation is speaker-selected sponsor resources; sponsor self-serve content comes later. |
| Lead scoring, gated resources, interest tagging | Phase C. V1 is binary: consented lead with engagement type and resource. |
| CRM integrations (Salesforce, HubSpot) | Phase D. Export (CSV) is sufficient for v1. |
| Sponsor subscription tiers / monetization | Phase D. No sponsor billing in this PRD. |
| Per-sponsor discovery directory (speakers browsing sponsors) | Phase C. V1 connection flow can be invite/link only if we choose. |
| PDF export of sponsor reports | P1; may be fast-follow. CSV and magic link are P0. |

---

## 4. User Stories

### Speaker

- As a **speaker**, I want to show a consent checkbox on my fanflet subscribe form so that only attendees who opt in become eligible sponsor leads.
- As a **speaker**, I want to see a sponsor report for each fanflet that has sponsor blocks so that I can show sponsors exactly who engaged and how.
- As a **speaker**, I want to export that report as CSV or send a magic link to the sponsor so that I can share data without requiring the sponsor to have an account.
- As a **speaker**, I want to know that only consented subscribers are ever passed as leads so that I can represent the product honestly to attendees and sponsors.

### Attendee

- As an **attendee**, I want to choose whether to share my info with event sponsors when I subscribe so that I control how my data is used.
- As an **attendee**, I want the consent wording to be clear (what I'm agreeing to) so that I can make an informed choice.

### Sponsor

- As a **sponsor**, I want to sign up and log in to Fanflet so that I can see my engagement and lead data in one place.
- As a **sponsor**, I want to see a dashboard of my connections, fanflets where my content appears, and a lead list with engagement history so that I don't depend on speakers to send reports.
- As a **sponsor**, I want to accept or decline connection requests from speakers and see a simple message from them so that I can manage partnerships.
- As a **sponsor**, I want to export my leads as CSV so that I can use them in my existing CRM or email tools.

---

## 5. Requirements

### Phase A: Speaker-Managed Lead Capture

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| A1 | Add optional consent checkbox to speaker fanflet subscribe form: "Share my info with event sponsors to receive relevant offers and resources." Store in `subscribers.sponsor_consent`. | P0 | Default false; only checked if user opts in. |
| A2 | Extend subscribe flow (server action / API) to accept and persist `sponsor_consent`. | P0 | Backward compatible: omit or false = no consent. |
| A3 | New table `sponsor_leads`: links subscriber, sponsor (via resource), fanflet, engagement type, resource title, timestamp. Only insert when subscriber has `sponsor_consent = true`. | P0 | See Data Model section. |
| A4 | When tracking `resource_click` or `resource_download`, if the resource block has `sponsor_resource_id`, resolve sponsor and subscriber (e.g. by session/email or visitor_hash + fanflet); if subscriber exists and has consent, insert into `sponsor_leads`. | P0 | Requires track API and/or client to pass subscriber context where available. |
| A5 | New speaker dashboard route: `/dashboard/fanflets/[id]/sponsors`. Per-sponsor breakdown: name, logo, impressions (page views with sponsor block), clicks, lead count, lead list (email, what clicked, when). | P0 | Data from analytics_events + sponsor_leads + resource_blocks. |
| A6 | Export sponsor report as CSV (per sponsor or all sponsors for that fanflet). | P0 | Speaker-initiated from report page. |
| A7 | Magic link report: generate a time-limited token, store in `sponsor_report_tokens`; public route `/reports/[token]` shows read-only report for that sponsor/fanflet. | P1 | No login; token expiry (e.g. 7 days). |
| A8 | Optional: "Send report to sponsor" email with magic link. | P1 | Depends on A7. |

### Phase B: Sponsor Self-Serve Dashboard

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| B1 | Sponsor signup and login using existing Supabase Auth. On first login, create or link `sponsor_accounts` row (company name, slug, contact email, industry, etc.). | P0 | Reuse auth; onboarding form for profile. |
| B2 | Optional admin approval for new sponsors (e.g. `is_verified` gated by admin). Alternative: auto-approve with email verification only. | P1 | Design decision; can ship without approval. |
| B3 | Sponsor dashboard at `/sponsor/dashboard`: list of connections (speakers), aggregate metrics (total leads, total clicks), per-fanflet or per-speaker breakdown. | P0 | Read-only; data from sponsor_leads + analytics. |
| B4 | Lead list view: all consented leads who engaged with this sponsor's resources; columns e.g. email, fanflet, speaker, resource title, engagement type, date. Filter by speaker/fanflet/date. | P0 | |
| B5 | CSV export of leads from sponsor dashboard. | P0 | |
| B6 | Connection management: sponsors see pending/active/declined; can accept or decline pending requests; optional message in request. | P0 | Uses existing `sponsor_connections`. |
| B7 | Basic connection request messaging (e.g. message from speaker when requesting connection). | P1 | Already in schema as `message`. |

### Future (P2)

- Lead scoring (points per engagement type).
- Gated sponsor resources (attendee must enter email before access).
- Notifications (new lead alert, weekly digest).
- CRM push (future Phase D).

---

## 6. Consent Model Analysis

We evaluate two approaches for attendee consent to share info with sponsors.

### Option 1: Single checkbox (global "share with sponsors")

**Description:** One checkbox on the subscribe form: e.g. "Share my info with event sponsors to receive relevant offers and resources." If checked, `sponsor_consent = true`; that subscriber can become a lead for any sponsor whose content they engage with on that (or any) fanflet.

**Pros**

- Simple to implement and to explain; one field, one decision.
- Higher conversion: single step, no per-sponsor friction.
- Matches "event sponsors" framing: typical attendee thinks in terms of "the event" not individual companies.
- Easier to implement in track/lead logic: one flag to check.

**Cons**

- Less granular: attendee cannot allow Sponsor A and deny Sponsor B from the same fanflet without a more complex UI later.
- Privacy purists may prefer explicit per-sponsor choice.

### Option 2: Per-sponsor opt-in

**Description:** After subscribe, or when the attendee first encounters a sponsor block, we ask "Share your info with [Sponsor Name]?" (or a list of sponsors on the fanflet). Consent stored per (subscriber, sponsor) or as a set of sponsor IDs.

**Pros**

- Maximum control for the attendee; aligns with strictest interpretations of consent.
- Could support "share with some but not others" if we have multiple sponsors per fanflet.

**Cons**

- More complex schema (e.g. `subscriber_sponsor_consent` table) and UI (when to prompt, how to list sponsors).
- Likely lower conversion: more steps and decisions.
- Harder to explain: "event sponsors" is clearer than "each sponsor individually."

### Recommendation

**Recommend Option 1 (single checkbox)** for v1.

- Delivers the core value (consent-based leads) with minimal friction and implementation cost.
- Wording can be made explicit: "Share my name and email with sponsors whose content I engage with on this event page."
- We can add per-sponsor or per-engagement consent in a future version if users or compliance require it; the single flag does not preclude a more granular model later (e.g. add a separate table and migrate).

**If compliance or legal requires stronger granularity,** we can document Option 2 as a P2 and design the lead table so that we can later add a `consent_scope` or link to a consent record without breaking existing data.

---

## 7. Data Model Changes

### 7.1 Subscribers: consent flag

**Table:** `subscribers` (existing; speaker-scoped subscriber list).

**Change:** Add column:

```sql
ALTER TABLE public.subscribers
  ADD COLUMN IF NOT EXISTS sponsor_consent BOOLEAN NOT NULL DEFAULT false;
```

- `false`: do not create sponsor_leads for this subscriber.
- `true`: when they engage with a sponsor resource (and we can attribute the engagement to them), insert into `sponsor_leads`.

**RLS:** No change; speakers already manage their subscribers. Insert policy must allow setting `sponsor_consent` on insert (e.g. from anon/authenticated subscribe flow).

### 7.2 Sponsor leads table

**Table:** `sponsor_leads`

Links a consented subscriber to a sponsor via a specific engagement event. One row per (subscriber, sponsor, fanflet, resource, engagement type) — or one row per engagement event if we want multiple clicks to create multiple rows (recommended for simplicity and reporting).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| subscriber_id | UUID | FK → subscribers(id) |
| sponsor_id | UUID | FK → sponsor_accounts(id) |
| fanflet_id | UUID | FK → fanflets(id) |
| resource_block_id | UUID | FK → resource_blocks(id), nullable |
| sponsor_resource_id | UUID | FK → sponsor_resources(id), nullable |
| engagement_type | TEXT | e.g. 'click', 'download' |
| resource_title | TEXT | Denormalized for display |
| created_at | TIMESTAMPTZ | |

**Indexes:** (sponsor_id, created_at), (subscriber_id), (fanflet_id, sponsor_id).  
**RLS:** Speakers can read leads for their fanflets/subscribers; sponsors can read leads where sponsor_id = their account. Service role for report generation if needed.

### 7.3 Sponsor report tokens (magic links)

**Table:** `sponsor_report_tokens`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | PK |
| token | TEXT | Unique, URL-safe (e.g. nanoid); used in /reports/[token] |
| fanflet_id | UUID | FK → fanflets |
| sponsor_id | UUID | FK → sponsor_accounts |
| created_by_speaker_id | UUID | FK → speakers (who generated the link) |
| expires_at | TIMESTAMPTZ | Time-limited access |
| created_at | TIMESTAMPTZ | |

**RLS:** Speakers can create tokens for their fanflets. Anonymous can SELECT by token (for the public report page) with a check that expires_at > now().

---

## 8. Success Metrics

### Leading (first 2–4 weeks)

- **Consent opt-in rate:** % of new subscribers (per fanflet or globally) who check sponsor consent. Target: measurable baseline; stretch >20% where sponsor blocks are present.
- **Sponsor report usage:** % of fanflets with at least one sponsor block where the speaker has opened the sponsor report page at least once. Target: >50% within 30 days.
- **Magic link usage (if P1 shipped):** # of report link opens; goal is to see adoption without requiring sponsor login.

### Lagging (1–3 months)

- **Sponsor account creation:** # of new sponsor_accounts after launch; goal is to validate that speakers share the product and sponsors sign up.
- **Sponsor dashboard usage:** # of sponsors who view leads or export CSV at least once.
- **Repeat engagement:** Speakers with sponsor blocks who generate more than one report or re-use the feature per event.

### Measurement

- Consent: query subscribers where sponsor_consent = true vs total new subscribers in period.
- Report page: analytics or server logs for route `/dashboard/fanflets/[id]/sponsors`.
- Sponsor accounts: count from sponsor_accounts.created_at post-launch.

---

## 9. Open Questions

| Question | Owner | Blocking? | Notes |
|----------|--------|-----------|--------|
| Exact consent checkbox wording (GDPR/CCPA considerations) | Product / Legal | Yes for EU-facing | May need "I agree to share my data with sponsors as described in the Privacy Policy" and link. |
| Admin approval for new sponsors (yes/no; if yes, workflow) | Product | No | Can ship auto-approve; add approval later. |
| Magic link default expiry (7 days vs 30 days) | Product | No (P1) | 7 days is a reasonable default. |
| How to attribute a click to a subscriber (session cookie, email in context, visitor_hash + later match) | Engineering | Yes | Affects when we can write sponsor_leads; may require client to send subscriber_id or session token to track API. |
| Feature gating: which plan(s) get sponsor report and sponsor dashboard? | Product | No | Assume existing plan flags (e.g. sponsor feature) apply. |

---

## 10. Timeline Considerations

- **Phase A (Wave 1):** ~1–2 weeks — migration (sponsor_consent, sponsor_leads, sponsor_report_tokens), subscribe form + API, track API integration, speaker report page, CSV export. Dependency: clear attribution strategy (subscriber ↔ click).
- **Phase B (Wave 2):** ~2–3 weeks — sponsor auth/signup, onboarding, dashboard, connection management, sponsor-side lead list and export. Dependency: Phase A so that sponsor_leads data exists.
- **Phasing within one branch:** Build Wave 1 first, ship or feature-flag; then Wave 2. Both can sit behind a single feature flag (e.g. sponsor engagement) if desired.
- **Hard dependencies:** None. Optional: legal sign-off on consent wording before broad rollout.

---

## 11. Data Flow (Summary)

1. Attendee subscribes on fanflet with optional "Share my info with event sponsors" checked → `subscribers.sponsor_consent` set.
2. Attendee clicks or downloads a sponsor resource → existing track API fires; backend resolves resource_block → sponsor_resource_id → sponsor_id, and (if we have subscriber context and consent) inserts into `sponsor_leads`.
3. Speaker opens `/dashboard/fanflets/[id]/sponsors` → sees per-sponsor metrics and lead list; can export CSV or generate magic link.
4. Sponsor (if account exists) logs in → `/sponsor/dashboard` shows connections, fanflets, leads; can export CSV and accept/decline connection requests.

---

## Appendix: References

- [SPONSOR_ENGAGEMENT_STRATEGY.md](SPONSOR_ENGAGEMENT_STRATEGY.md) — Phased plan, design decisions.
- [SPONSOR_PORTAL_ARCHITECTURE.md](SPONSOR_PORTAL_ARCHITECTURE.md) — Data model, RLS, resource lifecycle.
- [supabase/migrations/20260227120000_sponsor_portal_schema.sql](../../supabase/migrations/20260227120000_sponsor_portal_schema.sql) — Current sponsor tables.
- [apps/web/app/api/track/route.ts](../../apps/web/app/api/track/route.ts) — Analytics tracking API.
- [apps/web/app/[speakerSlug]/[fanfletSlug]/actions.ts](../../apps/web/app/[speakerSlug]/[fanfletSlug]/actions.ts) — Subscribe server action.
