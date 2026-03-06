# Daily Work Log — March 6, 2026

## Release Summary

Today's release brings major enhancements to the Fanflet platform focused on sponsor engagement, subscriber experience, and platform administration.

### New Features

**Subscriber Confirmation Emails**
When audience members subscribe to a fanflet, they now receive a confirmation email with a direct link to the speaker's resources. Speakers can customize the default message in Settings and override it per-fanflet if needed.

**Admin Impersonation**
Platform administrators can now view the speaker and sponsor experience directly by impersonating user accounts. Sessions are fully audited with action logging, and a visible banner ensures transparency. Impersonation supports both read-only and read/write modes.

**Sponsor Portal Settings**
Sponsors can now manage their company profile including logo upload with crop/resize, company description, contact information, and URL slug. The settings page is accessible from the sponsor dashboard sidebar.

**Role Switching**
Users who are both speakers and sponsors can now switch between roles using a role switcher in the dashboard sidebar, without needing to log out and back in.

**Analytics Improvements**
- Conversion Rate metric now shows subscriber-to-view ratio
- Unique Views replaces raw Page Views for more accurate metrics
- Deep links from analytics cards to filtered subscriber lists

**Dashboard UX Updates**
- New "Show event name" toggle lets speakers hide the event badge on public pages
- Improved form labels and placeholder text
- Subscriber count links directly to filtered subscriber list

### Bug Fixes

- Fixed analytics tracking that was incorrectly logging all visits as QR scans
- Fixed sponsor logos not displaying when hosted on external domains
- Fixed subscriber signup errors on public fanflet pages
- Fixed admin portal environment variable configuration for OAuth and impersonation

### Infrastructure

- Migrated to custom Supabase domain (app.fanflet.com)
- Added Vercel Web Analytics for traffic insights
- Updated README with comprehensive project documentation

---

## Technical Details

### Pull Requests Merged

| PR | Title |
|----|-------|
| #53 | fix(sponsor): show external logo URLs with unoptimized Image |
| #52 | promote: gitignore, docs, and admin env var fixes |
| #51 | promote: TypeScript build fix for subscriber confirmation email |
| #50 | promote: confirmation email and dashboard fixes |
| #49 | chore: redeploy with custom Supabase domain |
| #48 | Promote develop to main: dashboard UX improvements |
| #47 | feat(dashboard): subscriber deep links, form labels, show_event_name toggle |
| #46 | Promote develop to main: page view tracking fix |
| #45 | fix(analytics): always fire page_view event, use URL param for QR scan detection |
| #44 | Promote develop to main: analytics dashboard cleanup |
| #43 | fix(analytics): replace dead Email Signups metric with Conversion Rate |
| #42 | Promote develop to main: env var consolidation |
| #41 | Add Vercel Web Analytics to Next.js |
| #40 | fix(admin): consolidate URL env vars |
| #39 | chore(ci): clean up workflows and fix migration push |
| #38 | feat: impersonation, sponsor portal, and role switching |
| #37 | promote: deploy subscriber RLS fix and auth fixes to production |
| #36 | fix(subscribe): RLS violation on public fanflet subscribe |

### Commits

```
b81f9a9 Merge pull request #53 from bbellwfu/develop
5d8938c fix(sponsor): show external logo URLs with unoptimized Image
c12b1d3 Merge pull request #52 from bbellwfu/develop
6578a3e chore: add .claude and _local to gitignore
118f2c4 docs: update README with comprehensive project documentation
00a3fd1 refactor(admin): standardize env vars - NEXT_PUBLIC_SITE_URL for web, NEXT_PUBLIC_ADMIN_URL for admin
430f638 fix(admin): use NEXT_PUBLIC_WEB_URL for web app links and impersonation
e4c0cb2 Merge pull request #51 from bbellwfu/develop
ef8500a fix(web): handle Supabase join returning array type for speakers
7330a89 Merge pull request #50 from bbellwfu/develop
8bfa0ba feat(subscribers): add confirmation email on subscribe
282d133 Merge pull request #49 from bbellwfu/chore/redeploy-custom-domain
3a11aa0 chore: redeploy with custom Supabase domain (app.fanflet.com)
32abaa4 Merge pull request #48 from bbellwfu/develop
d323027 Merge pull request #47 from bbellwfu/feat/dashboard-ux-improvements
f2fdf25 feat(dashboard): subscriber deep links, form label updates, show_event_name toggle
7016035 Merge pull request #46 from bbellwfu/develop
18583ea Merge pull request #45 from bbellwfu/fix/page-view-tracking
37186aa fix(analytics): always fire page_view event, use URL param for QR scan detection
fb554eb Merge pull request #44 from bbellwfu/develop
098ae4d Merge pull request #43 from bbellwfu/fix/analytics-dashboard-cleanup
eb1998e fix(analytics): replace dead Email Signups metric with Conversion Rate, use unique views
d2c863d Merge pull request #42 from bbellwfu/develop
959a20c Merge pull request #41 from bbellwfu/vercel/vercel-web-analytics-to-nextjs-1xxrg2
159e87a Add Vercel Web Analytics to Next.js
46c320e Merge pull request #40 from bbellwfu/fix/admin-env-var-consolidation
b110926 fix(admin): consolidate env vars to NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_ADMIN_URL
887cf27 Merge pull request #39 from bbellwfu/develop
667ad24 chore(ci): clean up workflows and fix migration push
8118609 Merge pull request #38 from bbellwfu/develop
38b5406 feat(admin): add impersonation, sponsor portal enhancements, and role switching
596d553 fix(subscribe): update success message to not promise an email
8dbc6a0 Merge pull request #37 from bbellwfu/develop
4ae36c8 Merge pull request #36 from bbellwfu/fix/subscriber-rls-returning
24d72e4 fix(subscribe): avoid INSERT...RETURNING to prevent RLS violation on public fanflets
58c6d12 fix(rls): allow authenticated users to view published fanflets
```

### Database Migrations

| Migration | Purpose |
|-----------|---------|
| `20260307100000_tighten_public_insert_rls.sql` | Restrict public insert policies |
| `20260307110000_create_user_roles_table.sql` | User roles tracking table |
| `20260307120000_app_metadata_roles_array.sql` | Multi-role support in app_metadata |
| `20260307130000_lead_attribution_function.sql` | Sponsor lead attribution |
| `20260307140000_sponsor_entitlements.sql` | Sponsor feature entitlements |
| `20260307150000_impersonation_tables.sql` | Impersonation audit trail (sessions, tokens, actions) |
| `20260308000000_subscriber_confirmation_emails.sql` | Per-fanflet email config column |

### Environment Variables

**Admin app (`fanflet-admin`) requires:**
- `NEXT_PUBLIC_SITE_URL` = `https://fanflet.com` (web app URL for impersonation/links)
- `NEXT_PUBLIC_ADMIN_URL` = `https://admin.fanflet.com` (admin OAuth callbacks)

**Web app (`fanflet`) requires:**
- `RESEND_API_KEY` — for subscriber confirmation emails (optional, graceful degradation)

### Key Files Changed

**New files:**
- `apps/web/lib/subscriber-confirmation.ts` — Email sending utility
- `apps/web/lib/impersonation.ts` — Impersonation session helpers
- `apps/web/lib/rate-limit.ts` — Rate limiting utility
- `apps/web/components/impersonation-banner.tsx` — Impersonation UI banner
- `apps/web/components/sponsor/sponsor-settings-form.tsx` — Sponsor profile form
- `apps/web/components/sponsor/sponsor-sidebar.tsx` — Sponsor navigation
- `apps/web/components/sponsor/logo-crop-modal.tsx` — Logo crop/resize modal
- `apps/web/components/dashboard/role-switcher.tsx` — Multi-role switcher
- `apps/admin/app/api/impersonate/start/route.ts` — Impersonation initiation
- `apps/web/app/api/impersonate/establish/route.ts` — Cross-domain session handoff
- `apps/web/app/api/impersonate/stop/route.ts` — End impersonation
- `packages/db/src/impersonation.ts` — Impersonation database queries
- `packages/db/src/sponsor-features.ts` — Sponsor entitlements

**Modified files:**
- `apps/web/app/[speakerSlug]/[fanfletSlug]/actions.ts` — Confirmation email trigger
- `apps/web/components/dashboard/settings-form.tsx` — Email settings UI
- `apps/web/components/fanflet-builder/fanflet-editor.tsx` — Per-fanflet email override
- `apps/web/app/dashboard/analytics/page.tsx` — Conversion rate, unique views
- `apps/web/components/landing/analytics-script.tsx` — Page view tracking fix
- `apps/web/app/api/qr/[id]/route.ts` — Add ?ref=qr param
- `README.md` — Comprehensive documentation update
