# Sponsor Engagement & Lead Generation Strategy

## The Problem We're Solving

Conference sponsors spend thousands on booth space, swag, and printed materials — then walk away with a fishbowl of business cards and no real data on who engaged with their content. Fanflet changes that by turning every speaker's resource page into a measurable, trackable touchpoint between sponsors and attendees.

## Core Value Proposition

**"Know exactly which attendees engaged with your content — and how."**

When a dental supply company sponsors a speaker's presentation, they don't just get a logo placement. They get a list of every attendee who clicked their product guide, downloaded their clinical protocol, or visited their special offer — with the attendee's permission.

## What We Have Today

| Asset | Status | Lead Gen Relevance |
|-------|--------|--------------------|
| Sponsor blocks on fanflets | Working | Content is already in front of attendees |
| Analytics tracking (resource_click, resource_download) | Working | We know *what* gets clicked |
| Email subscriber collection | Working | We have attendee contact info |
| SMS bookmark tracking | Working | Additional engagement signal |
| Sponsor portal schema (DB) | Ready, no UI | Foundation for sponsor accounts, connections, resources |

## What's Missing

1. **Consent layer** — Attendees must opt-in to share their info with sponsors. Without this, we can't ethically pass leads.
2. **Sponsor-attributed engagement** — We track clicks, but don't yet tie them back to "this attendee clicked this sponsor's resource."
3. **Lead reports** — No way to generate or export sponsor-specific engagement data.
4. **Sponsor-facing views** — Sponsors can't see anything yet.

---

## Phased Plan

### Phase A: Sponsor Lead Capture (Speaker-Managed)

**Goal:** Give speakers the ability to generate sponsor engagement reports they can share with their sponsors. No sponsor login required.

**What to build:**

1. **Consent checkbox on email subscribe form**
   - Add an opt-in: "Share my info with event sponsors to receive relevant offers and resources"
   - Store consent flag on the `subscribers` table (`sponsor_consent BOOLEAN DEFAULT false`)
   - Only attendees who check this box become eligible sponsor leads

2. **Sponsor engagement tracking**
   - When a subscriber clicks a sponsor block resource, record the event with both the `subscriber_id` and `sponsor_resource_id` (or tag the sponsor on the resource_block)
   - New table: `sponsor_leads` — links a subscriber to a sponsor via a specific engagement action
     - `subscriber_id`, `sponsor_id`, `fanflet_id`, `engagement_type` (click, download, view), `resource_title`, `created_at`
   - Only populated when `sponsor_consent = true`

3. **Sponsor report page (speaker dashboard)**
   - New route: `/dashboard/fanflets/[id]/sponsors`
   - Shows per-sponsor breakdown for a given fanflet:
     - Sponsor name, logo
     - Total impressions (page views where sponsor block was visible)
     - Total clicks on sponsor resources
     - Number of leads (consented subscribers who engaged)
     - Lead list: name, email, what they clicked, when
   - Export: CSV or PDF of sponsor report (speaker sends this to sponsor)

4. **Sponsor report email/share**
   - One-click "Send report to sponsor" — generates a branded PDF or a magic link to a read-only report page
   - Magic link approach: `/reports/[token]` — time-limited, no login required, shows the sponsor only their own data

**Why this phase matters:** Speakers can immediately demonstrate ROI to sponsors without requiring sponsors to create accounts or learn a new tool. This is how you get sponsors excited before asking them to adopt a platform.

---

### Phase B: Sponsor Self-Serve Dashboard (Read-Only)

**Goal:** Give sponsors their own login and a dashboard where they can see engagement data across all speakers they sponsor.

**What to build:**

1. **Sponsor signup/login flow**
   - New auth flow: sponsor registration with company verification
   - Sponsor onboarding: company name, logo, industry, contact info
   - Admin approval workflow (optional — or auto-approve with email domain verification)

2. **Sponsor dashboard**
   - `/sponsor/dashboard` — overview of all connections and aggregate metrics
   - Per-speaker view: which fanflets include their content, engagement metrics
   - Per-resource view: how each piece of content performed across all speakers
   - Lead list: all consented subscribers who engaged with their content, filterable by speaker/fanflet/date
   - Export: CSV of leads with engagement history

3. **Connection management UI**
   - Sponsors can see their active speaker connections
   - Accept/decline incoming connection requests from speakers
   - Basic messaging (connection request message, thank-you note)

**Why this phase matters:** Sponsors can now self-serve their own data. Speakers don't have to manually generate and send reports. The platform starts to feel like a two-sided marketplace.

---

### Phase C: Sponsor Resource Management & Premium Features

**Goal:** Let sponsors control their own content and unlock premium lead gen features.

**What to build:**

1. **Sponsor resource CRUD**
   - Sponsors create and manage their own resources (links, files, promos)
   - Lifecycle control: active/paused/retired with real-time effect on fanflets
   - Resource templates: pre-built content types (product spotlight, special offer, CE credit link)

2. **Enhanced lead capture**
   - **Gated sponsor resources**: Attendee must enter email before accessing a sponsor's download or link (micro-conversion)
   - **Interest tagging**: Sponsor resources can be tagged by category (e.g., "implants", "imaging", "practice management"). Leads inherit interest tags based on what they clicked.
   - **Lead scoring**: Assign point values to engagement types. A download is worth more than a click. Multiple engagements score higher. Sponsors see a lead quality score.

3. **Sponsor discovery & marketplace**
   - Speakers can browse verified sponsors by industry
   - Sponsors can browse speakers by specialty, audience size, upcoming events
   - "Suggest a sponsor" — speakers can invite companies to join Fanflet

4. **Real-time notifications**
   - Sponsors get notified when a new lead engages with their content
   - Weekly digest email with engagement summary
   - Threshold alerts: "Your product guide hit 100 downloads this week"

---

### Phase D: Monetization & Advanced Analytics

**Goal:** Turn sponsor engagement into a revenue stream for Fanflet (and for speakers).

**Potential models:**

1. **Sponsor subscription tiers**
   - Free: basic profile, 1 connection, aggregate metrics only
   - Pro: unlimited connections, lead export, individual lead data, priority placement
   - Enterprise: API access, CRM integration, custom branding, dedicated support

2. **Speaker revenue share**
   - Speakers earn a percentage of sponsor subscription fees tied to engagement driven through their fanflets
   - Incentivizes speakers to include sponsor content and grow their audience

3. **Advanced analytics**
   - Funnel visualization: impression → click → download → lead capture
   - A/B testing: sponsors can test different resource titles/descriptions
   - Benchmarking: "Your click rate is 2x the industry average"
   - Attribution: which speakers/events drive the most valuable leads

4. **CRM integrations**
   - Push leads directly to sponsor's Salesforce, HubSpot, etc.
   - Bi-directional sync: mark leads as "contacted" or "converted" in the CRM, see status in Fanflet

---

## Recommended Build Order

| Priority | Phase | Effort | Impact |
|----------|-------|--------|--------|
| **Now** | Phase A: Consent + tracking + speaker reports | ~1-2 weeks | Immediate sponsor value, demo-ready |
| **Next** | Phase B: Sponsor login + dashboard | ~2-3 weeks | Self-serve, reduces speaker burden |
| **Later** | Phase C: Resource CRUD + premium lead gen | ~3-4 weeks | Differentiation, stickiness |
| **Future** | Phase D: Monetization + integrations | Ongoing | Revenue, scale |

## Key Design Decisions to Make

1. **Consent model**: Single checkbox ("share with sponsors") or granular per-sponsor opt-in? Single is simpler and converts better. Granular is more privacy-forward.

2. **Lead data scope**: What exactly does a sponsor see? Options range from "email + what they clicked" to "full profile with engagement history." More data = more value, but privacy implications.

3. **Report delivery**: Magic link (no login, time-limited) vs. PDF export vs. both? Magic links are lower friction for sponsors who aren't ready to create accounts.

4. **Pricing model**: Do sponsors pay Fanflet directly, or do speakers set their own sponsorship rates and Fanflet takes a platform fee?

5. **Privacy compliance**: Do we need explicit GDPR/CCPA language in the consent checkbox? Probably yes if we want enterprise sponsors.

## What This Looks Like for Josh Austin's Demo

For the demo next Thursday, we can talk through this strategy even though we won't have Phase A built yet. The pitch to a dental sponsor would be:

> "When Dr. Austin presents at the Southwest Dental Conference, his attendees scan a QR code and land on his Fanflet page. Your product guide is right there alongside his clinical resources. Every attendee who subscribes and opts in — you get their name, email, and exactly which of your resources they engaged with. No fishbowl. No guessing. Real leads with real engagement data."

The demo page already shows sponsor blocks working. The story writes itself.
