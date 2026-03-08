import { cache } from "react";
import { createClient } from "./server";
import { FREE_PLAN_NAME } from "./constants";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SpeakerEntitlements {
  features: Set<string>;
  limits: Record<string, number>;
  planName: string | null;
  planDisplayName: string | null;
}

const EMPTY_ENTITLEMENTS: SpeakerEntitlements = {
  features: new Set<string>(),
  limits: {},
  planName: null,
  planDisplayName: null,
};

/**
 * Framework-agnostic entitlement loader. Works in any context: MCP server,
 * background jobs, integration adapters, tests — anywhere you have a
 * Supabase client and a speaker ID.
 *
 * Resolution:
 * 1. Subscription row (with snapshots when available)
 * 2. Global feature flags (everyone gets these)
 * 3. Speaker-specific overrides (explicit grant/deny)
 */
export async function loadSpeakerEntitlements(
  supabase: SupabaseClient,
  speakerId: string
): Promise<SpeakerEntitlements> {
  const [subResult, globalFlagsResult, overridesResult] = await Promise.all([
    supabase
      .from("speaker_subscriptions")
      .select(
        "plan_id, limits_snapshot, features_snapshot, plans(name, display_name, limits)"
      )
      .eq("speaker_id", speakerId)
      .eq("status", "active")
      .maybeSingle(),

    supabase
      .from("feature_flags")
      .select("key")
      .eq("is_global", true),

    supabase
      .from("speaker_feature_overrides")
      .select("feature_flag_id, enabled, feature_flags(key)")
      .eq("speaker_id", speakerId),
  ]);

  const sub = subResult.data;
  const globalFlags = globalFlagsResult.data ?? [];
  const overrides = overridesResult.data ?? [];

  const features = new Set<string>();
  let limits: Record<string, number> = {};
  let planName: string | null = null;
  let planDisplayName: string | null = null;

  if (sub) {
    const plan = sub.plans as unknown as {
      name: string;
      display_name: string;
      limits: Record<string, number>;
    } | null;

    planName = plan?.name ?? null;
    planDisplayName = plan?.display_name ?? null;

    if (sub.features_snapshot && sub.features_snapshot.length > 0) {
      for (const key of sub.features_snapshot) features.add(key);
    } else if (plan) {
      const { data: planFeatures } = await supabase
        .from("plan_features")
        .select("feature_flags(key)")
        .eq("plan_id", sub.plan_id);

      for (const pf of planFeatures ?? []) {
        const flag = pf.feature_flags as unknown as { key: string } | null;
        if (flag?.key) features.add(flag.key);
      }
    }

    if (sub.limits_snapshot && typeof sub.limits_snapshot === "object") {
      limits = sub.limits_snapshot as Record<string, number>;
    } else if (plan?.limits) {
      limits = plan.limits;
    }
  } else {
    const { data: freePlan } = await supabase
      .from("plans")
      .select("name, display_name, limits")
      .eq("name", FREE_PLAN_NAME)
      .single();

    if (freePlan) {
      planName = freePlan.name;
      planDisplayName = freePlan.display_name;
      limits = (freePlan.limits as Record<string, number>) ?? {};
    }
  }

  for (const gf of globalFlags) features.add(gf.key);

  for (const ov of overrides) {
    const flag = ov.feature_flags as unknown as { key: string } | null;
    if (!flag?.key) continue;
    if (ov.enabled) {
      features.add(flag.key);
    } else {
      features.delete(flag.key);
    }
  }

  return { features, limits, planName, planDisplayName };
}

/**
 * React-cached wrapper for Next.js server components and server actions.
 * Uses cookie-based Supabase client internally.
 */
export const getSpeakerEntitlements = cache(
  async (speakerId: string): Promise<SpeakerEntitlements> => {
    const supabase = await createClient();
    return loadSpeakerEntitlements(supabase, speakerId);
  }
);

/**
 * @deprecated Use `getSpeakerEntitlements()` instead. Kept for backward compatibility.
 */
export async function hasFeature(
  speakerId: string,
  featureKey: string
): Promise<boolean> {
  const entitlements = await getSpeakerEntitlements(speakerId);
  return entitlements.features.has(featureKey);
}

/**
 * @deprecated Use `getSpeakerEntitlements()` instead. Kept for backward compatibility.
 */
export async function getSpeakerLimits(
  speakerId: string
): Promise<Record<string, number> | null> {
  const entitlements = await getSpeakerEntitlements(speakerId);
  return Object.keys(entitlements.limits).length > 0
    ? entitlements.limits
    : null;
}
