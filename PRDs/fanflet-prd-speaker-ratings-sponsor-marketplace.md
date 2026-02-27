# PRD: Speaker Ratings & Sponsor Marketplace
**Version:** 0.1 — Future Vision  
**Date:** February 19, 2026  
**Author:** Brian (Product) / Claude (Documentation)  
**Status:** Vision Draft — Not Scheduled for Development

---

## 1. Overview & Strategic Context

### What This Feature Does
The Speaker Ratings & Sponsor Marketplace is a two-sided platform layer built on top of Fanflet's existing KOL infrastructure. It enables:

1. **Audience ratings** — After attending a talk, audience members rate the speaker's session through the fanflet, providing structured feedback on content quality and audience experience.
2. **Speaker profiles** — KOLs accumulate a verified, audience-validated track record over time, built from the fanflets they choose to include.
3. **Sponsor directory** — A gated, vetted (and potentially paid-access) directory where approved sponsors can discover KOLs, browse their profiles and ratings, and initiate engagement.

### Why This Matters
The primary motivation surfaced through KOL research is clear: **speakers want to attract better and higher-paying sponsors.** Audience feedback is valued, but it is a means to an end — the end being sponsor visibility and connection.

This reframes the ratings system not as a feedback tool but as a **credential-building system**. A KOL's rating history becomes their verified track record, the evidence they present to sponsors in lieu of (or in addition to) a traditional speaker bio or media kit.

### Strategic Significance
This feature represents a fundamental evolution of Fanflet's business model. Today, Fanflet is a KOL tool — it creates value for speakers and their audiences. This marketplace layer transforms Fanflet into a **two-sided platform**, where:

- **KOLs** are the supply side — building profiles, collecting ratings, seeking visibility.
- **Sponsors** are the demand side — discovering talent, validating quality, initiating relationships.

The monetization model shifts accordingly. Rather than relying solely on KOL subscriptions, Fanflet can charge sponsors for access to a curated, verified talent pool. This is a higher-value transaction and a more scalable revenue model.

### Connection to Existing Features
Several features already in development or planned lay groundwork for this marketplace:

- **Audience surveys** (existing) — The survey mechanism is the natural collection point for ratings. Ratings are a structured, quantified form of the feedback surveys already gather.
- **Content expiration** (in development) — Expiration introduces the concept of content with a lifecycle, and establishes that fanflets represent discrete events — the right unit of analysis for per-talk ratings.
- **Engagement tracking** (existing) — Audience size and engagement data from fanflets will enrich the KOL profile shown to sponsors.
- **Email list building** (existing) — Audience capture demonstrates a speaker's ability to build a following, a signal sponsors care about.

---

## 2. User Stories

### KOL (Speaker)

- **As a KOL**, I want to collect audience ratings after my talks, so I can build a verified track record that attracts better sponsors.
- **As a KOL**, I want to choose, on a per-fanflet basis, whether to collect ratings and whether those ratings contribute to my public sponsor-facing profile, so that casual or private events don't dilute my profile.
- **As a KOL**, I want to see my own private feedback in full, even for fanflets I don't include in my public profile, so I can learn and improve from every event.
- **As a KOL**, I want to tag my fanflets by topic and industry, so sponsors in relevant verticals can find me and my ratings reflect the right context.
- **As a KOL**, I want to control which elements of my ratings are surfaced publicly, so I can present my strengths without being penalized for early talks or mismatched events.
- **As a KOL**, I want to be discoverable in a sponsor directory so that relevant companies can find and engage with me without me having to cold-pitch them.

### Audience Member (Rater)

- **As an audience member**, I want to easily rate a talk I just attended through the fanflet I'm already using, so giving feedback is frictionless and feels natural.
- **As an audience member**, I want to know my feedback contributes to something meaningful (helping the speaker grow and get recognized), so I'm motivated to complete it.

### Sponsor

- **As a sponsor**, I want to browse a curated directory of verified KOLs with real audience ratings, so I can identify speakers who resonate with the audiences I care about.
- **As a sponsor**, I want to filter speakers by topic, industry, audience type, and rating, so I can narrow to talent that fits my specific needs.
- **As a sponsor**, I want confidence that the ratings I'm seeing are genuine and not self-reported, so I can trust the data I'm making decisions on.
- **As a sponsor**, I want to initiate contact with a KOL I'm interested in, so I can open a conversation about partnership without cold outreach.

---

## 3. System Architecture (Conceptual)

This feature has three distinct layers, each with different users, data flows, and build complexity. They should be thought of as sequential phases.

### Layer 1: Ratings Collection (KOL & Audience-facing)
The foundation. Audience members rate talks through fanflets. Data is collected, stored privately, and attributed to the KOL and the specific fanflet/event.

### Layer 2: KOL Profile & Score (KOL-facing)
KOLs accumulate ratings over time. They manage which fanflets contribute to their profile, how their score is displayed, and how they tag their content for sponsor discoverability.

### Layer 3: Sponsor Directory (Sponsor-facing)
A gated environment where vetted/paying sponsors can browse KOL profiles, view ratings, and initiate engagement. This layer has no value without sufficient density in Layers 1 and 2.

---

## 4. Functional Requirements

### 4.1 Ratings Collection (Per Fanflet)

**Rating mode is configured per fanflet.** When creating or editing a fanflet, the KOL sets a rating configuration with the following options:

| Setting | Description |
|--------|-------------|
| **Don't collect ratings** | No rating prompt shown to audience. Default for existing fanflets. |
| **Collect for private use only** | Ratings collected and visible to KOL only. Not included in public profile or sponsor score. |
| **Collect and include in public profile** | Ratings collected and, if the KOL chooses, factored into their public sponsor-facing profile. |

**Rating dimensions collected from the audience:**

The rating prompt should be short and frictionless — ideally completable in under 60 seconds. Proposed dimensions:

| Dimension | Description | Format |
|-----------|-------------|--------|
| **Overall session quality** | General impression of the talk | 1–5 stars |
| **Content relevance** | How relevant the content was to the audience | 1–5 stars |
| **Speaker delivery** | Clarity, energy, engagement of the speaker | 1–5 stars |
| **Would recommend** | NPS-style: would you recommend this speaker to others? | 0–10 scale |
| **Open feedback** | Optional free-text comment | Text field (optional) |

The NPS-style "would recommend" score is particularly valuable for sponsors — it reflects audience advocacy, not just satisfaction.

**Placement in the fanflet:** The rating prompt should appear as a natural section near the bottom of the fanflet page — after the content, not before. It should feel like a natural conclusion to the fanflet experience.

**Timing consideration:** Ratings are most accurate when submitted close to the event. The fanflet's engagement window (combined with content expiration if set) creates a natural rating window.

### 4.2 KOL Rating Dashboard (Private)

KOLs should have a private view of all ratings collected across all their fanflets, regardless of whether those fanflets are included in their public profile. This includes:

- Per-fanflet breakdown of all rating dimensions.
- Trends over time (improving delivery scores, consistent content relevance, etc.).
- Full open-text feedback comments.
- Response rate (what % of fanflet visitors submitted a rating).

This private view is always complete and unfiltered. It is the KOL's learning tool.

### 4.3 KOL Public Profile & Sponsor Score

The KOL's public-facing sponsor profile is built from a **curated subset** of their fanflets — those they have explicitly designated as "include in public profile."

**KOL controls:**
- Toggle per fanflet: include or exclude from public profile.
- Topic/industry tags per fanflet (e.g., "Fintech," "Leadership," "Healthcare," "AI/ML") — sponsors filter by these.
- Profile-level bio, headshot, and links (website, LinkedIn, social).

**Score calculation:**
The public sponsor score is computed from only the included fanflets. This is a deliberate design decision — it ensures the score reflects the KOL's intentional, relevant work rather than every casual appearance.

Displaying the score to sponsors should include context: "Score based on X rated sessions" — transparency about sample size builds sponsor trust.

**What sponsors see vs. what KOLs control:**

| Data Point | KOL Controls? | Sponsor Sees? |
|------------|--------------|---------------|
| Overall score (avg of included fanflets) | Indirectly (via inclusion/exclusion) | Yes |
| Per-dimension scores | Indirectly | Yes |
| Number of rated sessions | No — always shown | Yes |
| Individual fanflet scores | No — always shown for included fanflets | Yes |
| Private/excluded fanflet scores | N/A — excluded | No |
| Open-text comments | KOL can flag inappropriate ones | Optional / moderated |
| Engagement stats (audience size) | Indirectly | Yes |

**Important principle:** KOLs control *presentation* (which fanflets to include), not *the underlying data*. Ratings on included fanflets are shown as-is. This is essential for sponsor trust — if KOLs could edit or suppress individual ratings, the score would be meaningless.

### 4.4 Sponsor Directory & Access

**Access model:**
The sponsor directory is gated. Sponsors must register and be approved before gaining access. Access may be free (approval-gated) or paid, or both — a tiered model where basic browsing is free for approved sponsors and deeper engagement features (contact, full profile history) require a subscription or per-contact fee.

**Sponsor registration:**
- Company name, website, industry, and use case (event sponsorship, content partnership, brand ambassador, etc.).
- Approval by Fanflet team before access is granted.
- Terms of use: sponsors agree not to misuse KOL contact information or circumvent the platform.

**Directory browsing & filtering:**
Sponsors can filter the KOL directory by:
- Topic / industry tags
- Overall score (minimum threshold)
- Number of rated sessions (experience level)
- Audience size / engagement metrics
- Geography (if collected)

**Engagement initiation:**
Sponsors can express interest in a KOL through the platform. In v1, this could be as simple as a structured inquiry form that notifies the KOL. In future versions, this evolves into a messaging layer or a formal booking/proposal workflow.

KOLs are notified of sponsor interest and can choose to respond or ignore. They are never obligated to engage.

---

## 5. Data Model (Conceptual)

New tables and fields required. Exact schema to be defined during implementation planning.

### Ratings Table

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `fanflet_id` | UUID | FK to fanflets table |
| `kol_id` | UUID | FK to users/profiles table |
| `submitted_at` | TIMESTAMP | When rating was submitted |
| `score_overall` | INTEGER (1–5) | Overall session quality |
| `score_content` | INTEGER (1–5) | Content relevance |
| `score_delivery` | INTEGER (1–5) | Speaker delivery |
| `score_nps` | INTEGER (0–10) | Would recommend score |
| `comment` | TEXT, nullable | Optional open-text feedback |
| `is_flagged` | BOOLEAN | KOL-flagged for moderation review |

### Fanflet Table (additions)

| Field | Type | Description |
|-------|------|-------------|
| `rating_mode` | ENUM | `none`, `private`, `public` |
| `include_in_profile` | BOOLEAN | Whether fanflet contributes to public sponsor score |
| `topic_tags` | ARRAY/JSON | Industry/topic tags for discoverability |

### KOL Profile Table (additions or new)

| Field | Type | Description |
|-------|------|-------------|
| `sponsor_bio` | TEXT | Short bio shown in sponsor directory |
| `sponsor_visible` | BOOLEAN | Whether KOL is discoverable in sponsor directory |
| `topic_tags` | ARRAY/JSON | Profile-level topic/industry tags |

### Sponsor Table (new)

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `company_name` | VARCHAR | Sponsor company |
| `website` | VARCHAR | Company website |
| `industry` | VARCHAR | Industry vertical |
| `use_case` | TEXT | How they intend to use the platform |
| `status` | ENUM | `pending`, `approved`, `suspended` |
| `access_tier` | ENUM | `free`, `paid` (for future tiering) |
| `approved_at` | TIMESTAMP | When approved |

### Sponsor Interest / Inquiry Table (new)

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `sponsor_id` | UUID | FK to sponsors table |
| `kol_id` | UUID | FK to users/profiles table |
| `message` | TEXT | Initial inquiry message |
| `submitted_at` | TIMESTAMP | When submitted |
| `status` | ENUM | `pending`, `viewed`, `responded`, `declined` |

---

## 6. UX/UI Considerations

### Rating Prompt (Audience-facing)
- Should feel like a natural part of the fanflet, not an afterthought or a pop-up interruption.
- Short, visual, and mobile-friendly — most audience members will be on their phones.
- Stars and the NPS slider should be tap-friendly with large touch targets.
- The open-text field should be clearly optional.
- A brief framing line helps: "Help [KOL Name] improve and get recognized — share your feedback." This connects the act of rating to a benefit for someone the audience member presumably likes.

### KOL Fanflet Settings (Rating Configuration)
- Rating mode should be a simple 3-option toggle in fanflet settings.
- "Include in public profile" should be a separate, clearly labeled toggle — distinct from whether ratings are collected at all.
- Topic tags should be a multi-select with suggested common tags plus a custom entry option.

### KOL Profile & Score (Sponsor-facing)
- Clean, professional presentation — this is a marketplace listing, not a social media profile.
- Score should be displayed prominently but with context (sample size, recency).
- Per-dimension scores shown as a simple breakdown — not just a single number.
- The KOL's fanflet history (included sessions) should be browsable by sponsors as evidence, not just an aggregate.

### Sponsor Directory
- Search and filter as the primary interaction — sponsors know what they're looking for.
- KOL cards in the directory should show: name, photo, top topic tags, overall score, session count, and a one-line bio.
- Inquiry flow should be low-friction but structured — sponsors should provide enough context that KOLs can make an informed decision about whether to respond.

---

## 7. Sequencing & Dependencies

This feature cannot be built all at once. The three layers have clear dependencies and should be treated as distinct releases.

### Phase 1: Ratings Collection
**Prerequisite for everything.** No marketplace exists without a ratings foundation.
- Build the rating prompt into the fanflet page (controlled by `rating_mode` setting).
- Build the private KOL ratings dashboard.
- No public-facing score yet.
- **Success metric:** X% of KOLs enable ratings on at least one fanflet; average rating response rate.

### Phase 2: KOL Public Profile & Score
**Prerequisite for the sponsor layer.** Sponsors need something to look at.
- Build the public KOL profile page (sponsor-facing view).
- Build the score calculation from included fanflets.
- Build topic tagging and profile management tools.
- KOL profiles are created but the sponsor directory is not yet open.
- **Success metric:** X KOLs have profiles with at least 3 rated sessions included.

### Phase 3: Sponsor Directory
**The marketplace becomes live.**
- Build sponsor registration and approval workflow.
- Build directory browsing and filtering.
- Build inquiry/interest mechanism.
- Define and implement access model (free approval-gated vs. paid).
- **Success metric:** X sponsors approved; X sponsor inquiries initiated.

### Build Density Before Opening the Directory
A critical sequencing principle: **the sponsor directory should not open until there is enough KOL supply to make it valuable.** A sparse directory destroys sponsor trust and makes early adopters look bad. Define a minimum threshold (e.g., 25 KOLs with verified profiles and 3+ rated sessions each) before making the directory accessible to sponsors.

---

## 8. Monetization Model

### Current Model (KOL-side)
Fanflet charges KOLs for access to premium features (subscription tiers). The marketplace is built on top of this existing revenue base.

### Future Model (Sponsor-side)
The marketplace introduces a second revenue stream — sponsors pay for access to and engagement with the KOL directory. This is a higher-value transaction than KOL subscriptions because:

- Sponsors have larger budgets and a direct commercial incentive (finding talent = business value).
- The platform can charge per-contact, per-inquiry, or as a subscription.
- As KOL density and rating data grows, the directory becomes more valuable and pricing can increase.

### Possible Sponsor Pricing Structures
- **Freemium:** Approved sponsors browse profiles for free but pay to initiate contact or access full rating history.
- **Subscription:** Monthly/annual fee for full directory access and unlimited inquiries.
- **Per-contact:** Pay-per-inquiry model, charged when a sponsor sends an inquiry to a KOL.

The right model depends on sponsor acquisition dynamics and should be validated before building the payment infrastructure.

### KOL Monetization Implications
KOLs should benefit from the marketplace, not just be listed in it. Considerations:
- KOL profiles in the sponsor directory could be a premium feature (paid tier only).
- Revenue sharing when sponsor deals originate through the platform is a future possibility but introduces significant complexity.

---

## 9. Future Considerations

### 9.1 Booking & Proposal Workflow
Beyond inquiry, a future version could facilitate the full sponsor-KOL engagement workflow: proposals, contracts, payment. This moves Fanflet from a discovery layer toward a full talent marketplace (similar to a speaker bureau platform).

### 9.2 Audience Notifications Before Expiration
If a fanflet with ratings enabled is expiring, audience members who haven't yet rated could receive a notification: "You attended [Event] — share your feedback before it closes." This increases rating volume and response rates.

### 9.3 Sponsor Event Reports
Connecting to the separately considered sponsor reporting feature — sponsors who find and work with KOLs through the platform may want access to event-specific engagement reports, creating a continuity between discovery, engagement, and measurement.

### 9.4 Verified Audience Badges
To combat rating manipulation, a future version could add weight to ratings from verified audience members (e.g., those who registered for the event, or who spent meaningful time on the fanflet before rating). Unverified ratings still count but are flagged differently.

### 9.5 KOL Tiers / Badges
As rating history accumulates, Fanflet could introduce recognition tiers (e.g., "Rising Speaker," "Top Rated in Fintech") that appear on KOL profiles and increase their visibility in the directory. This creates a gamification element that motivates KOLs to collect ratings and maintain quality.

### 9.6 Paywall Connection
A high-rated KOL with a large audience base becomes a natural candidate for Fanflet's paywall/community monetization features. The ratings system and the paywall system together tell the same story: KOLs build audiences, build credibility, and eventually monetize through both direct (subscriptions) and indirect (sponsor) channels.

---

## 10. Out of Scope (This Vision Document)

The following are acknowledged but not addressed in this PRD:

- Specific pricing for sponsor access tiers
- Payment infrastructure for sponsor transactions
- Revenue sharing with KOLs for platform-originated deals
- Booking and contract workflow
- Legal/compliance considerations for the marketplace (terms of service, data use, etc.)
- Moderation policies for ratings (fraud, manipulation, abuse)
- Mobile app considerations for the sponsor-facing directory
- International/multi-currency considerations

---

## 11. Open Questions

1. **Sponsor access model:** Free + approval, or paid + approval, or tiered? This has significant implications for sponsor acquisition speed vs. revenue timing.

2. **KOL opt-in to directory:** Should all KOLs be automatically listed in the sponsor directory once they have a sufficient rating history, or should they actively opt in? Opt-in respects KOL autonomy; auto-listing maximizes directory density.

3. **Minimum ratings threshold for profile visibility:** How many rated sessions should a KOL need before their profile appears in the sponsor directory? Too low = noisy, low-quality profiles. Too high = slow supply build. Recommend: 3 rated sessions as a starting threshold, revisable.

4. **Rating authenticity:** What prevents a KOL from asking friends to submit fake positive ratings? Options include IP throttling, requiring fanflet visit duration before rating is accepted, or linking ratings to registered audience members. This needs a considered policy before launch.

5. **Topic taxonomy:** Who defines the topic/industry tags KOLs can apply? A free-form system is flexible but creates inconsistency. A curated list is cleaner but may not cover all verticals. Recommend: curated list with a "suggest a tag" escape hatch.

6. **KOL control over sponsor visibility:** Should KOLs be able to block specific sponsors from viewing their profile (e.g., a competitor of one of their existing sponsors)? This is a premium feature consideration for future versions.
