# Sponsor Portal — Data Model & Architecture

## Overview

The sponsor portal introduces a new user type (Sponsor) that can connect with
speakers and share curated resources. Sponsors control the lifecycle of their
content — if a resource is retired, it gracefully degrades on any fanflet
that references it.

## Core Concepts

### User Roles

Fanflet will have three user roles, all sharing the same `auth.users` table:

| Role | Table | Purpose |
|------|-------|---------|
| Speaker | `speakers` | Creates fanflets, shares resources with audience |
| Sponsor | `sponsor_accounts` | Curates resources, connects with speakers |
| Admin | (checked via `platform_admin` flag) | Manages the platform |

A single auth user could potentially be both a speaker and a sponsor (e.g., a
dental supply company rep who also gives talks). The system supports this by
having separate profile tables keyed to the same `auth_user_id`.

### Connection Flow

```
Sponsor discovers Speaker (or vice versa)
         │
         ▼
  Connection Request
  (status: pending)
         │
    ┌────┴────┐
    ▼         ▼
 Accepted   Declined
    │
    ▼
 Active Connection
 (sponsor shares resources)
    │
    ▼
 Speaker adds sponsor
 resources to fanflets
```

### Resource Sharing Flow

```
Sponsor Account
  └── sponsor_resources (curated content)
        │
        ▼
  sponsor_connections (active)
        │
        ▼
  Speaker sees available sponsor resources
        │
        ▼
  Speaker adds to fanflet via resource_blocks
  (resource_blocks.sponsor_resource_id → sponsor_resources.id)
        │
        ▼
  Public fanflet renders sponsor block
  (checks sponsor_resources.status for lifecycle)
```

## New Tables

### `sponsor_accounts`

The sponsor entity. Each sponsor has a profile, branding, and can connect
with multiple speakers.

```sql
CREATE TABLE public.sponsor_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  company_name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  contact_email TEXT NOT NULL,
  industry TEXT,           -- e.g., 'dental_supplies', 'dental_technology'
  social_links JSONB DEFAULT '{}',
  is_verified BOOLEAN DEFAULT false,  -- admin-verified sponsor
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

### `sponsor_connections`

Manages the relationship between sponsors and speakers. Either party
can initiate the connection request.

```sql
CREATE TABLE public.sponsor_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_id UUID REFERENCES public.sponsor_accounts(id) ON DELETE CASCADE NOT NULL,
  speaker_id UUID REFERENCES public.speakers(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'active', 'declined', 'revoked')),
  initiated_by TEXT NOT NULL CHECK (initiated_by IN ('sponsor', 'speaker')),
  message TEXT,             -- optional message with the connection request
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(sponsor_id, speaker_id)
);
```

### `sponsor_resources`

Resources curated by sponsors that can be shared with connected speakers.
The sponsor controls the lifecycle — they can publish, pause, or retire
resources at any time.

```sql
CREATE TABLE public.sponsor_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sponsor_id UUID REFERENCES public.sponsor_accounts(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('link', 'file', 'text', 'promo')),
  title TEXT NOT NULL,
  description TEXT,
  url TEXT,
  file_path TEXT,
  image_url TEXT,           -- sponsor logo or promotional image
  cta_text TEXT DEFAULT 'Learn More',
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'retired')),
  expires_at TIMESTAMPTZ,   -- optional auto-expiration
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
```

### Changes to `resource_blocks`

Add a nullable FK to `sponsor_resources` so fanflet blocks can reference
sponsor-controlled content:

```sql
ALTER TABLE public.resource_blocks
  ADD COLUMN IF NOT EXISTS sponsor_resource_id UUID
    REFERENCES public.sponsor_resources(id) ON DELETE SET NULL;
```

When `sponsor_resource_id` is set:
- The block renders data from the linked `sponsor_resources` row
- If the sponsor resource status is 'paused' or 'retired', the block
  renders "This content is no longer available"
- If the sponsor resource is deleted, the FK is SET NULL and the block
  shows the same unavailable message

## RLS Policies

### sponsor_accounts
- Sponsors can manage their own account
- Speakers can read verified sponsors (for discovery)
- Anonymous can read verified sponsors (for public sponsor pages)

### sponsor_connections
- Sponsors can read/manage connections where they are the sponsor
- Speakers can read/manage connections where they are the speaker
- Only the non-initiating party can accept/decline

### sponsor_resources
- Sponsors can CRUD their own resources
- Speakers with an active connection can READ the sponsor's resources
- Anonymous can read resources that are linked to published fanflet blocks

## Content Lifecycle

When a sponsor changes a resource's status:

| Status | Effect on Fanflets |
|--------|-------------------|
| `active` | Resource renders normally |
| `paused` | Block shows "This content is temporarily unavailable" |
| `retired` | Block shows "This content is no longer available" |
| Row deleted | `sponsor_resource_id` set to NULL via FK; block shows unavailable |
| `expires_at` passed | Application treats as 'retired' at render time |

The public landing page checks the sponsor_resource status at render time.
No background job needed — it's a simple status check in the query.

## Discovery & Search

Sponsors and speakers can find each other through:

1. **Browse directory** — list of verified sponsors/speakers by industry
2. **Search** — by company name, industry, or location
3. **Invite link** — sponsor generates a unique link to send directly

Future: recommendation engine based on industry, geography, event overlap.

## Analytics Integration

Sponsor resource clicks are tracked via the existing `analytics_events` table:
- `event_type: 'resource_click'` with `resource_block_id` pointing to the
  block that references the sponsor resource
- Sponsors can see aggregate click data for their resources across all
  connected speakers' fanflets

## Migration Strategy

Phase 1 (data model): Create tables, RLS policies, indexes
Phase 2 (sponsor auth): Add sponsor signup/login flow
Phase 3 (connection UI): Build discovery + connection request pages
Phase 4 (resource sharing): Sponsor resource CRUD + speaker integration
Phase 5 (analytics): Sponsor dashboard with cross-speaker analytics

## Relationship to Existing Schema

```
auth.users
  ├── speakers (1:1)
  │     ├── fanflets (1:N)
  │     │     └── resource_blocks (1:N)
  │     │           ├── library_item_id → resource_library (speaker's own)
  │     │           └── sponsor_resource_id → sponsor_resources (sponsor's)
  │     ├── resource_library (1:N)
  │     ├── subscribers (1:N)
  │     └── sponsor_connections (1:N) ← connection to sponsors
  │
  └── sponsor_accounts (1:1)
        ├── sponsor_resources (1:N)
        └── sponsor_connections (1:N) ← connection to speakers
```
