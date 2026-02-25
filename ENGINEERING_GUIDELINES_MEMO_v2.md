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

*These guidelines are stack-agnostic in principle. The patterns apply whether you're using Next.js or Rails, Supabase or Firebase, Vercel or AWS. Substitute your specific tools — the architectural decisions and operational practices remain the same.*
