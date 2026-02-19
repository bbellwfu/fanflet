# Fanflet

Digital resource platform for speakers — attendees scan a QR code and get instant access to the speaker's curated resources (links, files, downloads).

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
      (demo)/          # Demo/preview pages
      (marketing)/     # Marketing/landing pages
      [speakerSlug]/   # Public speaker pages (dynamic routes)
      api/             # API routes (qr, survey, track)
      auth/            # Auth callbacks (callback, confirm, signout)
      dashboard/       # Authenticated dashboard
    components/        # Web-specific React components
    lib/               # Web-specific utilities, themes
    middleware.ts      # Auth middleware (speaker dashboard)
  admin/               # Admin back-office Next.js app
    app/               # Admin pages (overview, accounts, features)
    components/        # Admin-specific components
    middleware.ts      # Admin auth middleware (platform_admin only)
packages/
  db/                  # Shared Supabase clients (server, browser, service-role, middleware)
  types/               # Generated Supabase types + shared interfaces
  ui/                  # Shared shadcn/ui components (button, card, input, etc.)
  config/              # Shared TypeScript and lint configs
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

## Review Focus Areas

When reviewing PRs, prioritize:
1. **Security** — RLS policies, auth patterns, key exposure, input validation
2. **Correctness** — Error handling, edge cases, null checks on Supabase responses
3. **Architecture** — Server vs. client component boundaries, data fetching patterns
4. **Code quality** — TypeScript strictness, naming, DRY without over-abstraction
5. **Migrations** — New SQL in `supabase/migrations/` must be idempotent (see `supabase/migrations/README.md`)
