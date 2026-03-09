"use server";

import { createServiceClient } from "@fanflet/db/service";
import { FREE_PLAN_NAME } from "@fanflet/db";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireSuperAdmin } from "@/lib/admin-auth";
import { auditAdminAction } from "@/lib/audit";
import { z } from "zod";

const speakerIdSchema = z.string().uuid();
const toggleSuspensionSchema = z.object({
  speakerId: z.string().uuid(),
  currentStatus: z.enum(["active", "suspended"]),
  reason: z.string().max(1000).optional(),
});
const changeSpeakerPlanSchema = z.object({
  speakerId: z.string().uuid(),
  planId: z.string().uuid().nullable(),
});

export async function resetAccountToNew(speakerId: string) {
  const parsed = speakerIdSchema.safeParse(speakerId);
  if (!parsed.success) return { error: "Invalid input" };
  const validSpeakerId = parsed.data;

  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: speaker, error: speakerError } = await supabase
    .from("speakers")
    .select("id, auth_user_id")
    .eq("id", validSpeakerId)
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
    .eq("speaker_id", validSpeakerId);
  if (connError) {
    return { error: "Failed to delete sponsor connections" };
  }

  // 2. Fanflets (cascades: resource_blocks, analytics_events, sms_bookmarks, survey_responses, sponsor_leads, sponsor_report_tokens)
  const { error: fanfletsError } = await supabase
    .from("fanflets")
    .delete()
    .eq("speaker_id", validSpeakerId);
  if (fanfletsError) {
    return { error: "Failed to delete fanflets" };
  }

  // 3. Subscribers
  const { error: subsError } = await supabase
    .from("subscribers")
    .delete()
    .eq("speaker_id", validSpeakerId);
  if (subsError) {
    return { error: "Failed to delete subscribers" };
  }

  // 4. Survey questions
  const { error: surveyError } = await supabase
    .from("survey_questions")
    .delete()
    .eq("speaker_id", validSpeakerId);
  if (surveyError) {
    return { error: "Failed to delete survey questions" };
  }

  // 5. Resource library
  const { error: libError } = await supabase
    .from("resource_library")
    .delete()
    .eq("speaker_id", validSpeakerId);
  if (libError) {
    return { error: "Failed to delete resource library" };
  }

  // 6. Speaker feature overrides
  const { error: overridesError } = await supabase
    .from("speaker_feature_overrides")
    .delete()
    .eq("speaker_id", validSpeakerId);
  if (overridesError) {
    return { error: "Failed to delete feature overrides" };
  }

  // 7. Speaker subscription
  const { error: subError } = await supabase
    .from("speaker_subscriptions")
    .delete()
    .eq("speaker_id", validSpeakerId);
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
    .eq("id", validSpeakerId);
  if (updateError) {
    return { error: "Failed to clear speaker profile" };
  }

  // 9. Storage: avatars/{auth_user_id}/ and file-uploads/{speaker_id}/
  const [avatarList, fileUploadDirsList] = await Promise.all([
    supabase.storage.from("avatars").list(authUserId, { limit: 1000 }),
    supabase.storage.from("file-uploads").list(validSpeakerId, { limit: 1000 }),
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
      .list(`${validSpeakerId}/${dir.name}`, { limit: 1000 });
    const subFiles = subList.data ?? [];
    const paths = subFiles
      .filter((item) => item.name)
      .map((f) => `${validSpeakerId}/${dir.name}/${f.name}`);
    if (paths.length > 0) {
      await supabase.storage.from("file-uploads").remove(paths);
    }
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "account.reset",
    category: "account",
    targetType: "speaker",
    targetId: validSpeakerId,
    details: { speakerAuthUserId: authUserId },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath(`/accounts/${validSpeakerId}`);
  revalidatePath("/accounts");
  return { success: true };
}

export async function toggleSuspension(
  speakerId: string,
  currentStatus: string,
  reason?: string
) {
  const parsed = toggleSuspensionSchema.safeParse({
    speakerId,
    currentStatus,
    reason,
  });
  if (!parsed.success) return { error: "Invalid input" };
  const { speakerId: validSpeakerId, currentStatus: validStatus, reason: validReason } = parsed.data;

  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  if (validStatus === "active") {
    const { error } = await supabase
      .from("speakers")
      .update({
        status: "suspended",
        suspended_at: new Date().toISOString(),
        suspended_by: admin.user.id,
        suspension_reason: validReason ?? null,
      })
      .eq("id", validSpeakerId);

    if (error) {
      return { error: "Failed to suspend account" };
    }

    await auditAdminAction({
      adminId: admin.user.id,
      action: "account.suspend",
      category: "account",
      targetType: "speaker",
      targetId: validSpeakerId,
      details: { reason: validReason ?? null },
      ipAddress: admin.ipAddress,
      userAgent: admin.userAgent,
    });
  } else {
    const { error } = await supabase
      .from("speakers")
      .update({
        status: "active",
        suspended_at: null,
        suspended_by: null,
        suspension_reason: null,
      })
      .eq("id", validSpeakerId);

    if (error) {
      return { error: "Failed to reactivate account" };
    }

    await auditAdminAction({
      adminId: admin.user.id,
      action: "account.reactivate",
      category: "account",
      targetType: "speaker",
      targetId: validSpeakerId,
      ipAddress: admin.ipAddress,
      userAgent: admin.userAgent,
    });
  }

  revalidatePath(`/accounts/${validSpeakerId}`);
  revalidatePath("/accounts");
  return { success: true };
}

export async function changeSpeakerPlan(
  speakerId: string,
  planId: string | null
): Promise<{ error?: string }> {
  const parsed = changeSpeakerPlanSchema.safeParse({ speakerId, planId });
  if (!parsed.success) return { error: "Invalid input" };
  const { speakerId: validSpeakerId, planId: validPlanId } = parsed.data;

  let admin: Awaited<ReturnType<typeof requireSuperAdmin>>;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  if (validPlanId === null) {
    const { error } = await supabase
      .from("speaker_subscriptions")
      .delete()
      .eq("speaker_id", validSpeakerId);
    if (error) {
      return { error: "Failed to remove subscription" };
    }

    await auditAdminAction({
      adminId: admin.user.id,
      action: "plan.change_speaker",
      category: "plan",
      targetType: "speaker",
      targetId: validSpeakerId,
      details: { newPlanId: null },
      ipAddress: admin.ipAddress,
      userAgent: admin.userAgent,
    });

    revalidatePath(`/accounts/${validSpeakerId}`);
    revalidatePath("/accounts");
    return {};
  }

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, name, limits")
    .eq("id", validPlanId)
    .single();

  if (planError || !plan) {
    return { error: "Plan not found" };
  }

  if (plan.name === FREE_PLAN_NAME) {
    const { error } = await supabase
      .from("speaker_subscriptions")
      .delete()
      .eq("speaker_id", validSpeakerId);
    if (error) {
      return { error: "Failed to remove subscription" };
    }

    await auditAdminAction({
      adminId: admin.user.id,
      action: "plan.change_speaker",
      category: "plan",
      targetType: "speaker",
      targetId: validSpeakerId,
      details: { newPlanId: validPlanId, newPlanName: plan.name },
      ipAddress: admin.ipAddress,
      userAgent: admin.userAgent,
    });

    revalidatePath(`/accounts/${validSpeakerId}`);
    revalidatePath("/accounts");
    return {};
  }

  const { data: featureRows } = await supabase
    .from("plan_features")
    .select("feature_flags(key)")
    .eq("plan_id", validPlanId);

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
        speaker_id: validSpeakerId,
        plan_id: validPlanId,
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

  await auditAdminAction({
    adminId: admin.user.id,
    action: "plan.change_speaker",
    category: "plan",
    targetType: "speaker",
    targetId: validSpeakerId,
    details: { newPlanId: validPlanId, newPlanName: plan.name },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath(`/accounts/${validSpeakerId}`);
  revalidatePath("/accounts");
  return {};
}
