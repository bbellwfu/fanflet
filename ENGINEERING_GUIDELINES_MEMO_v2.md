# Engineering & DevOps Guidelines

**Purpose:** A "get it right from day one" reference for any team starting a SaaS application. Focused on architectural decisions, security, deployment, testing, and operational practices that are painful to retrofit.

**Origin:** Distilled from hard-won lessons building a production multi-tenant platform — 22+ resolved issues, 30+ database migrations, and a full security audit compressed into actionable guidelines.

**Audience:** Systems architects, lead engineers, and DevOps engineers at project kickoff.

---

## Table of Contents

- [Section 0: Decision Record — What to Get Right on Day One](#section-0-decision-record--what-to-get-right-on-day-one)
- [Section 1: Repository & Monorepo Architecture](#section-1-repository--monorepo-architecture)
- [Section 2: Authentication & Session Management](#section-2-authentication--session-management)
- [Section 3: Multi-Tenancy & Data Isolation](#section-3-multi-tenancy--data-isolation)
- [Section 4: Security Hardening](#section-4-security-hardening)
- [Section 5: API Design & Input Validation](#section-5-api-design--input-validation)
- [Section 6: Database Schema & Migrations](#section-6-database-schema--migrations)
- [Section 7: Timezone Architecture](#section-7-timezone-architecture)
- [Section 8: DevOps & Deployment Pipeline](#section-8-devops--deployment-pipeline)
- [Section 9: Testing Strategy](#section-9-testing-strategy)
- [Section 10: Developer Experience & Code Quality](#section-10-developer-experience--code-quality)
- [Section 11: Observability & Monitoring](#section-11-observability--monitoring)
- [Section 12: Architecture Maturity & When to Split](#section-12-architecture-maturity--when-to-split)
- [Section 13: Secrets Management, Machine Hygiene & Bus Factor](#section-13-secrets-management-machine-hygiene--bus-factor)
- [Appendix: Ship Checklists](#appendix-ship-checklists)

---

## Section 0: Decision Record — What to Get Right on Day One

These decisions are expensive or impossible to change once users and data exist. Make them deliberately at project kickoff.

| Decision | Why It's Hard to Change Later |
|----------|-------------------------------|
| **Data isolation strategy** | Retrofitting tenant isolation (RLS, schema-per-tenant, or DB-per-tenant) onto an existing schema requires rewriting every query, every policy, and every test. Data leaks are silent if you miss one. |
| **Auth provider & session model** | Auth touches every route, every middleware, every API call. Switching providers means rewriting session management, user tables, and all invitation flows. |
| **Role & permission model** | Flat role models (`user.role = "admin"`) cannot express scoped access ("admin of Team A but viewer of Team B"). Migrating from flat to hierarchical requires rewriting every permission check. |
| **Tenant hierarchy** | Adding hierarchy levels later requires new foreign keys on every tenant-scoped table, new isolation policies, and new UI navigation. Define your entity hierarchy before writing any schema. |
| **Monorepo vs. polyrepo** | Extracting shared code into packages after the fact creates circular dependency nightmares. Start with shared packages for types, config, and data access from day one. |
| **Testing framework** | Retrofitting tests onto untested code is 3-5x more expensive than writing them alongside features. Data isolation policies are especially dangerous untested. |
| **CI/CD pipeline** | Without CI gates, broken migrations and type errors ship to production. Fixing them after deployment requires emergency rollbacks. Define quality gates before the first feature. |
| **Migration strategy** | Unordered or unnumbered migrations cause conflicts when multiple developers work in parallel. Missing rollback migrations make reverting changes a manual, error-prone process. |
| **Content Security Policy** | Adding CSP later means auditing every inline script and style across the entire app. Nonce-based CSP must be designed into the rendering pipeline from the start. |

---

## Section 1: Repository & Monorepo Architecture

### Recommended Structure

```
project-root/
├── apps/
│   ├── web/              # Customer-facing application
│   └── admin/            # Internal admin application
├── packages/
│   ├── db/               # Database client, types, and middleware
│   ├── config/           # Shared linter, TypeScript, and style configs
│   ├── ui/               # Shared UI component library
│   └── types/            # Shared TypeScript types and API contracts
├── database/
│   ├── migrations/       # Sequential SQL migration files
│   ├── seeds/            # Seed data for local development
│   └── tests/            # Database-level tests (isolation policies, migrations)
├── .github/workflows/    # CI/CD pipeline definitions
└── [monorepo config]     # turbo.json, nx.json, or similar
```

### Key Principles

1. **Shared packages from day one.** Define a `types/` package for all entity types, API contracts, and enums. Define a `db/` package for all database access. Both apps import from these rather than duplicating.

2. **Shared UI from day one.** Buttons, modals, form fields, and layout primitives go in a `ui/` package. Without this, you'll duplicate components across apps and they'll diverge.

3. **Separate config from code.** Linter configs, TypeScript configs, and style configs live in a shared `config/` package so all apps and packages follow the same rules.

### Workspace Dependency Syntax

If using **npm workspaces**, reference internal packages with `"*"`:

```json
{ "dependencies": { "@your-org/types": "*" } }
```

The `"workspace:*"` protocol is pnpm/yarn-only. Using it with npm causes CI build failures.

### Build Cache Invalidation

Whatever monorepo tool you use (Turborepo, Nx, etc.), configure it to invalidate caches when:

- Environment variables change (`globalEnv`)
- Shared config files change (`globalDependencies`)
- Internal package dependencies rebuild (`dependsOn: ["^build"]`)

Without this, stale caches will produce builds with outdated environment values or types.

---

## Section 2: Authentication & Session Management

### Client Separation

Every application that talks to an auth-enabled database needs clearly separated client types:

| Client | Auth Context | Use Case |
|--------|-------------|----------|
| **Browser/public client** | End-user session (cookies/tokens) | Client-side data fetching, user-facing operations |
| **Server client** | End-user session from request cookies | Server-side rendering, API routes, middleware |
| **Admin/service client** | Elevated privileges, bypasses access policies | Server-only admin operations (user creation, role assignment, cross-tenant data access) |

**Critical rule:** Admin operations — creating users, assigning roles, modifying data the current user doesn't own — must use the elevated service client. Using the user-scoped client for admin writes silently fails when access policies block the operation. The write appears to succeed but affects zero rows.

### Session Configuration

| Setting | Recommendation | Rationale |
|---------|---------------|-----------|
| Access token expiry | 1 hour (3600s) | Limits window of stolen token reuse |
| Refresh token rotation | Enabled, single-use | Prevents replay of leaked refresh tokens |
| Minimum password length | 12 characters | NIST SP 800-63B recommendation |
| Email confirmation | Required in production | Prevents account takeover via unverified email |
| Password/email changes | Double-confirmation required | Re-verify identity before sensitive changes |

### Rate Limiting

Implement rate limiting at the database or infrastructure level, not just in application middleware. This ensures limits apply even if the application layer is bypassed.

| Operation | Recommended Limit | Window |
|-----------|------------------|--------|
| Login attempts | 5 | 15 minutes |
| OTP/MFA verification | 3 | 10 minutes |
| Password reset requests | 3 | 1 hour |
| API calls (per user) | Varies by endpoint | 1 minute |

### Auth User Lifecycle

Most auth providers maintain separate internal and application user records. Understand this lifecycle before writing any user management code:

1. **Invitation sent** — Auth provider creates an internal record (e.g., `auth.users`). Your application's `users` table has no record yet.
2. **User accepts invitation** — Auth provider confirms the user. A trigger or callback creates the application user record.
3. **Only now** can you safely create foreign key references to the application user.

**Common bug:** Attempting to FK-reference the application user at invite time, before the record exists. This causes constraint violations or silent failures.

### Day One Requirements

- **MFA for admin users** — Implement TOTP-based multi-factor authentication for all users with admin-level roles.
- **IP allowlisting for admin portal** — Restrict access to internal admin tools by IP address via middleware or CDN.

---

## Section 3: Multi-Tenancy & Data Isolation

### Choose Your Isolation Strategy Early

| Strategy | Isolation Level | Complexity | When to Use |
|----------|----------------|-----------|-------------|
| **Row-Level Security (RLS)** | Row-level via policies | Medium | Most SaaS apps — shared schema, policy-enforced separation |
| **Schema-per-tenant** | Schema-level | High | Regulated industries requiring physical separation within one DB |
| **Database-per-tenant** | Full database | Very high | Enterprise customers requiring complete isolation |

For most applications, **row-level policies are the right default.** They're centralized, auditable, and enforced even for direct database access.

### Database-Level Isolation as the Only Layer

**Principle:** Data isolation must be enforced at the database level. Application code must never contain tenant-filtering logic like `.where('tenant_id', currentTenantId)` as the primary safety mechanism.

**Why:** Application-level tenant checks are scattered across hundreds of queries and are easy to forget. A single missed filter leaks data across tenants. Database-level policies are centralized, enforced on every query regardless of how it's constructed, and auditable in one place.

### Five Hard-Won Isolation Lessons

#### 1. Policy Violations Are Silent

When a query violates an access policy, most PostgreSQL-based systems return **empty results**, not errors. Your code sees "not found" when data actually exists but the user doesn't have access.

**Implication:** You cannot distinguish "record doesn't exist" from "policy blocked access" without checking server-side logs. Design error messages and debugging workflows for this ambiguity.

#### 2. Every CRUD Operation Needs a Policy

When you enable row-level security on a table, **all operations are blocked by default.** You must create explicit policies for SELECT, INSERT, UPDATE, and DELETE. Missing even one causes that operation to silently fail.

Most common miss: forgetting the DELETE policy. Deletions appear to succeed (no error) but the record remains.

#### 3. Complex Joins Can Lose Auth Context

ORMs and query builders that construct multi-table joins may fail to propagate the authentication context through sub-queries. The result: related records return as `null` even when they exist and the user has access.

**Mitigation:** For queries that join more than two tables with row-level policies, use sequential queries (one per table) instead of deep nested joins. Each query then carries full auth context.

#### 4. Helper Functions Need Explicit Permissions

If your access policies call helper functions (e.g., `get_user_tenant_id()`), those functions need explicit execute permissions granted to the appropriate database role. Without this, the policy itself fails with a "permission denied" error.

#### 5. Writes Must Include the Tenant Identifier

INSERT policies typically verify that the new row's tenant ID matches the user's tenant. If your application code omits the tenant ID on insert, the policy check fails silently — the insert appears to succeed but no row is created.

**Always set the tenant identifier explicitly on every INSERT**, even if you think a database default or trigger should handle it.

### Scope-Based Role Assignments

A user should be able to hold different roles at different levels of your tenant hierarchy. For example: "Admin of Team A, Viewer of Team B."

Store role assignments with:
- **Role key:** What the user can do (`admin`, `editor`, `viewer`)
- **Scope type:** At what level (`organization`, `team`, `project`)
- **Scope IDs:** Which specific entities the role applies to

This is more complex than a flat `user.role` column but is nearly impossible to retrofit later.

---

## Section 4: Security Hardening

### Security Headers

Apply these headers via middleware on every HTTP response:

| Header | Value | Purpose |
|--------|-------|---------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Force HTTPS |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Control referrer leakage |
| `Content-Security-Policy` | Restrictive policy (see below) | Prevent XSS, code injection |

**CSP guidance:** Start with a restrictive policy that disallows `unsafe-inline` for scripts and styles. Use nonces or hashes if inline code is unavoidable. Adding CSP after the app is built requires auditing every inline script and style.

Force HTTPS in production by redirecting all HTTP requests with a 301.

### Error Sanitization

| Context | What to Show | What to Log |
|---------|-------------|-------------|
| Client-facing API response | Generic message: "An error occurred." | Nothing sensitive |
| Server-side logs | Full error, stack trace, request context | Everything for debugging |
| Password reset / login failure | Identical response regardless of email validity | Whether the account existed (for security monitoring) |

**User enumeration prevention:** Authentication and password reset endpoints must return identical responses whether or not the email exists. Varying responses (different error messages, different response times) allow attackers to discover valid accounts.

### Privileged Database Keys

Any credential that bypasses access policies (service role keys, admin API keys):

- Must never appear in client-accessible environment variables
- Must never be imported in browser-side code
- Must only be used in server-side routes and background jobs
- Should be stored with server-only scope in your deployment platform

### Privileged Database Functions

Functions that execute with elevated privileges (e.g., `SECURITY DEFINER` in PostgreSQL) bypass all access policies. Every such function **must**:

1. Verify the caller's identity as its first operation
2. Check the caller's authorization level
3. Limit returned data to what the caller should see
4. Set `search_path` explicitly to prevent hijacking

```sql
CREATE FUNCTION sensitive_operation()
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- FIRST: verify authorization
  PERFORM require_authorized_caller();
  -- THEN: do the work
  ...
END;
$$;
```

### Session Management

Implement session tracking with revocation support:

- Track active sessions in a database table
- Provide single-session logout ("sign out this device")
- Provide full session revocation ("sign out everywhere")
- Schedule cleanup of expired sessions

### Additional Security Measures

- **Secrets scanning in CI** — Run `gitleaks` or equivalent on every PR to catch committed credentials.
- **Dependency auditing** — Run `npm audit` (or equivalent) in CI. Block merges on high/critical vulnerabilities.
- **Penetration testing** — Schedule regular security assessments using OWASP ZAP, Burp Suite, or third-party auditors.
- **Storage security** — Restrict file uploads by MIME type and file size. Enforce access policies on storage buckets.

---

## Section 5: API Design & Input Validation

### Consistent Response Format

Adopt a uniform response envelope across all API endpoints:

```typescript
// Success
{ data: T, error: null }

// Error
{ data: null, error: string | ValidationError }
```

This allows clients to handle responses uniformly without inspecting status codes for every endpoint.

### Schema Validation on All Inputs

Validate every API input with a schema library (Zod, Yup, AJV, etc.) before processing. Never trust client data.

```typescript
const CreateItemSchema = z.object({
  name: z.string().min(1).max(255),
  category: z.enum(['typeA', 'typeB', 'typeC']),
  tenant_id: z.string().uuid(),
});

export async function POST(request: Request) {
  const parsed = CreateItemSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json({ data: null, error: parsed.error.flatten() }, { status: 400 });
  }
  // Proceed with validated data
}
```

Centralize schema definitions in a shared package so they can be used for both server-side validation and client-side form validation.

### Client-Side Data Fetching Conventions

If using a query caching library (React Query, SWR, Apollo, etc.):

1. **Include tenant/scope identifiers in cache keys.** This triggers automatic refetching when the user switches context (tenant, team, project).
   ```
   key: ["items", tenantId, filters]
   ```

2. **Invalidate related caches after mutations.** When creating an item, invalidate both the item list cache and any related entity caches.

3. **Expose both raw IDs and full objects from context providers.** Raw IDs (from state) update immediately on context switch. Full objects (from async queries) may be stale during refetch. Cache keys need the raw ID for instant reactivity; display components need the full object for labels and metadata.

---

## Section 6: Database Schema & Migrations

### Migration Strategy

**File naming:** Use sequential timestamps: `YYYYMMDDHHMMSS_descriptive_name.sql`

This ensures:
- Migrations are applied in the correct order
- Multiple developers can create migrations without collisions (timestamp-based, not sequence-based)
- The migration history is human-readable

**Forward-only in production.** Migrations are applied sequentially and never edited after being applied. To change something, create a new migration.

**Idempotent migrations.** Every migration must be safe to run more than once. Migrations may be applied via CI (`supabase db push`), via Supabase MCP, or re-run after a partial failure; the same SQL must not fail if objects already exist. Use `CREATE TABLE IF NOT EXISTS`; `DROP POLICY IF EXISTS` before `CREATE POLICY`; `CREATE INDEX IF NOT EXISTS`; `ADD COLUMN IF NOT EXISTS`; `DROP CONSTRAINT IF EXISTS` before adding constraints. See `supabase/migrations/README.md` for patterns. Non-idempotent migrations break CI and multi-path deployment.

**Down migrations:** Every forward migration should have a corresponding rollback script, even if it's just a stub explaining manual steps. Without rollback scripts, reverting a broken migration is an emergency improvisation.

### Schema Conventions

| Convention | Rule | Rationale |
|-----------|------|-----------|
| Primary keys | UUIDs | Prevents sequential ID enumeration; safe to expose in URLs |
| Timestamps | `created_at` and `updated_at` on every table | Essential for debugging, auditing, and sync |
| Foreign key indexes | Always indexed | Unindexed FKs cause full table scans on joins and cascaded deletes |
| Soft deletes | `status` column or `deleted_at` timestamp | Preserves audit trail; enables undo functionality |
| Naming | snake_case for tables and columns | Consistent, avoids quoting issues across tools |

### JSONB vs. Normalized Tables

| Use JSONB When | Use Normalized Tables When |
|---------------|---------------------------|
| Structure varies per record | Structure is consistent across records |
| Data is read/written as a whole blob | Individual fields are queried, filtered, or sorted |
| Schema flexibility is required (user-defined fields) | Referential integrity matters (FK relationships) |
| Rarely queried by individual sub-fields | Fields participate in joins or aggregations |

When using JSONB, define the expected shape in your application's type system. The database stores anything; your types enforce the contract.

### Seed Data

Seed scripts must be **idempotent** — safe to run multiple times without creating duplicates:

```sql
INSERT INTO categories (key, label) VALUES ('type_a', 'Type A')
ON CONFLICT (key) DO NOTHING;
```

This enables developers to reset their local databases to a known state at any time.

---

## Section 7: Timezone Architecture

### Core Principle: "Times Belong to Locations, Not Viewers"

When your application manages events or records tied to physical locations, display times in the **location's timezone**, not the viewer's browser timezone.

A manager in New York viewing a compliance log from a Nevada location must see Nevada time. Displaying browser-local time produces incorrect compliance documentation and confuses users managing multiple locations.

### Storage Strategy

| Data Type | Database Type | Examples | Rationale |
|-----------|--------------|---------|-----------|
| Events | `TIMESTAMP WITH TIME ZONE` | `created_at`, `start_time` | Stored as UTC, convertible to any timezone on display |
| Business dates | `DATE` | `due_date`, `scheduled_date` | Represents a calendar day at the location, no time component |
| Entity timezone | `TEXT` (IANA format) | `locations.timezone` | `America/New_York`, `Europe/London` — never use UTC offsets |

### Display Rules

| Context | Display In |
|---------|-----------|
| Single-location views | Location's timezone (no abbreviation needed) |
| Cross-location dashboards | Each item's location timezone + abbreviation (e.g., "2:30 PM PST") |
| Compliance/audit reports | Location's timezone (legal requirement) |
| User preferences | User's chosen timezone or primary location |

### Implementation Rules

1. **Never use browser-local time for business dates.** The local date in the viewer's timezone may differ from the local date at the location. Use the location's timezone to compute business dates.

2. **Always show timezone indicators** when displaying times — either in the header ("Holly Springs (EST)") or inline ("2:30 PM PST").

3. **Store IANA timezone identifiers**, not UTC offsets. Offsets don't account for daylight saving transitions. `America/New_York` is correct; `UTC-5` is fragile.

### Utility Functions to Build

| Function | Purpose |
|----------|---------|
| `formatInTimezone(date, tz)` | Display a UTC timestamp in a specific timezone |
| `getLocalDate(tz)` | Get today's date string in a specific timezone |
| `getTimezoneAbbreviation(tz)` | Convert IANA identifier to abbreviation ("EST", "PST") |
| `formatForCompliance(date, tz)` | Full audit-ready format with timezone |

---

## Section 8: DevOps & Deployment Pipeline

### Managed Infrastructure Recommendations

For most startups and early-stage teams, managed services reduce operational burden dramatically:

| Concern | Managed Option | Benefit |
|---------|---------------|---------|
| App hosting | Vercel, Netlify, Railway, Render | Zero-config framework deployment, preview environments per PR |
| Database + Auth | Supabase, Firebase, Neon, PlanetScale | Managed Postgres/MySQL with built-in auth and access policies |
| Build orchestration | Turborepo, Nx | Incremental builds, caches, task parallelization |
| SSL/DNS | Your hosting platform | Automatic certificate provisioning |

### Multi-App Deployment

If your monorepo contains multiple apps (customer-facing + admin), deploy each as a separate project pointing to the same repository with different root directories. They share the same database but have independent deployment lifecycles.

### Rollback Procedures

**Application rollback:** Most hosting platforms allow promoting a previous deployment to production. Document this procedure and test it before you need it.

**Database rollback:** Requires down migrations (see Section 6). Always back up data before rolling back migrations that modify existing records. A broken migration with no rollback script is a midnight emergency.

### CI/CD Pipeline — Build This Before Your First Feature

Create a CI pipeline that runs on every pull request:

```
┌─────────┐    ┌────────────┐    ┌──────┐    ┌─────┐    ┌───────────┐    ┌──────────┐
│  Lint   │───▶│ Type-check │───▶│ Test │───▶│ E2E │───▶│ Migration │───▶│ Security │
└─────────┘    └────────────┘    └──────┘    └─────┘    └───────────┘    └──────────┘
```

| Job | What It Catches |
|-----|----------------|
| **Lint** | Style violations, unused variables, import issues |
| **Type-check** | Type errors, missing properties, incorrect function signatures |
| **Unit/integration tests** | Logic bugs, permission errors, validation failures |
| **E2E tests** | Broken user flows, auth issues, data isolation violations |
| **Migration check** | Migrations that fail on a fresh database or conflict with existing data |
| **Security scan** | Committed secrets (gitleaks), vulnerable dependencies (npm audit) |

Without these gates, every issue listed above will eventually ship to production.

### Staging Environment

Create a separate infrastructure stack for staging:

- Staging database with production-like data (anonymized)
- Staging deployment URL (e.g., `staging.yourapp.com`)
- All migrations tested on staging before production
- QA sign-off required before production deploy

### Infrastructure-as-Code

Use Terraform, Pulumi, or SST to manage:

- Database configuration (auth settings, storage, access policies)
- Hosting platform settings (environment variables, domains, build config)
- DNS records
- Monitoring and alerting rules

Benefits: reproducible environments, auditable changes, disaster recovery, and new-developer onboarding in minutes instead of hours.

---

## Section 9: Testing Strategy

### Why This Section Exists

Building without tests is borrowing against your future self. The cost compounds: 22+ issues in one project that automated tests would have caught, plus manual QA cycles, plus low confidence during every refactor. Build testing into the project from day one.

### Test Pyramid

Target ratio: **Unit 70% / Integration 20% / E2E 10%**

#### Unit Tests

Test pure logic in isolation — no network, no database, no UI:

- Permission checking functions (given role X and scope Y, can user do Z?)
- Data transformation functions (given API response, correct UI model?)
- Validation schemas (given invalid input, correct error messages?)
- Utility functions (timezone conversion, formatting, calculations)

**Framework:** Vitest, Jest, or your language's standard test runner.

#### Integration Tests

Test components or modules that interact with each other:

- React components that consume context providers
- Permission-gated UI (button hidden for unauthorized users)
- Form validation (error messages display correctly)
- API route handlers with mocked database responses

**Framework:** Testing Library, Enzyme, or your framework's component testing tools.

#### E2E Tests

Test critical user journeys through the full stack:

- Authentication flows (login, logout, password reset, invitation acceptance)
- Multi-tenant isolation (User A cannot see User B's data)
- CRUD operations with access policy enforcement
- Cross-app flows (admin creates user, user logs into customer app)

**Framework:** Playwright, Cypress, or your platform's E2E tooling.

#### Database Tests

Test access policies and migrations directly against the database:

- **Policy tests:** Simulate an authenticated user and verify they can only see their own tenant's data.
- **Migration tests:** Verify migrations apply cleanly to both a fresh database and one with existing data.
- **Rollback tests:** Verify down migrations reverse the forward migration without data loss.

---

## Section 10: Developer Experience & Code Quality

### TypeScript Configuration

- **Strict mode enabled** — `"strict": true`. Catches entire categories of bugs at compile time.
- **No `any`** — Use `unknown` with type guards. Every `any` is a runtime bug waiting to happen.
- **Interface-typed component props** — All component props defined as named interfaces, not inline types.
- **Generated database types** — Use your ORM's or database client's type generation. Manual type definitions drift from the actual schema.

### Commit Convention

Use semantic commits for meaningful changelogs, automated versioning, and reviewable history:

```
feat(auth): Add password reset flow with rate limiting
fix(api): Handle expired tokens in middleware gracefully
chore(deps): Update database client to latest version
refactor(permissions): Consolidate scope-checking helpers
test(isolation): Add RLS policy tests for equipment table
```

Format: `type(scope): imperative description`

Types: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`, `perf`, `ci`

### PR Template

Create `.github/PULL_REQUEST_TEMPLATE.md` with your ship checklist (see Appendix). Every PR must complete this checklist before merge. This catches the same class of bug that caused 80% of production issues in the reference project.

### CONTRIBUTING.md

Every project needs a CONTRIBUTING.md covering:

- Repository structure and how packages relate
- How to run the project locally (one command, ideally)
- Database migration workflow (create, test locally, apply to staging, apply to production)
- Coding standards and linting rules
- PR process and review expectations
- How to add a new feature end-to-end (the "new developer's first ticket" guide)

---

## Section 11: Observability & Monitoring

### Error Tracking — From First Deployment

Integrate Sentry, Bugsnag, or equivalent before shipping any feature:

- Upload source maps for readable stack traces in production
- Tag errors by environment (production, staging, development)
- Configure alerts for new error types (Slack, email, PagerDuty)
- Track release health and detect regressions per deploy

The cost of adding error tracking after the first production incident is the incident itself. Add it before.

### Structured Logging

Use JSON-formatted logs with correlation IDs:

```json
{
  "level": "error",
  "correlationId": "req-abc-123",
  "message": "Item creation failed",
  "userId": "user-uuid",
  "tenantId": "tenant-uuid",
  "error": "unique constraint violation",
  "timestamp": "2026-01-19T14:30:00Z"
}
```

**Correlation IDs** allow tracing a single user action across middleware, API handler, background job, and database — essential for debugging multi-step operations.

**Log levels:** Use them consistently:
- `error` — Something failed and needs attention
- `warn` — Something unexpected happened but was handled
- `info` — Significant business events (user created, payment processed)
- `debug` — Detailed diagnostic information (disabled in production)

### Audit Log

Log all write operations for compliance and debugging:

```sql
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action VARCHAR NOT NULL,        -- 'create', 'update', 'delete'
  table_name VARCHAR NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

This table answers "who changed what, when, and what was it before?" — invaluable for debugging data issues and required for most compliance frameworks.

### Health Checks

Expose a `/api/health` endpoint on each application:

```typescript
export async function GET() {
  const checks = {
    database: await pingDatabase(),
    auth: await pingAuthService(),
    storage: await pingStorageService(),
  };
  const healthy = Object.values(checks).every(c => c.status === 'ok');
  return Response.json(
    { status: healthy ? 'healthy' : 'degraded', checks },
    { status: healthy ? 200 : 503 }
  );
}
```

Monitor these endpoints with an external uptime service (UptimeRobot, Checkly, Pingdom). Internal health checks can't tell you when the entire app is down.

### Monitoring Stack

| Layer | Purpose | Examples |
|-------|---------|---------|
| Error tracking | Exception capture, source maps | Sentry, Bugsnag |
| Uptime monitoring | External availability checks | UptimeRobot, Checkly |
| Application performance | Response times, web vitals | Vercel Analytics, Datadog, New Relic |
| Database monitoring | Query performance, connections, storage | Your database provider's dashboard |
| Security monitoring | Failed logins, suspicious activity | Auth provider logs, custom alerts |
| Log aggregation | Centralized search and alerting | Datadog, Logflare, CloudWatch |

---

## Section 13: Secrets Management, Machine Hygiene & Bus Factor

### Why This Section Exists

A solo founder or small team has a single point of failure: the person who set everything up. If that person's laptop dies, their account gets locked, or they're unavailable, can someone else keep the product running? This section covers secrets management, local machine practices, and operational continuity — the things that don't feel urgent until they are.

### Secrets Management

#### The Hierarchy of Secrets

Not all secrets are equal. Classify them by blast radius:

| Tier | Examples | Compromise Impact | Storage |
|------|----------|-------------------|---------|
| **Critical** | Supabase service role key, database password, Supabase JWT secret | Full data access, bypass all RLS | Deployment platform only (Vercel env vars, server-only scope) |
| **High** | Twilio auth token, Resend API key, Anthropic API key | Can send messages/emails/AI calls as you, incur costs | Deployment platform only |
| **Medium** | Supabase anon key, `NEXT_PUBLIC_*` vars | Public by design, but scope abuse possible | Deployment platform + `.env.local` |
| **Low** | GitHub PATs (scoped), MCP OAuth client secrets | Scoped access, revocable | Deployment platform, 1Password/Bitwarden |

#### Rules

1. **Never commit secrets to git.** Even in a private repo. Git history is forever — `git filter-branch` is unreliable and painful. Use `.env.local` (gitignored) for local development, deployment platform env vars for staging/production.

2. **Never put critical secrets in `NEXT_PUBLIC_*` variables.** These are embedded in client-side JavaScript bundles and visible to anyone who opens browser DevTools. Only the Supabase anon key and site URL belong in `NEXT_PUBLIC_*`.

3. **Use a password manager for all credentials.** 1Password, Bitwarden, or equivalent. Every API key, every login, every recovery code. The password manager is your single source of truth — not a `.env` file on your laptop, not a Slack message, not your memory.

4. **Rotate secrets on a schedule.** At minimum: when someone leaves the team, when a secret may have been exposed, and annually for long-lived keys. Document the rotation procedure for each secret (where to generate a new one, where to update it).

5. **Scope API keys to minimum required permissions.** A GitHub PAT should have only the permissions it needs. A Supabase service role key should only exist in server-side code. Twilio keys should be restricted to the specific phone numbers in use.

#### Where Secrets Should Live

| Environment | Secret Storage | Access |
|-------------|---------------|--------|
| **Local development** | `.env.local` (gitignored) + password manager | Developer's machine only |
| **CI (GitHub Actions)** | Repository secrets or environment secrets | Encrypted, injected at runtime |
| **Staging (Vercel)** | Project environment variables, Preview scope | Vercel dashboard, team members |
| **Production (Vercel)** | Project environment variables, Production scope | Vercel dashboard, restricted to admins |

#### Secret Inventory

Maintain a living inventory of every secret the platform uses. Store this in your password manager, not in the repo.

| Secret | Provider | Where Used | Rotation URL | Notes |
|--------|----------|------------|-------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | Client + server | Supabase dashboard → Settings → API | Public, non-sensitive |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | Client + server | Supabase dashboard → Settings → API | Public, RLS-scoped |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | Server only (admin ops) | Supabase dashboard → Settings → API | **Critical** — bypasses RLS |
| `SUPABASE_JWT_SECRET` | Supabase | Server only (MCP auth) | Supabase dashboard → Settings → API | **Critical** — validates JWTs |
| `TWILIO_ACCOUNT_SID` | Twilio | Server only (SMS) | Twilio console → Account Info | |
| `TWILIO_AUTH_TOKEN` | Twilio | Server only (SMS) | Twilio console → Account Info | Regeneratable |
| `TWILIO_PHONE_NUMBER` | Twilio | Server only (SMS) | Twilio console → Phone Numbers | |
| `RESEND_API_KEY` | Resend | Server only (email) | Resend dashboard → API Keys | |
| `ANTHROPIC_API_KEY` | Anthropic | Admin server only (demo AI) | Anthropic console → API Keys | |
| GitHub PATs | GitHub | CI workflows | GitHub → Settings → Developer settings → PATs | Scope to minimum permissions |

### Local Development Machine

#### What's on Your Laptop That Isn't in the Cloud

Your local machine contains things that don't exist anywhere else. Identify and protect them:

| Item | Risk if Lost | Mitigation |
|------|-------------|------------|
| **`.env.local` files** | Can't run the app locally until recreated | Store all values in password manager. Document which env vars each app needs in `.env.example`. |
| **SSH keys** | Lose git push access, server access | Back up private keys to password manager. Or: use per-machine keys and just generate new ones. |
| **GPG keys** (if signing commits) | Lose verified commit ability | Back up to password manager. Or: use SSH signing instead. |
| **Browser sessions / cookies** | Lose access to Supabase dashboard, Vercel, GitHub, etc. | All behind password manager + 2FA. Recoverable from any machine. |
| **Uncommitted code** | Lose work in progress | Push WIP branches frequently. Use `git stash` for quick saves. |
| **Local database state** | Lose test data | Supabase is remote — local state is just a dev convenience, not critical. |
| **IDE settings / extensions** | Lose productivity setup | VS Code: Settings Sync. Cursor: exports. Low-priority — recreatable in an hour. |

#### Backup Strategy

| Layer | Tool | What It Covers | Frequency |
|-------|------|---------------|-----------|
| **Full machine backup** | Time Machine (macOS) | Everything on disk — code, config, documents, apps | Continuous (hourly) |
| **Off-site backup** | iCloud Drive, Backblaze, or similar | Recovery from theft, fire, hardware failure | Continuous |
| **Code** | GitHub | All committed code, branches, PRs, issues | Every push |
| **Secrets** | 1Password / Bitwarden | API keys, passwords, recovery codes, SSH keys | Synced to cloud automatically |
| **Database** | Supabase automatic backups | All production data | Daily (Supabase Pro) or point-in-time recovery |

**The test:** If your laptop caught fire right now, could you buy a new one and be fully operational within 4 hours? If yes, your backup strategy is adequate.

Checklist for the "new laptop" scenario:
1. Install password manager → all credentials restored
2. Install git, clone repo → all code restored
3. Copy `.env.local` values from password manager → local dev working
4. Log into Vercel, Supabase, GitHub via password manager → cloud access restored
5. Install IDE + extensions → productivity restored

#### macOS-Specific Recommendations

- **FileVault disk encryption:** Enable it. Non-negotiable. A stolen laptop with an unencrypted disk is a full data breach.
- **Firmware password / Find My Mac:** Enable both. Remote wipe capability if the machine is stolen.
- **Automatic updates:** Keep macOS and Xcode command line tools updated. Security patches matter.
- **Don't store secrets in plain text files.** No `passwords.txt` on the desktop. No API keys in Notes.app. Password manager only.

### Bus Factor: Operational Continuity

The "bus factor" is the number of people who, if unavailable, would halt the project. For a solo founder, it's 1. The goal is to make that number irrelevant by ensuring everything is documented and accessible.

#### Access Inventory

Document every system the platform depends on, who has access, and how to grant it to someone new:

| System | Purpose | Access Method | Recovery Path |
|--------|---------|---------------|---------------|
| **GitHub** (bbellwfu/fanflet) | Source code, CI, issues | GitHub account + 2FA | Add collaborator via GitHub settings. Org account preferred over personal. |
| **Vercel** (fanflet project) | Hosting, deployments, env vars | Vercel account + 2FA | Add team member via Vercel dashboard. Use a Vercel Team, not a personal account. |
| **Supabase** (project: eoihlmxmbtzsixoapgif) | Database, auth, storage, RLS | Supabase account + 2FA | Add team member via Supabase Org settings. Service role key in password manager. |
| **Domain registrar** | DNS for fanflet.com | Registrar account + 2FA | Transfer or add collaborator. Document the registrar and account. |
| **Twilio** | SMS sending | Twilio account + 2FA | Add team member via Twilio console. |
| **Resend** | Email sending | Resend account + 2FA | Add team member via Resend dashboard. |
| **Apple Developer** (if applicable) | App Store, signing | Apple ID + 2FA | Add to team via App Store Connect. |

#### Critical Actions Someone Else Must Be Able To Do

If you're unavailable, another person must be able to:

| Action | How | Documented Where |
|--------|-----|-----------------|
| **Deploy a hotfix** | Push to `develop` → auto-deploys to staging. Merge to `main` → auto-deploys to production. | This memo + CLAUDE.md |
| **Roll back a broken deploy** | Vercel dashboard → Deployments → promote previous deployment | Vercel docs |
| **Access production database** | Supabase dashboard → SQL Editor (requires Supabase org access) | Password manager |
| **Rotate a compromised secret** | Generate new key at provider → update in Vercel env vars → redeploy | Secret inventory above |
| **Apply a database migration** | Push migration file to `develop` or `main` → `migrate.yml` workflow runs automatically | CLAUDE.md, `supabase/migrations/README.md` |
| **Access error logs** | Vercel dashboard → Deployments → Runtime Logs; Supabase → Logs | — |
| **Send a platform communication** | Admin portal → Communications → New | Admin app UI |

#### Recommended Steps (Do These Now)

1. **Use organization accounts, not personal accounts.** Create a Vercel Team, a Supabase Organization, and a GitHub Organization. Personal accounts die with the person (or their email access). Org accounts can have multiple owners.

2. **Add a trusted second person to every critical system.** Even if they're not actively developing, they need the ability to log in and take action. A co-founder, a trusted advisor, or a contracted DevOps person.

3. **Store recovery codes in your password manager.** Every 2FA-enabled account generates recovery codes. If you lose your phone and your laptop simultaneously, recovery codes are the only way back in. They must be in a cloud-synced password manager, not on the devices they're protecting.

4. **Document the "emergency runbook."** A single document (stored in the password manager, not in the repo) that says: "If Brian is unavailable, here's how to keep Fanflet running." Include: account credentials (or paths to them in the password manager), how to deploy, how to roll back, who to contact at each provider for account recovery.

5. **Test the runbook.** Have your second person actually log into each system and perform a non-destructive action (view a deployment, run a read-only SQL query). An untested runbook is a fiction.

#### Password Manager as the Keystone

Everything above converges on one tool: your password manager. It is the single point of recovery for every other system. Protect it accordingly:

- Use a strong, unique master password (20+ characters, memorized, written nowhere digital)
- Enable 2FA on the password manager itself (TOTP, not SMS)
- Store the emergency kit / recovery key in a physical location (safe deposit box, sealed envelope with a trusted person)
- Use the password manager's sharing features to grant access to specific vaults for your second person

If your password manager is secure, accessible, and shared appropriately, every other system is recoverable.

---

## Appendix: Ship Checklists

### Before Shipping a Feature

- [ ] All mutations have success and error feedback (toast notifications, inline messages, etc.)
- [ ] Loading states shown during async operations (button spinners, skeleton screens)
- [ ] Destructive actions have confirmation dialogs
- [ ] Database constraints reviewed (unique, FK, check) — know what will reject your data
- [ ] Edge cases tested: duplicate submissions, missing data, invalid state transitions
- [ ] Queries that expect exactly one row handle the zero-row case gracefully
- [ ] New environment variables documented in `.env.example` or equivalent
- [ ] Auth user lifecycle understood — know when application user records exist vs. auth-only records
- [ ] Admin/elevated operations use the correct privileged client, not the user-scoped client
- [ ] Pages render with full navigation shell (sidebar, header visible — not orphaned)
- [ ] Access policies created for all four CRUD operations (SELECT, INSERT, UPDATE, DELETE)
- [ ] Role assignment verified end-to-end after onboarding or invitation flows
- [ ] Internal identifiers have user-friendly display labels (never show raw enum values)
- [ ] Permission checks gate UI actions appropriately (hidden, disabled, or error state)

### Before Deploying Database Functions

- [ ] SQL tested against the actual database first, not just reviewed in code
- [ ] Table and column names verified against `information_schema` (not assumed)
- [ ] Privileged functions (SECURITY DEFINER or equivalent) include authorization checks
- [ ] Return structure matches the frontend's TypeScript interface or data contract
- [ ] Error cases handled gracefully (bad input, missing records, constraint violations)
- [ ] Execution context is explicitly scoped (e.g., `search_path` set to prevent hijacking)

### Before Deploying Schema Changes

- [ ] New schema or tables are accessible through the API layer (or exposed via RPC functions)
- [ ] Access policies tested for circular dependencies (Policy A depends on table B which depends on Policy A)
- [ ] Self-access policies added where needed (e.g., user can always read their own record)
- [ ] Query patterns match access policy conditions (querying by the right column)
- [ ] Down migration exists and has been tested

### Pre-Launch Security Checklist

- [ ] Security headers active on all responses (HSTS, X-Frame-Options, CSP, X-Content-Type-Options, Referrer-Policy)
- [ ] Error messages sanitized — no stack traces, SQL errors, or internal details sent to clients
- [ ] User enumeration prevented — login and password reset return identical responses regardless of email validity
- [ ] HTTPS enforced on all domains (HTTP redirects to HTTPS)
- [ ] Tokens never passed in URLs — authorization headers only
- [ ] Access policies enabled and tested on all database tables
- [ ] Privileged database keys not exposed in client-side code or environment variables
- [ ] Rate limiting active on authentication endpoints (login, OTP, password reset)
- [ ] Password requirements enforced (12+ characters, complexity rules)
- [ ] Session revocation tested (single-session logout, "log out everywhere")
- [ ] Storage/upload security configured (MIME type restrictions, file size limits, scoped access)
- [ ] Secrets scanning enabled in CI pipeline
- [ ] Admin portal access restricted (role checks, optional IP allowlisting)
- [ ] Security monitoring configured (failed login alerts, audit log review)
- [ ] Cleanup jobs scheduled (expired sessions, old rate-limiting records, stale security logs)

---

## Section 12: Architecture Maturity & When to Split

### Why This Section Exists

Early-stage teams often worry they're building something that will need to be thrown away. The fear is that architectural decisions made today will become technical debt that forces a rewrite. This section provides concrete criteria for evaluating architectural maturity and knowing when (and when not) to split a codebase.

### The Monorepo-to-Services Spectrum

Most applications evolve through these stages. The key insight is that **you don't need to plan for stage 4 when you're at stage 2** — you just need clean boundaries so the transition is a migration, not a rewrite.

```
Stage 1: Single App              "One Next.js app does everything"
Stage 2: Modular Monorepo        "Multiple apps + shared packages in one repo"
Stage 3: Monorepo + Workers      "Add background processing, event queues"
Stage 4: Service Extraction       "Extract high-traffic or divergent components"
Stage 5: Distributed Services     "Independent teams, independent deployments"
```

**Most successful products stay at Stage 2-3 until 10-20 engineers.** Premature progression to Stage 4-5 is the most common architectural mistake in startups — it trades feature velocity for infrastructure complexity.

### Signals That Your Architecture Is Sound

An architecture is production-grade (not a "vibe-coded weekend project") when it has:

| Property | What It Means | How to Verify |
|----------|---------------|---------------|
| **Type safety** | TypeScript strict mode, no `any`, Zod validation on inputs | `tsc --noEmit` passes with zero errors |
| **Data isolation** | Authorization enforced at database level, not application code | RLS policies on every table, tested in CI |
| **Schema versioning** | Database changes are versioned, ordered, and reproducible | Migration files in version control, idempotent |
| **Separation of concerns** | Business logic is framework-agnostic | Shared packages (`core`, `db`) have zero React/Next.js imports |
| **Automated quality gates** | CI catches regressions before deployment | Lint, type-check, tests, build all pass on every PR |
| **Test coverage** | Critical business logic has automated verification | Pure functions tested, security properties verified |
| **Environment separation** | Development, staging, and production are isolated | Separate database instances, deployment URLs, env vars |
| **Deployment automation** | Code ships via CI/CD, not manual steps | Push to branch → automatic deployment |

If your codebase has all eight, it is production-grade software. The specific framework, hosting provider, or language is secondary — these properties are what determine whether a codebase can scale, be maintained by a team, and survive refactoring.

### Signals That Warrant Splitting

Do **not** split proactively. Split reactively when one of these becomes a blocking problem:

| Signal | Threshold | What to Do |
|--------|-----------|------------|
| **Build time** | Deploys exceed 10 minutes consistently | Optimize build caching first. If that fails, extract the slowest app into its own deployment. |
| **Team contention** | Two teams regularly block each other's PRs or deploys | Split along team boundaries. Each team owns its own app/service. |
| **Runtime mismatch** | A component needs a fundamentally different runtime (Python ML, WebSocket server, GPU compute) | Extract that component into its own service. Keep everything else together. |
| **Scaling mismatch** | One component needs 100x the resources of another | Extract the hot component. Serverless platforms handle moderate scaling mismatches automatically. |
| **Release cadence conflict** | Team A needs to ship hourly, Team B ships weekly, and they share a deployment | Separate deployments. This doesn't necessarily mean separate repos. |
| **Data boundary** | A subsystem needs its own database (different scaling, backup, or compliance requirements) | Extract the subsystem and its data. This is the most expensive split. |
| **Compliance boundary** | Regulation requires physical isolation of data or infrastructure (HIPAA, SOX, PCI-DSS) | Isolate the regulated components into their own infrastructure. Non-negotiable when applicable. |

### The Cost of Splitting

Every split introduces ongoing costs that didn't exist before:

| Cost | Description |
|------|-------------|
| **Type sharing** | Direct imports become a publish/consume cycle. Types can drift between producer and consumer. |
| **Deployment coordination** | Features that span services require coordinated deploys. Rollbacks become multi-step. |
| **API versioning** | Internal function calls become HTTP contracts. Breaking changes require migration strategies. |
| **Auth propagation** | Tokens must be forwarded between services. CORS configuration. Service-to-service auth. |
| **Local development** | Running the full system locally means starting multiple processes with correct env vars. |
| **Distributed debugging** | Errors span multiple services. Correlation IDs and distributed tracing become required, not optional. |
| **Contract testing** | Changes to shared interfaces must be verified across all consumers. |

For a team of 1-5 engineers, these costs typically exceed the benefits. The break-even point is roughly 8-10 engineers working on the same codebase.

### What to Extract First (When the Time Comes)

When splitting becomes warranted, extract in this order:

1. **Background workers** — Jobs that don't need to respond to HTTP requests (email sending, analytics aggregation, cleanup tasks, webhook delivery). These have the cleanest boundary and lowest coordination cost. Most serverless platforms (Vercel + Inngest, AWS Lambda + SQS) provide this without a separate service.

2. **Public API** — If you need API consumers beyond your own frontend (mobile app, third-party integrations), extract a standalone API service. Your existing `packages/core` business logic becomes the service layer with zero rewrite.

3. **Admin/internal tools** — If the admin app has different scaling, security, or access requirements. This is often already a separate deployment in a monorepo setup.

4. **Data-intensive pipelines** — Analytics processing, reporting, ML features. These often need different runtimes (Python) or database configurations (read replicas, columnar storage).

### What Makes a Codebase Splittable (Invest Here)

The ability to split later depends entirely on having clean boundaries today. These boundaries cost almost nothing to maintain but make future extraction straightforward:

| Boundary | Implementation | Why It Matters |
|----------|----------------|----------------|
| **Framework-agnostic business logic** | Shared package (`packages/core`) with zero framework imports | If you extract an API service, core becomes its business layer with no rewrite |
| **Database access abstraction** | Shared package (`packages/db`) that creates typed clients | Swap the database provider or connection strategy in one place |
| **Type contracts** | Shared package (`packages/types`) with generated types | Types travel with the business logic, not the framework |
| **Explicit dependency direction** | Apps depend on packages, packages never depend on apps | Clean extraction — pull the package out, publish it, import it |

### Vendor Lock-In Assessment

Evaluate each major dependency for exit cost:

| Dependency | Lock-In Risk | Exit Strategy |
|------------|-------------|---------------|
| **PostgreSQL** | Very low | Industry standard. Runs anywhere. All major cloud providers offer managed Postgres. |
| **TypeScript** | Very low | Compiles to standard JavaScript. Types are a development tool, not a runtime dependency. |
| **React/Next.js** | Low | Business logic in `packages/core` is framework-agnostic. UI is the replaceable layer. Next.js runs self-hosted (not Vercel-only). |
| **Supabase** | Low-Medium | Uses standard Postgres, standard SQL, standard RLS policies. Auth helpers are isolated in `packages/db`. Migration cost: 2-3 weeks to swap the client library and auth flow. |
| **Vercel** | Low | Next.js deploys on any Node.js platform (Railway, Render, Coolify, self-hosted). No Vercel-specific APIs beyond optional analytics. |
| **Tailwind CSS** | Low | Utility classes compile to standard CSS. Switching to another CSS approach doesn't affect business logic. |

The highest lock-in risk is always the **data layer** — your database schema, migrations, and access policies. These should be the most portable part of your stack, and with standard Postgres + SQL migrations, they are.

### Anti-Patterns to Avoid

| Anti-Pattern | Why It's Harmful |
|-------------|-----------------|
| **Premature microservices** | Distributed systems are harder to build, test, debug, and operate. The infrastructure overhead for a small team exceeds the benefits. |
| **Splitting for "clean architecture"** | If two components communicate frequently, splitting them adds latency and failure modes. Co-locate things that change together. |
| **Rewriting instead of migrating** | A "clean rewrite" discards all the edge cases and bug fixes encoded in the existing code. Migrate incrementally — extract, test, replace. |
| **Over-abstracting for hypothetical future** | Building plugin systems, adapter patterns, and configuration layers for requirements that don't exist yet. The abstraction cost is paid now; the benefit may never materialize. |
| **Chasing new frameworks** | Rewriting a working app in the latest framework provides zero user value. Frameworks are a means, not an end. |

---

*These guidelines are stack-agnostic in principle. The patterns apply whether you're using Next.js or Rails, Supabase or Firebase, Vercel or AWS. Substitute your specific tools — the architectural decisions and operational practices remain the same.*
