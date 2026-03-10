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

  const result = await response.json();
  const textBlock = result.content?.find(
    (block: { type: string }) => block.type === "text",
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
