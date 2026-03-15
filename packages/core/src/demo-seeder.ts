/**
 * Seed engine for personalized demo environments.
 * Takes AI-generated content (or explicit input) and creates the full
 * demo environment: auth user, speaker profile, Pro plan, sponsors,
 * connections, fanflets, resource blocks, survey questions.
 *
 * Uses the service-role client — admin-only operation.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  GeneratedDemoPayload,
  DemoProspectInput,
  GeneratedSponsorDemoPayload,
  SponsorDemoProspectInput,
} from "./demo-ai";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SeedManifest {
  auth_user_id: string;
  speaker_id: string;
  speaker_slug: string;
  fanflets: Array<{ id: string; slug: string; title: string }>;
  resource_block_ids: string[];
  resource_library_ids: string[];
  sponsor_account_ids: string[];
  sponsor_auth_user_ids: string[];
  sponsor_connection_ids: string[];
  survey_question_ids: string[];
  subscription_id: string | null;
}

export interface SeedDemoResult {
  demoEnvironmentId: string;
  manifest: SeedManifest;
  publicUrls: string[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 60);
}

function generateAvatarUrl(name: string): string {
  const encoded = encodeURIComponent(name);
  return `https://ui-avatars.com/api/?name=${encoded}&size=256&background=6C63FF&color=fff&bold=true&format=png`;
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/* ------------------------------------------------------------------ */
/*  Auth helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Try to create a demo auth user. If the email is already taken (orphan from
 * a prior failed attempt), delete the orphan and its associated speaker/sponsor
 * rows, then retry creation once.
 */
async function createOrReclaimDemoAuthUser(
  serviceClient: SupabaseClient,
  email: string,
  meta: {
    full_name: string;
    is_demo: boolean;
    demo_prospect_email?: string;
    signup_role?: string;
    roles: string[];
  },
): Promise<{ id: string }> {
  const userPayload = {
    email,
    password: crypto.randomUUID(),
    email_confirm: true,
    user_metadata: {
      full_name: meta.full_name,
      is_demo: true,
      ...(meta.signup_role ? { signup_role: meta.signup_role } : {}),
    },
    app_metadata: {
      is_demo: true,
      roles: meta.roles,
      ...(meta.demo_prospect_email
        ? { demo_prospect_email: meta.demo_prospect_email }
        : {}),
    },
  };

  const { data, error } =
    await serviceClient.auth.admin.createUser(userPayload);

  if (!error && data.user) return { id: data.user.id };

  if (error?.message?.includes("already been registered")) {
    const { data: listed } = await serviceClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const orphanId = listed?.users?.find((u) => u.email === email)?.id;

    if (orphanId) {
      await serviceClient.from("speakers").delete().eq("auth_user_id", orphanId);
      await serviceClient.from("sponsor_accounts").delete().eq("auth_user_id", orphanId);
      await serviceClient.auth.admin.deleteUser(orphanId);

      const { data: retryData, error: retryError } =
        await serviceClient.auth.admin.createUser(userPayload);
      if (!retryError && retryData.user) return { id: retryData.user.id };
      throw new Error(`Auth retry failed after orphan cleanup: ${retryError?.message}`);
    }
  }

  throw new Error(`Auth user creation failed: ${error?.message ?? "no user returned"}`);
}

/* ------------------------------------------------------------------ */
/*  Seed Engine                                                        */
/* ------------------------------------------------------------------ */

export async function seedDemoEnvironment(
  serviceClient: SupabaseClient,
  demoEnvironmentId: string,
  input: DemoProspectInput,
  payload: GeneratedDemoPayload,
  adminUserId: string,
  siteUrl: string,
): Promise<SeedDemoResult> {
  const manifest: SeedManifest = {
    auth_user_id: "",
    speaker_id: "",
    speaker_slug: "",
    fanflets: [],
    resource_block_ids: [],
    resource_library_ids: [],
    sponsor_account_ids: [],
    sponsor_auth_user_ids: [],
    sponsor_connection_ids: [],
    survey_question_ids: [],
    subscription_id: null,
  };

  try {
    // Step 1: Create auth user with synthetic email
    const baseSlug = payload.slug || slugify(input.full_name);
    const speakerSlug = baseSlug.startsWith("demo-") ? baseSlug : `demo-${baseSlug}`;
    const syntheticEmail = `demo+${speakerSlug}@fanflet.com`;

    const authUser = await createOrReclaimDemoAuthUser(serviceClient, syntheticEmail, {
      full_name: input.full_name,
      is_demo: true,
      demo_prospect_email: input.email,
      roles: ["speaker"],
    });
    manifest.auth_user_id = authUser.id;

    // Step 2: Wait for trigger to create speaker row, then update it
    // handle_new_user() trigger fires synchronously on insert
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { data: speaker, error: speakerFetchError } = await serviceClient
      .from("speakers")
      .select("id")
      .eq("auth_user_id", authUser.id)
      .maybeSingle();

    if (speakerFetchError || !speaker) {
      throw new Error(`Speaker row not found after auth creation: ${speakerFetchError?.message ?? "no row"}`);
    }

    manifest.speaker_id = speaker.id;
    manifest.speaker_slug = speakerSlug;

    const { error: speakerUpdateError } = await serviceClient
      .from("speakers")
      .update({
        name: input.full_name,
        bio: payload.bio,
        slug: speakerSlug,
        photo_url: input.photo_url || generateAvatarUrl(input.full_name),
        social_links: {
          ...(input.linkedin_url ? { linkedin: input.linkedin_url } : {}),
          ...(input.website_url ? { website: input.website_url } : {}),
          default_theme_preset: payload.theme || "navy",
        },
        is_demo: true,
        demo_created_by: adminUserId,
        demo_expires_at: addDays(30),
        demo_prospect_email: input.email ?? null,
        demo_environment_id: demoEnvironmentId,
      })
      .eq("id", speaker.id);

    if (speakerUpdateError) {
      throw new Error(`Speaker update failed: ${speakerUpdateError.message}`);
    }

    // Step 3: Assign Pro plan
    const { data: proPlan } = await serviceClient
      .from("plans")
      .select("id, limits")
      .or("name.eq.Pro,name.eq.early_access")
      .limit(1)
      .maybeSingle();

    if (proPlan) {
      const { data: featureRows } = await serviceClient
        .from("plan_features")
        .select("feature_flags(key)")
        .eq("plan_id", proPlan.id);

      const featureKeys = (featureRows ?? [])
        .map((r) => {
          const flag = r.feature_flags as unknown as { key: string } | null;
          return flag?.key;
        })
        .filter((k): k is string => !!k);

      const { data: sub } = await serviceClient
        .from("speaker_subscriptions")
        .upsert(
          {
            speaker_id: speaker.id,
            plan_id: proPlan.id,
            status: "active",
            limits_snapshot: proPlan.limits,
            features_snapshot: featureKeys,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "speaker_id" },
        )
        .select("id")
        .single();

      if (sub) manifest.subscription_id = sub.id;
    }

    // Step 4: Create sponsor accounts (or reuse existing verified ones)
    const sponsorIdMap = new Map<string, string>(); // company_name → sponsor_account id

    for (const sponsor of payload.sponsors) {
      const { data: existing } = await serviceClient
        .from("sponsor_accounts")
        .select("id")
        .ilike("company_name", sponsor.company_name)
        .eq("is_verified", true)
        .maybeSingle();

      if (existing) {
        sponsorIdMap.set(sponsor.company_name, existing.id);
        continue;
      }

      // Do not reuse demo sponsors across environments; each demo gets its own sponsors.
      const sponsorSlug = slugify(sponsor.company_name);
      const sponsorEmail = `demo+sponsor+${sponsorSlug}@fanflet.com`;

      let sponsorAuthUser: { id: string };
      try {
        sponsorAuthUser = await createOrReclaimDemoAuthUser(serviceClient, sponsorEmail, {
          full_name: sponsor.company_name,
          is_demo: true,
          signup_role: "sponsor",
          roles: ["sponsor"],
        });
      } catch (err) {
        console.error(`Sponsor auth creation failed for ${sponsor.company_name}: ${err instanceof Error ? err.message : err}`);
        continue;
      }

      manifest.sponsor_auth_user_ids.push(sponsorAuthUser.id);

      const { data: sponsorAccount, error: sponsorInsertError } =
        await serviceClient
          .from("sponsor_accounts")
          .insert({
            auth_user_id: sponsorAuthUser.id,
            company_name: sponsor.company_name,
            slug: sponsorSlug,
            logo_url: generateAvatarUrl(sponsor.company_name),
            website_url: sponsor.website_url || null,
            description: sponsor.description || null,
            industry: sponsor.industry || null,
            contact_email: sponsorEmail,
            is_verified: true,
            is_demo: true,
            demo_created_by: adminUserId,
            demo_environment_id: demoEnvironmentId,
          })
          .select("id")
          .single();

      if (sponsorInsertError || !sponsorAccount) {
        console.error(`Sponsor insert failed for ${sponsor.company_name}: ${sponsorInsertError?.message}`);
        continue;
      }

      sponsorIdMap.set(sponsor.company_name, sponsorAccount.id);
      manifest.sponsor_account_ids.push(sponsorAccount.id);
    }

    // Step 5: Create sponsor connections
    for (const [, sponsorId] of sponsorIdMap) {
      const { data: conn, error: connError } = await serviceClient
        .from("sponsor_connections")
        .insert({
          speaker_id: speaker.id,
          sponsor_id: sponsorId,
          status: "active",
          initiated_by: "speaker",
          responded_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (connError) {
        console.error(`Sponsor connection failed: ${connError.message}`);
        continue;
      }

      if (conn) manifest.sponsor_connection_ids.push(conn.id);
    }

    // Step 6: Create survey questions
    for (const questionText of payload.survey_questions) {
      const { data: sq, error: sqError } = await serviceClient
        .from("survey_questions")
        .insert({
          speaker_id: speaker.id,
          question_text: questionText,
        })
        .select("id")
        .single();

      if (sqError) {
        console.error(`Survey question creation failed: ${sqError.message}`);
        continue;
      }

      if (sq) manifest.survey_question_ids.push(sq.id);
    }

    // Step 7: Create fanflets with resource blocks
    const themeConfig = { preset: payload.theme || "navy" };

    for (const talk of payload.talks) {
      const fanfletSlug = slugify(talk.title);

      const { data: fanflet, error: fanfletError } = await serviceClient
        .from("fanflets")
        .insert({
          speaker_id: speaker.id,
          title: talk.title,
          event_name: talk.event_name,
          event_date: talk.event_date || null,
          slug: fanfletSlug,
          status: "draft",
          theme_config: themeConfig,
          show_event_name: true,
          survey_question_ids: manifest.survey_question_ids,
        })
        .select("id, slug")
        .single();

      if (fanfletError || !fanflet) {
        console.error(`Fanflet creation failed for "${talk.title}": ${fanfletError?.message}`);
        continue;
      }

      manifest.fanflets.push({
        id: fanflet.id,
        slug: fanflet.slug,
        title: talk.title,
      });

      // Identify the primary sponsor for this talk from the sponsor-type block
      let talkSponsorId: string | null = null;
      for (const resource of talk.resources) {
        if (resource.type === "sponsor") {
          const matchingSponsor = payload.sponsors.find((s) =>
            resource.title.toLowerCase().includes(s.company_name.toLowerCase()) ||
            resource.description?.toLowerCase().includes(s.company_name.toLowerCase()),
          );
          if (matchingSponsor) {
            talkSponsorId = sponsorIdMap.get(matchingSponsor.company_name) ?? null;
          }
          if (!talkSponsorId && sponsorIdMap.size > 0) {
            talkSponsorId = [...sponsorIdMap.values()][0] ?? null;
          }
          break;
        }
      }

      for (let i = 0; i < talk.resources.length; i++) {
        const resource = talk.resources[i];

        const { data: libItem, error: libError } = await serviceClient
          .from("resource_library")
          .insert({
            speaker_id: speaker.id,
            type: resource.type,
            title: resource.title,
            description: resource.description || null,
            url: resource.url || null,
            section_name:
              resource.type === "sponsor"
                ? "Featured Partners"
                : "Resources",
          })
          .select("id")
          .single();

        if (libError || !libItem) {
          console.error(`Library item creation failed: ${libError?.message}`);
          continue;
        }

        manifest.resource_library_ids.push(libItem.id);

        // Attribute all non-text blocks to the talk's primary sponsor for analytics
        const sponsorAccountId =
          resource.type === "text" ? null : talkSponsorId;

        const { data: block, error: blockError } = await serviceClient
          .from("resource_blocks")
          .insert({
            fanflet_id: fanflet.id,
            library_item_id: libItem.id,
            type: resource.type,
            title: resource.title,
            description: resource.description || null,
            url: resource.url || null,
            display_order: i,
            section_name:
              resource.type === "sponsor"
                ? "Featured Partners"
                : "Resources",
            metadata: {},
            sponsor_account_id: sponsorAccountId,
          })
          .select("id")
          .single();

        if (blockError) {
          console.error(`Resource block creation failed: ${blockError.message}`);
          continue;
        }

        if (block) manifest.resource_block_ids.push(block.id);
      }
    }

    // Step 8: Update demo_environments with manifest and active status
    const publicUrls = manifest.fanflets.map(
      (f) => `${siteUrl}/${manifest.speaker_slug}/${f.slug}`,
    );

    await serviceClient
      .from("demo_environments")
      .update({
        speaker_id: speaker.id,
        auth_user_id: authUser.id,
        sponsor_account_ids: manifest.sponsor_account_ids,
        seed_manifest: manifest as unknown as Record<string, unknown>,
        status: "active",
      })
      .eq("id", demoEnvironmentId);

    return { demoEnvironmentId, manifest, publicUrls };
  } catch (error) {
    // On failure, update status and store error
    await serviceClient
      .from("demo_environments")
      .update({
        status: "failed",
        error_message:
          error instanceof Error ? error.message : "Unknown error during seeding",
      })
      .eq("id", demoEnvironmentId);

    // Best-effort cleanup of partially created entities
    if (manifest.auth_user_id) {
      await serviceClient.auth.admin
        .deleteUser(manifest.auth_user_id)
        .catch(() => {});
    }
    for (const sponsorAuthId of manifest.sponsor_auth_user_ids) {
      await serviceClient.auth.admin
        .deleteUser(sponsorAuthId)
        .catch(() => {});
    }

    throw error;
  }
}

/* ------------------------------------------------------------------ */
/*  Sponsor Demo Seed Engine                                           */
/* ------------------------------------------------------------------ */

const STATIC_DEMO_SUBSCRIBERS = [
  { name: "Sarah Chen", email: "sarah.chen@tech.com", resource_title: "Product Overview PDF" },
  { name: "Marcus Thorne", email: "m.thorne@global.net", resource_title: "Book a Demo" },
  { name: "Elena Rodriguez", email: "elena.r@healthcare.org", resource_title: "Case Study" },
  { name: "David Kim", email: "david.kim@startup.io", resource_title: "Product Overview PDF" },
  { name: "Aisha Patel", email: "aisha.p@media.group", resource_title: "Whitepaper" },
  { name: "Thomas Mueller", email: "t.mueller@industrial.de", resource_title: "Technical Specs" },
  { name: "Sophie Laurent", email: "sophie.l@luxury.fr", resource_title: "Partner Program" },
  { name: "James Wilson", email: "j.wilson@edu.au", resource_title: "Product Overview PDF" },
];

export interface SponsorSeedManifest {
  sponsor_auth_user_id: string;
  sponsor_account_id: string;
  sponsor_slug: string;
  sponsor_resource_ids: string[];
  sponsor_resource_library_ids: string[];
  sponsor_campaign_ids: string[];
  sponsor_subscription_id: string | null;
  demo_speakers: Array<{
    auth_user_id: string;
    speaker_id: string;
    speaker_name: string;
    speaker_slug: string;
    connection_status: "active" | "none" | "pending";
    connection_id: string | null;
    fanflet_ids: string[];
    subscription_id: string | null;
  }>;
  lead_ids: string[];
  subscriber_ids: string[];
  analytics_event_ids: string[];
}

export interface SponsorSeedDemoResult {
  demoEnvironmentId: string;
  manifest: SponsorSeedManifest;
}

export async function seedSponsorDemoEnvironment(
  serviceClient: SupabaseClient,
  demoEnvironmentId: string,
  input: SponsorDemoProspectInput,
  payload: GeneratedSponsorDemoPayload,
  adminUserId: string,
  siteUrl: string,
): Promise<SponsorSeedDemoResult> {
  const manifest: SponsorSeedManifest = {
    sponsor_auth_user_id: "",
    sponsor_account_id: "",
    sponsor_slug: "",
    sponsor_resource_ids: [],
    sponsor_resource_library_ids: [],
    sponsor_campaign_ids: [],
    sponsor_subscription_id: null,
    demo_speakers: [],
    lead_ids: [],
    subscriber_ids: [],
    analytics_event_ids: [],
  };

  try {
    // ── Step 1: Create sponsor auth user ──
    const sponsorSlug = payload.slug || slugify(input.company_name);
    const sponsorEmail = `demo+sponsor+${sponsorSlug}@fanflet.com`;

    const sponsorAuthUser = await createOrReclaimDemoAuthUser(
      serviceClient,
      sponsorEmail,
      {
        full_name: input.company_name,
        is_demo: true,
        demo_prospect_email: input.contact_email,
        signup_role: "sponsor",
        roles: ["sponsor"],
      },
    );
    manifest.sponsor_auth_user_id = sponsorAuthUser.id;

    // ── Step 2: Create sponsor_accounts row ──
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { data: sponsorAccount, error: sponsorError } = await serviceClient
      .from("sponsor_accounts")
      .insert({
        auth_user_id: sponsorAuthUser.id,
        company_name: input.company_name,
        slug: sponsorSlug,
        logo_url: input.logo_url || generateAvatarUrl(input.company_name),
        website_url: input.website_url || null,
        description: payload.description || null,
        industry: payload.industry || input.industry || null,
        contact_email: input.contact_email || sponsorEmail,
        is_verified: true,
        is_demo: true,
        demo_created_by: adminUserId,
        demo_environment_id: demoEnvironmentId,
      })
      .select("id")
      .single();

    if (sponsorError || !sponsorAccount) {
      throw new Error(
        `Sponsor account creation failed: ${sponsorError?.message ?? "no row"}`,
      );
    }

    manifest.sponsor_account_id = sponsorAccount.id;
    manifest.sponsor_slug = sponsorSlug;

    // ── Step 3: Assign Sponsor Studio plan (Library + Campaigns unlocked) ──
    const { data: sponsorEnterprisePlan } = await serviceClient
      .from("sponsor_plans")
      .select("id, limits")
      .eq("name", "sponsor_studio")
      .maybeSingle();

    if (sponsorEnterprisePlan) {
      const { data: sub } = await serviceClient
        .from("sponsor_subscriptions")
        .upsert(
          {
            sponsor_id: sponsorAccount.id,
            plan_id: sponsorEnterprisePlan.id,
            status: "active",
            limits_snapshot: sponsorEnterprisePlan.limits,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "sponsor_id" },
        )
        .select("id")
        .single();

      if (sub) manifest.sponsor_subscription_id = sub.id;
    }

    // ── Step 4: Create sponsor resource library (Library tab) ──
    const payloadLibraryType = (t: string): "file" | "link" | "video" | "sponsor_block" => {
      if (t === "link" || t === "file" || t === "video" || t === "sponsor_block") return t;
      if (t === "text" || t === "promo") return "sponsor_block";
      return "link"; // fallback
    };
    for (const resource of payload.resources) {
      const libType = payloadLibraryType(resource.type);
      const { data: libRow, error: libError } = await serviceClient
        .from("sponsor_resource_library")
        .insert({
          sponsor_id: sponsorAccount.id,
          type: libType,
          title: resource.title,
          description: resource.description || null,
          url: libType === "link" || libType === "video" ? resource.url || null : null,
          file_path: libType === "file" ? `demo/${sponsorAccount.id}/${slugify(resource.title)}.pdf` : null,
          file_size_bytes: libType === "file" ? Math.floor(Math.random() * 10 * 1024 * 1024) + 2 * 1024 * 1024 : null, // 2-12MB
          status: "published",
          availability: "all",
        })
        .select("id")
        .single();

      if (libError) {
        console.error(
          `Sponsor resource library creation failed: ${libError.message}`,
        );
        continue;
      }
      if (libRow) manifest.sponsor_resource_library_ids.push(libRow.id);
    }

    // ── Step 5: Create sponsor resources (legacy; keep for MCP/backward compat) ──
    for (const resource of payload.resources) {
      const { data: sr, error: srError } = await serviceClient
        .from("sponsor_resources")
        .insert({
          sponsor_id: sponsorAccount.id,
          title: resource.title,
          description: resource.description || null,
          url: resource.url || null,
          type: resource.type,
          status: "active",
        })
        .select("id")
        .single();

      if (srError) {
        console.error(
          `Sponsor resource creation failed: ${srError.message}`,
        );
        continue;
      }
      if (sr) manifest.sponsor_resource_ids.push(sr.id);
    }

    // ── Step 5b: Create campaigns and link library items (Enterprise) ──
    const campaigns = payload.campaigns ?? [];
    for (const camp of campaigns) {
      const startDate = camp.start_date || new Date().toISOString().slice(0, 10);
      const { data: campaignRow, error: campError } = await serviceClient
        .from("sponsor_campaigns")
        .insert({
          sponsor_id: sponsorAccount.id,
          name: camp.name,
          description: camp.description || null,
          start_date: startDate,
          end_date: camp.end_date || null,
          status: "active",
          all_speakers_assigned: camp.all_speakers_assigned ?? false,
        })
        .select("id")
        .single();

      if (campError) {
        console.error(`Sponsor campaign creation failed: ${campError.message}`);
        continue;
      }
      if (campaignRow) {
        manifest.sponsor_campaign_ids.push(campaignRow.id);
        
        // Link unique library items to this campaign
        if (manifest.sponsor_resource_library_ids.length > 0) {
          const campaignIndex = manifest.sponsor_campaign_ids.length - 1;
          const resourcesToLink = manifest.sponsor_resource_library_ids.slice(
            campaignIndex * 2,
            (campaignIndex + 1) * 2
          );
          
          if (resourcesToLink.length > 0) {
            const resourceJunctions = resourcesToLink.map(resourceId => ({
              resource_id: resourceId,
              campaign_id: campaignRow.id,
            }));
            
            await serviceClient
              .from("sponsor_resource_campaigns")
              .insert(resourceJunctions);
          }
        }
      }
    }

    // ── Step 6: Create demo speaker accounts with fanflets ──
    const connectedSpeakerIds: string[] = [];
    const sponsorBlockIds: string[] = [];

    for (const demoSpeaker of payload.demo_speakers) {
      const speakerSlug = demoSpeaker.slug.startsWith("demo-")
        ? demoSpeaker.slug
        : `demo-${demoSpeaker.slug}`;
      const speakerEmail = `demo+${speakerSlug}@fanflet.com`;

      let demoSpeakerAuth: { id: string };
      try {
        demoSpeakerAuth = await createOrReclaimDemoAuthUser(
          serviceClient,
          speakerEmail,
          {
            full_name: demoSpeaker.full_name,
            is_demo: true,
            roles: ["speaker"],
          },
        );
      } catch (err) {
        console.error(
          `Speaker auth creation failed for ${demoSpeaker.full_name}: ${err instanceof Error ? err.message : err}`,
        );
        continue;
      }

      await new Promise((resolve) => setTimeout(resolve, 500));

      const { data: speakerRow } = await serviceClient
        .from("speakers")
        .select("id")
        .eq("auth_user_id", demoSpeakerAuth.id)
        .maybeSingle();

      if (!speakerRow) {
        console.error(`Speaker row not found for ${demoSpeaker.full_name}`);
        continue;
      }

      await serviceClient
        .from("speakers")
        .update({
          name: demoSpeaker.full_name,
          bio: demoSpeaker.bio,
          slug: speakerSlug,
          photo_url: generateAvatarUrl(demoSpeaker.full_name),
          social_links: {
            default_theme_preset: payload.theme || "navy",
          },
          is_demo: true,
          demo_created_by: adminUserId,
          demo_expires_at: addDays(30),
          demo_environment_id: demoEnvironmentId,
        })
        .eq("id", speakerRow.id);

      // Assign Pro plan to demo speaker
      let speakerSubId: string | null = null;
      const { data: proPlan } = await serviceClient
        .from("plans")
        .select("id, limits")
        .or("name.eq.Pro,name.eq.early_access")
        .limit(1)
        .maybeSingle();

      if (proPlan) {
        const { data: featureRows } = await serviceClient
          .from("plan_features")
          .select("feature_flags(key)")
          .eq("plan_id", proPlan.id);

        const featureKeys = (featureRows ?? [])
          .map((r) => {
            const flag = r.feature_flags as unknown as { key: string } | null;
            return flag?.key;
          })
          .filter((k): k is string => !!k);

        const { data: sub } = await serviceClient
          .from("speaker_subscriptions")
          .upsert(
            {
              speaker_id: speakerRow.id,
              plan_id: proPlan.id,
              status: "active",
              limits_snapshot: proPlan.limits,
              features_snapshot: featureKeys,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "speaker_id" },
          )
          .select("id")
          .single();

        if (sub) speakerSubId = sub.id;
      }

      // Create sponsor connection based on status
      let connectionId: string | null = null;
      if (demoSpeaker.connection_status === "active") {
        const { data: conn } = await serviceClient
          .from("sponsor_connections")
          .insert({
            speaker_id: speakerRow.id,
            sponsor_id: sponsorAccount.id,
            status: "active",
            initiated_by: "sponsor",
            responded_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (conn) {
          connectionId = conn.id;
          connectedSpeakerIds.push(speakerRow.id);
        }
      } else if (demoSpeaker.connection_status === "pending") {
        const { data: conn } = await serviceClient
          .from("sponsor_connections")
          .insert({
            speaker_id: speakerRow.id,
            sponsor_id: sponsorAccount.id,
            status: "pending",
            initiated_by: "sponsor",
          })
          .select("id")
          .single();

        if (conn) connectionId = conn.id;
      }

      // Create fanflet with resources
      const fanfletIds: string[] = [];
      const themeConfig = { preset: payload.theme || "navy" };
      const fanfletSlug = slugify(demoSpeaker.fanflet.title);

      const { data: fanflet } = await serviceClient
        .from("fanflets")
        .insert({
          speaker_id: speakerRow.id,
          title: demoSpeaker.fanflet.title,
          event_name: demoSpeaker.fanflet.event_name,
          event_date: demoSpeaker.fanflet.event_date || null,
          slug: fanfletSlug,
          status: "published",
          theme_config: themeConfig,
          show_event_name: true,
        })
        .select("id, slug")
        .single();

      if (fanflet) {
        fanfletIds.push(fanflet.id);

        for (let i = 0; i < demoSpeaker.fanflet.resources.length; i++) {
          const resource = demoSpeaker.fanflet.resources[i];

          const { data: libItem } = await serviceClient
            .from("resource_library")
            .insert({
              speaker_id: speakerRow.id,
              type: resource.type,
              title: resource.title,
              description: resource.description || null,
              url: resource.url || null,
              section_name:
                resource.type === "sponsor"
                  ? "Featured Partners"
                  : "Resources",
            })
            .select("id")
            .single();

          if (!libItem) continue;

          // Attribute all non-text blocks to the sponsor for analytics flow
          const sponsorAccountId =
            resource.type === "text" ? null : sponsorAccount.id;
          const sponsorLibraryItemId =
            resource.type === "sponsor" && manifest.sponsor_resource_library_ids.length > 0
              ? manifest.sponsor_resource_library_ids[0]
              : null;
          await serviceClient.from("resource_blocks").insert({
            fanflet_id: fanflet.id,
            library_item_id: libItem.id,
            type: resource.type,
            title: resource.title,
            description: resource.description || null,
            url: resource.url || null,
            display_order: i,
            section_name:
              resource.type === "sponsor"
                ? "Featured Partners"
                : "Resources",
            metadata: {},
            sponsor_account_id: sponsorAccountId,
            sponsor_library_item_id: sponsorLibraryItemId,
          });

          if (sponsorAccountId === sponsorAccount.id) {
            const { data: latestBlock } = await serviceClient.from("resource_blocks").select("id").eq("fanflet_id", fanflet.id).order("created_at", { ascending: false }).limit(1).single();
            if (latestBlock) sponsorBlockIds.push(latestBlock.id);
          }
        }
      }

      manifest.demo_speakers.push({
        auth_user_id: demoSpeakerAuth.id,
        speaker_id: speakerRow.id,
        speaker_name: demoSpeaker.full_name,
        speaker_slug: speakerSlug,
        connection_status: demoSpeaker.connection_status,
        connection_id: connectionId,
        fanflet_ids: fanfletIds,
        subscription_id: speakerSubId,
      });
    }

    // ── Step 7: Create sample leads ──
    // sponsor_leads requires subscriber_id (FK), so we create demo subscribers first
    const connectedSpeaker = manifest.demo_speakers.find(
      (s) => s.connection_status === "active",
    );
    const firstFanfletId = connectedSpeaker?.fanflet_ids[0] ?? null;

    if (connectedSpeaker && firstFanfletId) {
      // Use static subscribers instead of AI-generated leads
      for (const lead of STATIC_DEMO_SUBSCRIBERS) {
        // Create a demo subscriber record for the lead
        const { data: subscriber, error: subError } = await serviceClient
          .from("subscribers")
          .insert({
            email: lead.email.toLowerCase().trim(),
            name: lead.name,
            speaker_id: connectedSpeaker.speaker_id,
            source_fanflet_id: firstFanfletId,
            sponsor_consent: true, // Explicitly set sponsor consent for demo leads
          })
          .select("id")
          .single();

        if (subError || !subscriber) {
          console.error(`Demo subscriber creation failed: ${subError?.message}`);
          continue;
        }

        manifest.subscriber_ids.push(subscriber.id);

        const randomBlockId = sponsorBlockIds.length > 0 
          ? sponsorBlockIds[Math.floor(Math.random() * sponsorBlockIds.length)]
          : null;

        const { data: leadRow, error: leadError } = await serviceClient
          .from("sponsor_leads")
          .insert({
            subscriber_id: subscriber.id,
            sponsor_id: sponsorAccount.id,
            fanflet_id: firstFanfletId,
            resource_block_id: randomBlockId,
            engagement_type: "resource_click",
            resource_title: lead.resource_title,
            created_at: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select("id")
          .single();

        if (leadError) {
          console.error(`Lead creation failed: ${leadError.message}`);
          continue;
        }

        if (leadRow) manifest.lead_ids.push(leadRow.id);
      }
    }

    // ── Step 7b: Assign speakers to campaigns ──
    for (const campaignId of manifest.sponsor_campaign_ids) {
      const speakerAssignments = manifest.demo_speakers.map(s => ({
        campaign_id: campaignId,
        speaker_id: s.speaker_id,
      }));
      
      await serviceClient
        .from("sponsor_campaign_speakers")
        .insert(speakerAssignments);
    }

    // ── Step 7c: Seed analytics events ──
    const analyticsEvents = [];
    const eventIds = [];
    for (const speaker of manifest.demo_speakers) {
      const fanfletId = speaker.fanflet_ids[0];
      if (!fanfletId) continue;

      // Page views
      for (let i = 0; i < 40; i++) {
        analyticsEvents.push({
          fanflet_id: fanfletId,
          event_type: "page_view",
          device_type: Math.random() > 0.3 ? "mobile" : "desktop",
          referrer: "https://google.com",
          visitor_hash: Math.random().toString(36).substring(2), // Ensure unique visitors
          created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        });
      }

      // Resource clicks for blocks attributed to this sponsor
      const { data: blocks } = await serviceClient
        .from("resource_blocks")
        .select("id")
        .eq("fanflet_id", fanfletId)
        .eq("sponsor_account_id", sponsorAccount.id);

      if (blocks) {
        for (const block of blocks) {
          for (let i = 0; i < 8; i++) {
            analyticsEvents.push({
              fanflet_id: fanfletId,
              event_type: "resource_click",
              resource_block_id: block.id,
              device_type: Math.random() > 0.3 ? "mobile" : "desktop",
              visitor_hash: Math.random().toString(36).substring(2),
              created_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
            });
          }
        }
      }
    }

    if (analyticsEvents.length > 0) {
      const { data: insertedEvents } = await serviceClient
        .from("analytics_events")
        .insert(analyticsEvents)
        .select("id");
      
      if (insertedEvents) {
        manifest.analytics_event_ids = insertedEvents.map(e => e.id);
      }
    }

    // ── Step 8: Update demo_environments row ──
    await serviceClient
      .from("demo_environments")
      .update({
        sponsor_id: sponsorAccount.id,
        auth_user_id: sponsorAuthUser.id,
        sponsor_account_ids: [sponsorAccount.id],
        seed_manifest: manifest as unknown as Record<string, unknown>,
        status: "active",
      })
      .eq("id", demoEnvironmentId);

    return { demoEnvironmentId, manifest };
  } catch (error) {
    await serviceClient
      .from("demo_environments")
      .update({
        status: "failed",
        error_message:
          error instanceof Error ? error.message : "Unknown error during sponsor seeding",
      })
      .eq("id", demoEnvironmentId);

    // Best-effort cleanup
    if (manifest.sponsor_auth_user_id) {
      await serviceClient.auth.admin
        .deleteUser(manifest.sponsor_auth_user_id)
        .catch(() => {});
    }
    for (const speaker of manifest.demo_speakers) {
      await serviceClient.auth.admin
        .deleteUser(speaker.auth_user_id)
        .catch(() => {});
    }

    throw error;
  }
}
