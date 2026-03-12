# Technical Changes: Sponsor Enterprise Gating and Migrations

## Summary

Sponsor Enterprise plan changes made in the admin portal were not reflected in the sponsor-facing portal: the Library and Campaigns tabs remained gated after upgrading a sponsor to Enterprise. Fixes included an idempotent entitlement backfill migration so the Enterprise plan has the correct feature flags, scoping the admin subscription update to active status, and forcing dynamic rendering on the sponsor dashboard layout so entitlements are never served from cache. Applying migrations to the dev database failed initially because one migration referenced `resource_blocks.sponsor_library_item_id` in RLS policies before adding that column; the migration was reordered so the column is added before any policy that references it.

---

## Changes Made (for Validation)

### 1. Backfill migration (new)

**File:** `supabase/migrations/20260323100000_sponsor_enterprise_features_backfill.sql`

- **Purpose:** Ensures the `sponsor_enterprise` plan has `sponsor_resource_library` and `sponsor_campaigns` in `sponsor_plan_features`, so that when a sponsor’s subscription is set to Enterprise, `loadSponsorEntitlements` returns those features and the portal shows Library and Campaigns as unlocked.
- **Behavior:** Inserts into `feature_flags` (for the two keys if missing) with `ON CONFLICT (key) DO NOTHING`. Inserts into `sponsor_plan_features` by joining `sponsor_plans` (name = `sponsor_enterprise`) and `feature_flags` (key in the two keys) with `ON CONFLICT (plan_id, feature_flag_id) DO NOTHING`.
- **Idempotency:** No new tables or policies; only INSERT with ON CONFLICT. Safe to run after `20260321000000` and `20260322000000`.

### 2. Admin sponsor plan update

**File:** `apps/admin/app/(dashboard)/sponsors/[id]/actions.ts`

- **Function:** `updateSponsorPlan(sponsorId, planId)`.
- **Change:** The Supabase **update** on `sponsor_subscriptions` now includes `.eq("status", "active")` in addition to `.eq("sponsor_id", validSponsorId)`, so only the active subscription row is updated. With the current schema (UNIQUE on `sponsor_id`) there is at most one row per sponsor; the filter makes intent explicit and is future-proof if multiple rows per sponsor are ever allowed.
- **Unchanged:** The existing-row check still uses only `.eq("sponsor_id", validSponsorId).maybeSingle()` to decide between update and insert.

### 3. Sponsor dashboard layout (dynamic)

**File:** `apps/web/app/(sponsor)/sponsor/(dashboard)/layout.tsx`

- **Change:** Added `export const dynamic = "force-dynamic"` so the sponsor dashboard layout (and its children) are never statically cached. Each request re-runs the layout and data fetches (including `loadSponsorEntitlements`), so an admin plan change is visible after a refresh without relying on cache invalidation.

### 4. Migration reorder (sponsor_resource_library)

**File:** `supabase/migrations/20260321000000_sponsor_resource_library.sql`

- **Problem:** When applying migrations to dev, the migration failed with: `column rb.sponsor_library_item_id does not exist`. RLS policies on `sponsor_resource_library` and `sponsor_resource_events` referenced `resource_blocks.sponsor_library_item_id` before the column was added (the ADD COLUMN lived in a later section of the same file).
- **Fix:** The block that adds `sponsor_library_item_id` to `resource_blocks` (and the index `idx_resource_blocks_sponsor_library_item`) was moved to run **immediately after** creating the `sponsor_resource_library` table and enabling RLS, and **before** any CREATE POLICY that references `rb.sponsor_library_item_id`. The former “section 3” (resource_blocks) was removed from its old position; section numbers were renumbered (old 4→3, 5→4, 6→5). No new logic or duplicate ADD COLUMN.

---

## What to Validate

- **Backfill migration:** All inserts use ON CONFLICT; no CREATE TABLE/CREATE POLICY without idempotent patterns.
- **Admin action:** Update still targets the correct row when there is a single active subscription per sponsor; insert path unchanged.
- **Layout:** `export const dynamic = "force-dynamic"` is valid for Next.js 16 App Router.
- **Migration reorder:** Exactly one ADD COLUMN for `sponsor_library_item_id`; policies that reference it appear after that DDL.

### 5. Sponsor catalog visibility for speakers

**Problem:** Sponsor-provided library resources were not appearing in the fanflet builder “Sponsor catalog” for connected speakers.

**Cause:** RLS on `sponsor_resource_library` (“Connected speakers can read sponsor library catalog”) allows SELECT only when **both** `status = 'available'` **and** `availability IN ('all', 'specific')` (with speaker in `available_to` for `specific`). New resources default to `availability = 'draft'`. The sponsor action “Make available” only set `status = 'available'`, so `availability` stayed `draft` and no speaker could see the row.

**Fix (app):** `apps/web/app/(sponsor)/sponsor/(dashboard)/library/actions.ts` — In `updateSponsorLibraryResource`, when setting `status = 'available'` and the caller does not pass `availability`, if the current row’s `availability` is `'draft'`, set `availability = 'all'` in the same update. So one-click “Make available” makes the resource visible to all connected speakers; sponsors can still use Edit to set “Specific speakers” or “Draft” afterward.

**Speaker flow:** Speaker dashboard fanflet editor page (`apps/web/app/dashboard/fanflets/[id]/page.tsx`) fetches from `sponsor_resource_library` with `.in('sponsor_id', connectedSponsorIds).eq('status', 'available')`. RLS further restricts to rows where `availability` is `all` or `specific` (with that speaker in `available_to`). Results are passed as `sponsorCatalogItems` into `FanfletEditor` → `AddBlockForm`; the “Sponsor catalog” button and picker only render when `sponsorCatalogItems.length > 0`.

---

## References

- **Entitlement resolution:** `packages/db/src/sponsor-features.ts` — `loadSponsorEntitlements(supabase, sponsorId)` reads `sponsor_subscriptions` (active) → `plan_id` → `sponsor_plan_features` → `feature_flags.key`.
- **Gating:** Library page uses `entitlements.features.has("sponsor_resource_library")`; Campaigns page uses `entitlements.features.has("sponsor_campaigns")`. Both in `apps/web/app/(sponsor)/sponsor/(dashboard)/`.
- **Plan:** Sponsor Enterprise gating fix plan (e.g. `.cursor/plans/sponsor_enterprise_gating_fix_7905fb53.plan.md`).
