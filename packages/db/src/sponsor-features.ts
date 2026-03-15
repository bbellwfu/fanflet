import { cache } from "react";
import { createClient } from "./server";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SponsorEntitlements {
  features: Set<string>;
  limits: Record<string, number>;
  planName: string | null;
  planDisplayName: string | null;
}

const EMPTY_ENTITLEMENTS: SponsorEntitlements = {
  features: new Set<string>(),
  limits: {},
  planName: null,
  planDisplayName: null,
};

const SPONSOR_FREE_PLAN_NAME = "sponsor_connect";

/**
 * Framework-agnostic entitlement loader for sponsors. Works in any context:
 * MCP server, background jobs, integration adapters, tests.
 *
 * Resolution:
 * 1. Subscription row (plan limits + features from sponsor_plan_features)
 * 2. Global feature flags (everyone gets these)
 * 3. Fallback to sponsor_connect plan defaults
 */
export async function loadSponsorEntitlements(
  supabase: SupabaseClient,
  sponsorId: string
): Promise<SponsorEntitlements> {
  const [subResult, globalFlagsResult] = await Promise.all([
    supabase
      .from("sponsor_subscriptions")
      .select(
        "plan_id, limits_snapshot, sponsor_plans(name, display_name, limits)"
      )
      .eq("sponsor_id", sponsorId)
      .eq("status", "active")
      .maybeSingle(),

    supabase
      .from("feature_flags")
      .select("key")
      .eq("is_global", true),
  ]);

  const sub = subResult.data;
  const globalFlags = globalFlagsResult.data ?? [];
  const features = new Set<string>();
  let limits: Record<string, number> = {};
  let planName: string | null = null;
  let planDisplayName: string | null = null;

  if (sub) {
    const plan = sub.sponsor_plans as unknown as {
      name: string;
      display_name: string;
      limits: Record<string, number>;
    } | null;

    planName = plan?.name ?? null;
    planDisplayName = plan?.display_name ?? null;

    limits =
      sub.limits_snapshot && typeof sub.limits_snapshot === "object"
        ? (sub.limits_snapshot as Record<string, number>)
        : plan?.limits ?? {};

    const { data: planFeatures } = await supabase
      .from("sponsor_plan_features")
      .select("feature_flags(key)")
      .eq("plan_id", sub.plan_id);

    for (const pf of planFeatures ?? []) {
      const flag = pf.feature_flags as unknown as { key: string } | null;
      if (flag?.key) features.add(flag.key);
    }
  } else {
    const { data: freePlan } = await supabase
      .from("sponsor_plans")
      .select("id, name, display_name, limits")
      .eq("name", SPONSOR_FREE_PLAN_NAME)
      .single();

    if (freePlan) {
      planName = freePlan.name;
      planDisplayName = freePlan.display_name;
      limits = (freePlan.limits as Record<string, number>) ?? {};

      const { data: planFeatures } = await supabase
        .from("sponsor_plan_features")
        .select("feature_flags(key)")
        .eq("plan_id", freePlan.id);

      for (const pf of planFeatures ?? []) {
        const flag = pf.feature_flags as unknown as { key: string } | null;
        if (flag?.key) features.add(flag.key);
      }
    }
  }

  for (const gf of globalFlags) features.add(gf.key);

  return { features, limits, planName, planDisplayName };
}

/**
 * React-cached wrapper for Next.js server components and server actions.
 * Uses cookie-based Supabase client internally.
 */
export const getSponsorEntitlements = cache(
  async (sponsorId: string): Promise<SponsorEntitlements> => {
    const supabase = await createClient();
    return loadSponsorEntitlements(supabase, sponsorId);
  }
);
