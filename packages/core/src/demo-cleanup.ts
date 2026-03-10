/**
 * Cleanup and conversion logic for demo environments.
 * - cleanupDemoEnvironment: tears down all seeded entities
 * - convertDemoToReal: transfers demo data to a real user account
 * - expireStaleEnvironments: TTL-based batch cleanup
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { SeedManifest } from "./demo-seeder";

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

  const manifest = demo.seed_manifest as SeedManifest | null;
  const speakerId = demo.speaker_id as string | null;
  const authUserId = demo.auth_user_id as string | null;

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

  // 9. Delete demo sponsor accounts (only those we created)
  if (manifest?.sponsor_account_ids?.length) {
    for (const sponsorId of manifest.sponsor_account_ids) {
      await serviceClient
        .from("sponsor_accounts")
        .delete()
        .eq("id", sponsorId)
        .eq("is_demo", true);
    }
  }

  // 10. Delete auth users
  if (manifest?.sponsor_auth_user_ids?.length) {
    for (const uid of manifest.sponsor_auth_user_ids) {
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
