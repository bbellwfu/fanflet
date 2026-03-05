"use server";

import { createServiceClient } from "@fanflet/db/service";
import { createClient } from "@fanflet/db/server";
import { FREE_PLAN_NAME } from "@fanflet/db";
import { revalidatePath } from "next/cache";

export async function resetAccountToNew(speakerId: string) {
  const userSupabase = await createClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const appMetadata = user.app_metadata ?? {};
  if (appMetadata.role !== "platform_admin") {
    return { error: "Not authorized" };
  }

  const supabase = createServiceClient();

  const { data: speaker, error: speakerError } = await supabase
    .from("speakers")
    .select("id, auth_user_id")
    .eq("id", speakerId)
    .single();

  if (speakerError || !speaker) {
    return { error: "Speaker not found" };
  }

  const authUserId = speaker.auth_user_id as string | null;
  if (!authUserId) {
    return { error: "Speaker has no linked auth user" };
  }

  // 1. Sponsor connections (speaker side)
  const { error: connError } = await supabase
    .from("sponsor_connections")
    .delete()
    .eq("speaker_id", speakerId);
  if (connError) {
    return { error: "Failed to delete sponsor connections" };
  }

  // 2. Fanflets (cascades: resource_blocks, analytics_events, sms_bookmarks, survey_responses, sponsor_leads, sponsor_report_tokens)
  const { error: fanfletsError } = await supabase
    .from("fanflets")
    .delete()
    .eq("speaker_id", speakerId);
  if (fanfletsError) {
    return { error: "Failed to delete fanflets" };
  }

  // 3. Subscribers
  const { error: subsError } = await supabase
    .from("subscribers")
    .delete()
    .eq("speaker_id", speakerId);
  if (subsError) {
    return { error: "Failed to delete subscribers" };
  }

  // 4. Survey questions
  const { error: surveyError } = await supabase
    .from("survey_questions")
    .delete()
    .eq("speaker_id", speakerId);
  if (surveyError) {
    return { error: "Failed to delete survey questions" };
  }

  // 5. Resource library
  const { error: libError } = await supabase
    .from("resource_library")
    .delete()
    .eq("speaker_id", speakerId);
  if (libError) {
    return { error: "Failed to delete resource library" };
  }

  // 6. Speaker feature overrides
  const { error: overridesError } = await supabase
    .from("speaker_feature_overrides")
    .delete()
    .eq("speaker_id", speakerId);
  if (overridesError) {
    return { error: "Failed to delete feature overrides" };
  }

  // 7. Speaker subscription
  const { error: subError } = await supabase
    .from("speaker_subscriptions")
    .delete()
    .eq("speaker_id", speakerId);
  if (subError) {
    return { error: "Failed to delete subscription" };
  }

  // 8. Clear profile fields on speaker (keep id, auth_user_id, name, email, created_at, status)
  const { error: updateError } = await supabase
    .from("speakers")
    .update({
      photo_url: null,
      bio: null,
      slug: null,
      social_links: {},
    })
    .eq("id", speakerId);
  if (updateError) {
    return { error: "Failed to clear speaker profile" };
  }

  // 9. Storage: avatars/{auth_user_id}/ and file-uploads/{speaker_id}/
  const [avatarList, fileUploadDirsList] = await Promise.all([
    supabase.storage.from("avatars").list(authUserId, { limit: 1000 }),
    supabase.storage.from("file-uploads").list(speakerId, { limit: 1000 }),
  ]);

  const avatarFiles = avatarList.data ?? [];
  const avatarPaths = avatarFiles
    .filter((item) => item.name)
    .map((f) => `${authUserId}/${f.name}`);
  if (avatarPaths.length > 0) {
    await supabase.storage.from("avatars").remove(avatarPaths);
  }

  const fileUploadDirs = fileUploadDirsList.data ?? [];
  for (const dir of fileUploadDirs) {
    if (!dir.name) continue;
    const subList = await supabase.storage
      .from("file-uploads")
      .list(`${speakerId}/${dir.name}`, { limit: 1000 });
    const subFiles = subList.data ?? [];
    const paths = subFiles
      .filter((item) => item.name)
      .map((f) => `${speakerId}/${dir.name}/${f.name}`);
    if (paths.length > 0) {
      await supabase.storage.from("file-uploads").remove(paths);
    }
  }

  revalidatePath(`/accounts/${speakerId}`);
  revalidatePath("/accounts");
  return { success: true };
}

export async function toggleSuspension(
  speakerId: string,
  currentStatus: string,
  reason?: string
) {
  // Verify the caller is an admin
  const userSupabase = await createClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const appMetadata = user.app_metadata ?? {};
  if (appMetadata.role !== "platform_admin") {
    return { error: "Not authorized" };
  }

  const supabase = createServiceClient();

  if (currentStatus === "active") {
    // Suspend
    const { error } = await supabase
      .from("speakers")
      .update({
        status: "suspended",
        suspended_at: new Date().toISOString(),
        suspended_by: user.id,
        suspension_reason: reason ?? null,
      })
      .eq("id", speakerId);

    if (error) {
      return { error: "Failed to suspend account" };
    }
  } else {
    // Reactivate
    const { error } = await supabase
      .from("speakers")
      .update({
        status: "active",
        suspended_at: null,
        suspended_by: null,
        suspension_reason: null,
      })
      .eq("id", speakerId);

    if (error) {
      return { error: "Failed to reactivate account" };
    }
  }

  revalidatePath(`/accounts/${speakerId}`);
  revalidatePath("/accounts");
  return { success: true };
}

export async function changeSpeakerPlan(
  speakerId: string,
  planId: string | null
): Promise<{ error?: string }> {
  const userSupabase = await createClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const appMetadata = user.app_metadata ?? {};
  if (appMetadata.role !== "platform_admin") {
    return { error: "Not authorized" };
  }

  const supabase = createServiceClient();

  if (planId === null) {
    const { error } = await supabase
      .from("speaker_subscriptions")
      .delete()
      .eq("speaker_id", speakerId);
    if (error) {
      return { error: "Failed to remove subscription" };
    }
    revalidatePath(`/accounts/${speakerId}`);
    revalidatePath("/accounts");
    return { success: true };
  }

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, name, limits")
    .eq("id", planId)
    .single();

  if (planError || !plan) {
    return { error: "Plan not found" };
  }

  if (plan.name === FREE_PLAN_NAME) {
    const { error } = await supabase
      .from("speaker_subscriptions")
      .delete()
      .eq("speaker_id", speakerId);
    if (error) {
      return { error: "Failed to remove subscription" };
    }
    revalidatePath(`/accounts/${speakerId}`);
    revalidatePath("/accounts");
    return { success: true };
  }

  const { data: featureRows } = await supabase
    .from("plan_features")
    .select("feature_flags(key)")
    .eq("plan_id", planId);

  const featureKeys = (featureRows ?? [])
    .map((r) => {
      const flag = r.feature_flags as unknown as { key: string } | null;
      return flag?.key;
    })
    .filter((k): k is string => !!k);

  const { error: upsertError } = await supabase
    .from("speaker_subscriptions")
    .upsert(
      {
        speaker_id: speakerId,
        plan_id: planId,
        status: "active",
        limits_snapshot: plan.limits,
        features_snapshot: featureKeys,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "speaker_id" }
    );

  if (upsertError) {
    return { error: "Failed to update subscription" };
  }

  revalidatePath(`/accounts/${speakerId}`);
  revalidatePath("/accounts");
  return { success: true };
}
