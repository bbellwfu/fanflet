# Fanflet

Digital resource platform for speakers — attendees scan a QR code and get instant access to the speaker's curated resources (links, files, downloads).

## Product scope (key features in place)

### Core product

- **Fanflet creation & editing**: Speakers create resource pages (fanflets) with a WYSIWYG editor supporting four block types: link, file, text, and sponsor. Blocks can reference a centralized resource library (`library_item_id`) so updates propagate. Themes, expiration dates, and survey questions are configurable per fanflet.
- **Public landing pages** (`/[speakerSlug]/[fanfletSlug]`): Mobile-first audience pages with speaker profile, event context, resource cards, email subscribe, SMS bookmark, survey prompt, and sponsor section. Theme CSS variables applied from fanflet config.
- **QR code system** (`/api/qr/[id]`): Generates branded QR codes (PNG/SVG) linking to the public fanflet page. Downloadable from `/dashboard/fanflets/[id]/qr`.
- **Analytics & tracking** (`/api/track`): Tracks page_view, resource_click, email_signup, qr_scan, sms_bookmark, referral_click, and resource_download events. Dashboard views at `/dashboard` (overview chart) and `/dashboard/analytics` (per-fanflet and per-resource breakdown). Feature-gated by plan.

### Demo page

- **Route**: `/demo` — static dental-focused demo page (no auth required)
- **Content**: Fictitious speaker Dr. Sarah Mitchell, DDS at "Southwest Dental Conference 2026." Shows all four resource types (slides PDF, CE credit link, clinical protocol download, product recommendations link), a text block, sponsor block (ApexDental), email subscribe, and SMS bookmark.
- **Design**: Matches the real `LandingPage` component structure (hero, subscribe card, SMS card, resource sections, sponsor section, footer CTA). Uses the default Navy theme.
- **Files**: `apps/web/app/(demo)/demo/page.tsx`

### Subscriber management

- **Dashboard page**: `/dashboard/subscribers` — server component fetching subscribers via server actions.
- **Features**: Searchable/filterable table (by email, name, or source fanflet), sort by date/email/source, select all/individual checkboxes, bulk or single delete with confirmation modal, CSV export (selected or all), and email compose modal (opens user's email client with subscribers in BCC).
- **Stats cards**: Total subscribers, this week's signups, number of source fanflets.
- **Source filter dropdown**: Dynamically populated from fanflets that actually produced subscribers — only shows fanflets with at least one signup.
- **Database**: Uses existing `subscribers` table. New migration `20260227100000` adds DELETE and UPDATE RLS policies so speakers can manage their own subscribers.
- **Files**: `apps/web/app/dashboard/subscribers/page.tsx`, `apps/web/app/dashboard/subscribers/actions.ts`, `apps/web/components/dashboard/subscribers-dashboard.tsx`
- **Admin**: Platform-level subscriber views exist separately in `apps/admin/app/(dashboard)/subscribers/`, backed by `marketing_subscribers` table.

### SMS bookmark

- **Audience feature**: Attendees enter their phone number on a public fanflet page and receive a single SMS with the link. Shown on every public landing page and the demo page.
- **API route**: `POST /api/sms` — validates phone (Zod), normalizes to E.164 format, rate-limits (max 2 per phone+fanflet per 24h via SHA-256 phone hash), sends SMS via Twilio, records bookmark in `sms_bookmarks` table, and fires an `sms_bookmark` analytics event.
- **Graceful degradation**: If Twilio env vars are not configured, the bookmark is still tracked in the database and the user sees "SMS delivery will be available soon." No errors thrown.
- **Environment variables** (server-only, set in Vercel):
  - `TWILIO_ACCOUNT_SID` — Twilio account SID (starts with `AC`)
  - `TWILIO_AUTH_TOKEN` — Twilio auth token
  - `TWILIO_PHONE_NUMBER` — Purchased Twilio phone number in E.164 format (e.g., `+15551234567`)
- **Database**: `sms_bookmarks` table (migration `20260227110000`) with `phone_hash`, `fanflet_id`, and `created_at`. Phone numbers are never stored — only SHA-256 hashes for rate limiting.
- **Files**: `apps/web/app/api/sms/route.ts`, `apps/web/components/landing/sms-bookmark-form.tsx`
- **Note**: Twilio trial accounts can only send to verified phone numbers. Add numbers under Twilio Console → Phone Numbers → Verified Caller IDs.

### Sponsor portal (schema only — no UI yet)

- **Architecture doc**: `docs/SPONSOR_PORTAL_ARCHITECTURE.md` — full design covering user roles, connection flow, resource sharing, content lifecycle, discovery model, RLS policies, and phased implementation plan.
- **Database tables** (migration `20260227120000`):
  - `sponsor_accounts` — company profile (name, logo, industry, website, verification status). One per auth user, parallel to `speakers`.
  - `sponsor_connections` — manages sponsor↔speaker relationships with request flow (`pending → active/declined/revoked`). Either party can initiate. Unique constraint on `(sponsor_id, speaker_id)`.
  - `sponsor_resources` — content curated by sponsors with lifecycle control (`active/paused/retired` + optional `expires_at`). Types: link, file, text, promo.
  - `resource_blocks.sponsor_resource_id` — new nullable FK (`ON DELETE SET NULL`) linking fanflet blocks to sponsor-controlled resources. When the sponsor retires or deletes a resource, the block shows "This content is no longer available."
- **RLS**: Full policies on all three tables. Sponsors manage their own data; speakers with active connections can read sponsor resources; public can read resources linked to published fanflets.
- **No UI yet**: The sponsor-facing app, discovery/search, and connection management UI are planned for post-launch.

## Tech Stack

- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict)
- **Database & Auth:** Supabase (PostgreSQL, RLS, Supabase Auth with SSR)
- **Styling:** Tailwind CSS 4, Radix UI, shadcn/ui patterns (CVA + tailwind-merge)
- **Deployment:** Vercel (preview on PR, staging on `develop`, production on `main`)
- **Validation:** Zod 4
- **Forms:** React Hook Form

## Repository Structure (Turborepo Monorepo)

```
apps/
  web/                 # Speaker-facing Next.js app
    app/               # App Router pages and API routes
      (auth)/          # Auth pages (login, signup, forgot-password)
      (demo)/          # Demo/preview pages (e.g. /demo — dental demo, all resource types)
      (marketing)/     # Marketing/landing pages
      [speakerSlug]/   # Public speaker pages (dynamic routes)
      api/             # API routes (qr, survey, track, subscribe, sms)
      auth/            # Auth callbacks (callback, confirm, signout)
      dashboard/       # Authenticated dashboard (fanflets, resources, subscribers, analytics, settings)
    components/        # Web-specific React components
    lib/               # Web-specific utilities, themes
    middleware.ts      # Auth middleware (speaker dashboard)
  admin/               # Admin back-office Next.js app
    app/               # Admin pages (overview, accounts, features, subscribers, waiting-list)
    components/        # Admin-specific components
    middleware.ts      # Admin auth middleware (platform_admin only)
packages/
  db/                  # Shared Supabase clients (server, browser, service-role, middleware)
  types/               # Generated Supabase types + shared interfaces
  ui/                  # Shared shadcn/ui components (button, card, input, etc.)
  config/              # Shared TypeScript and lint configs
docs/                  # Architecture and product docs (e.g. SPONSOR_PORTAL_ARCHITECTURE.md)
supabase/migrations/   # Idempotent SQL migrations (see migrations/README.md)
```

## Key Architectural Patterns

- **Server Components by default.** Only use `"use client"` when you need browser APIs, event handlers, or hooks.
- **Supabase SSR pattern:** Use `createClient()` from `@fanflet/db/server` (or `@/lib/supabase/server` in web app) for server components and API routes. Use `createBrowserClient()` from `@fanflet/db/client` for client components.
- **Service role client:** Use `createServiceClient()` from `@fanflet/db/service`. Only in server-side admin operations. Never import in client code.
- **RLS enforced at database level.** Never rely on application-level tenant filtering as the primary safety mechanism.
- **Zod validation on all API inputs.** Validate before processing — never trust client data.
- **Site URL centralized** via `getSiteUrl()` from `@fanflet/db/config`.
- **Idempotent database migrations.** Every migration in `supabase/migrations/` must be safe to run more than once (e.g. same migration applied via CI and via MCP, or re-runs after partial failure). Use `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`, `CREATE INDEX IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, etc. See `supabase/migrations/README.md`.

## Coding Conventions

- TypeScript strict mode. No `any` — use `unknown` with type guards.
- Named interfaces for component props (not inline types).
- `const` over `let` wherever possible.
- Commit format: `type(scope): description` (e.g., `feat(auth): add password reset flow`)
- Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `ci`

## Security Requirements

- Never expose Supabase service role key in client-accessible code or `NEXT_PUBLIC_*` env vars.
- All database tables must have RLS policies for SELECT, INSERT, UPDATE, DELETE.
- Error responses must be generic — never leak stack traces, SQL errors, or internal details to the client.
- Auth endpoints must return identical responses whether or not an email exists (prevent user enumeration).
- Follow standards defined in `ENGINEERING_GUIDELINES_MEMO_v2.md`.

### MCP Server Security (CRITICAL)

The MCP server (`packages/mcp/`) uses **branded Supabase client types** to enforce data isolation at compile time. Violating these rules is a **security vulnerability** — it was exploited in PR #77 where all roles received the service-role client, bypassing RLS.

**Rules for MCP tool development:**

1. **Speaker, sponsor, and audience tools MUST use `ctx.supabase`** (typed as `RlsScopedClient`). This client has `auth.uid()` set to the authenticated user, so RLS policies enforce data isolation.
2. **NEVER use `ctx.serviceClient` in non-admin tools.** It bypasses all RLS. CI will reject PRs that reference `serviceClient` or `createServiceClient` in `tools/speaker/`, `tools/sponsor/`, or `tools/audience/`.
3. **Only `platform_admin` tools may use `ctx.serviceClient`** (typed as `ServiceRoleClient`) for cross-tenant queries.
4. **The `buildToolContext()` function in `auth.ts` is the ONLY place** where the client type cast should appear. Do not cast `ServiceRoleClient` to `RlsScopedClient` anywhere else.
5. **`SUPABASE_JWT_SECRET` must be set** in all environments. Without it, `createUserScopedClient()` throws (fail closed).
6. **All changes to `packages/mcp/src/auth.ts` require security review.** The RLS isolation tests in `packages/mcp/src/__tests__/auth-rls-isolation.test.ts` must pass.

**CI enforcement:**
- `.github/scripts/check-mcp-client-isolation.sh` — static check that non-admin tool files don't reference `serviceClient`
- `packages/mcp/src/__tests__/auth-rls-isolation.test.ts` — 7 tests verifying each role gets the correct client type

## Common Anti-Patterns to Flag

- Using `any` type instead of proper typing
- Missing RLS policies on new tables
- Importing server-only code (service role client, API keys) in client components
- Using `let` when `const` would suffice
- Missing error handling on Supabase queries (not checking `.error`)
- Inline styles instead of Tailwind classes
- Missing loading/error states on async operations
- Missing Zod validation on API route inputs
- Direct DOM manipulation instead of React patterns
- Hardcoding URLs instead of using centralized config
- **Non-idempotent migrations** — `CREATE TABLE`/`CREATE POLICY`/`CREATE INDEX` without `IF NOT EXISTS` or a preceding `DROP ... IF EXISTS` (breaks CI when migrations are applied in more than one way or re-run)
- **Using `serviceClient` in non-admin MCP tools** — Speaker/sponsor/audience tools must use `ctx.supabase` (RLS-scoped). Using `ctx.serviceClient` bypasses data isolation. CI enforces this via `.github/scripts/check-mcp-client-isolation.sh`.
- **Casting `ServiceRoleClient` to `RlsScopedClient`** outside of `buildToolContext()` in `auth.ts` — this defeats the branded type safety net

## Review Focus Areas

When reviewing PRs, prioritize:
1. **Security** — RLS policies, auth patterns, key exposure, input validation
2. **Correctness** — Error handling, edge cases, null checks on Supabase responses
3. **Architecture** — Server vs. client component boundaries, data fetching patterns
4. **Code quality** — TypeScript strictness, naming, DRY without over-abstraction
5. **Migrations** — New SQL in `supabase/migrations/` must be idempotent (see `supabase/migrations/README.md`)

## Security & Infrastructure Audits

For security audits, use Supabase and Vercel MCP tools directly (not via agents) to inspect live infrastructure:
- **Supabase MCP**: Execute SQL to audit RLS policies, list tables, check storage bucket configs, review auth settings, inspect logs
- **Vercel MCP**: Inspect project settings, environment variables, deployment configs, security headers
- **npm audit**: Run `npm audit --audit-level=high` for dependency vulnerabilities
- **Codebase scanning**: Use Grep/Read to check for service role key exposure, missing input validation, PII leaks in logs/analytics

## Implementation Status (AI and CI)

**Canonical project context and implementation status:** This document. For the full AI Team Lead phase plan, cost analysis, and decisions, see `AI_TEAM_LEAD_VISION.md`.

### CI today

- **Quality job** (`.github/workflows/ci.yml`): Lint, type-check, build (web) on PRs and pushes to `develop`.
- **Migration idempotency:** CI runs `.github/scripts/check-migrations-idempotent.sh` when migrations are present; see `supabase/migrations/README.md` for required patterns.
- **Not yet in CI:** `npm audit` and gitleaks (secrets scanning) are not in the pipeline.

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR to main/develop, push to develop | Lint, type-check, MCP security tests, build, migration idempotency check, MCP client isolation check |
| `migrate.yml` | Push to main/develop when `supabase/migrations/**` or the workflow changes | Applies migrations with `--include-all` to linked Supabase project (dev on develop, prod on main) |
| `claude.yml` | `@claude` in issue/PR comments or reviews | On-demand Claude via Claude Code GitHub App (CLAUDE_CODE_OAUTH_TOKEN) |
| `claude-code-review.yml` | Manual (`workflow_dispatch`) | Plugin-based code review using CLAUDE_CODE_OAUTH_TOKEN; invoke manually or via `@claude` |

### Branch protection

Branch protection on `main` and `develop` is not configured (no required status checks or reviewers).

### Database migrations

| Migration | Purpose |
|-----------|---------|
| `20260217190000` | Marketing subscribers table |
| `20260218031402` | Content expiration for fanflets |
| `20260218100000` | Marketing subscribers allow authenticated |
| `20260218120000` | Plans, subscriptions, feature flags, entitlements |
| `20260218140000` | Backfill early access subscriptions |
| `20260218150000` | Marketing subscribers interest tier |
| `20260220110000` | Resource library table |
| `20260220120000` | Plan visibility and entitlement snapshots |
| `20260224120000` | Content library secure delivery (storage quotas, signed URLs) |
| `20260227100000` | Subscriber management (DELETE/UPDATE RLS policies) |
| `20260227110000` | SMS bookmarks tracking table |
| `20260227120000` | Sponsor portal schema (accounts, connections, resources) |

### Next steps

- **Sponsor portal UI**: Build the sponsor-facing app, connection discovery/search, and resource sharing interface. Schema is ready (see `docs/SPONSOR_PORTAL_ARCHITECTURE.md`).
- **Email sending integration**: The subscriber email compose currently opens the user's email client via `mailto:`. Wire up a server-side email service (e.g., Resend) for in-app sending with templates and tracking.
- **Twilio verification**: The toll-free number requires Twilio verification before it can send to unverified numbers. Trial accounts are limited to verified caller IDs.
- Add `npm audit --audit-level=high` and gitleaks to `ci.yml` per engineering guidelines.
- Optionally configure branch protection (required status checks) once the check suite is stable.
- Optionally add a promote-to-production workflow (develop → main PR creation and checks) as in Phase 3 of the vision doc.
