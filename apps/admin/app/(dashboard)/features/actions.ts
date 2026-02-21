"use server";

import { createServiceClient } from "@fanflet/db/service";
import { createClient } from "@fanflet/db/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function toggleFeatureGlobal(flagId: string, isGlobal: boolean) {
  // Verify admin
  const userSupabase = await createClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "platform_admin") {
    return { error: "Not authorized" };
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("feature_flags")
    .update({ is_global: isGlobal })
    .eq("id", flagId);

  if (error) {
    return { error: "Failed to update feature flag" };
  }

  revalidatePath("/features");
  return { success: true };
}

export async function updatePlanFeatures(
  planId: string,
  featureFlagIds: string[]
) {
  const userSupabase = await createClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "platform_admin") {
    return { error: "Not authorized" };
  }

  const supabase = createServiceClient();

  const { error: deleteError } = await supabase
    .from("plan_features")
    .delete()
    .eq("plan_id", planId);

  if (deleteError) {
    return { error: "Failed to update plan features" };
  }

  if (featureFlagIds.length > 0) {
    const { error: insertError } = await supabase.from("plan_features").insert(
      featureFlagIds.map((feature_flag_id) => ({
        plan_id: planId,
        feature_flag_id,
      }))
    );

    if (insertError) {
      return { error: "Failed to save plan features" };
    }
  }

  revalidatePath("/features");
  revalidatePath("/features/plans");
  revalidatePath(`/features/plans/${planId}`);
  return { success: true };
}

export async function updatePlan(
  planId: string,
  data: {
    display_name?: string;
    description?: string | null;
    limits?: Record<string, number>;
  }
) {
  const userSupabase = await createClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "platform_admin") {
    return { error: "Not authorized" };
  }

  const supabase = createServiceClient();

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.display_name !== undefined) payload.display_name = data.display_name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.limits !== undefined) payload.limits = data.limits;

  const { error } = await supabase
    .from("plans")
    .update(payload)
    .eq("id", planId);

  if (error) {
    return { error: "Failed to update plan" };
  }

  revalidatePath("/features");
  revalidatePath("/features/plans");
  revalidatePath(`/features/plans/${planId}`);
  return { success: true };
}

export async function updatePlanWithFeatures(
  planId: string,
  formData: FormData
) {
  const userSupabase = await createClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "platform_admin") {
    return { error: "Not authorized" };
  }

  const display_name = formData.get("display_name");
  const description = formData.get("description");
  const maxFanfletsRaw = formData.get("max_fanflets");
  const maxResourcesRaw = formData.get("max_resources_per_fanflet");
  const featureFlagIds = formData.getAll("feature_flag_id") as string[];

  const supabase = createServiceClient();
  const { data: existingPlan } = await supabase
    .from("plans")
    .select("limits")
    .eq("id", planId)
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

  const updateResult = await updatePlan(planId, {
    ...(typeof display_name === "string" && display_name.trim()
      ? { display_name: display_name.trim() }
      : {}),
    ...(description !== undefined
      ? { description: typeof description === "string" ? description : null }
      : {}),
    limits,
  });

  if (updateResult.error) return updateResult;

  const featuresResult = await updatePlanFeatures(planId, featureFlagIds);
  if (featuresResult.error) return featuresResult;

  redirect(`/features?tab=plans`);
}

/** Form action wrapper that returns void for use in plan edit form (avoids passing inline functions to Client Components). */
export async function submitPlanEditForm(
  planId: string,
  formData: FormData
): Promise<void> {
  await updatePlanWithFeatures(planId, formData);
}

/** Create a new plan with optional description, limits, and feature assignments. */
export async function createPlanWithFeatures(formData: FormData) {
  const userSupabase = await createClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user || user.app_metadata?.role !== "platform_admin") {
    return { error: "Not authorized" };
  }

  const nameRaw = formData.get("name");
  const display_name = formData.get("display_name");
  const description = formData.get("description");
  const maxFanfletsRaw = formData.get("max_fanflets");
  const maxResourcesRaw = formData.get("max_resources_per_fanflet");
  const featureFlagIds = formData.getAll("feature_flag_id") as string[];

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
  };
  if (maxFanfletsRaw !== null && maxFanfletsRaw !== "") {
    const n = Number(maxFanfletsRaw);
    limits.max_fanflets = Number.isFinite(n) ? n : 5;
  }
  if (maxResourcesRaw !== null && maxResourcesRaw !== "") {
    const n = Number(maxResourcesRaw);
    limits.max_resources_per_fanflet = Number.isFinite(n) ? n : 20;
  }

  const supabase = createServiceClient();

  const { data: maxSort } = await supabase
    .from("plans")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const sort_order = (maxSort?.sort_order ?? 0) + 10;

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
      is_active: true,
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
