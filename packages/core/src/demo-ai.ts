/**
 * AI content generator for personalized demo environments.
 * Calls Claude Haiku via the Anthropic API to generate specialty-aware
 * demo content (talks, resources, sponsors, bio, survey questions).
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DemoProspectInput {
  full_name: string;
  email?: string;
  specialty: string;
  credentials?: string;
  bio?: string;
  photo_url?: string;
  website_url?: string;
  linkedin_url?: string;
  slug?: string;
  notes?: string;
  sponsors?: Array<{
    company_name: string;
    website_url?: string;
    logo_url?: string;
    industry?: string;
    description?: string;
  }>;
  talks?: Array<{
    title: string;
    event_name: string;
    event_date?: string;
    resources?: Array<{
      type: "link" | "file" | "text" | "sponsor";
      title: string;
      description?: string;
      url?: string;
    }>;
  }>;
  theme?: string;
  survey_questions?: string[];
}

export interface GeneratedDemoPayload {
  bio: string;
  credentials: string;
  slug: string;
  talks: Array<{
    title: string;
    event_name: string;
    event_date: string;
    resources: Array<{
      type: "link" | "file" | "text" | "sponsor";
      title: string;
      description: string;
      url?: string;
    }>;
  }>;
  sponsors: Array<{
    company_name: string;
    website_url: string;
    description: string;
    industry: string;
  }>;
  survey_questions: string[];
  theme: string;
}

/* ------------------------------------------------------------------ */
/*  Sponsor demo types                                                 */
/* ------------------------------------------------------------------ */

export interface SponsorDemoProspectInput {
  company_name: string;
  contact_name?: string;
  contact_email?: string;
  website_url?: string;
  industry?: string;
  logo_url?: string;
  notes?: string;
}

export interface GeneratedSponsorDemoPayload {
  description: string;
  industry: string;
  slug: string;
  resources: Array<{
    title: string;
    description: string;
    url?: string;
    type: "link" | "file" | "text" | "promo";
  }>;
  kol_speakers: Array<{
    full_name: string;
    specialty: string;
    credentials: string;
    bio: string;
    slug: string;
    connection_status: "active" | "none" | "pending";
    fanflet: {
      title: string;
      event_name: string;
      event_date: string;
      resources: Array<{
        type: "link" | "file" | "text" | "sponsor";
        title: string;
        description: string;
        url?: string;
      }>;
    };
  }>;
  sample_leads: Array<{
    name: string;
    email: string;
    resource_title: string;
    created_at: string;
  }>;
  theme: string;
}

/* ------------------------------------------------------------------ */
/*  Prompt                                                             */
/* ------------------------------------------------------------------ */

function buildPrompt(input: DemoProspectInput): string {
  const sponsorContext = input.sponsors?.length
    ? `The prospect works with these sponsors: ${input.sponsors.map((s) => s.company_name).join(", ")}. Include these as sponsors and generate resources related to their products.`
    : "Generate 2-3 realistic sponsor companies that are well-known in this specialty.";

  const talkContext = input.talks?.length
    ? `The prospect has these upcoming talks: ${input.talks.map((t) => `"${t.title}" at ${t.event_name}`).join("; ")}. Use these exact talks and generate appropriate resources for each.`
    : "Generate 2-3 realistic talk titles and event names appropriate for this specialty.";

  const notesContext = input.notes
    ? `Additional context from the sales conversation: ${input.notes}`
    : "";

  return `You are generating realistic demo content for a speaker platform called Fanflet. The prospect is:

Name: ${input.full_name}
Specialty: ${input.specialty}
${input.credentials ? `Credentials: ${input.credentials}` : ""}
${input.website_url ? `Website: ${input.website_url}` : ""}
${input.bio ? `Known bio: ${input.bio}` : ""}
${notesContext}

${sponsorContext}

${talkContext}

Generate a complete, realistic demo profile as JSON with this exact structure:
{
  "bio": "A 2-3 sentence professional bio for this speaker. Make it sound natural and authoritative.",
  "credentials": "Their professional credentials/designations (e.g. 'DDS, MS' or 'DMD, FICD')",
  "slug": "a-url-friendly-slug-based-on-their-name",
  "talks": [
    {
      "title": "Realistic talk title for their specialty",
      "event_name": "Realistic conference or event name",
      "event_date": "YYYY-MM-DD (upcoming date within next 3 months)",
      "resources": [
        { "type": "file", "title": "Presentation Slides", "description": "PDF slides from the presentation" },
        { "type": "link", "title": "Resource title", "description": "Brief description", "url": "https://real-relevant-url.com" },
        { "type": "file", "title": "Clinical Protocol or Handout", "description": "Downloadable resource" },
        { "type": "link", "title": "CE Credit Registration", "description": "AGD-approved continuing education" }
      ]
    }
  ],
  "sponsors": [
    {
      "company_name": "Real company name in this specialty",
      "website_url": "https://real-company-website.com",
      "description": "One sentence about what this company does",
      "industry": "Industry category (e.g. 'Dental Materials', 'Medical Devices')"
    }
  ],
  "survey_questions": [
    "Relevant survey question for this specialty and audience",
    "Another relevant question"
  ],
  "theme": "navy"
}

Rules:
- Use REAL company names that are well-known in this specialty. Do not invent fake companies.
- Use REAL website URLs for known companies.
- Generate 2-3 talks with 3-5 resources each.
- Generate 2-3 sponsors (use the ones provided if given, add more if needed).
- Generate 2-3 survey questions relevant to the specialty.
- For resource URLs, use real URLs when possible (company websites, product pages). For files, omit the url field.
- Event dates should be within the next 3 months from today.
- The theme should be one of: navy, crimson, forest, sunset, royal, slate, midnight, terracotta.
- Resources should include a mix of types: at least one "file" (slides/handout), one "link" (external resource), and one "sponsor" type per talk that references one of the sponsors.
- Return ONLY valid JSON, no markdown fences or explanation.`;
}

/* ------------------------------------------------------------------ */
/*  API call                                                           */
/* ------------------------------------------------------------------ */

export async function generateDemoContent(
  input: DemoProspectInput,
  apiKey: string,
): Promise<GeneratedDemoPayload> {
  const prompt = buildPrompt(input);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("AI generation timed out after 30 seconds");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const textBlock = result.content?.find(
    (block) => block.type === "text",
  );

  if (!textBlock?.text) {
    throw new Error("No text content in Anthropic API response");
  }

  let parsed: GeneratedDemoPayload;
  try {
    const cleaned = textBlock.text
      .replace(/^```json?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${textBlock.text.substring(0, 200)}`);
  }

  return mergeWithExplicitInput(input, parsed);
}

/* ------------------------------------------------------------------ */
/*  Merge explicit input over AI-generated content                     */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Sponsor demo prompt & generation                                   */
/* ------------------------------------------------------------------ */

function buildSponsorPrompt(input: SponsorDemoProspectInput): string {
  const notesContext = input.notes
    ? `Additional context: ${input.notes}`
    : "";

  return `You are generating realistic demo content for a SPONSOR PORTAL on a speaker platform called Fanflet. Sponsors connect with Key Opinion Leaders (KOLs/speakers) to distribute resources and track engagement.

The prospect sponsor company is:

Company: ${input.company_name}
${input.industry ? `Industry: ${input.industry}` : ""}
${input.website_url ? `Website: ${input.website_url}` : ""}
${input.contact_name ? `Contact: ${input.contact_name}` : ""}
${notesContext}

Generate a complete demo environment as JSON with this exact structure:
{
  "description": "A 2-3 sentence description of what this company does and their value to dental/medical professionals.",
  "industry": "Industry category (e.g. 'Dental AI', 'Dental Materials', 'Dental Equipment')",
  "slug": "url-friendly-slug-for-the-company",
  "resources": [
    {
      "title": "Product or resource name",
      "description": "Brief description of this resource",
      "url": "https://real-url-if-applicable.com",
      "type": "link"
    }
  ],
  "kol_speakers": [
    {
      "full_name": "Realistic dental professional name",
      "specialty": "Their dental specialty",
      "credentials": "DDS, MS or similar",
      "bio": "2-3 sentence professional bio",
      "slug": "url-friendly-speaker-slug",
      "connection_status": "active",
      "fanflet": {
        "title": "Realistic talk title",
        "event_name": "Realistic dental conference name",
        "event_date": "YYYY-MM-DD (within next 3 months)",
        "resources": [
          { "type": "file", "title": "Presentation Slides", "description": "PDF slides" },
          { "type": "link", "title": "Resource", "description": "Description", "url": "https://..." },
          { "type": "sponsor", "title": "Sponsored by ${input.company_name}", "description": "Resource from ${input.company_name}" }
        ]
      }
    }
  ],
  "sample_leads": [
    {
      "name": "Realistic attendee name",
      "email": "email@example.com",
      "resource_title": "Which resource they clicked",
      "created_at": "ISO date within last 30 days"
    }
  ],
  "theme": "navy"
}

Rules:
- Generate 3-5 sponsor resources (mix of types: "link" for URLs/product pages, "file" for documents, "promo" for promotional materials, "text" for text-based resources).
- Generate exactly 3 KOL speakers:
  - KOL #1: connection_status "active" — an established relationship. Include a "sponsor" type resource in their fanflet referencing ${input.company_name}.
  - KOL #2: connection_status "none" — a discoverable speaker NOT yet connected. No sponsor resource for ${input.company_name} in their fanflet.
  - KOL #3: connection_status "pending" — a pending connection request. No sponsor resource for ${input.company_name} yet.
- Each KOL should have a realistic specialty, 3-5 resources in their fanflet.
- Generate 5-8 sample leads with realistic names, emails, and dates spread over the last 30 days.
- Use REAL company names and URLs when referencing the sponsor.
- The theme should be one of: navy, crimson, forest, sunset, royal, slate, midnight, terracotta.
- Return ONLY valid JSON, no markdown fences or explanation.`;
}

export async function generateSponsorDemoContent(
  input: SponsorDemoProspectInput,
  apiKey: string,
): Promise<GeneratedSponsorDemoPayload> {
  const prompt = buildSponsorPrompt(input);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 8192,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("AI generation timed out after 45 seconds");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error (${response.status}): ${errorText}`);
  }

  const result = (await response.json()) as {
    content?: Array<{ type: string; text?: string }>;
  };
  const textBlock = result.content?.find(
    (block) => block.type === "text",
  );

  if (!textBlock?.text) {
    throw new Error("No text content in Anthropic API response");
  }

  let parsed: GeneratedSponsorDemoPayload;
  try {
    const cleaned = textBlock.text
      .replace(/^```json?\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Failed to parse AI response as JSON: ${textBlock.text.substring(0, 200)}`);
  }

  if (input.industry) parsed.industry = input.industry;
  if (input.website_url && !parsed.slug) {
    parsed.slug = slugifySponsor(input.company_name);
  }

  return parsed;
}

function slugifySponsor(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 60);
}

/* ------------------------------------------------------------------ */
/*  Merge explicit input over AI-generated content                     */
/* ------------------------------------------------------------------ */

function mergeWithExplicitInput(
  input: DemoProspectInput,
  generated: GeneratedDemoPayload,
): GeneratedDemoPayload {
  if (input.bio) generated.bio = input.bio;
  if (input.credentials) generated.credentials = input.credentials;
  if (input.slug) generated.slug = input.slug;
  if (input.theme) generated.theme = input.theme;

  if (input.survey_questions?.length) {
    generated.survey_questions = input.survey_questions;
  }

  if (input.talks?.length) {
    generated.talks = input.talks.map((talk) => ({
      title: talk.title,
      event_name: talk.event_name,
      event_date: talk.event_date ?? generated.talks[0]?.event_date ?? new Date().toISOString().split("T")[0],
      resources: talk.resources?.length
        ? talk.resources.map((r) => ({
            type: r.type,
            title: r.title,
            description: r.description ?? "",
            url: r.url,
          }))
        : generated.talks[0]?.resources ?? [],
    }));
  }

  if (input.sponsors?.length) {
    const explicitNames = new Set(input.sponsors.map((s) => s.company_name.toLowerCase()));
    const keptGenerated = generated.sponsors.filter(
      (s) => !explicitNames.has(s.company_name.toLowerCase()),
    );
    generated.sponsors = [
      ...input.sponsors.map((s) => ({
        company_name: s.company_name,
        website_url: s.website_url ?? "",
        description: s.description ?? "",
        industry: s.industry ?? "",
      })),
      ...keptGenerated,
    ];
  }

  return generated;
}
