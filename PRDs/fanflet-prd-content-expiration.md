# PRD: Fanflet Content Expiration
**Version:** 1.0 — Draft  
**Date:** February 17, 2026  
**Author:** Brian (Product) / Claude (Documentation)  
**Status:** Draft for Review

---

## 1. Overview & Strategic Context

### What This Feature Does
Content expiration allows KOLs (Key Opinion Leaders) to set a time window on their fanflets. After the expiration date, the fanflet content is no longer publicly accessible. The KOL retains full control and can reactivate or extend at any time.

### Why It Matters Now
Post-event content has a natural lifecycle. A talk's supplementary materials are most valuable in the days and weeks following the event. Giving KOLs control over that window:

- Creates urgency for audiences to engage promptly ("access this for the next 30 days")
- Gives KOLs a sense of control over their content lifecycle
- Keeps a KOL's public-facing content fresh and intentional

### Strategic Foundation
This feature is designed as the first building block toward a larger content access and monetization strategy. The expiration mechanism introduces the concept of **gated content** — content that is available under specific conditions. In this initial version, the condition is time. In future iterations, the condition could be **membership or payment**, enabling a paywall model where expired free content becomes accessible through a paid subscription (e.g., "This talk was free for 30 days. Join my community for $X/year to access my full library.").

Decisions in this PRD are made with that future direction in mind.

---

## 2. User Stories

### KOL (Content Creator)

- **As a KOL**, I want to set an expiration date when I create a fanflet, so that my content is only publicly available for a defined period after my talk.
- **As a KOL**, I want to choose from quick presets (30 days, 60 days, doesn't expire) or set a custom date, so I don't have to think too hard about it.
- **As a KOL**, I want to change or extend the expiration on any fanflet at any time — even after it has already expired — so I maintain full control over my content.
- **As a KOL**, I want to see at a glance which of my fanflets are active, expiring soon, or expired, so I can manage my content library.
- **As a KOL**, I want existing fanflets I created before this feature launched to default to "Doesn't Expire," so nothing changes unexpectedly.

### Audience (Fanflet Viewer)

- **As an audience member**, I want to know if a fanflet has a limited availability window, so I engage with it before it's gone.
- **As an audience member**, if I visit an expired fanflet, I want to see a clear message explaining it's no longer available, with an option to follow or connect with the KOL, so I'm not left at a dead end.

---

## 3. Functional Requirements

### 3.1 Setting Expiration

**Where:** Expiration is set during fanflet creation and is editable at any time from the fanflet settings/edit screen.

**Options presented to the user:**

| Option | Behavior |
|--------|----------|
| 30 days | Expires 30 days from publish date |
| 60 days | Expires 60 days from publish date |
| 90 days | Expires 90 days from publish date |
| Doesn't expire | No expiration (default) |
| Custom date | User selects a specific date via date picker |

**Default behavior:**
- New fanflets: Default selection is "Doesn't expire" (no expiration pre-selected)
- Existing fanflets (created before feature launch): Automatically set to "Doesn't expire" — no retroactive expiration applied

**Preset calculation:** When a preset is selected (e.g., "30 days"), the system calculates the expiration date relative to the **publish date** of the fanflet. If the fanflet is not yet published, the countdown begins on publish. The calculated date should be displayed to the user for clarity (e.g., "Expires: March 19, 2026").

### 3.2 Editing Expiration

- KOLs can modify the expiration setting at **any time**, including after a fanflet has already expired.
- Changing expiration on an already-expired fanflet **immediately reactivates** it (content becomes publicly accessible again).
- There is no limit on how many times expiration can be changed.
- Editing options are the same as creation: presets or custom date. When editing, presets recalculate relative to the **original publish date**, not the edit date. If a preset would result in a date in the past, it should be shown but greyed out / unavailable, and the user should use the custom date picker instead.

### 3.3 What Happens When a Fanflet Expires

**For the KOL:**
- The fanflet remains fully visible and manageable in their dashboard.
- It is clearly marked as "Expired" with a visual indicator (badge, color, icon — to be defined in design).
- All content, stats, and settings are preserved. Nothing is deleted.
- The KOL can reactivate at any time by changing the expiration.

**For the audience (expired landing page):**
- Visiting the fanflet URL shows a branded "expired" page with:
  - A clear message: "This fanflet is no longer available."
  - The KOL's name and profile photo (if set).
  - A CTA to follow or connect with the KOL (e.g., link to their user profile page if/when that feature exists, or a link they configure — social profile, website, etc.).
- The expired page should be **cleanly designed** and feel intentional, not like an error.
- The expired page should NOT show any of the original fanflet content (no previews, no teaser text — this is important for the future paywall path, where "teaser + paywall gate" would be a distinct, upgraded behavior).

### 3.4 Expiration Processing

- Expiration should be evaluated at the **time of page request** (i.e., check `expiration_date` against current timestamp when a viewer loads the fanflet). No background cron job needed for the initial implementation.
- Edge case: If a KOL is in the middle of editing a fanflet when it expires, the edit session should not be interrupted. Expiration only affects the public-facing view.

### 3.5 Dashboard & Management

- The KOL's fanflet list/dashboard should display expiration status:
  - **Active** — no expiration set, or expiration date is in the future
  - **Expiring soon** — within 7 days of expiration (visual warning)
  - **Expired** — past expiration date
- Optional: Allow filtering/sorting by expiration status in the dashboard.
- Optional: Email notification to KOL when a fanflet is about to expire (e.g., 7 days before). This is a nice-to-have for v1 and could be deferred.

---

## 4. UX/UI Considerations

### Fanflet Creation/Edit Flow
- Expiration should be a clear but non-intrusive part of the creation flow. It should not be the first thing the user sees — content setup comes first.
- Suggested placement: In a "Settings" or "Options" section of the creation/edit screen, alongside other metadata.
- The preset buttons should be prominent, with "Custom date" as a secondary option that reveals a date picker.
- Always show the calculated expiration date in plain language (e.g., "This fanflet will expire on March 19, 2026").

### Dashboard Indicators
- Use subtle but clear visual cues: color-coded badges or status pills (e.g., green for active, amber for expiring soon, grey for expired).
- Expired fanflets should not be hidden by default — KOLs need to see and manage them.

### Expired Landing Page
- Should carry Fanflet branding (this is the free-tier experience; reduced branding is a future paid-tier feature).
- The KOL's identity (name, photo) should be visible to maintain the personal connection.
- The CTA should be configurable in a future iteration, but for v1, a simple "Learn more about [KOL Name]" link to their configured URL (website, social, etc.) is sufficient.
- If no KOL link is configured, show the message without a CTA rather than a broken or empty link.

---

## 5. Data Model Changes

### Fanflet Table (or equivalent)

| Field | Type | Description |
|-------|------|-------------|
| `expiration_date` | `TIMESTAMP`, nullable | The date/time the fanflet expires. NULL = does not expire. |
| `expiration_preset` | `VARCHAR`, nullable | The preset option selected by the user (e.g., "30d", "60d", "90d", "none", "custom"). Stored for UI convenience when re-editing — allows the UI to re-highlight the selected preset. |

### Migration for Existing Fanflets
- All existing fanflets should have `expiration_date` set to `NULL` and `expiration_preset` set to `"none"` — equivalent to "Doesn't expire."
- This is a non-destructive migration with no impact on current behavior.

### Notes
- Storing `expiration_date` as an absolute timestamp (rather than a relative duration) simplifies the check at page-request time and avoids ambiguity.
- The `expiration_preset` field is optional but recommended — without it, the UI can't distinguish between "user chose 30 days" and "user chose a custom date that happens to be 30 days out" when re-editing.

---

## 6. Future Considerations

This section documents how the expiration feature connects to the larger product vision. These items are explicitly **out of scope for this release** but should inform design and technical decisions now.

### 6.1 Paywall / Gated Access
The expiration mechanism creates a natural transition point for a paywall:
- A fanflet expires (free access window closes).
- The expired landing page could evolve to show a teaser of the content + a gate: "Subscribe to [KOL Name]'s community for $X/year to access this and all their talks."
- This requires: a subscription/payment system, a content access layer, and a richer expired page. But the core concept — "this content is available under conditions" — is established by this feature.

### 6.2 Configurable Expired Page CTAs
In v1, the expired page shows a simple message + follow link. Future iterations could allow KOLs to customize this page with their own messaging, links, or embedded signup forms — especially at paid tiers.

### 6.3 Audience Notifications
Future versions could notify subscribed audience members before a fanflet expires ("Last chance to access [KOL]'s talk resources — expires in 3 days"). This increases engagement and creates another touchpoint for conversion to a paid community.

### 6.4 Analytics on Expired Page
Track how many visitors land on expired fanflet pages, and what percentage click the CTA. This data is valuable both for KOLs ("people are still trying to access your content after it expires — consider a subscription model") and for Fanflet's own product decisions.

### 6.5 Bulk Expiration Management
As KOLs accumulate fanflets, they may want to set or change expiration on multiple fanflets at once. Not needed for v1 but worth considering in the dashboard design.

---

## 7. Out of Scope (v1)

The following are explicitly deferred:

- Paywall or paid access to expired content
- Customizable expired page content or CTAs beyond the default
- Audience-facing notifications about upcoming expiration
- Bulk expiration management
- Email notifications to KOLs about upcoming expiration (nice-to-have, may include if straightforward)
- Teaser/preview content on the expired page
- Any tier-gating of the expiration feature itself (available to all users in v1)

---

## 8. Open Questions

1. **Expiration granularity:** Should expiration be date-only (midnight on the selected date) or date+time? Date-only is simpler and probably sufficient for v1. Recommend: date-only, expiring at 11:59 PM in the KOL's configured timezone (or UTC if no timezone is set).

2. **Audience-facing expiration visibility:** Should active fanflets show their expiration date to the audience (e.g., "Available until March 19, 2026")? This creates urgency but also sets an expectation. Recommend: Yes, show it — urgency drives engagement, and it's honest. But this should be a KOL-controlled toggle.

3. **SEO impact:** Expired fanflet URLs will return a different page. Should the expired page return a 200 (with the expired message) or a 410 (Gone)? A 200 preserves the URL for future reactivation or paywall conversion. Recommend: 200 with appropriate meta tags (noindex on expired pages).

4. **KOL follow/connect CTA:** What does the v1 CTA link to? Options: the KOL's user profile page (if/when it exists), a URL they configure in their settings, or their social links. This depends on whether the user landing page (item 3 from the brainstorm notes) ships before or after this feature.
