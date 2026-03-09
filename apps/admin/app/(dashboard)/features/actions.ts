"use server";

import { createServiceClient } from "@fanflet/db/service";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { auditAdminAction } from "@/lib/audit";
import { z } from "zod";

const flagIdSchema = z.string().uuid();
const planIdSchema = z.string().uuid();
const toggleFeatureGlobalSchema = z.object({
  flagId: z.string().uuid(),
  isGlobal: z.boolean(),
});
const updatePlanFeaturesSchema = z.object({
  planId: z.string().uuid(),
  featureFlagIds: z.array(z.string().uuid()).max(100),
});
const updatePlanSchema = z.object({
  planId: z.string().uuid(),
  data: z.object({
    display_name: z.string().max(200).optional(),
    description: z.string().max(2000).nullable().optional(),
    limits: z.record(z.string(), z.number()).optional(),
    is_public: z.boolean().optional(),
    is_active: z.boolean().optional(),
  }),
});
const refreshPlanEntitlementsSchema = z.string().uuid();

export async function toggleFeatureGlobal(flagId: string, isGlobal: boolean) {
  const parsed = toggleFeatureGlobalSchema.safeParse({ flagId, isGlobal });
  if (!parsed.success) return { error: "Invalid input" };
  const { flagId: validFlagId, isGlobal: validIsGlobal } = parsed.data;

  let admin: Awaited<ReturnType<typeof requireSuperAdmin>>;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("feature_flags")
    .update({ is_global: validIsGlobal })
    .eq("id", validFlagId);

  if (error) {
    return { error: "Failed to update feature flag" };
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "feature_flag.toggle_global",
    category: "feature",
    targetType: "feature_flag",
    targetId: validFlagId,
    details: { isGlobal: validIsGlobal },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/features");
  return { success: true };
}

export async function updatePlanFeatures(
  planId: string,
  featureFlagIds: string[]
) {
  const parsed = updatePlanFeaturesSchema.safeParse({ planId, featureFlagIds });
  if (!parsed.success) return { error: "Invalid input" };
  const { planId: validPlanId, featureFlagIds: validFeatureFlagIds } = parsed.data;

  let admin: Awaited<ReturnType<typeof requireSuperAdmin>>;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { error: deleteError } = await supabase
    .from("plan_features")
    .delete()
    .eq("plan_id", validPlanId);

  if (deleteError) {
    return { error: "Failed to update plan features" };
  }

  if (validFeatureFlagIds.length > 0) {
    const { error: insertError } = await supabase.from("plan_features").insert(
      validFeatureFlagIds.map((feature_flag_id) => ({
        plan_id: validPlanId,
        feature_flag_id,
      }))
    );

    if (insertError) {
      return { error: "Failed to save plan features" };
    }
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "plan.update_features",
    category: "plan",
    targetType: "plan",
    targetId: validPlanId,
    details: { featureFlagIds: validFeatureFlagIds },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/features");
  revalidatePath("/features/plans");
  revalidatePath(`/features/plans/${validPlanId}`);
  return { success: true };
}

export async function updatePlan(
  planId: string,
  data: {
    display_name?: string;
    description?: string | null;
    limits?: Record<string, number>;
    is_public?: boolean;
    is_active?: boolean;
  }
) {
  const parsed = updatePlanSchema.safeParse({ planId, data });
  if (!parsed.success) return { error: "Invalid input" };
  const { planId: validPlanId, data: validData } = parsed.data;

  let admin: Awaited<ReturnType<typeof requireSuperAdmin>>;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (validData.display_name !== undefined) payload.display_name = validData.display_name;
  if (validData.description !== undefined) payload.description = validData.description;
  if (validData.limits !== undefined) payload.limits = validData.limits;
  if (validData.is_public !== undefined) payload.is_public = validData.is_public;
  if (validData.is_active !== undefined) payload.is_active = validData.is_active;

  const { error } = await supabase
    .from("plans")
    .update(payload)
    .eq("id", validPlanId);

  if (error) {
    return { error: "Failed to update plan" };
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "plan.update",
    category: "plan",
    targetType: "plan",
    targetId: validPlanId,
    details: validData as Record<string, unknown>,
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/features");
  revalidatePath("/features/plans");
  revalidatePath(`/features/plans/${validPlanId}`);
  return { success: true };
}

export async function updatePlanWithFeatures(
  planId: string,
  formData: FormData
) {
  const validPlanId = planIdSchema.safeParse(planId);
  if (!validPlanId.success) {
    redirect("/features?tab=plans");
    return;
  }
  const planIdParsed = validPlanId.data;
  // updatePlan and updatePlanFeatures both call requireSuperAdmin internally
  const display_name = formData.get("display_name");
  const description = formData.get("description");
  const maxFanfletsRaw = formData.get("max_fanflets");
  const maxResourcesRaw = formData.get("max_resources_per_fanflet");
  const storageMbRaw = formData.get("storage_mb");
  const maxFileMbRaw = formData.get("max_file_mb");
  const signedUrlMinutesRaw = formData.get("signed_url_minutes");
  const featureFlagIds = formData.getAll("feature_flag_id") as string[];
  const is_public = formData.get("is_public") === "true";
  const is_active = formData.get("is_active") === "true";

  const supabase = createServiceClient();
  const { data: existingPlan } = await supabase
    .from("plans")
    .select("limits")
    .eq("id", planIdParsed)
    .single();

  const existingLimits = (existingPlan?.limits ?? {}) as Record<string, number>;
  const limits: Record<string, number> = { ...existingLimits };
  if (maxFanfletsRaw !== null && maxFanfletsRaw !== "") {
    const n = Number(maxFanfletsRaw);
    limits.max_fanflets = Number.isFinite(n) ? n : 5;
  }
  if (maxResourcesRaw !== null && maxResourcesRaw !== "") {
    const n = Number(maxResourcesRaw);
    limits.max_resources_per_fanflet = Number.isFinite(n) ? n : 20;
  }
  if (storageMbRaw !== null && storageMbRaw !== "") {
    const n = Number(storageMbRaw);
    if (Number.isFinite(n) && n >= 0) limits.storage_mb = n;
    else if (n === -1) limits.storage_mb = -1;
  }
  if (maxFileMbRaw !== null && maxFileMbRaw !== "") {
    const n = Number(maxFileMbRaw);
    if (Number.isFinite(n) && n >= 0) limits.max_file_mb = n;
    else if (n === -1) limits.max_file_mb = -1;
  }
  if (signedUrlMinutesRaw !== null && signedUrlMinutesRaw !== "") {
    const n = Number(signedUrlMinutesRaw);
    if (Number.isFinite(n) && n >= 0) limits.signed_url_minutes = n;
    else if (n === -1) limits.signed_url_minutes = -1;
  }

  const updateResult = await updatePlan(planIdParsed, {
    ...(typeof display_name === "string" && display_name.trim()
      ? { display_name: display_name.trim() }
      : {}),
    ...(description !== undefined
      ? { description: typeof description === "string" ? description : null }
      : {}),
    limits,
    is_public,
    is_active,
  });

  if (updateResult.error) return updateResult;

  const featuresResult = await updatePlanFeatures(planIdParsed, featureFlagIds);
  if (featuresResult.error) return featuresResult;

  redirect(`/features?tab=plans`);
}

/** Form action wrapper that returns void for use in plan edit form. */
export async function submitPlanEditForm(
  planId: string,
  formData: FormData
): Promise<void> {
  await updatePlanWithFeatures(planId, formData);
}

/** Create a new plan with optional description, limits, and feature assignments. */
export async function createPlanWithFeatures(formData: FormData) {
  let admin: Awaited<ReturnType<typeof requireSuperAdmin>>;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const nameRaw = formData.get("name");
  const display_name = formData.get("display_name");
  const description = formData.get("description");
  const maxFanfletsRaw = formData.get("max_fanflets");
  const maxResourcesRaw = formData.get("max_resources_per_fanflet");
  const storageMbRaw = formData.get("storage_mb");
  const maxFileMbRaw = formData.get("max_file_mb");
  const signedUrlMinutesRaw = formData.get("signed_url_minutes");
  const featureFlagIdsRaw = formData.getAll("feature_flag_id");
  const featureFlagIdsParsed = z.array(z.string().uuid()).max(100).safeParse(featureFlagIdsRaw);
  const featureFlagIds = featureFlagIdsParsed.success ? featureFlagIdsParsed.data : [];

  if (
    typeof nameRaw !== "string" ||
    !nameRaw.trim() ||
    typeof display_name !== "string" ||
    !display_name.trim()
  ) {
    return { error: "Plan key and display name are required" };
  }

  const name = nameRaw.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
  if (!name) {
    return { error: "Plan key must contain at least one letter or number" };
  }

  const limits: Record<string, number> = {
    max_fanflets: 5,
    max_resources_per_fanflet: 20,
    storage_mb: 100,
    max_file_mb: 10,
    signed_url_minutes: 15,
  };
  if (maxFanfletsRaw !== null && maxFanfletsRaw !== "") {
    const n = Number(maxFanfletsRaw);
    limits.max_fanflets = Number.isFinite(n) ? n : 5;
  }
  if (maxResourcesRaw !== null && maxResourcesRaw !== "") {
    const n = Number(maxResourcesRaw);
    limits.max_resources_per_fanflet = Number.isFinite(n) ? n : 20;
  }
  if (storageMbRaw !== null && storageMbRaw !== "") {
    const n = Number(storageMbRaw);
    if (Number.isFinite(n) && n >= 0) limits.storage_mb = n;
    else if (n === -1) limits.storage_mb = -1;
  }
  if (maxFileMbRaw !== null && maxFileMbRaw !== "") {
    const n = Number(maxFileMbRaw);
    if (Number.isFinite(n) && n >= 0) limits.max_file_mb = n;
    else if (n === -1) limits.max_file_mb = -1;
  }
  if (signedUrlMinutesRaw !== null && signedUrlMinutesRaw !== "") {
    const n = Number(signedUrlMinutesRaw);
    if (Number.isFinite(n) && n >= 0) limits.signed_url_minutes = n;
    else if (n === -1) limits.signed_url_minutes = -1;
  }

  const supabase = createServiceClient();

  const { data: maxSort } = await supabase
    .from("plans")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sort_order = (maxSort?.sort_order ?? 0) + 10;

  const is_public = formData.get("is_public") === "true";
  const is_active = formData.get("is_active") === "true";

  const { data: newPlan, error: insertPlanError } = await supabase
    .from("plans")
    .insert({
      name,
      display_name: (display_name as string).trim(),
      description:
        typeof description === "string" && description.trim()
          ? description.trim()
          : null,
      sort_order,
      is_active,
      is_public,
      price_monthly_cents: null,
      limits,
    })
    .select("id")
    .single();

  if (insertPlanError) {
    if (insertPlanError.code === "23505") {
      return { error: "A plan with this key already exists" };
    }
    return { error: "Failed to create plan" };
  }

  if (!newPlan?.id) {
    return { error: "Failed to create plan" };
  }

  if (featureFlagIds.length > 0) {
    const { error: insertFeaturesError } = await supabase
      .from("plan_features")
      .insert(
        featureFlagIds.map((feature_flag_id) => ({
          plan_id: newPlan.id,
          feature_flag_id,
        }))
      );

    if (insertFeaturesError) {
      return { error: "Failed to assign features to plan" };
    }
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "plan.create",
    category: "plan",
    targetType: "plan",
    targetId: newPlan.id,
    details: { name, display_name, limits, featureFlagIds },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/features");
  redirect(`/features?tab=plans`);
}

/** Form action wrapper for create plan form (useActionState signature). */
export async function submitPlanCreateFormAction(
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const result = await createPlanWithFeatures(formData);
  return result ?? null;
}

/** Plain form action wrapper for the new plan page. */
export async function submitPlanCreateForm(formData: FormData): Promise<void> {
  await createPlanWithFeatures(formData);
}

/** Refresh entitlement snapshots for all active subscribers on a plan. */
export async function refreshPlanEntitlements(
  planId: string
): Promise<{ error?: string; count?: number }> {
  const parsed = refreshPlanEntitlementsSchema.safeParse(planId);
  if (!parsed.success) return { error: "Invalid input" };
  const validPlanId = parsed.data;

  let admin: Awaited<ReturnType<typeof requireSuperAdmin>>;
  try {
    admin = await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: plan } = await supabase
    .from("plans")
    .select("limits")
    .eq("id", validPlanId)
    .single();

  if (!plan) return { error: "Plan not found" };

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

  const { data: subs, error: fetchError } = await supabase
    .from("speaker_subscriptions")
    .select("id")
    .eq("plan_id", validPlanId)
    .eq("status", "active");

  if (fetchError) return { error: "Failed to fetch subscribers" };
  if (!subs || subs.length === 0) return { count: 0 };

  const subIds = subs.map((s) => s.id);
  const { error: updateError } = await supabase
    .from("speaker_subscriptions")
    .update({
      limits_snapshot: plan.limits,
      features_snapshot: featureKeys,
      updated_at: new Date().toISOString(),
    })
    .in("id", subIds);

  if (updateError) return { error: "Failed to refresh entitlements" };

  await auditAdminAction({
    adminId: admin.user.id,
    action: "plan.refresh_entitlements",
    category: "plan",
    targetType: "plan",
    targetId: validPlanId,
    details: { subscriberCount: subIds.length },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath(`/features/plans/${validPlanId}`);
  return { count: subIds.length };
}
