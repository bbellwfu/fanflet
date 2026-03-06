# Fanflet

Fanflet helps speakers share presentation resources, collect audience feedback, and track engagement — all through a single QR code.

## Overview

Fanflet is a digital resource platform for speakers. Attendees scan a QR code and get instant access to the speaker's curated resources (links, files, downloads).

**Core user flow:**
1. Speaker creates a fanflet with resources, themes, and optional survey questions
2. Speaker downloads a branded QR code for their presentation
3. Attendee scans the QR code → lands on a mobile-first page
4. Attendee accesses resources, subscribes for updates, or bookmarks via SMS

**Try it:** Visit `/demo` for a live demo page.

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router, React 19, TypeScript strict) |
| Database & Auth | Supabase (PostgreSQL, RLS, Auth with SSR) |
| Styling | Tailwind CSS 4, Radix UI, shadcn/ui (CVA + tailwind-merge) |
| Validation | Zod 4 |
| Forms | React Hook Form |
| SMS | Twilio |
| Email | Resend |
| Monorepo | Turborepo |
| Deployment | Vercel |
| CI/CD | GitHub Actions |

## Repository Structure

```
Fanflet/
├── apps/
│   ├── web/                  # Speaker-facing app (port 3000)
│   │   ├── app/
│   │   │   ├── (auth)/       # Login, signup, forgot-password
│   │   │   ├── (demo)/       # Demo pages (/demo)
│   │   │   ├── (marketing)/  # Public marketing pages
│   │   │   ├── (sponsor)/    # Sponsor portal (in progress)
│   │   │   ├── [speakerSlug]/ # Public fanflet pages
│   │   │   ├── api/          # API routes (qr, survey, track, subscribe, sms)
│   │   │   ├── auth/         # Auth callbacks
│   │   │   └── dashboard/    # Speaker dashboard
│   │   ├── components/
│   │   └── lib/
│   └── admin/                # Admin back-office (port 3001)
│       ├── app/              # Admin pages (accounts, features, subscribers, sponsors)
│       └── components/
├── packages/
│   ├── db/                   # Shared Supabase clients (server, browser, service-role)
│   ├── types/                # Generated Supabase types + shared interfaces
│   ├── ui/                   # Shared shadcn/ui components
│   └── config/               # Shared TypeScript and lint configs
├── supabase/
│   └── migrations/           # Database migrations (idempotent)
└── .github/workflows/        # CI/CD pipelines
```

## Features

- **Fanflet Editor** — WYSIWYG editor with link, file, text, and sponsor block types; configurable themes and expiration dates
- **Public Landing Pages** — Mobile-first pages with speaker profile, resource cards, email subscribe, and survey prompts
- **QR Code Generation** — Branded PNG/SVG download for each fanflet
- **Analytics & Tracking** — Page views, resource clicks, email signups, QR scans, SMS bookmarks
- **Subscriber Management** — Search, filter, bulk actions, CSV export, email compose
- **SMS Bookmark** — Twilio integration sends attendees a link to their phone
- **Resource Library** — Centralized content with secure file delivery and storage quotas
- **Plans & Subscriptions** — Feature flags and entitlements system
- **Admin Back-Office** — Platform administration for accounts, features, and subscribers
- **Sponsor Portal** — Schema ready; connections and resource sharing (UI in progress)

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Access to the Fanflet Dev Supabase project credentials

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd Fanflet

# Install dependencies (from root — installs all workspaces)
npm install

# Configure environment variables
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
```

Edit both `.env.local` files with the Dev Supabase credentials. Ask the project lead for the dev project URL and keys.

### Running Locally

```bash
# Run all apps in parallel
npm run dev

# Run web app only (http://localhost:3000)
npm run dev:web

# Run admin app only (http://localhost:3001)
npm run dev:admin
```

## Development Workflow

### Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run all apps in parallel |
| `npm run dev:web` | Run web app only |
| `npm run dev:admin` | Run admin app only |
| `npm run build` | Build all apps |
| `npm run lint` | Lint all packages |
| `npm run db:types` | Regenerate Supabase types |
| `npm run db:migration:new <name>` | Create a new migration |
| `npm run db:push` | Push migrations to linked project |
| `npm run db:status` | List migration status |

### Database Migrations

All migrations in `supabase/migrations/` must be **idempotent** — safe to run more than once. Use patterns like:

- `CREATE TABLE IF NOT EXISTS`
- `DROP POLICY IF EXISTS` before `CREATE POLICY`
- `CREATE INDEX IF NOT EXISTS`

See `supabase/migrations/README.md` for details.

## Branching Strategy

We use a `main` + `develop` branching model:

| Branch | Purpose | Deploys to |
|--------|---------|------------|
| `main` | Production-ready code | `fanflet.com` |
| `develop` | Integration branch | `dev.fanflet.com` |
| `feature/*` | New features | Vercel preview URL |
| `fix/*` | Bug fixes | Vercel preview URL |

### Workflow

1. Create a branch off `develop`: `git checkout -b feature/my-feature develop`
2. Make your changes and commit
3. Push and open a PR to `develop`
4. CI checks run automatically; Vercel deploys a preview
5. After review and merge to `develop`, the staging site updates
6. Periodically, `develop` is merged to `main` for a production release

### Branch Rules

- **Never push directly to `main`** — always go through a PR
- **PRs to `main` require approval** from at least one reviewer
- **All PRs must pass CI** (lint, type-check, build) before merge

## Environment Configuration

| Environment | Supabase Project | Web URL | Admin URL |
|-------------|------------------|---------|-----------|
| Local | Fanflet Dev | `localhost:3000` | `localhost:3001` |
| Preview | Fanflet Dev | `*.vercel.app` | `*.vercel.app` |
| Staging | Fanflet Dev | `dev.fanflet.com` | `admin.dev.fanflet.com` |
| Production | Fanflet Prod | `fanflet.com` | `admin.fanflet.com` |

### Required Environment Variables

**Web App** (`apps/web/.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (optional — SMS bookmark)

**Admin App** (`apps/admin/.env.local`):
- All web variables, plus:
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`
- `NEXT_PUBLIC_WEB_URL`

## CI/CD Pipeline

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | PR, push to develop | Lint, type-check, build, migration idempotency check |
| `migrate.yml` | Push to main/develop | Apply database migrations |
| `claude-code-review.yml` | PR opened | AI code review |
| `claude.yml` | `@claude` mention | On-demand AI assistance |

Vercel handles deployment automatically via GitHub integration.

## Architecture & Conventions

For detailed architecture patterns, coding conventions, security requirements, and review guidelines, see `CLAUDE.md`.

## Contributing

- Follow TypeScript strict mode (no `any` — use `unknown` with type guards)
- All database tables must have RLS policies
- Commit format: `type(scope): description`
- Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `ci`
