/**
 * Seed engine for personalized demo environments.
 * Takes AI-generated content (or explicit input) and creates the full
 * demo environment: auth user, speaker profile, Pro plan, sponsors,
 * connections, fanflets, resource blocks, survey questions.
 *
 * Uses the service-role client — admin-only operation.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { GeneratedDemoPayload, DemoProspectInput } from "./demo-ai";

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

    const { data: authData, error: authError } =
      await serviceClient.auth.admin.createUser({
        email: syntheticEmail,
        password: crypto.randomUUID(),
        email_confirm: true,
        user_metadata: {
          full_name: input.full_name,
          is_demo: true,
        },
        app_metadata: {
          is_demo: true,
          demo_prospect_email: input.email,
          roles: ["speaker"],
        },
      });

    if (authError || !authData.user) {
      throw new Error(`Auth user creation failed: ${authError?.message ?? "no user returned"}`);
    }

    manifest.auth_user_id = authData.user.id;

    // Step 2: Wait for trigger to create speaker row, then update it
    // handle_new_user() trigger fires synchronously on insert
    await new Promise((resolve) => setTimeout(resolve, 500));

    const { data: speaker, error: speakerFetchError } = await serviceClient
      .from("speakers")
      .select("id")
      .eq("auth_user_id", authData.user.id)
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

      // Check for existing demo sponsor with same name
      const { data: existingDemo } = await serviceClient
        .from("sponsor_accounts")
        .select("id")
        .ilike("company_name", sponsor.company_name)
        .eq("is_demo", true)
        .maybeSingle();

      if (existingDemo) {
        sponsorIdMap.set(sponsor.company_name, existingDemo.id);
        manifest.sponsor_account_ids.push(existingDemo.id);
        continue;
      }

      const sponsorSlug = slugify(sponsor.company_name);
      const sponsorEmail = `demo+sponsor+${sponsorSlug}@fanflet.com`;

      const { data: sponsorAuth, error: sponsorAuthError } =
        await serviceClient.auth.admin.createUser({
          email: sponsorEmail,
          password: crypto.randomUUID(),
          email_confirm: true,
          user_metadata: {
            signup_role: "sponsor",
            is_demo: true,
            full_name: sponsor.company_name,
          },
          app_metadata: {
            is_demo: true,
            roles: ["sponsor"],
          },
        });

      if (sponsorAuthError || !sponsorAuth.user) {
        console.error(`Sponsor auth creation failed for ${sponsor.company_name}: ${sponsorAuthError?.message}`);
        continue;
      }

      manifest.sponsor_auth_user_ids.push(sponsorAuth.user.id);

      const { data: sponsorAccount, error: sponsorInsertError } =
        await serviceClient
          .from("sponsor_accounts")
          .insert({
            auth_user_id: sponsorAuth.user.id,
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

      for (let i = 0; i < talk.resources.length; i++) {
        const resource = talk.resources[i];

        // Create library item first
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

        // Find matching sponsor for sponsor-type resources
        let sponsorAccountId: string | null = null;
        if (resource.type === "sponsor") {
          const matchingSponsor = payload.sponsors.find((s) =>
            resource.title.toLowerCase().includes(s.company_name.toLowerCase()) ||
            resource.description?.toLowerCase().includes(s.company_name.toLowerCase()),
          );
          if (matchingSponsor) {
            sponsorAccountId = sponsorIdMap.get(matchingSponsor.company_name) ?? null;
          }
          if (!sponsorAccountId && sponsorIdMap.size > 0) {
            const sponsorIds = [...sponsorIdMap.values()];
            sponsorAccountId = sponsorIds[i % sponsorIds.length] ?? null;
          }
        }

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
        auth_user_id: authData.user.id,
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
