# Daily Work Log — March 10, 2026

## Release Summary

Major platform maturity push spanning analytics intelligence, compliance infrastructure, billing self-service, survey-gated content, and sponsor attribution. The analytics system now detects bots, captures visitor geography, and classifies referrer sources. A full GDPR/CCPA compliance management system was added to the admin portal with a 12-step deletion pipeline. Speakers can now manage their plan and billing in-dashboard, gate resources behind survey prompts, and attribute any resource type to connected sponsors for engagement tracking.

### New Features

**Bot Detection, Geo Tracking, and Referrer Intelligence**
Analytics events now automatically detect bot traffic (filtered from all reports), capture visitor location from Vercel geo headers, and classify referrer sources (search, social, email, QR, etc.) at insert time. The admin analytics dashboard shows bot traffic indicators, visitor location maps, and top referring domains. Fixed a bug where QR scan source attribution was always recorded as "direct."

**GDPR/CCPA Compliance Management System**
Admin portal now has a full compliance dashboard for managing data subject requests (DSRs). Includes a 12-step deletion pipeline with real-time progress visualization, email-confirmation safety gate, reject/cancel with reason tracking, notification tracking, and audit log. Speakers can self-service request account deletion from their settings page.

**In-Dashboard Billing and Plan Management**
Speakers can now view their current plan, compare all tiers, detect entitlement drift (snapshot vs. live features), and request plan changes — all without leaving the dashboard. Shared plan feature metadata powers both the marketing pricing page and the dashboard comparison view.

**Survey-Gated Landing Pages**
When a fanflet has survey questions configured, resources are hidden until the visitor answers or explicitly skips the survey. Previously the survey was a dismissible overlay alongside the full resource list. Now supports up to 3 survey questions per fanflet with a multi-step progress prompt.

**Sponsor Attribution on All Block Types**
Speakers can now attribute any resource block (link, file, text) to a connected sponsor — not just "sponsor" type blocks. This enables per-resource engagement tracking for sponsors who provide product collateral, demo videos, and clinical protocols. The entire downstream analytics pipeline (lead attribution, sponsor dashboard, sponsor reports) works automatically with no changes needed.

**Entitlement Guards and CI Enforcement**
Created reusable server-side authorization guards (`requireFeature`, `requireActiveConnection`) that close gaps where sponsor-connection actions relied solely on UI-level gating. Added a CI script that verifies sponsor-related action files include entitlement checks, preventing regressions.

**OAuth Password Setup**
Users who signed up with Google OAuth can now add a password from Settings, enabling them to disconnect Google later if desired.

**Sticky Save Bar and QR Page Publish**
The fanflet editor now has a sticky bottom bar for Save/Publish visible on all screen sizes. The QR page also shows a Publish button when the fanflet is still in draft.

### Bug Fixes

- Fixed source attribution bug where QR scans were always recorded as "direct" traffic
- Fixed email_signup tracking event that was defined but never fired from the subscribe form
- Fixed GTM script placement that threw errors in Next.js 16 Turbopack
- Rewrote Terms of Service and Privacy Policy to remove premature GDPR compliance claims and honestly reflect US/NA-focused launch
- Resolved 3 CI lint errors (useEffect setState patterns, cookie consent hydration, plan grid navigation)

### Infrastructure

- Added geo-targeted cookie consent: non-US/CA visitors must opt in before GTM loads
- Added Acceptable Use Policy page and robots.txt with AI bot directives
- Added JSON-LD structured data to public fanflet pages
- Sidebar now conditionally hides "Sponsor connections" link for Free plan users

---

## Technical Details

### Pull Requests Merged

| PR | Title |
|----|-------|
| #93 | Major development work on audience experience, analytics, compliance and comms |
| #92 | Fix GTM script placement for Next.js 16 compat |

### Commits

```
49e600d docs: session handoff 2026-03-10 18:39
0a50cef fix(lint): resolve 3 CI lint errors
e1720b1 feat: multi-survey questions, entitlement guards, and CI sponsor check
4d60f2b feat(dashboard): sticky save bar and publish from QR page
0e9532c feat(survey): gate resources behind survey prompt on public landing pages
f0bd547 feat(analytics): add bot detection, geo tracking, and referrer intelligence
9b34461 feat(legal): add acceptable use policy, robots.txt, and SEO updates
411089d feat(compliance): add GDPR/CCPA compliance management system
72c0d7a feat(auth): allow OAuth-only users to set up email/password sign-in
bbe7b9e feat(billing): add in-dashboard billing & plan management page
85f1153 fix(legal): honest US/NA positioning and geo-targeted cookie consent
19b79c1 fix(marketing): move GTM script into <head> tag for Next.js 16 compat
```

### Database Migrations

| Migration | Purpose |
|-----------|---------|
| `20260314100000_compliance_management.sql` | data_subject_requests, deletion_pipeline_steps, compliance_audit_log tables with RLS |
| `20260314200000_analytics_traffic_intelligence.sql` | Add is_bot, country_code, city, region, referrer_category to analytics_events |

### Key Files Changed

**New files:**
- `apps/web/lib/entitlement-guards.ts` — Reusable requireFeature/requireActiveConnection server-side authorization guards
- `apps/web/lib/plan-features.ts` — Shared plan feature metadata for marketing and dashboard
- `.github/scripts/check-sponsor-entitlements.sh` — CI script enforcing entitlement checks on sponsor actions
- `apps/web/components/landing/survey-gated-landing.tsx` — Survey gate wrapper for landing pages
- `apps/web/components/cookie-consent.tsx` — Geo-targeted cookie consent with GTM integration
- `apps/web/app/dashboard/billing/` — Billing page, actions, plan cards, comparison grid, upgrade modal
- `apps/admin/app/(dashboard)/compliance/` — Full compliance dashboard, DSR detail, new request form
- `apps/admin/lib/deletion-pipeline.ts` — 12-step resumable deletion pipeline
- `apps/web/app/(marketing)/legal/acceptable-use/page.tsx` — Acceptable Use Policy page
- `apps/web/app/robots.ts` — robots.txt with sitemap and AI bot directives

**Modified files:**
- `apps/web/components/fanflet-builder/add-block-form.tsx` — Sponsor attribution dropdown on all block types
- `apps/web/components/fanflet-builder/resource-block-card.tsx` — Sponsor attribution on edit for all block types
- `apps/web/components/dashboard/resource-library.tsx` — Sponsor dropdown in library add/edit for all types
- `apps/web/app/dashboard/fanflets/[id]/actions.ts` — Type-agnostic sponsor_account_id validation
- `apps/web/app/dashboard/resources/actions.ts` — Type-agnostic default_sponsor_account_id validation
- `apps/web/app/dashboard/sponsor-connections/actions.ts` — Server-side sponsor_visibility entitlement checks
- `apps/web/components/dashboard/sidebar.tsx` — Conditional sponsor connections link by plan
- `apps/web/app/dashboard/layout.tsx` — Load entitlements for sidebar visibility
- `apps/web/app/api/track/route.ts` — Bot detection, geo headers, referrer classification
- `apps/web/components/landing/analytics-script.tsx` — Source attribution fix, email_signup tracking
- `.github/workflows/ci.yml` — Added sponsor entitlement check step
