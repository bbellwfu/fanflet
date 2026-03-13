# AI Usage Tracking, Preview Fixes, Modal Redesign

**Date:** 2026-03-13
**Author:** Brian Bell

## Release Summary

Added centralized AI usage tracking across all platform AI features, fixed critical preview and landing page bugs with library-linked resources, redesigned sponsor campaign and library forms from modal dialogs to slide-over sheets, and added AI-powered text rewriting to the communications editor.

### New Features

- **AI Utilization Dashboard** — New admin page (`/ai-usage`) showing total cost, token usage, success/error rates, and a filterable log table for all AI API calls across the platform. Super-admin only.
- **AI Usage Logging** — Centralized `ai_usage_logs` table and `logAiUsage()` utility. All AI features (demo generation, communication rewrite) now log tokens, cost estimates, model, and status to the database.
- **AI Text Rewrite in Communications** — Per-field "Rewrite" buttons (sparkle icon) on the communication composer. Rewrites technical worklog text into audience-friendly language using Claude Haiku, with full usage tracking.
- **Resource Library File Preview** — Edit sheet for library resources now shows the attached file with icon, filename, file type, size badge, and a "View File" button (signed URL). Delete button added to edit footer.

### Bug Fixes

- **Library resource merge on landing pages** — Fixed `resource_library` join returning arrays instead of objects in certain Supabase configurations. Added `Array.isArray` guard on public landing page, preview page, and download route.
- **Block-level overrides now take priority** — Changed merge logic from `library ?? block` to `block || library` so speaker customizations on individual blocks are preserved over library defaults.
- **Preview page missing sponsor resources** — Preview page now fetches and merges sponsor library items, matching the public landing page behavior. Draft fanflets are visible to their owner via updated RLS policy.
- **Case-insensitive block type matching** — Landing page block type comparisons (sponsor, text, link, file, embed) are now case-insensitive to handle mixed-case data from library items.
- **Demo file blocks render without file_path** — File-type blocks on demo pages now render correctly even when no actual file is uploaded, showing placeholder size/type info.
- **Communication form UX fixes** — Added missing `type="button"` attributes to prevent unintended form submissions, unique input IDs to avoid label conflicts, and `autoComplete="off"` on form fields.

### Infrastructure

- **RLS policy updates** — `resource_library` and `sponsor_resource_library` SELECT policies now allow authenticated speakers to read items linked to their own fanflets (not just published ones), enabling preview of draft content.
- **Sponsor demo seeder improvements** — Replaced AI-generated sample leads with static demo subscribers for consistency. Added `sponsor_consent`, `resource_block_id` to leads. Increased analytics event volume. Seeder now tracks subscriber and analytics IDs for clean demo cleanup.
- **Campaign and Library UI redesign** — Converted campaign create/edit and sponsor library create/edit from centered modal dialogs to right-side slide-over sheets with sticky headers/footers and improved styling.
- **New migration** — `20260329000000_ai_usage_logs.sql` creates the `ai_usage_logs` table with RLS (service role write, super_admin read) and performance indexes.

## Technical Details

- `packages/core/src/ai-usage.ts` — Cost calculator with per-model pricing rates
- `packages/core/src/rewrite-ai.ts` — Claude Haiku rewrite endpoint with 20s timeout
- `packages/core/src/demo-ai.ts` — Now returns `{ data, usage }` tuple for tracking
- `apps/admin/app/(dashboard)/ai-usage/` — Full dashboard (page, actions, client component)
- Two existing migrations updated with expanded RLS policies for preview support
