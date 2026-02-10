# Fanflet

Fanflet helps speakers share presentation resources, collect audience feedback, and track engagement -- all through a single QR code.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database & Auth**: Supabase (Postgres + Auth + Storage)
- **Styling**: Tailwind CSS + shadcn/ui
- **Deployment**: Vercel
- **CI/CD**: GitHub Actions

## Project Structure

```
Fanflet/
├── application/          # Next.js application (product + marketing page)
│   ├── app/              # App Router pages and API routes
│   │   ├── (auth)/       # Login, signup, password reset
│   │   ├── (marketing)/  # Public marketing landing page
│   │   ├── [speakerSlug]/[fanfletSlug]/  # Public fanflet pages
│   │   ├── api/          # API routes (QR, survey, analytics tracking)
│   │   └── dashboard/    # Authenticated speaker dashboard
│   ├── components/       # React components
│   ├── lib/              # Supabase clients, utilities
│   └── public/           # Static assets
├── .github/workflows/    # CI pipeline
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm
- Access to the Fanflet Dev Supabase project credentials

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd Fanflet
   ```

2. **Configure environment variables**
   ```bash
   cp application/.env.example application/.env.local
   ```
   Edit `application/.env.local` and fill in the **Dev** Supabase credentials.
   Ask the project lead for the dev project URL and anon key.

3. **Install dependencies**
   ```bash
   cd application
   npm install
   ```

4. **Start the dev server**
   ```bash
   npm run dev
   ```
   The app runs at [http://localhost:3000](http://localhost:3000).

## Branching Strategy

We use a `main` + `develop` branching model:

| Branch | Purpose | Deploys to |
|--------|---------|------------|
| `main` | Production-ready code | `fanflet.com` (production Supabase) |
| `develop` | Integration branch | `dev.fanflet.com` (dev Supabase) |
| `feature/*` | New features | Vercel preview URL (dev Supabase) |
| `fix/*` | Bug fixes | Vercel preview URL (dev Supabase) |

### Workflow

1. Create a branch off `develop`: `git checkout -b feature/my-feature develop`
2. Make your changes and commit
3. Push and open a PR to `develop`
4. CI checks run automatically; Vercel deploys a preview
5. After review and merge to `develop`, the staging site updates
6. Periodically, `develop` is merged to `main` for a production release

### Branch Rules

- **Never push directly to `main`** -- always go through a PR
- **PRs to `main` require approval** from at least one reviewer
- **All PRs must pass CI** (lint, type-check, build) before merge

## Environment Configuration

| Environment | Supabase Project | Site URL |
|-------------|-----------------|----------|
| Local dev | Fanflet Dev | `http://localhost:3000` |
| Vercel Preview | Fanflet Dev | auto-generated `*.vercel.app` |
| Staging (`develop`) | Fanflet Dev | `dev.fanflet.com` |
| Production (`main`) | Fanflet Production | `fanflet.com` |

## CI/CD Pipeline

Every PR triggers:
1. **Lint** -- ESLint checks
2. **Type-check** -- TypeScript compiler (`tsc --noEmit`)
3. **Build** -- Full Next.js production build

Vercel handles deployment automatically via GitHub integration.
