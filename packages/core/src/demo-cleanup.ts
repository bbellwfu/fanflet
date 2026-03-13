/**
 * Cleanup and conversion logic for demo environments.
 * - cleanupDemoEnvironment: tears down all seeded entities
 * - convertDemoToReal: transfers demo data to a real user account
 * - expireStaleEnvironments: TTL-based batch cleanup
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SeedManifest, SponsorSeedManifest } from "./demo-seeder";

/* ------------------------------------------------------------------ */
/*  Cleanup                                                            */
/* ------------------------------------------------------------------ */

export async function cleanupDemoEnvironment(
  serviceClient: SupabaseClient,
  demoEnvironmentId: string,
): Promise<{ success: boolean; error?: string }> {
  const { data: demo, error: fetchError } = await serviceClient
    .from("demo_environments")
    .select("*")
    .eq("id", demoEnvironmentId)
    .single();

  if (fetchError || !demo) {
    return { success: false, error: "Demo environment not found" };
  }

  if (demo.status === "deleted") {
    return { success: true };
  }

  const manifest = demo.seed_manifest as SeedManifest | SponsorSeedManifest | null;
  const isSponsorDemo = demo.demo_type === "sponsor";
  let speakerId = demo.speaker_id as string | null;
  let authUserId = demo.auth_user_id as string | null;

  // Sponsor demo: tear down demo speakers first, then sponsor (CASCADE removes library, campaigns, etc.)
  if (isSponsorDemo && manifest && "sponsor_account_id" in manifest) {
    const sponsorManifest = manifest as SponsorSeedManifest;
    for (const s of sponsorManifest.demo_speakers ?? []) {
      if (s.speaker_id) {
        await serviceClient.from("sponsor_connections").delete().eq("speaker_id", s.speaker_id);
        await serviceClient.from("fanflets").delete().eq("speaker_id", s.speaker_id);
        await serviceClient.from("subscribers").delete().eq("speaker_id", s.speaker_id);
        await serviceClient.from("survey_questions").delete().eq("speaker_id", s.speaker_id);
        await serviceClient.from("resource_library").delete().eq("speaker_id", s.speaker_id);
        await serviceClient.from("speaker_feature_overrides").delete().eq("speaker_id", s.speaker_id);
        await serviceClient.from("speaker_subscriptions").delete().eq("speaker_id", s.speaker_id);
        await serviceClient.from("speakers").delete().eq("id", s.speaker_id);
      }
      if (s.auth_user_id) {
        await serviceClient.auth.admin.deleteUser(s.auth_user_id).catch(() => {});
      }
    }
    if (sponsorManifest.subscriber_ids?.length) {
      await serviceClient.from("subscribers").delete().in("id", sponsorManifest.subscriber_ids);
    }
    if (sponsorManifest.analytics_event_ids?.length) {
      await serviceClient.from("analytics_events").delete().in("id", sponsorManifest.analytics_event_ids);
    }
    if (sponsorManifest.sponsor_account_id) {
      await serviceClient
        .from("sponsor_accounts")
        .delete()
        .eq("id", sponsorManifest.sponsor_account_id)
        .eq("is_demo", true);
    }
    if (sponsorManifest.sponsor_auth_user_id) {
      await serviceClient.auth.admin.deleteUser(sponsorManifest.sponsor_auth_user_id).catch(() => {});
    }
    await serviceClient.from("demo_environments").update({ status: "deleted" }).eq("id", demoEnvironmentId);
    return { success: true };
  }

  // If speaker_id/auth_user_id are null (orphan from a failed provision),
  // try to find them by the synthetic email pattern
  if (!authUserId && demo.prospect_name) {
    const slug = (demo.prospect_name as string)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .substring(0, 60);
    const syntheticEmail = `demo+demo-${slug}@fanflet.com`;

    const { data: listed } = await serviceClient.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const orphan = listed?.users?.find((u) => u.email === syntheticEmail);
    if (orphan) {
      authUserId = orphan.id;
      const { data: orphanSpeaker } = await serviceClient
        .from("speakers")
        .select("id")
        .eq("auth_user_id", orphan.id)
        .maybeSingle();
      if (orphanSpeaker) speakerId = orphanSpeaker.id;
    }
  }

  // 1. Sponsor connections (speaker side)
  if (speakerId) {
    await serviceClient
      .from("sponsor_connections")
      .delete()
      .eq("speaker_id", speakerId);
  }

  // 2. Fanflets (cascades: resource_blocks, analytics_events, sms_bookmarks, survey_responses, sponsor_leads)
  if (speakerId) {
    await serviceClient
      .from("fanflets")
      .delete()
      .eq("speaker_id", speakerId);
  }

  // 3. Subscribers
  if (speakerId) {
    await serviceClient
      .from("subscribers")
      .delete()
      .eq("speaker_id", speakerId);
  }

  // 4. Survey questions
  if (speakerId) {
    await serviceClient
      .from("survey_questions")
      .delete()
      .eq("speaker_id", speakerId);
  }

  // 5. Resource library
  if (speakerId) {
    await serviceClient
      .from("resource_library")
      .delete()
      .eq("speaker_id", speakerId);
  }

  // 6. Speaker feature overrides
  if (speakerId) {
    await serviceClient
      .from("speaker_feature_overrides")
      .delete()
      .eq("speaker_id", speakerId);
  }

  // 7. Speaker subscription
  if (speakerId) {
    await serviceClient
      .from("speaker_subscriptions")
      .delete()
      .eq("speaker_id", speakerId);
  }

  // 8. Delete speaker row
  if (speakerId) {
    await serviceClient
      .from("speakers")
      .delete()
      .eq("id", speakerId);
  }

  // 9. Delete demo sponsor accounts (speaker demo only; sponsor demo already handled above)
  const speakerManifest = manifest as SeedManifest | null;
  if (speakerManifest?.sponsor_account_ids?.length) {
    for (const sponsorId of speakerManifest.sponsor_account_ids) {
      await serviceClient
        .from("sponsor_accounts")
        .delete()
        .eq("id", sponsorId)
        .eq("is_demo", true);
    }
  }

  // 10. Delete auth users (speaker demo only)
  if (speakerManifest?.sponsor_auth_user_ids?.length) {
    for (const uid of speakerManifest.sponsor_auth_user_ids) {
      await serviceClient.auth.admin.deleteUser(uid).catch(() => {});
    }
  }

  if (authUserId) {
    await serviceClient.auth.admin.deleteUser(authUserId).catch(() => {});
  }

  // 11. Storage cleanup
  if (authUserId) {
    const { data: avatarFiles } = await serviceClient.storage
      .from("avatars")
      .list(authUserId, { limit: 1000 });
    if (avatarFiles?.length) {
      const paths = avatarFiles.map((f) => `${authUserId}/${f.name}`);
      await serviceClient.storage.from("avatars").remove(paths);
    }
  }

  if (speakerId) {
    const { data: uploadDirs } = await serviceClient.storage
      .from("file-uploads")
      .list(speakerId, { limit: 1000 });
    if (uploadDirs?.length) {
      for (const dir of uploadDirs) {
        if (!dir.name) continue;
        const { data: files } = await serviceClient.storage
          .from("file-uploads")
          .list(`${speakerId}/${dir.name}`, { limit: 1000 });
        if (files?.length) {
          const paths = files.map(
            (f) => `${speakerId}/${dir.name}/${f.name}`,
          );
          await serviceClient.storage.from("file-uploads").remove(paths);
        }
      }
    }
  }

  // 12. Update demo environment status
  await serviceClient
    .from("demo_environments")
    .update({ status: "deleted" })
    .eq("id", demoEnvironmentId);

  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  Conversion                                                         */
/* ------------------------------------------------------------------ */

export async function convertDemoToReal(
  serviceClient: SupabaseClient,
  demoEnvironmentId: string,
  realAuthUserId: string,
): Promise<{ success: boolean; error?: string }> {
  const { data: demo, error: fetchError } = await serviceClient
    .from("demo_environments")
    .select("*")
    .eq("id", demoEnvironmentId)
    .single();

  if (fetchError || !demo) {
    return { success: false, error: "Demo environment not found" };
  }

  if (demo.status !== "active") {
    return {
      success: false,
      error: `Cannot convert demo with status "${demo.status}"`,
    };
  }

  const speakerId = demo.speaker_id as string | null;
  const demoAuthUserId = demo.auth_user_id as string | null;

  if (!speakerId) {
    return { success: false, error: "Demo has no speaker ID" };
  }

  // Verify real user exists and doesn't already have a speaker row
  const { data: realUser } = await serviceClient.auth.admin.getUserById(
    realAuthUserId,
  );
  if (!realUser?.user) {
    return { success: false, error: "Target auth user not found" };
  }

  const { data: existingSpeaker } = await serviceClient
    .from("speakers")
    .select("id")
    .eq("auth_user_id", realAuthUserId)
    .maybeSingle();

  if (existingSpeaker) {
    // Delete the newly-created speaker row so we can reassign the demo one
    await serviceClient
      .from("speakers")
      .delete()
      .eq("id", existingSpeaker.id);
  }

  // Swap auth_user_id on the demo speaker row
  const { error: updateError } = await serviceClient
    .from("speakers")
    .update({
      auth_user_id: realAuthUserId,
      email: realUser.user.email ?? null,
      is_demo: false,
      demo_converted_at: new Date().toISOString(),
      demo_expires_at: null,
    })
    .eq("id", speakerId);

  if (updateError) {
    return {
      success: false,
      error: `Failed to reassign speaker: ${updateError.message}`,
    };
  }

  // Delete the demo auth user
  if (demoAuthUserId && demoAuthUserId !== realAuthUserId) {
    await serviceClient.auth.admin
      .deleteUser(demoAuthUserId)
      .catch(() => {});
  }

  // Update demo environment record
  await serviceClient
    .from("demo_environments")
    .update({
      status: "converted",
      converted_at: new Date().toISOString(),
      converted_to_speaker_id: speakerId,
    })
    .eq("id", demoEnvironmentId);

  return { success: true };
}

/* ------------------------------------------------------------------ */
/*  TTL-based batch expiration                                         */
/* ------------------------------------------------------------------ */

export async function expireStaleEnvironments(
  serviceClient: SupabaseClient,
): Promise<{ expired: number; errors: string[] }> {
  const { data: stale, error } = await serviceClient
    .from("demo_environments")
    .select("id")
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString());

  if (error || !stale) {
    return { expired: 0, errors: [error?.message ?? "Query failed"] };
  }

  let expired = 0;
  const errors: string[] = [];

  for (const demo of stale) {
    const result = await cleanupDemoEnvironment(serviceClient, demo.id);
    if (result.success) {
      expired++;
    } else {
      errors.push(`${demo.id}: ${result.error}`);
    }
  }

  return { expired, errors };
}
