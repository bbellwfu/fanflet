"use server";

import { createServiceClient } from "@fanflet/db/service";
import { FREE_PLAN_NAME } from "@fanflet/db";
import { requireSpeaker } from "@/lib/auth-context";
import { blockImpersonationWrites } from "@/lib/impersonation";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const planIdSchema = z.string().uuid();

export async function requestPlanChange(targetPlanId: string) {
  await blockImpersonationWrites();
  const { speakerId } = await requireSpeaker();

  const parsed = planIdSchema.safeParse(targetPlanId);
  if (!parsed.success) return { error: "Invalid plan ID" };

  const supabase = createServiceClient();

  const { data: plan, error: planError } = await supabase
    .from("plans")
    .select("id, name, display_name, limits, is_active")
    .eq("id", parsed.data)
    .single();

  if (planError || !plan) return { error: "Plan not found" };
  if (!plan.is_active) return { error: "This plan is not currently available" };

  const { data: currentSub } = await supabase
    .from("speaker_subscriptions")
    .select("plan_id")
    .eq("speaker_id", speakerId)
    .eq("status", "active")
    .maybeSingle();

  if (currentSub?.plan_id === plan.id) {
    return { error: "You are already on this plan" };
  }

  if (plan.name === FREE_PLAN_NAME) {
    const { error } = await supabase
      .from("speaker_subscriptions")
      .delete()
      .eq("speaker_id", speakerId);

    if (error) return { error: "Failed to update subscription" };

    revalidatePath("/dashboard/billing");
    revalidatePath("/dashboard/settings");
    return { success: true, planName: plan.display_name };
  }

  const { data: featureRows } = await supabase
    .from("plan_features")
    .select("feature_flags(key)")
    .eq("plan_id", plan.id);

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
        plan_id: plan.id,
        status: "active",
        limits_snapshot: plan.limits,
        features_snapshot: featureKeys,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "speaker_id" }
    );

  if (upsertError) return { error: "Failed to update subscription" };

  revalidatePath("/dashboard/billing");
  revalidatePath("/dashboard/settings");
  return { success: true, planName: plan.display_name };
}

export async function refreshPlanEntitlements(): Promise<{
  error?: string;
  added?: string[];
  removed?: string[];
}> {
  await blockImpersonationWrites();
  const { speakerId } = await requireSpeaker();

  const supabase = createServiceClient();

  const { data: sub } = await supabase
    .from("speaker_subscriptions")
    .select("id, plan_id, features_snapshot, limits_snapshot")
    .eq("speaker_id", speakerId)
    .eq("status", "active")
    .maybeSingle();

  if (!sub) return { error: "No active subscription found" };

  const { data: plan } = await supabase
    .from("plans")
    .select("limits")
    .eq("id", sub.plan_id)
    .single();

  if (!plan) return { error: "Plan not found" };

  const { data: featureRows } = await supabase
    .from("plan_features")
    .select("feature_flags(key)")
    .eq("plan_id", sub.plan_id);

  const liveFeatureKeys = (featureRows ?? [])
    .map((r) => {
      const flag = r.feature_flags as unknown as { key: string } | null;
      return flag?.key;
    })
    .filter((k): k is string => !!k);

  const oldFeatures = new Set<string>(
    Array.isArray(sub.features_snapshot) ? (sub.features_snapshot as string[]) : []
  );
  const newFeatures = new Set(liveFeatureKeys);

  const added = liveFeatureKeys.filter((k) => !oldFeatures.has(k));
  const removed = [...oldFeatures].filter((k) => !newFeatures.has(k));

  const { error: updateError } = await supabase
    .from("speaker_subscriptions")
    .update({
      features_snapshot: liveFeatureKeys,
      limits_snapshot: plan.limits,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sub.id);

  if (updateError) return { error: "Failed to refresh entitlements" };

  revalidatePath("/dashboard/billing");
  revalidatePath("/dashboard/settings");
  return { added, removed };
}

/**
 * Computes entitlement drift: features in the live plan definition that are
 * missing from the speaker's snapshot, and vice versa.
 */
export async function getEntitlementDrift(speakerId: string): Promise<{
  hasDrift: boolean;
  added: string[];
  removed: string[];
  liveFeatures: string[];
  snapshotFeatures: string[];
}> {
  const supabase = createServiceClient();

  const { data: sub } = await supabase
    .from("speaker_subscriptions")
    .select("plan_id, features_snapshot")
    .eq("speaker_id", speakerId)
    .eq("status", "active")
    .maybeSingle();

  if (!sub) {
    return { hasDrift: false, added: [], removed: [], liveFeatures: [], snapshotFeatures: [] };
  }

  const { data: featureRows } = await supabase
    .from("plan_features")
    .select("feature_flags(key)")
    .eq("plan_id", sub.plan_id);

  const liveFeatures = (featureRows ?? [])
    .map((r) => {
      const flag = r.feature_flags as unknown as { key: string } | null;
      return flag?.key;
    })
    .filter((k): k is string => !!k);

  const snapshotFeatures: string[] = Array.isArray(sub.features_snapshot)
    ? (sub.features_snapshot as string[])
    : [];

  const snapshotSet = new Set(snapshotFeatures);
  const liveSet = new Set(liveFeatures);

  const added = liveFeatures.filter((k) => !snapshotSet.has(k));
  const removed = snapshotFeatures.filter((k) => !liveSet.has(k));

  return {
    hasDrift: added.length > 0 || removed.length > 0,
    added,
    removed,
    liveFeatures,
    snapshotFeatures,
  };
}
