# FANFLET: Vision, Strategy, and Execution Plan

**Prepared for:** Brian Bell, Founder
**Date:** February 9, 2026
**Version:** 1.0

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Concept Validation and Opportunity Assessment](#2-concept-validation-and-opportunity-assessment)
3. [Product Vision and Design](#3-product-vision-and-design)
4. [Technical Architecture](#4-technical-architecture)
5. [Business Model and Revenue Strategy](#5-business-model-and-revenue-strategy)
6. [Go-to-Market Strategy](#6-go-to-market-strategy)
7. [Competitive Analysis and Positioning](#7-competitive-analysis-and-positioning)
8. [Phased Execution Roadmap](#8-phased-execution-roadmap)
9. [Team and Resource Plan](#9-team-and-resource-plan)
10. [Risk Analysis and Mitigations](#10-risk-analysis-and-mitigations)
11. [Financial Projections and Scenarios](#11-financial-projections-and-scenarios)
12. [Governance, Ethics, and Guardrails](#12-governance-ethics-and-guardrails)
13. [Key Decisions and Open Questions](#13-key-decisions-and-open-questions)

---

## 1. EXECUTIVE SUMMARY

**Fanflet** is a platform that empowers professional speakers to convert one-time event interactions into lasting audience relationships. By providing a dead-simple workflow -- speaker creates a curated resource page, audience scans a QR code, connection is established -- Fanflet fills a gap that no current tool specifically addresses: the post-event engagement layer between speakers, their audiences, and sponsors.

### Why This Matters Now

The global events industry is valued at approximately $1.5 trillion (2025) and is growing at nearly 10% annually. Over 86% of event organizers plan to maintain or increase in-person events. Sponsorship revenue alone accounts for 46% of total event revenue. Yet there is no purpose-built tool for the approximately 40,000 professional speakers in the U.S. alone to systematically capture, engage, and monetize their audiences after the talk ends.

### The Core Insight

Every speaker has the same problem: the moment their session ends, the connection with their audience evaporates. Audience members have taken blurry photos of slides, scribbled partial URLs, and lost the context within days. Speakers have no way to follow up, no data on who attended, and no proof of impact to show sponsors. This is a broken handoff -- and Fanflet is the fix.

### Founder-Market Fit

Brian Bell brings 20+ years in Enterprise SaaS, experience from startup founding to global executive leadership in a Fortune 50 company, and a track record of delivering over $1B in enterprise value to Tier 1 private equity. This background is directly relevant: Fanflet's long-term value lies in its B2B motion (sponsor integrations, enterprise event partnerships), and Brian's network and instincts in this space are a meaningful unfair advantage.

---

## 2. CONCEPT VALIDATION AND OPPORTUNITY ASSESSMENT

### 2.1 Problem Validation

The problem is real and broadly experienced. Three distinct stakeholder groups suffer:

**Speakers:**
- Cannot share post-event resources in a centralized, branded way
- Have no mechanism to build ongoing relationships with attendees
- Cannot demonstrate measurable audience engagement to sponsors or event organizers
- After-event activities represent 60% of speaker income, yet the tools to support this are fragmented and generic

**Audience Members:**
- Miss key information during live sessions (frantic note-taking, blurry screen photos)
- Have no reliable way to access slides, links, or supplementary resources afterward
- Cannot easily connect with the speaker or other attendees post-event

**Sponsors:**
- Limited visibility into the impact of their sponsorship investment
- No direct mechanism to capture leads from the audiences they are paying to reach
- Cannot measure ROI beyond badge scans and booth traffic

### 2.2 Market Sizing

| Metric | Value | Source |
|--------|-------|--------|
| Global events industry | ~$1.5T (2025) | Expert Market Research |
| Annual growth rate | 9.7% CAGR | Business Research Company |
| Events driven by live programming | ~100,000/year (critical industries) | Pitch deck research |
| Professional speakers (U.S.) | ~40,000 | Pitch deck research |
| Influencer marketing spend | >$20B annually | Industry data |
| Sponsorship share of event revenue | 46.3% | Allied Market Research |
| In-person event commitment | 86.4% of organizers maintaining/increasing | Industry survey |

**Serviceable Addressable Market (SAM):** The immediate target is professional speakers who present regularly at industry conferences. At $50/month (Brian's proposed pricing), 40,000 U.S. professional speakers represents a $24M annual revenue opportunity from speaker subscriptions alone. The sponsor integration and lead-generation layers are significantly larger.

**Serviceable Obtainable Market (SOM):** Realistically capturing 1-5% of professional speakers in the first 2-3 years (400-2,000 speakers) yields $240K-$1.2M in subscription revenue, with sponsor revenue as an accelerant.

### 2.3 Feasibility Assessment

| Dimension | Rating | Notes |
|-----------|--------|-------|
| Technical feasibility | HIGH | The core product (landing page builder + QR generation + analytics) uses well-understood web technologies. No novel technical risk. |
| Business viability | HIGH | Clear pain point, identifiable buyers, multiple revenue streams, low marginal cost to serve. |
| Market timing | STRONG | Post-COVID resurgence of in-person events, influencer economy maturation, growing sponsor demand for measurable ROI. |
| Competitive moat potential | MODERATE | Low initial barriers to entry, but network effects and data accumulation create defensibility over time. First-mover advantage in the specific niche matters. |
| Founder-market fit | STRONG | Enterprise SaaS background, speaker community connections, understanding of B2B value chains. |

**Overall Assessment: GREEN LIGHT.** The concept is validated, the market is real and growing, technical risk is low, and the founder has relevant domain expertise. The key execution risk is in go-to-market: achieving speaker adoption in a market that has gotten by with duct-tape solutions (email, Google Drive links, generic Linktree pages).

---

## 3. PRODUCT VISION AND DESIGN

### 3.1 Core Product Concept

Fanflet is a two-sided platform with the **speaker** as the primary user and the **audience member** as the consumer of the experience.

**For the Speaker (Creator Side):**
A dashboard where speakers create and manage "Fanflets" -- event-specific resource pages. Each Fanflet is a self-contained hub for a specific talk at a specific event, containing curated links, downloads, embedded media, sponsor placements, and an email capture mechanism.

**For the Audience (Consumer Side):**
A clean, mobile-first landing page accessed via QR code scan. No app download required. No login friction. Scan, land, consume, optionally subscribe.

### 3.2 User Journey: Speaker

```
1. SIGN UP      --> Create account, set up speaker profile
2. CREATE       --> Build a new Fanflet for an upcoming talk
                    - Add title, event name, date
                    - Upload/link resources (slides, PDFs, links)
                    - Configure sponsor placements
                    - Add email capture and CTA
3. GENERATE     --> System produces a unique QR code and short URL
4. PRESENT      --> Speaker includes QR code slide in their deck
5. ANALYZE      --> Post-event dashboard shows scans, engagement,
                    leads captured, resource downloads
6. FOLLOW UP    --> Send push updates to subscribers
                    ("Here are the updated slides I promised")
7. GROW         --> Audience from multiple events accumulates into
                    a persistent subscriber base
```

### 3.3 User Journey: Audience Member

```
1. SCAN         --> Point phone camera at QR code on speaker's slide
2. LAND         --> Arrive at a clean, branded resource page
                    (No app install. No login. Instant access.)
3. CONSUME      --> Browse links, download files, watch embedded content
4. CONNECT      --> Optionally enter email to subscribe for updates
5. RECEIVE      --> Get push notifications if speaker sends follow-ups
```

### 3.4 Core Feature Set (MVP)

**Speaker Dashboard:**
- Account creation and speaker profile (photo, bio, social links)
- Fanflet builder (drag-and-drop or form-based resource page creator)
- Resource types: external links, file uploads (PDF, images), embedded video, text blocks
- QR code generator with customizable design (incorporate Fanflet branding)
- Short URL generator (e.g., fanflet.com/jduncan/tech-event-2025)
- Basic analytics (total scans, unique visitors, resource clicks, email signups)
- Email capture with export (CSV) and basic email follow-up

**Audience Landing Page:**
- Mobile-optimized, fast-loading resource page
- Speaker identity (name, photo, title)
- Event context (event name, session title, date)
- Organized resource sections (as shown in the pitch deck mockup):
  - "Information You Saw Today" (downloadable content)
  - "Companies I Mentioned" (sponsor-linked logos/descriptions)
  - "Products I Use" (affiliate/partner links)
- Email signup form
- Social sharing capability

### 3.5 Post-MVP Feature Expansion

**Phase 2 Features:**
- Sponsor management portal (sponsors can view their placement analytics)
- A/B testing for resource page layouts
- Audience segmentation (by event, by interest, by engagement level)
- Integration with email marketing platforms (Mailchimp, ConvertKit, HubSpot)
- Custom domains (speaker.fanflet.com or speaker's own domain)
- Speaker "hub" page -- a persistent page listing all of a speaker's past and upcoming Fanflets (the speaker's personal Fanflet profile)

**Phase 3 Features:**
- Event organizer portal (conference provides Fanflet to all speakers)
- Sponsor marketplace (sponsors can discover and pay for placement across speakers)
- AI-powered content suggestions ("Based on your talk title, here are recommended resources to include")
- Audience community features (comments, Q&A threads)
- Programmatic ad placements
- API for integration with event management platforms (Eventbrite, Cvent, Bizzabo)
- White-label offering for large event organizations

### 3.6 Brand Identity

The Fanflet brand is already well-conceived:

- **Name:** "Fanflet" -- memorable, distinctive, suggests "fan" (audience) + "leaflet" (resource handout). Strong, brandable name.
- **Logo:** A diamond-shaped geometric mark in navy blue and sky blue, with overlapping angular shapes suggesting connectivity and forward motion. Professional, modern, tech-forward. Works well at small sizes (important for QR code slides and mobile).
- **Color Palette:** Navy blue (#1B365D approximate) and sky/cyan blue (#3BA5D9 approximate) on white. Clean, professional, trustworthy -- appropriate for the conference/enterprise context.
- **Tagline:** "Turn Event Talks into Lasting Engagement" -- clear value proposition. Also: "Turn Casual Listeners into Lifelong Fans" -- more aspirational, better for marketing.

**Branding Assessment:** The name and logo are strong assets. The brand identity is professional enough for enterprise/healthcare contexts while being approachable enough for independent speakers. No changes recommended -- this is ready to build with.

---

## 4. TECHNICAL ARCHITECTURE

### 4.1 Architecture Principles

Given the product's nature and the need to move fast with limited initial resources, the architecture should be:

1. **Simple first, scalable later.** Start with a monolithic application. Microservices are not needed at this stage and would slow development.
2. **Mobile-first on the consumer side.** The audience experience is 95%+ mobile (QR code scan from phones). The speaker dashboard is primarily desktop.
3. **Performance-obsessed on the landing page.** The audience page must load in under 2 seconds on a mediocre conference Wi-Fi connection. This is a hard requirement.
4. **Low operational overhead.** Use managed services wherever possible. The founding team should be building product, not managing infrastructure.

### 4.2 Recommended Technology Stack

```
FRONTEND (Speaker Dashboard)
--------------------------------------
Framework:        Next.js (React) with App Router
Styling:          Tailwind CSS
State Management: React Query (server state) + Zustand (client state)
Component Library: shadcn/ui (fast, customizable, accessible)

FRONTEND (Audience Landing Page)
--------------------------------------
Rendering:        Static Site Generation (SSG) via Next.js
                  or pre-rendered HTML served from CDN
                  (Critical: must be FAST -- no client-side rendering dependency)
Styling:          Tailwind CSS (same design system)

BACKEND / API
--------------------------------------
Runtime:          Node.js
Framework:        Next.js API Routes (initially) or separate Express/Fastify service
Auth:             Clerk or NextAuth.js (OAuth + email/password)
Database:         PostgreSQL (via Supabase or Neon for managed hosting)
ORM:              Prisma
File Storage:     AWS S3 or Cloudflare R2 (for uploaded PDFs, images)
CDN:              Cloudflare (for landing page delivery and asset caching)

QR CODE GENERATION
--------------------------------------
Library:          qrcode (npm) or custom solution with branding overlay
Delivery:         Generated server-side, cached, downloadable as PNG/SVG

EMAIL
--------------------------------------
Transactional:    Resend or AWS SES
Marketing/Drip:   Integration with Mailchimp/ConvertKit (Phase 2)

ANALYTICS
--------------------------------------
Event Tracking:   Custom events to PostgreSQL + PostHog (self-hosted or cloud)
                  (Avoid Google Analytics -- too generic, and privacy concerns)

HOSTING / INFRASTRUCTURE
--------------------------------------
Application:      Vercel (natural fit for Next.js, generous free tier, auto-scaling)
Database:         Supabase (managed Postgres, auth, storage -- reduces complexity)
                  OR Neon (serverless Postgres) + separate auth
DNS/CDN:          Cloudflare
Monitoring:       Vercel Analytics + Sentry (error tracking)

ALTERNATIVE STACK (if preferring AWS ecosystem):
  Compute:        AWS Lambda + API Gateway or ECS Fargate
  Database:       AWS RDS (PostgreSQL)
  CDN:            AWS CloudFront
  Storage:        AWS S3
  (This path has higher operational complexity but may align
   with Brian's AWS familiarity from the pitch deck)
```

### 4.3 Data Model (Core Entities)

```
Speaker
  - id (UUID)
  - email
  - name
  - bio
  - photo_url
  - social_links (JSON)
  - subscription_tier
  - created_at

Fanflet (Resource Page)
  - id (UUID)
  - speaker_id (FK)
  - title
  - event_name
  - event_date
  - slug (unique, for URL: fanflet.com/{speaker_slug}/{fanflet_slug})
  - status (draft | published | archived)
  - qr_code_url
  - short_url
  - theme/layout_config (JSON)
  - created_at
  - published_at

ResourceBlock
  - id (UUID)
  - fanflet_id (FK)
  - type (link | file | embed | text | sponsor)
  - title
  - description
  - url / file_url
  - display_order
  - section_name (e.g., "Information You Saw Today")
  - metadata (JSON -- for sponsor-specific data, affiliate tags, etc.)

Subscriber (Audience Member)
  - id (UUID)
  - email
  - name (optional)
  - source_fanflet_id (FK -- which Fanflet they first subscribed from)
  - created_at

SpeakerSubscriber (Many-to-Many)
  - speaker_id (FK)
  - subscriber_id (FK)
  - subscribed_at
  - source_fanflet_id (FK)

SponsorPlacement
  - id (UUID)
  - fanflet_id (FK)
  - sponsor_name
  - sponsor_logo_url
  - sponsor_url
  - placement_type (logo | banner | featured_link)
  - click_count
  - impression_count

AnalyticsEvent
  - id (UUID)
  - fanflet_id (FK)
  - event_type (page_view | qr_scan | resource_click | email_signup | sponsor_click)
  - resource_block_id (FK, nullable)
  - visitor_fingerprint (hashed, for unique visitor counting -- no PII)
  - referrer
  - device_type
  - timestamp
```

### 4.4 Architecture Diagram (Logical)

```
                    +------------------+
                    |   SPEAKER        |
                    |   (Desktop/Web)  |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  Next.js App      |
                    |  (Speaker         |
                    |   Dashboard)      |
                    +--------+---------+
                             |
                    +--------v---------+      +-----------------+
                    |  API Layer        |----->|  PostgreSQL     |
                    |  (Next.js API     |      |  (Supabase/Neon)|
                    |   Routes)         |      +-----------------+
                    +--------+---------+
                             |
         +-------------------+-------------------+
         |                   |                   |
+--------v------+  +---------v--------+ +--------v--------+
|  S3/R2        |  |  QR Code Engine  | |  Email Service  |
|  (File        |  |  (Generation +   | |  (Resend/SES)   |
|   Storage)    |  |   Branding)      | |                 |
+---------------+  +------------------+ +-----------------+

                    +------------------+
                    |   AUDIENCE       |
                    |   (Mobile)       |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  CDN (Cloudflare) |
                    |  Cached/SSG       |
                    |  Landing Pages    |
                    +--------+---------+
                             |
                    +--------v---------+
                    |  Analytics        |
                    |  Collector        |
                    |  (Lightweight     |
                    |   event tracking) |
                    +------------------+
```

### 4.5 Key Technical Decisions and Rationale

**Why Next.js?**
Single framework for both the dashboard (SSR/CSR) and the landing pages (SSG). Reduces context switching, shared component library, excellent deployment story on Vercel. The App Router provides good patterns for both the authenticated dashboard and the public-facing pages.

**Why SSG for Landing Pages?**
When a speaker publishes a Fanflet, the landing page should be pre-rendered to static HTML and pushed to the CDN edge. This guarantees sub-second load times regardless of conference Wi-Fi quality. The page is rebuilt only when the speaker edits the Fanflet -- not on every audience request.

**Why PostgreSQL (not a NoSQL database)?**
The data model has clear relational structures (speakers have Fanflets, Fanflets have resources and analytics, subscribers belong to speakers). PostgreSQL handles this naturally, supports JSON columns for flexible metadata, and scales well beyond what Fanflet will need for years.

**Why Not a Mobile App?**
The audience side must be zero-friction. Requiring an app download before scanning a QR code would destroy the user experience. A responsive web page is the correct choice. A native app might make sense later for speakers who want a mobile dashboard, but it is not an MVP requirement.

### 4.6 Performance Budget (Audience Landing Page)

| Metric | Target |
|--------|--------|
| Time to First Byte (TTFB) | < 200ms |
| First Contentful Paint (FCP) | < 1.0s |
| Largest Contentful Paint (LCP) | < 1.5s |
| Total page weight | < 500KB |
| JavaScript payload | < 50KB (minimal -- mostly static content) |
| Lighthouse Performance Score | > 95 |

This is achievable with SSG + CDN + optimized images. The audience page should feel instant.

---

## 5. BUSINESS MODEL AND REVENUE STRATEGY

### 5.1 Primary Revenue Streams

Fanflet has a multi-layered revenue model, which is a strength. The pitch deck identifies multiple avenues; here they are prioritized and structured:

**Stream 1: Speaker Subscriptions (Primary, Recurring)**
The core SaaS model. Speakers pay a monthly or annual fee for access to the platform.

| Tier | Price | Includes |
|------|-------|----------|
| Free | $0/mo | 1 active Fanflet, basic analytics, Fanflet branding on page, 50 subscriber limit |
| Pro | $19/mo ($190/yr) | Unlimited Fanflets, full analytics, email capture, custom branding, remove Fanflet watermark |
| Business | $49/mo ($490/yr) | Everything in Pro + sponsor placement tools, audience segmentation, integrations, custom domain, priority support |
| Enterprise | Custom | White-label, API access, event organizer portal, dedicated support |

**Pricing Note:** The pitch deck uses $50/month uniformly. I recommend a tiered approach because: (a) the free tier creates a funnel and reduces barrier to trial, (b) $19/mo captures the long-tail of occasional speakers who would never pay $50, and (c) the $49/mo tier lands close to the $50 target for serious speakers while the higher Enterprise tier captures event organizations willing to pay significantly more. The blended ARPU may actually exceed $50/mo when Enterprise contracts are factored in.

**Stream 2: Sponsor Integrations (High-Margin, Growth Multiplier)**
This is where the big money is, and it is Fanflet's most differentiated revenue opportunity. Sponsors pay for:
- Featured placement on Fanflet pages (logo, banner, featured link)
- Click and impression analytics tied to their placement
- Lead capture data (audience members who interacted with their content)
- Premium placement in the "Companies I Mentioned" or "Products I Use" sections

Revenue model: Fanflet takes a percentage of sponsor placement fees or charges a flat fee per placement per event. This could be structured as a self-serve marketplace (Phase 3) or a managed service (Phase 2).

**Stream 3: Affiliate and Referral Revenue (Passive, Supplemental)**
When speakers link to products, tools, or services, Fanflet can provide an affiliate infrastructure. If a speaker links to "AWS CloudFront" or "Red Hat OpenShift" (as in the pitch deck mockup), those links can carry affiliate or referral tracking. Fanflet takes a share of any resulting conversions.

**Stream 4: Data and Insights (Future, Phase 3+)**
Aggregated, anonymized data about audience behavior, content performance, and engagement patterns across the platform. Valuable to event organizers, sponsors, and the events industry. This must be handled with strict privacy controls and opt-in consent.

### 5.2 Pricing Strategy Rationale

The freemium model is correct for this market because:
1. Speakers need to experience the "aha moment" (seeing their audience actually scan and engage) before they will pay
2. Free users create landing pages that audience members see -- every free Fanflet page with Fanflet branding is a marketing impression
3. The speaker community is tight-knit; word-of-mouth is the primary growth channel, and free access lowers the barrier to sharing

The conversion target from Free to Paid should be 5-10% within 90 days. If it is below 5%, the free tier is too generous. If above 15%, it may be too restrictive.

---

## 6. GO-TO-MARKET STRATEGY

### 6.1 Beachhead Market: Healthcare Conferences

The pitch deck correctly identifies healthcare as the Year 1 focus market. This is a strong choice for several reasons:

1. **High-value content:** Medical procedures, clinical case studies, and treatment protocols are information that attendees genuinely need to reference later. The pain point is acute.
2. **Sponsor density:** Healthcare conferences have deep sponsor involvement (pharmaceutical companies, medical device manufacturers, health IT vendors). Sponsor integration revenue potential is highest here.
3. **Regulatory tailwind:** CME (Continuing Medical Education) requirements create structural demand for resource documentation and follow-up materials.
4. **Premium willingness to pay:** Healthcare professionals and their organizations have higher budget tolerance for professional tools.
5. **Credential validation:** If Fanflet becomes known as "the tool healthcare speakers use," it creates credibility for expansion into other verticals.

### 6.2 Go-to-Market Phases

**Phase 1: Founder-Led Sales (Months 1-6)**

Strategy: Brian personally recruits the first 20-50 speakers through his network and direct outreach.

Tactics:
- Identify 10 healthcare conferences happening in the next 6 months
- Recruit 2-5 speakers per conference to use Fanflet (free, in exchange for feedback)
- Attend conferences in person to demonstrate the product and collect testimonials
- Create case studies from the first successful deployments
- Focus on speakers who are already frustrated with their current resource-sharing workflow

Success Criteria: 50 active speakers, 20+ published Fanflets that have been used at live events, 3+ testimonials, clear signal on which features matter most.

**Phase 2: Community-Led Growth (Months 6-12)**

Strategy: Leverage early adopters to drive organic word-of-mouth within the speaker community.

Tactics:
- Launch speaker referral program (give a month free for every referred speaker who converts)
- Partner with speaker bureaus and speaker coaching communities
- Content marketing: blog posts, guides ("How to maximize your post-event impact"), podcast appearances on speaker-focused shows
- Ensure every Fanflet landing page includes a subtle "Powered by Fanflet" link (free tier) that acts as organic marketing
- Engage in speaker-focused communities (National Speakers Association, Toastmasters chapters, industry-specific speaker networks)

Success Criteria: 200+ active speakers, organic signups exceeding outbound-driven signups, measurable referral loop.

**Phase 3: Vertical Expansion + Sponsor Revenue (Months 12-24)**

Strategy: Expand beyond healthcare into business/education (as the pitch deck proposes), and launch the sponsor integration product.

Tactics:
- Replicate the healthcare playbook in business conferences and education events
- Launch sponsor self-serve portal: sponsors can create accounts, browse available placements, purchase
- Hire first sales rep focused on sponsor partnerships
- Pursue partnerships with event management platforms (Cvent, Eventbrite, Bizzabo)
- Consider event organizer packages (conference buys Fanflet for all its speakers)

Success Criteria: 1,000+ active speakers, sponsor revenue > 25% of total revenue, 2+ event platform integrations.

### 6.3 Key Marketing Messages

**For Speakers:**
- "Your audience is already forgetting your talk. Give them a reason to remember."
- "Stop losing your audience the moment your session ends."
- "One QR code. Every resource. Lifelong fans."

**For Event Organizers:**
- "Give every speaker a superpower. Give every sponsor measurable ROI."
- "Upgrade your conference experience without changing your workflow."

**For Sponsors:**
- "Reach engaged, in-session audiences with measurable placement."
- "Know exactly who interacted with your brand, and when."

---

## 7. COMPETITIVE ANALYSIS AND POSITIONING

### 7.1 Competitive Landscape

| Competitor | Type | What They Do | Where Fanflet Wins |
|------------|------|-------------|-------------------|
| **Linktree** | Indirect | Generic "link in bio" pages | Not built for events. No QR workflow, no analytics for speakers, no sponsor integration, no event context. |
| **Shorby** | Indirect | Link-in-bio with more customization | Same limitations as Linktree. Generic tool, not event-specific. |
| **Talkadot** | Direct (closest) | Speaker feedback/booking platform. QR code leads to audience survey, captures leads, helps speakers get re-booked. Pricing: $49-99/mo. | Talkadot focuses on feedback collection and rebooking. Fanflet focuses on resource delivery and ongoing engagement. Different primary jobs-to-be-done. Could be complementary. |
| **SlideShare** | Indirect | Slide hosting platform | Upload-and-forget. No QR workflow, no audience connection, no sponsor layer, no analytics. |
| **Google Drive** | Indirect | File sharing | Generic, unprofessional, no branding, no analytics, no engagement features. |
| **Eventbrite** | Indirect | Event ticketing and management | Focuses on pre-event (ticketing) not post-event engagement. |
| **SpeakerHub** | Indirect | Speaker directory and profile platform | Focuses on discovery/booking. No post-event engagement. |
| **Snapsight** | Tangential | AI-powered event content platform | Focuses on content capture (transcription, summaries). Complementary, not competitive. |

### 7.2 Fanflet's Competitive Moat

**Short-term differentiation (Year 1):** Purpose-built for post-event resource sharing. The QR-to-landing-page workflow is faster and more elegant than any generic alternative. Speaks directly to speakers' language and workflow.

**Medium-term moat (Years 2-3):**
- **Data network effect:** As more speakers use Fanflet, aggregate data on audience behavior and content performance becomes uniquely valuable. No competitor will have this dataset.
- **Sponsor network effect:** As the sponsor marketplace grows, it attracts more speakers (who want monetization), and more speakers attract more sponsors (who want audience reach).
- **Audience subscriber base:** Audience members who have subscribed to multiple speakers through Fanflet represent a sticky asset. The platform becomes the audience's "inbox" for speaker content.

**Long-term moat (Years 3+):**
- **Platform integrations:** Deep integrations with event management platforms create switching costs.
- **Brand association:** Becoming synonymous with "the thing speakers put on their last slide" -- like Linktree became synonymous with Instagram bios.
- **Data intelligence:** AI-powered insights for speakers, sponsors, and event organizers based on the largest dataset of post-event engagement behavior.

### 7.3 Positioning Statement

"Fanflet is the only platform purpose-built for the moment after the talk ends -- giving speakers a beautiful, branded resource page their audience can access with a single QR scan, while providing sponsors with measurable audience engagement and speakers with the data to build lasting communities."

---

## 8. PHASED EXECUTION ROADMAP

### Phase 0: Foundation (Weeks 1-4)
**Objective:** Set up the project, validate core assumptions with a functional prototype.

| Task | Deliverable | Owner |
|------|------------|-------|
| Secure domain (fanflet.com) and social handles | Domain + @fanflet on key platforms | Brian |
| Set up development environment and repository | GitHub repo, CI/CD pipeline | Dev |
| Build functional prototype (landing page only) | A single, hand-coded Fanflet page that Brian can use at a real event | Dev |
| Validate QR scan experience on 5+ phone models | QR reliability confirmed | Brian + Dev |
| Define MVP scope (finalize feature list) | PRD document | Brian |
| Identify 5 pilot speakers from network | Committed pilot users | Brian |

**Go/No-Go Gate:** Can we get 5 speakers to commit to using the prototype at a real event in the next 60 days?

### Phase 1: MVP Build (Weeks 5-14)
**Objective:** Build the minimum viable product that supports the full speaker-to-audience workflow.

**Sprint 1-2 (Weeks 5-8): Core Infrastructure**
- User authentication (speaker accounts)
- Speaker profile creation
- Database schema and API foundations
- File upload infrastructure (S3/R2)

**Sprint 3-4 (Weeks 9-12): Fanflet Builder**
- Fanflet creation form (title, event, date)
- Resource block system (add links, files, embeds, text, sponsor sections)
- Drag-and-drop ordering of resource blocks
- QR code generation with Fanflet branding
- Short URL generation

**Sprint 5 (Weeks 13-14): Landing Page + Analytics**
- Mobile-optimized audience landing page renderer
- SSG build pipeline (publish Fanflet -> generate static page -> deploy to CDN)
- Basic analytics collection (page views, resource clicks, email signups)
- Speaker analytics dashboard (view stats for each Fanflet)
- Email capture form on landing page

**Deliverable:** Working product that a speaker can use to create a Fanflet, generate a QR code, include it in a presentation, and have audience members scan it to access resources.

**Go/No-Go Gate:** Do 3+ pilot speakers successfully use the MVP at a real event? Do audience members actually scan and engage?

### Phase 2: Polish and Early Growth (Weeks 15-26)
**Objective:** Refine based on pilot feedback, launch publicly, begin organic growth.

- Landing page design polish and theming options
- Speaker "hub" page (all Fanflets from one speaker)
- Email follow-up capability (speaker sends update to subscribers)
- Improved analytics (engagement over time, device breakdown, geographic data)
- Billing infrastructure (Stripe integration for Pro/Business tiers)
- Onboarding flow for new speakers
- Marketing website (fanflet.com homepage)
- Public launch
- Referral program infrastructure

**Go/No-Go Gate:** 50+ active speakers. Conversion rate from free to paid > 5%. Positive NPS from pilot users.

### Phase 3: Sponsor Layer and Vertical Expansion (Weeks 27-52)
**Objective:** Launch sponsor features, expand beyond healthcare, achieve first meaningful revenue milestone.

- Sponsor placement management (speakers can add/manage sponsor sections)
- Sponsor analytics dashboard
- Integration with email marketing platforms (Mailchimp, ConvertKit)
- Custom domain support
- Event organizer package (conference buys Fanflet for all speakers)
- Expansion into business and education verticals
- Hire first non-engineering team member (marketing or sales)

**Go/No-Go Gate:** $10K+ MRR. Sponsor revenue demonstrates product-market fit for the B2B layer.

### Phase 4: Scale (Year 2)
**Objective:** Scale the platform, deepen the sponsor marketplace, pursue integrations.

- Sponsor self-serve marketplace
- API for event management platform integrations
- Advanced analytics and AI-powered insights
- White-label capabilities
- International expansion
- Series A readiness (if pursuing venture funding)

---

## 9. TEAM AND RESOURCE PLAN

### 9.1 Founding Phase (Months 1-6)

The initial build requires a very small team. Fanflet's MVP is well-scoped enough that it does not require a large engineering organization.

**Minimum Viable Team:**

| Role | Allocation | Profile | Est. Cost |
|------|-----------|---------|-----------|
| Brian Bell (Founder/CEO) | Full-time | Product direction, GTM, pilot speaker recruitment, fundraising | Founder comp |
| Full-Stack Engineer | Full-time | Senior-level. Next.js, PostgreSQL, AWS/Vercel. Owns the entire technical build. | $150-180K/yr or $75-90/hr contract |
| UI/UX Designer | Part-time (contract) | Design the Fanflet builder UX and the audience landing page templates | $5-15K project-based |

**Alternative: AI-Accelerated Solo Build**
Given the relative simplicity of the MVP (it is fundamentally a CRUD application with a landing page renderer and QR generation), Brian could build the MVP himself using AI-assisted development tools (Claude Code, Cursor, v0) if he has intermediate-to-senior coding ability, or hire a single senior developer. The product does not require a team of five engineers.

**Estimated MVP Build Cost:**
- With 1 senior contractor: $40-60K over 14 weeks
- With a small agency: $60-100K over 14 weeks
- Self-built with AI tools: $5-10K (hosting, tools, design assets only)

### 9.2 Growth Phase (Months 6-18)

| Role | When to Hire | Why |
|------|-------------|-----|
| Marketing / Growth Lead | Month 8-10 | Organic growth is happening but needs fuel. Content marketing, community management, speaker outreach. |
| Second Engineer | Month 10-12 | Sponsor features, integrations, and scaling require more engineering capacity. |
| Customer Success | Month 12-15 | As paid speaker base grows, dedicated support and onboarding becomes important for retention. |
| Sales (Sponsor-focused) | Month 15-18 | Sponsor revenue is the high-margin growth lever. Needs dedicated outbound effort. |

### 9.3 Technology Partners / Sub-Agents

For execution, specialized work can be delegated to focused agents or contractors:

| Capability | Scope | Deliverable |
|------------|-------|-------------|
| **UI/UX Design Agent** | Design the Fanflet builder interface, audience landing page templates (3-5 themes), QR code slide template for speakers | Figma designs, component specifications |
| **Frontend Engineering Agent** | Build the Next.js application (dashboard + landing pages) | Working frontend codebase |
| **Backend Engineering Agent** | Build the API, database schema, auth, file storage, QR generation, analytics pipeline | Working backend codebase |
| **DevOps/Infrastructure Agent** | Set up Vercel/AWS deployment, CI/CD, CDN configuration, monitoring | Production infrastructure |
| **Content/Copy Agent** | Write marketing website copy, onboarding flows, help documentation, email templates | Content deliverables |

---

## 10. RISK ANALYSIS AND MITIGATIONS

### 10.1 Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **Speakers do not adopt** -- too much effort to set up, or they are satisfied with Google Drive links | Medium | Critical | Make Fanflet creation absurdly easy (< 5 minutes). Offer white-glove onboarding for first 50 speakers. Build a "quick start" mode that auto-generates a Fanflet from a slide deck upload. |
| **Audience does not scan** -- QR code fatigue, poor Wi-Fi at conferences, people just do not bother | Medium | High | Provide speakers with best-practice guidance on QR placement (big, on screen for 60+ seconds, verbal call-to-action). Ensure the landing page loads even on poor connections (SSG + CDN). Include short URL as fallback. |
| **Talkadot expands into resource sharing** -- they already have QR + audience capture and could add resource pages | Medium | Medium | Move fast. Talkadot's core is feedback/rebooking, not resource delivery. Fanflet's depth in resource curation, sponsor integration, and landing page quality will be hard to replicate as a bolt-on feature. |
| **Linktree adds event-specific features** -- they have massive distribution and could enter this niche | Low | High | Fanflet's advantage is depth and specialization. Linktree has no incentive to build event-specific analytics, sponsor tools, or speaker dashboards for a relatively small niche. If they do, it will be generic. |
| **Low willingness to pay** -- speakers try the free tier and never upgrade | Medium | Medium | Ensure the free tier has clear limitations that active speakers will hit (1 Fanflet limit, subscriber cap, Fanflet branding). Make the upgrade moment feel like relief, not extraction. |
| **Privacy/data concerns** -- collecting audience emails and behavior data raises compliance questions | Low | Medium | Implement GDPR-compliant consent flows from day one. Clear privacy policy. Minimal data collection. No selling of individual data. |
| **Conference Wi-Fi failures** -- QR codes are useless if phones cannot reach the internet | Low | Medium | SSG + CDN means the page loads from the nearest edge node, not a distant server. Provide speakers with guidance on offline alternatives (NFC tags, SMS shortcodes). |

### 10.2 Biggest Single Risk

The most significant risk is **speaker adoption inertia**. Many speakers have been doing this for years with hacky solutions that "work well enough." The key to overcoming this is making the setup so fast and the result so visually impressive that the speaker feels embarrassed by their old Google Drive link in comparison. The first impression of the audience landing page must make speakers think: "I need this."

---

## 11. FINANCIAL PROJECTIONS AND SCENARIOS

### 11.1 Conservative Scenario

| Metric | Month 6 | Month 12 | Month 18 | Month 24 |
|--------|---------|----------|----------|----------|
| Active speakers (free) | 50 | 200 | 500 | 1,000 |
| Paid speakers | 5 | 30 | 100 | 250 |
| Blended ARPU | $30 | $35 | $38 | $42 |
| Subscription MRR | $150 | $1,050 | $3,800 | $10,500 |
| Sponsor revenue (MRR) | $0 | $0 | $500 | $3,000 |
| Total MRR | $150 | $1,050 | $4,300 | $13,500 |
| Annual run rate | $1,800 | $12,600 | $51,600 | $162,000 |

### 11.2 Base Scenario (Aligned with Pitch Deck)

| Metric | Month 6 | Month 12 | Month 18 | Month 24 |
|--------|---------|----------|----------|----------|
| Active speakers (free) | 100 | 500 | 1,500 | 4,000 |
| Paid speakers | 15 | 80 | 350 | 1,000 |
| Blended ARPU | $35 | $40 | $42 | $45 |
| Subscription MRR | $525 | $3,200 | $14,700 | $45,000 |
| Sponsor revenue (MRR) | $0 | $500 | $5,000 | $20,000 |
| Total MRR | $525 | $3,700 | $19,700 | $65,000 |
| Annual run rate | $6,300 | $44,400 | $236,400 | $780,000 |

### 11.3 Optimistic Scenario (Viral Adoption + Strong Sponsor Traction)

| Metric | Month 6 | Month 12 | Month 18 | Month 24 |
|--------|---------|----------|----------|----------|
| Active speakers (free) | 200 | 1,000 | 5,000 | 15,000 |
| Paid speakers | 30 | 200 | 1,000 | 4,000 |
| Blended ARPU | $40 | $45 | $48 | $50 |
| Subscription MRR | $1,200 | $9,000 | $48,000 | $200,000 |
| Sponsor revenue (MRR) | $0 | $2,000 | $20,000 | $100,000 |
| Total MRR | $1,200 | $11,000 | $68,000 | $300,000 |
| Annual run rate | $14,400 | $132,000 | $816,000 | $3,600,000 |

### 11.4 Funding Considerations

**Bootstrapping Path (Recommended for Phase 0-1):**
- Total cash needed for MVP + 6 months: $50-100K
- Brian self-funds or uses a small friends/family round
- Validates product-market fit before taking institutional money
- Maintains full control and equity

**Seed Round Timing (If pursuing):**
- Raise after Phase 2 (Month 6-9), once there is evidence of product-market fit
- Target: $500K-$1M
- Use: Engineering hires, marketing, sponsor sales
- Valuation basis: Traction metrics, not revenue

**Why Bootstrap First:**
Given Brian's experience and the relatively low capital requirements of the MVP, bootstrapping through initial validation is the strongest move. It proves the concept without dilution, creates leverage for better terms if external funding is later pursued, and avoids the pressure to scale before the product is ready.

---

## 12. GOVERNANCE, ETHICS, AND GUARDRAILS

### 12.1 Data Privacy and Audience Protection

- **Minimal data collection:** Collect only what is needed (email for subscription, anonymous analytics for engagement tracking). No device fingerprinting beyond session-level uniqueness.
- **GDPR and CCPA compliance from day one:** Even if the initial market is U.S.-focused, building privacy-compliant infrastructure from the start avoids expensive retrofitting.
- **Clear opt-in:** Audience email capture must be explicitly opt-in with clear language about what they are subscribing to.
- **No selling of individual data:** Aggregate insights are acceptable (with consent). Individual audience data belongs to the speaker, not to Fanflet's commercial interests.
- **Easy unsubscribe:** One-click unsubscribe from all speaker communications.

### 12.2 Speaker Content Responsibility

- **Terms of service** must clearly state that speakers are responsible for the content they publish on their Fanflet pages.
- **Prohibited content policy** for resource pages (no illegal content, no misleading health claims, no spam).
- **DMCA takedown process** for copyrighted material uploaded without permission.

### 12.3 Sponsor Transparency

- **Clearly labeled sponsorships:** Any sponsor-placed content on a Fanflet page must be visually distinguishable from the speaker's own resources. No "stealth" advertising.
- **Speaker control:** Speakers must explicitly approve every sponsor placement on their pages. Fanflet will never inject sponsor content without speaker consent.

### 12.4 Quality Guardrails

- **Definition of Done:** Every feature must include automated tests, be reviewed by at least one other person, and work on mobile Safari and Chrome (the two dominant mobile browsers for QR scan use cases).
- **Performance monitoring:** Audience landing page load times are monitored in production. Any page exceeding 3 seconds triggers an alert.
- **Uptime target:** 99.9% for audience landing pages (these are served from CDN, so this is achievable). 99.5% for the speaker dashboard.

---

## 13. KEY DECISIONS AND OPEN QUESTIONS

These are the decisions that Brian should make before or during the early build phase:

### Decisions to Make Now

1. **Build vs. hire vs. agency?**
   Will Brian build the MVP himself (with AI assistance), hire a senior full-stack contractor, or engage a small agency? Recommendation: hire one strong senior contractor. The cost ($40-60K) is reasonable, the timeline is faster than solo, and it avoids agency overhead.

2. **Domain and infrastructure setup.**
   Is fanflet.com available? Secure it immediately, along with social handles (@fanflet on X/Twitter, Instagram, LinkedIn).

3. **Initial vertical commitment.**
   The pitch deck says healthcare first. Confirm this. It affects which conferences to target, which speakers to recruit, and how the marketing copy is written.

### Decisions to Make During Phase 1

4. **Pricing tiers and free tier limits.**
   The tiered model proposed above vs. a single price point. Test both with pilot speakers.

5. **Fanflet page URL structure.**
   Options: `fanflet.com/speaker/event-name` vs. `fanflet.com/qr/ABC123` vs. custom slugs. Recommendation: `fanflet.com/{speaker-slug}/{fanflet-slug}` for SEO and shareability.

6. **Analytics depth in MVP.**
   How much analytics to build in v1 vs. relying on a third-party tool like PostHog. Recommendation: build lightweight custom analytics for the metrics speakers care about (scans, clicks, signups) and use PostHog for deeper product analytics.

### Open Questions Requiring Research

7. **How big is the speaker community network effect?**
   Do speakers at the same conference talk to each other about tools they use? If yes, one speaker's adoption at a conference could drive 5-10 others. This needs to be validated with pilot users.

8. **What is the optimal QR code placement strategy?**
   First slide? Last slide? Persistent footer? Does it matter? This is worth testing with pilot speakers to develop a "best practices" guide.

9. **Is there an event organizer buying motion?**
   Would a conference like HIMSS or CES buy Fanflet for all their speakers as part of the event package? If so, this B2B2C motion could be more scalable than selling to individual speakers. Worth exploring after Phase 1.

10. **Talkadot partnership or competition?**
    Talkadot and Fanflet solve adjacent problems. A partnership (Talkadot for feedback, Fanflet for resources, integrated via API) could be more powerful than competition. Worth a conversation with their team.

---

## SUMMARY: THE PATH FORWARD

Fanflet is a well-conceived product with a clear pain point, a defined market, a viable business model, and a founder with the right background to execute. The technical build is straightforward, the competitive landscape is open, and the timing is strong.

**The next 30 days should focus on:**

1. Secure the domain and brand assets
2. Recruit one senior full-stack engineer (contract or hire)
3. Confirm 5 pilot speakers from Brian's network who will use Fanflet at real events in the next 90 days
4. Begin the Phase 0 prototype build
5. Start documenting the "Fanflet for Speakers" value proposition content for the marketing site

The biggest determinant of success will not be the technology (which is well-understood) or the market (which is large and growing). It will be **execution speed in achieving speaker adoption** before the window of competitive opportunity narrows. Brian should aim to have a working product in the hands of real speakers at real conferences within 90 days.

---

*This document is a living plan. It should be revisited and updated at each phase gate as new information emerges from the market and from real user behavior.*
