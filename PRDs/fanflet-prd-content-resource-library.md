# PRD: Content Resource Library & Secure Delivery
**Version:** 0.3 — Infrastructure-Informed Draft  
**Date:** February 23, 2026  
**Author:** Brian (Product) / Claude (Documentation)  
**Status:** Draft — In Progress

---

## 1. Overview & Strategic Context

### What This Feature Does
The Content Resource Library evolves Fanflet's existing resource management into a first-class content system with two core capabilities:

1. **A speaker-owned resource library** — where KOLs manage reusable content (slide decks, documents, links, sponsor materials) that can be linked to multiple fanflets across events.
2. **Scoped, secure file delivery** — where audience access to hosted files is controlled through fanflet-specific download links that inherit the fanflet's lifecycle (including expiration).

### Why It Matters Now
Speakers frequently give the same talks at multiple events. Today, while a Resource Library exists in Fanflet, the connection between library resources and fanflet delivery lacks the controls needed for speakers who treat their content as proprietary. A slide deck shared at a February conference shouldn't remain publicly downloadable through that event's fanflet indefinitely — but the speaker shouldn't have to re-upload it for their March event either.

The current system also lacks visibility into how resources are being used across fanflets, what's consuming storage, and what's been orphaned. As the platform grows, unmanaged file accumulation creates both a cost problem (storage) and a user experience problem (clutter).

### Strategic Foundation
This feature builds directly on the **Content Expiration** system (see Content Expiration PRD) and lays groundwork for several future capabilities:

- **Paywall / gated access:** The scoped download mechanism introduces the concept of "authorized access paths" to content. Today, the condition is "the fanflet is active." In the future, the condition could be "the user has a subscription" — same mechanism, different authorization check.
- **Speaker Ratings & Sponsor Marketplace:** A well-organized content library with usage data (downloads, engagement) enriches the KOL profile that sponsors evaluate.
- **Clone Fanflet:** A related quick-win feature (captured separately on the roadmap) that becomes significantly more valuable when combined with a reusable library — cloning a fanflet for a repeat engagement automatically brings along the library resource links.

### What Exists Today
The Resource Library is already a feature in Fanflet, backed by a two-table architecture:

- **`resource_library`** — the speaker's reusable content library, keyed by `speaker_id`. Stores the canonical version of each resource (title, description, URL, file_path, section_name, metadata).
- **`resource_blocks`** — resources as placed on a specific fanflet, keyed by `fanflet_id`. Each block has a `library_item_id` (nullable UUID) that references back to `resource_library`, plus its own copies of all fields (title, description, URL, file_path, etc.) and fanflet-specific fields like `display_order`.

The current model is **copy-on-place**: when a library item is added to a fanflet, its data is duplicated into `resource_blocks` with a back-reference via `library_item_id`. Resource blocks can also exist independently (nullable `library_item_id`) for event-specific items added directly to a fanflet.

Four resource types are supported: **Link**, **File Upload**, **Text**, and **Sponsor**. The file upload feature is defined in the UI but not yet fully implemented — this PRD covers its completion alongside the secure delivery mechanism.

The **Content Expiration** fields already exist on the `fanflets` table (`expiration_date`, `expiration_preset`, `show_expiration_notice`), and the **analytics_events** table already tracks per-resource interactions via `resource_block_id`.

This PRD focuses on **enhancing** this existing system, not replacing it. The core additions are: completing the file upload capability with secure scoped delivery, adding file metadata for storage management, and improving usage visibility. The existing two-table architecture is well-suited to these enhancements.

---

## 2. User Stories

### KOL (Content Creator)

- **As a KOL**, I want to upload my slide deck once and link it to multiple fanflets across different events, so I don't have to re-upload the same file every time I give a talk.
- **As a KOL**, I want the download links for my files to stop working when a fanflet expires, so that my proprietary materials (like slides) are only accessible during the engagement window I've defined.
- **As a KOL**, I want to see which of my library resources are currently linked to active fanflets and which are unlinked, so I can keep my library clean and understand what's in use.
- **As a KOL**, I want to know how much storage I'm using and what my limit is, so I can manage my content without surprises.
- **As a KOL**, I want to add event-specific resources to a fanflet alongside my reusable library items, so I can customize each event's resource page while reusing my core materials.
- **As a KOL**, I want to link to videos on YouTube or other platforms rather than uploading video files, so I can leverage dedicated video hosting without consuming my storage quota.

### Audience (Fanflet Viewer)

- **As an audience member**, I want to download the speaker's slides and materials from the fanflet page, so I can reference them after the event.
- **As an audience member**, if I try to download a file from an expired fanflet, I want to see a clear message that the content is no longer available (rather than a broken link or error), so I understand what happened.
- **As an audience member**, I want to watch linked videos directly within the fanflet (embedded player), so I don't have to leave the page.

---

## 3. Functional Requirements

### 3.1 Resource Types & Storage Model

The library supports two fundamental categories of resources, distinguished by where the content lives:

**Hosted Resources** (files stored by Fanflet)
- File uploads: PPTX, PDF, images, documents, and other common file types
- These consume storage quota
- Delivered to audiences through scoped download links (see §3.2)
- The underlying file is stored once, regardless of how many fanflets reference it

**Linked Resources** (content hosted elsewhere)
- Links: URLs to external content (articles, tools, websites)
- Video links: URLs to YouTube, Vimeo, Loom, Wistia, or other video platforms — rendered as embedded players via oEmbed where supported, with fallback to a rich link card
- Sponsor resources: Structured entries with branding (name, logo, URL, CTA)
- Text blocks: Inline content (notes, descriptions, instructions)
- These consume no storage quota
- No scoped download mechanism needed — links are inherently external

**Accepted file types for upload:**

| Category | Extensions | Notes |
|----------|-----------|-------|
| Presentations | .pptx, .pdf | Keynote users should export to PPTX or PDF |
| Documents | .pdf, .docx, .doc | |
| Images | .png, .jpg, .jpeg, .gif, .svg | |
| Spreadsheets | .xlsx, .csv | |
| Other | .zip | For bundled resources |

**Not accepted:**
- Video files (.mp4, .mov, .avi, etc.) — speakers should use YouTube, Vimeo, Loom, or similar platforms and add as a linked resource
- Executable files (.exe, .app, .sh, etc.)
- Files exceeding the per-file size limit (see §3.5)

### 3.2 Scoped Download Mechanism

This is the core new capability. When a hosted resource is linked to a fanflet, the audience accesses it through a **fanflet-scoped download route** — not a direct link to the stored file.

**How it works:**

1. Files are uploaded to the **private** `file-uploads` Supabase Storage bucket — no public URLs exist for any hosted resource. (Images and logos continue to use the existing public `resources` bucket.)
2. When a KOL links a library resource to a fanflet, the system creates a `resource_blocks` entry with `library_item_id` pointing to the `resource_library` item (this already happens today for link/sponsor types).
3. The audience-facing download URL follows the pattern:  
   `/api/download/[fanflet_id]/[resource_block_id]`
4. When this route is hit, the server performs an authorization check:
   - Look up the `resource_blocks` entry — confirm it exists and belongs to this `fanflet_id`. → If no, return 404.
   - Check the `fanflets` table: is `status` = `'published'`? → If no, return 403.
   - Check the `fanflets` table: is `expiration_date` set and in the past? → If yes, redirect to expired page or return 403 with clear messaging.
   - Resolve the file: follow `resource_blocks.library_item_id` → `resource_library.file_path` to get the storage path. (If `library_item_id` is null, use `resource_blocks.file_path` directly for event-specific uploads.)
   - If all checks pass → generate a **short-lived signed URL** (e.g., 60-minute expiry) from Supabase Storage and redirect the user to it for the actual file download.
5. The signed URL is temporary and cannot be bookmarked or shared meaningfully — it expires quickly, and a new one is generated on each valid request.

**Key design decision — file_path lives on `resource_library` only:**
For library-linked file uploads, the `file_path` should be stored on `resource_library` and **not duplicated** into `resource_blocks`. The download route resolves the path by joining through `library_item_id`. This ensures a single file in storage regardless of how many fanflets reference it, and avoids path-sync issues if a file is ever replaced. For event-specific file uploads (where `library_item_id` is null), `resource_blocks.file_path` is used directly.

**Benefits of this approach:**
- Files are never directly exposed — all access is mediated and auditable.
- Expiration "just works" — the authorization check references the fanflet's expiration status. No separate content expiration logic needed.
- Download analytics come free — every download hits the route, and can be logged to the existing `analytics_events` table with `event_type = 'resource_download'` (who, when, which fanflet, which resource).
- The same file serves multiple fanflets — different scoped URLs point to the same underlying stored file.
- Future paywall integration requires only adding a new condition to the authorization check (e.g., "does this user have a subscription?").

**Edge cases:**
- If a fanflet expires while a user has the page open, the download links on the page will fail on click (the server-side check catches this). The page itself will show expired content on refresh.
- If a KOL unlinks a resource from a fanflet, existing scoped URLs for that combination stop working immediately.

### 3.3 Library Management Enhancements

Building on the existing library UI, the following enhancements improve resource management:

**Usage visibility (v1 — required):**
- Each resource in the library displays a **"Linked to X fanflets"** count.
- Clicking the count shows which fanflets reference this resource (with links to each fanflet's edit screen).
- Resources with zero links are visually distinguished (e.g., muted styling, or an "Unused" indicator).

**File metadata (v1 — required):**
- Display **file type icon** based on extension (PDF icon, PPTX icon, image thumbnail, etc.) rather than showing raw filenames.
- Display **file size** for hosted resources.
- Display **upload date** and **last linked date**.

**Sorting and filtering (v1 — nice to have):**
- Filter by resource type (hosted files, links, sponsors, text).
- Filter by usage status (linked / unlinked).
- Sort by name, date added, file size, or usage count.

**Bulk actions (v2 — future):**
- Select multiple resources for deletion.
- Bulk unlink from a specific fanflet.

### 3.4 Fanflet Assembly Experience

When creating or editing a fanflet, the KOL assembles its resource list by pulling from their library and optionally adding event-specific items.

**Adding library resources to a fanflet:**
- A "Add from Library" action opens a picker showing the KOL's `resource_library` items.
- Resources already linked to this fanflet (existing `resource_blocks` with matching `library_item_id`) are indicated to prevent duplicates.
- The KOL can select one or multiple resources to add.
- Adding a resource creates a `resource_blocks` entry with `library_item_id` set — data fields (title, description, url, section_name) are copied for display purposes, but `file_path` for file-type resources is **not copied** (resolved via join at download time).

**Adding event-specific resources:**
- The existing "Add Resource" flow (upload file, add link, etc.) remains available directly within the fanflet edit screen.
- Resources added this way are saved to `resource_library` AND a corresponding `resource_blocks` entry is created with `library_item_id` set — all in one step.
- This ensures all files flow through the library — there are no "fanflet-only" files floating outside `resource_library`. This is important for storage management and lifecycle tracking.

**Ordering and sections:**
- Resources within a fanflet can be reordered (drag-and-drop or move up/down).
- Resources inherit the "Section Name" concept from the current system (e.g., "Resources," "Featured Partners") — this controls how they're grouped on the public-facing fanflet page.
- Section assignment and order are per-fanflet properties, not library-level. The same resource can appear under "Slide Deck" in one fanflet and "Workshop Materials" in another.

### 3.5 Storage Quotas & Lifecycle Management

**Storage quotas (v1):**

Quota numbers are configurable via the existing `plans.limits` JSONB field and should be adjustable as usage patterns emerge. Proposed initial structure:

```json
{
  "storage_mb": 500,
  "max_file_mb": 50,
  "signed_url_minutes": 60
}
```

Initial defaults (adjustable without code changes):

| Setting | Initial Value | Notes |
|---------|--------------|-------|
| Total storage per speaker | 500 MB | Sufficient for ~10-15 slide decks |
| Max file size per upload | 50 MB | Typical 40-slide deck with images is 20-40 MB |
| Signed URL duration | 60 minutes | Balances usability and security |

These can be adjusted per plan tier as paid plans are introduced. The application should read these values from the speaker's active plan, not hardcode them.

- Storage usage is displayed in the library UI (e.g., "Using 230 MB of 500 MB").
- A progress bar or similar visual indicator makes usage immediately clear.
- When approaching the limit (>80%), a warning is shown.
- When at the limit, new file uploads are blocked with a clear message and (in the future) an upgrade prompt.

**Lifecycle management (v1):**
- **Reference counting:** The system tracks which fanflets link to each resource via `resource_blocks.library_item_id`. A count of zero active `resource_blocks` entries means the resource is "unlinked."
- **Visibility, not automation:** In v1, we surface usage information to the KOL but do **not** auto-delete or auto-archive anything. The KOL decides what to keep and what to remove.
- **Manual delete:** KOLs can delete any resource from their library. If the resource has `resource_blocks` entries linked to active fanflets, a confirmation dialog warns them: "This resource is linked to X active fanflets. Deleting it will remove it from those fanflets. Continue?" Deleting a `resource_library` entry should cascade-delete all associated `resource_blocks` entries.
- **No orphaned files by design:** Because all files — including event-specific uploads — flow through `resource_library`, there is no path that creates files outside the library. If a KOL deletes a `resource_library` entry, the underlying file is removed from Supabase Storage. If a fanflet is deleted, its `resource_blocks` entries are removed, but the `resource_library` items (and files) persist until the KOL explicitly deletes them.

**Lifecycle management (v2 — future):**
- Automated "unused resource" nudges: After 90 days with zero active fanflet links, the KOL receives a notification (in-app or email) suggesting they review and clean up.
- Archive capability: Move unused resources to cold storage (cheaper tier) rather than deleting. Can be restored on demand.
- Storage usage dashboard: Detailed breakdown of what's consuming space, sorted by size.

### 3.6 Video & Rich Media Handling

Fanflet does not host video files. Instead, it provides a rich linking experience for externally hosted video content.

**Supported video platforms (via oEmbed):**
- YouTube
- Loom
- Wistia
- Vimeo (note: platform stability uncertain following Bending Spoons acquisition — see notes)

**Behavior when a video link is added:**
1. KOL pastes a video URL into the link resource form.
2. System detects it's a known video platform URL and fetches oEmbed metadata (thumbnail, title, duration if available).
3. The resource is stored as a link with enriched metadata.
4. On the public-facing fanflet page, the video renders as an **embedded player** (iframe via oEmbed) rather than a plain link.
5. If oEmbed is unavailable or the platform is unrecognized, the link falls back to a **rich link card** (thumbnail if available, title, URL).

**Broken link detection (v2 — future):**
- Periodic check of linked video URLs for availability.
- Flag broken links in the library UI so the KOL can update or remove them.

**Platform note on Vimeo:** As of early 2026, Vimeo's future is uncertain following its acquisition by Bending Spoons and subsequent mass layoffs. Fanflet should support Vimeo embeds (they still work today) but should not position Vimeo as a recommended platform. If a KOL adds a Vimeo link, no special warning is needed — but marketing materials and help docs should recommend YouTube, Loom, or Wistia as primary options.

---

## 4. Connection to Content Expiration

The scoped download mechanism is designed to work seamlessly with the Content Expiration feature (see Content Expiration PRD). Here's how they interact:

**When a fanflet expires:**
- The fanflet event page shows the expired landing page (per the Expiration PRD).
- All scoped download links (`/api/download/[fanflet_id]/[resource_id]`) for that fanflet **stop working** — the authorization check sees the fanflet is expired and returns a 403 or redirects to the expired page.
- The underlying files in the library are **unaffected** — they remain in the KOL's library, ready to be linked to future fanflets.
- Linked (non-hosted) resources like video embeds are also not shown, since the entire fanflet page is replaced by the expired page.

**When a fanflet is reactivated (expiration extended):**
- Scoped download links immediately resume working — the authorization check now sees the fanflet is active.
- No re-linking or re-uploading needed. Everything reconnects automatically because the junction table entries were never removed.

**Key principle:** Expiration controls the *access path*, not the *content*. Resources have their own lifecycle in the library, independent of any individual fanflet's expiration. This is the architectural separation that enables a single upload to serve many events with different time windows.

---

## 5. Data Model

### Existing Schema (Reference)

The following tables already exist and are relevant to this feature:

**`resource_library`** — Speaker's reusable content library:

| Field | Type | Exists? | Description |
|-------|------|---------|-------------|
| `id` | UUID | ✅ | Primary key |
| `speaker_id` | UUID | ✅ | FK to speakers table |
| `type` | TEXT | ✅ | `link`, `file`, `text`, `sponsor` |
| `title` | TEXT | ✅ | Display title |
| `description` | TEXT, nullable | ✅ | Optional description |
| `url` | TEXT, nullable | ✅ | For link/sponsor types |
| `file_path` | TEXT, nullable | ✅ | Supabase Storage path for hosted files |
| `image_url` | TEXT, nullable | ✅ | Logo/image URL (used by sponsor type) |
| `section_name` | TEXT, nullable | ✅ | Default section grouping (default: 'Resources') |
| `metadata` | JSONB, nullable | ✅ | Flexible metadata (default: '{}') |
| `created_at` | TIMESTAMPTZ | ✅ | When created |
| `updated_at` | TIMESTAMPTZ | ✅ | Last modified |

**`resource_blocks`** — Resources as placed on a specific fanflet:

| Field | Type | Exists? | Description |
|-------|------|---------|-------------|
| `id` | UUID | ✅ | Primary key |
| `fanflet_id` | UUID | ✅ | FK to fanflets table |
| `library_item_id` | UUID, nullable | ✅ | FK to resource_library (null = event-specific) |
| `type` | TEXT | ✅ | `link`, `file`, `text`, `sponsor` |
| `title` | TEXT | ✅ | Display title (copied from library on placement) |
| `description` | TEXT, nullable | ✅ | Optional description |
| `url` | TEXT, nullable | ✅ | For link/sponsor types |
| `file_path` | TEXT, nullable | ✅ | Storage path (see design note below) |
| `image_url` | TEXT, nullable | ✅ | Logo/image URL |
| `display_order` | INTEGER | ✅ | Sort order within the fanflet |
| `section_name` | TEXT, nullable | ✅ | Section grouping for this fanflet |
| `metadata` | JSONB, nullable | ✅ | Flexible metadata |
| `created_at` | TIMESTAMPTZ | ✅ | When created |
| `updated_at` | TIMESTAMPTZ | ✅ | Last modified |

**`fanflets`** — Relevant fields for this feature:

| Field | Type | Description |
|-------|------|-------------|
| `status` | TEXT | `'draft'` or `'published'` — checked by download route |
| `published_at` | TIMESTAMPTZ, nullable | When first published |
| `expiration_date` | DATE, nullable | NULL = no expiration — checked by download route |
| `expiration_preset` | TEXT | `'none'`, `'30d'`, `'60d'`, `'90d'`, `'custom'` |

**`analytics_events`** — Already tracks per-resource interactions:

| Field | Type | Description |
|-------|------|-------------|
| `event_type` | TEXT | Type of event (e.g., `'page_view'`, `'resource_click'`) |
| `resource_block_id` | UUID, nullable | FK to resource_blocks — links events to specific resources |
| `fanflet_id` | UUID | FK to fanflets — links events to specific fanflets |
| `visitor_hash` | TEXT, nullable | Anonymous visitor identifier |

### Schema Changes Required

**Add to `resource_library`:**

| Field | Type | Description |
|-------|------|-------------|
| `file_size_bytes` | BIGINT, nullable | Size of hosted file in bytes. Populated on upload for `type = 'file'`. Used for storage quota calculation. |
| `file_type` | TEXT, nullable | MIME type or file extension (e.g., `'application/pdf'`, `'application/vnd.openxmlformats-officedocument.presentationml.presentation'`). Used for file type icons and upload validation. |
| `media_metadata` | JSONB, nullable | oEmbed data for video links: thumbnail URL, video title, duration, provider. Populated automatically when a recognized video platform URL is added. |

*Note: `file_size_bytes` and `file_type` could alternatively be stored within the existing `metadata` JSONB column to avoid schema migration. However, dedicated columns are recommended because `file_size_bytes` is used in aggregate queries (SUM for quota) and JSONB aggregation is less performant.*

**No new columns needed on `resource_blocks`** — the existing schema already supports everything. The `library_item_id` back-reference is the key field.

**No new tables needed for v1.** The download analytics can be captured via the existing `analytics_events` table using a new `event_type` value (e.g., `'resource_download'`). The `resource_block_id` and `fanflet_id` fields already provide the necessary attribution.

### File Path Design Decision

For **library-linked file uploads** (`library_item_id` is not null):
- The canonical `file_path` lives on `resource_library`.
- `resource_blocks.file_path` should be **left null** (or ignored) for library-linked file resources.
- The download route resolves the path by joining: `resource_blocks.library_item_id` → `resource_library.file_path`.
- This guarantees one file in Supabase Storage per library item, regardless of how many fanflets reference it.

For **event-specific file uploads** (`library_item_id` is null):
- `resource_blocks.file_path` stores the path directly.
- These resources also get saved to `resource_library` automatically (with a new `resource_library` entry created and `library_item_id` set on the block) — see §3.4 Fanflet Assembly Experience. This ensures all files flow through the library for storage management.

### Storage Quota Query

Storage usage per speaker can be computed directly:

```sql
SELECT COALESCE(SUM(file_size_bytes), 0) as total_usage_bytes
FROM resource_library
WHERE speaker_id = :speaker_id
  AND type = 'file'
  AND file_size_bytes IS NOT NULL;
```

### Fanflet Link Count Query

For the "Linked to X fanflets" indicator in the library UI:

```sql
SELECT rl.id, rl.title, COUNT(rb.id) as fanflet_count
FROM resource_library rl
LEFT JOIN resource_blocks rb ON rb.library_item_id = rl.id
WHERE rl.speaker_id = :speaker_id
GROUP BY rl.id, rl.title;
```

To show only **active** fanflet links (excluding expired or draft):

```sql
SELECT rl.id, rl.title, COUNT(rb.id) as active_fanflet_count
FROM resource_library rl
LEFT JOIN resource_blocks rb ON rb.library_item_id = rl.id
LEFT JOIN fanflets f ON rb.fanflet_id = f.id
  AND f.status = 'published'
  AND (f.expiration_date IS NULL OR f.expiration_date >= CURRENT_DATE)
WHERE rl.speaker_id = :speaker_id
GROUP BY rl.id, rl.title;
```

### Migration

**Existing data:** All current `resource_library` and `resource_blocks` entries are link or sponsor types (no file uploads exist yet). No data migration is needed — only schema additions.

**Migration steps:**
1. Add `file_size_bytes` (BIGINT, nullable) to `resource_library`.
2. Add `file_type` (TEXT, nullable) to `resource_library`.
3. Add `media_metadata` (JSONB, nullable, default '{}') to `resource_library`.
4. No changes to `resource_blocks` — existing schema is sufficient.
5. Create new private storage bucket `file-uploads` (see §5.1).

### 5.1 Supabase Storage Architecture

**Current state:** A single `resources` bucket exists, configured as **PUBLIC**. It contains:
- Speaker-specific folders (UUID-named, e.g., `5fa3755c-34aa-44e1-9375-...`)
- An `images` subfolder structure
- A `library` subfolder
- Profile/logo images (PNG files)

The public bucket is correct for images and sponsor logos that need direct URL access (e.g., `image_url` fields on resource blocks). However, the scoped download mechanism requires files to be **private** — inaccessible without a signed URL.

**Required change: Create a new private bucket.**

| Bucket | Access | Contents | Used By |
|--------|--------|----------|---------|
| `resources` (existing) | **Public** | Sponsor logos, profile images, thumbnails | `image_url` fields, direct public display |
| `file-uploads` (new) | **Private** | PPTX, PDF, DOCX, and other downloadable files | `file_path` on `resource_library`, served via scoped download route |

**File path convention for the new bucket:**
```
file-uploads/{speaker_id}/{resource_library_id}/{original_filename}
```

Example: `file-uploads/5fa3755c-34aa-44e1-9375-.../cc87af4b-1a9b-43eb-a5f8-.../AI-in-Healthcare-2026.pptx`

This structure:
- Organizes files by speaker for easy per-speaker storage auditing
- Includes the `resource_library.id` to prevent filename collisions across uploads
- Preserves the original filename for meaningful download names

**Bucket policies:** The `file-uploads` bucket should have:
- No public access (default for private buckets)
- RLS policies allowing the speaker (`speaker_id` match) to upload, read, and delete their own files
- Signed URL generation restricted to the server-side download route (not client-side)

---

## 6. UX/UI Considerations

### Library View Enhancements
- Resource cards should display: type icon, title, file size (for hosted files), "Linked to X fanflets" badge, and upload/creation date.
- Unlinked resources should have a subtle visual distinction (muted card, or an "Unused" badge) — not alarming, but noticeable.
- A storage usage bar should appear at the top of the library view (e.g., "230 MB of 500 MB used").
- Video links should display a thumbnail preview (from oEmbed) in the library, making them visually distinct from plain links.

### Fanflet Resource Assembly
- When editing a fanflet, the resources section should clearly distinguish between "Add from Library" (existing content) and "Add New" (create and upload in one step).
- The library picker should support search/filter so speakers with many resources can find items quickly.
- Resources pulled from the library should show a small "library" icon or indicator, distinguishing them from event-specific items (though both live in the library — the visual distinction helps the speaker's mental model).

### Audience-Facing Fanflet Page
- Hosted files should display with a clear download button, file type icon, and file size.
- Video links should render as embedded players (via oEmbed iframe) with a fallback to a clickable card if embedding fails.
- Plain links should display as rich link cards where possible (title, description, favicon).
- All file downloads go through the scoped route — the audience never sees a direct storage URL.

### Expired Download Experience
- If a user clicks a scoped download link for an expired fanflet (e.g., from a bookmarked URL), they should see a clear, branded message: "This content is no longer available."
- The message should include the KOL's name and photo (sourced from Supabase Auth `raw_user_meta_data.full_name` and `raw_user_meta_data.avatar_url` via the speaker's `auth_user_id`) and a link back to the expired fanflet page (which has the KOL's follow CTA, per the Expiration PRD).
- This should not look like an error page — it should feel intentional and polished.

---

## 7. PPTX & File Ingestion (Phased)

### Phase 1 (This Release): Upload & Deliver
- Accept PPTX uploads as-is. Store the original file.
- Display with a PPTX-specific icon and file type label in the library and on the fanflet page.
- Audience downloads the original PPTX file through the scoped download mechanism.
- No slide extraction, no thumbnail generation, no preview.
- Same treatment for all other accepted file types — upload, store, deliver.

### Phase 2 (Future): Slide Thumbnails & Preview
- On PPTX upload, extract slides as images server-side (using a library like `python-pptx` or a headless LibreOffice conversion).
- Display slide thumbnails in the library and optionally on the fanflet page (as a visual preview of what the audience will download).
- For PDFs, render page thumbnails using `pdf.js` or similar.
- This enables a future "slide sorter" experience where speakers curate which slides to include.

### Phase 3 (Future): Content Curation Tools
- Slide-level selection: Upload a 60-slide deck, pick the 10 slides you want to share, and Fanflet generates a curated PDF or image set for download.
- Multi-file assembly: Combine pages/slides from multiple uploads into a single downloadable package.
- Annotations or overlay: Speaker adds notes or context to specific slides.

---

## 8. Future Considerations

### 8.1 Clone Fanflet
A separate, lightweight feature: duplicate an existing fanflet (metadata, settings, and resource links) as a starting point for a new event. Especially valuable for speakers who repeat talks — clone the fanflet, update the event name and date, and the library resources are already linked. Captured separately on the roadmap.

### 8.2 Paywall Integration
The scoped download mechanism is designed to support future paywall scenarios. When a fanflet expires, the expired page could evolve to offer: "Subscribe to [KOL Name]'s community for access to their full content library." The authorization check in the download route would gain a new condition: "does the requester have an active subscription?" The library, the files, and the junction table remain unchanged — only the access rules evolve.

### 8.3 Content Versioning
Speakers occasionally update their decks between events. A future enhancement could support versioning: upload a new version of a resource, and choose whether existing fanflet links should point to the new version or stay pinned to the version that was current when they were linked. For v1, updating a file replaces it everywhere — simpler and sufficient until usage patterns indicate otherwise.

### 8.4 Email-Based Ingestion
A future convenience feature: speakers forward their slide decks to a dedicated address (e.g., `slides@fanflet.com`) and the system parses the attachment and adds it to their library. This aligns with how speakers already share decks with event organizers.

### 8.5 Advanced Storage Lifecycle
See §3.5 for the v2 lifecycle roadmap: automated nudges for unused resources, archive to cold storage, and a storage usage dashboard.

### 8.6 Download Analytics
The existing `analytics_events` table captures per-download data via the `'resource_download'` event type, attributed to the specific `resource_block_id` and `fanflet_id`. A future analytics view could show KOLs: total downloads per resource, downloads over time, downloads per fanflet, and geographic distribution. This enriches the KOL's understanding of which materials resonate and feeds into the Sponsor Marketplace profile.

---

## 9. Out of Scope (v1)

The following are explicitly deferred:

- Video file hosting (speakers should use YouTube, Loom, Wistia, etc.)
- PPTX slide extraction or thumbnail generation (Phase 2)
- Slide-level curation or multi-file packaging (Phase 3)
- Content versioning
- Bulk resource management (bulk delete, bulk unlink)
- Automated lifecycle nudges or archiving (v2)
- DRM or download-after-download protection (once downloaded, the file is the user's)
- Broken link detection for external URLs
- Email-based ingestion
- Storage tier-gating beyond a single quota limit
- Download analytics UI (the data is logged but no dashboard in v1)

---

## 10. Open Questions

### Resolved Through Schema & Infrastructure Review

~~1. **Current data model:**~~ **Resolved:** Two-table model (`resource_library` + `resource_blocks`) with `library_item_id` back-reference. See §5.

~~2. **Fanflet-resource relationship:**~~ **Resolved:** Copy-on-place with back-reference. For file uploads (new), `file_path` stored only on `resource_library`. See §5.

~~3. **Section name scope:**~~ **Resolved:** Already correct — `section_name` exists on both tables. Library provides default, fanflet block overrides. No change needed.

~~4. **Storage quota numbers:**~~ **Resolved:** Too early to set firm numbers. Quotas will be configurable via the `plans.limits` JSONB field and adjustable as usage patterns emerge. Implementation should support plan-level configuration from the start.

~~5. **Signed URL duration:**~~ **Resolved:** 60 minutes is appropriate. Should be configurable via `plans.limits` or application config so it can be adjusted per plan in the future.

~~6. **Download route authentication:**~~ **Resolved:** Fully anonymous for v1. Future enhancement may add lightweight identification (email entry or email/SMS verification code) before download — this would be a KOL-controlled toggle and could feed email list building.

~~7. **Speaker profile data location:**~~ **Resolved:** Profile data lives in Supabase Auth `raw_user_meta_data`. Relevant fields: `name`, `full_name`, `avatar_url` / `picture`, `email`. The expired download page and KOL attribution can source from this via the `speakers.auth_user_id` → Auth user join.

~~8. **Supabase Storage bucket configuration:**~~ **Resolved — action required.** See §5.1 below. The existing `resources` bucket is **public**, which is correct for images/logos but incompatible with the scoped download mechanism. A new **private** bucket is needed for file uploads.

~~9. **Metadata JSONB usage:**~~ **Resolved:** The `metadata` field stores type-specific data (e.g., `{"cta_text": "Learn More", "logo_url": "..."}` for sponsor resources). Since it's actively used with type-specific schemas, `file_size_bytes` and `file_type` should be added as **dedicated columns** on `resource_library` rather than mixed into `metadata`. This keeps the aggregate storage query simple and avoids overloading the JSONB field with structurally different data.

### Remaining Open

1. **Download identification UX (future):** When/if we add email-based identification before download, should it be per-fanflet or per-resource? Per-fanflet (enter email once, download everything) is lower friction. Per-resource is more granular but annoying. Recommend per-fanflet, deferred to a future release.

2. **File replacement behavior:** When a KOL re-uploads a file to replace an existing library resource, should this update the file across all linked fanflets immediately? Or should they be prompted to confirm? For v1, immediate replacement is simpler. But if a speaker has an event-specific version, this could cause issues. Worth monitoring.
