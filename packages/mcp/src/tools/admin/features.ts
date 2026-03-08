import type { SupabaseClient } from "@supabase/supabase-js";
import { McpToolError } from "../../types";

export async function adminListFeatures(serviceClient: SupabaseClient) {
  const { data: flags, error } = await serviceClient
    .from("feature_flags")
    .select("id, key, name, description, is_global, created_at")
    .order("key");

  if (error) throw new McpToolError("Failed to fetch feature flags");

  const { data: planFeatures } = await serviceClient
    .from("plan_features")
    .select("feature_flag_id, plans(id, name, display_name)");

  const featurePlans: Record<string, { planId: string; planName: string }[]> = {};
  for (const pf of planFeatures ?? []) {
    const plan = pf.plans as unknown as {
      id: string;
      name: string;
      display_name: string;
    } | null;
    if (plan) {
      const fid = pf.feature_flag_id;
      if (!featurePlans[fid]) featurePlans[fid] = [];
      featurePlans[fid].push({ planId: plan.id, planName: plan.display_name });
    }
  }

  return (flags ?? []).map((f) => ({
    ...f,
    plans: featurePlans[f.id] ?? [],
  }));
}

export async function adminToggleFeatureGlobal(
  serviceClient: SupabaseClient,
  featureFlagId: string,
  isGlobal: boolean
) {
  const { error } = await serviceClient
    .from("feature_flags")
    .update({ is_global: isGlobal })
    .eq("id", featureFlagId);

  if (error) throw new McpToolError("Failed to update feature flag");
  return { success: true, isGlobal };
}

export async function adminListPlans(serviceClient: SupabaseClient) {
  const { data: plans, error } = await serviceClient
    .from("plans")
    .select("id, name, display_name, description, sort_order, is_active, is_public, limits, price_monthly_cents, created_at")
    .order("sort_order");

  if (error) throw new McpToolError("Failed to fetch plans");

  const withDetails = await Promise.all(
    (plans ?? []).map(async (plan) => {
      const [featuresResult, subCountResult] = await Promise.all([
        serviceClient
          .from("plan_features")
          .select("feature_flags(key, name)")
          .eq("plan_id", plan.id),
        serviceClient
          .from("speaker_subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("plan_id", plan.id)
          .eq("status", "active"),
      ]);

      const features = (featuresResult.data ?? []).map((pf) => {
        const flag = pf.feature_flags as unknown as { key: string; name: string } | null;
        return flag ? { key: flag.key, name: flag.name } : null;
      }).filter((f): f is { key: string; name: string } => f !== null);

      return {
        ...plan,
        features,
        activeSpeakerCount: subCountResult.count ?? 0,
      };
    })
  );

  return withDetails;
}

export async function adminGetPlan(
  serviceClient: SupabaseClient,
  planId: string
) {
  const { data: plan, error } = await serviceClient
    .from("plans")
    .select("*")
    .eq("id", planId)
    .single();

  if (error || !plan) throw new McpToolError("Plan not found");

  const [featuresResult, subCountResult] = await Promise.all([
    serviceClient
      .from("plan_features")
      .select("feature_flags(id, key, name)")
      .eq("plan_id", planId),
    serviceClient
      .from("speaker_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("plan_id", planId)
      .eq("status", "active"),
  ]);

  const features = (featuresResult.data ?? []).map((pf) => {
    const flag = pf.feature_flags as unknown as { id: string; key: string; name: string } | null;
    return flag;
  }).filter((f): f is { id: string; key: string; name: string } => f !== null);

  return {
    ...plan,
    features,
    activeSpeakerCount: subCountResult.count ?? 0,
  };
}

export async function adminCreatePlan(
  serviceClient: SupabaseClient,
  input: {
    name: string;
    displayName: string;
    description?: string;
    limits: Record<string, number>;
    featureFlagIds: string[];
    isVisible?: boolean;
    isActive?: boolean;
  }
) {
  const planKey = input.name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  if (!planKey) {
    throw new McpToolError("Plan key must contain at least one letter or number");
  }

  const { data: maxSort } = await serviceClient
    .from("plans")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sortOrder = (maxSort?.sort_order ?? 0) + 10;

  const { data: newPlan, error: insertError } = await serviceClient
    .from("plans")
    .insert({
      name: planKey,
      display_name: input.displayName.trim(),
      description: input.description?.trim() || null,
      sort_order: sortOrder,
      is_active: input.isActive ?? true,
      is_public: input.isVisible ?? true,
      price_monthly_cents: null,
      limits: input.limits,
    })
    .select("id, name")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      throw new McpToolError("A plan with this key already exists");
    }
    throw new McpToolError("Failed to create plan");
  }

  if (input.featureFlagIds.length > 0 && newPlan) {
    const { error: featError } = await serviceClient
      .from("plan_features")
      .insert(
        input.featureFlagIds.map((feature_flag_id) => ({
          plan_id: newPlan.id,
          feature_flag_id,
        }))
      );
    if (featError) throw new McpToolError("Failed to assign features to plan");
  }

  return { plan: newPlan };
}

export async function adminUpdatePlan(
  serviceClient: SupabaseClient,
  planId: string,
  input: {
    displayName?: string;
    description?: string;
    limits?: Record<string, number>;
    featureFlagIds?: string[];
    isVisible?: boolean;
    isActive?: boolean;
  }
) {
  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.displayName !== undefined) payload.display_name = input.displayName;
  if (input.description !== undefined)
    payload.description = input.description || null;
  if (input.limits !== undefined) payload.limits = input.limits;
  if (input.isVisible !== undefined) payload.is_public = input.isVisible;
  if (input.isActive !== undefined) payload.is_active = input.isActive;

  const { error } = await serviceClient
    .from("plans")
    .update(payload)
    .eq("id", planId);

  if (error) throw new McpToolError("Failed to update plan");

  if (input.featureFlagIds !== undefined) {
    await serviceClient
      .from("plan_features")
      .delete()
      .eq("plan_id", planId);

    if (input.featureFlagIds.length > 0) {
      const { error: featError } = await serviceClient
        .from("plan_features")
        .insert(
          input.featureFlagIds.map((feature_flag_id) => ({
            plan_id: planId,
            feature_flag_id,
          }))
        );
      if (featError) throw new McpToolError("Failed to update plan features");
    }
  }

  return { success: true };
}

export async function adminRefreshEntitlements(
  serviceClient: SupabaseClient,
  planId: string
) {
  const { data: plan } = await serviceClient
    .from("plans")
    .select("limits")
    .eq("id", planId)
    .single();

  if (!plan) throw new McpToolError("Plan not found");

  const { data: featureRows } = await serviceClient
    .from("plan_features")
    .select("feature_flags(key)")
    .eq("plan_id", planId);

  const featureKeys = (featureRows ?? [])
    .map((r) => {
      const flag = r.feature_flags as unknown as { key: string } | null;
      return flag?.key;
    })
    .filter((k): k is string => !!k);

  const { data: subs, error: fetchError } = await serviceClient
    .from("speaker_subscriptions")
    .select("id")
    .eq("plan_id", planId)
    .eq("status", "active");

  if (fetchError) throw new McpToolError("Failed to fetch subscribers");
  if (!subs || subs.length === 0) return { updated: 0 };

  const subIds = subs.map((s) => s.id);
  const { error: updateError } = await serviceClient
    .from("speaker_subscriptions")
    .update({
      limits_snapshot: plan.limits,
      features_snapshot: featureKeys,
      updated_at: new Date().toISOString(),
    })
    .in("id", subIds);

  if (updateError) throw new McpToolError("Failed to refresh entitlements");
  return { updated: subIds.length };
}

export async function adminOverrideSpeakerFeature(
  serviceClient: SupabaseClient,
  speakerId: string,
  featureKey: string,
  enabled: boolean
) {
  const { data: flag } = await serviceClient
    .from("feature_flags")
    .select("id")
    .eq("key", featureKey)
    .single();

  if (!flag) throw new McpToolError(`Feature flag "${featureKey}" not found`);

  if (enabled) {
    const { error } = await serviceClient
      .from("speaker_feature_overrides")
      .upsert(
        {
          speaker_id: speakerId,
          feature_flag_id: flag.id,
          created_at: new Date().toISOString(),
        },
        { onConflict: "speaker_id,feature_flag_id" }
      );
    if (error) throw new McpToolError("Failed to grant feature override");
  } else {
    const { error } = await serviceClient
      .from("speaker_feature_overrides")
      .delete()
      .eq("speaker_id", speakerId)
      .eq("feature_flag_id", flag.id);
    if (error) throw new McpToolError("Failed to revoke feature override");
  }

  return { success: true, featureKey, enabled };
}
