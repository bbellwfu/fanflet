import { cache } from "react";
import { createClient } from "./server";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface SponsorEntitlements {
  limits: Record<string, number>;
  planName: string | null;
  planDisplayName: string | null;
}

const EMPTY_ENTITLEMENTS: SponsorEntitlements = {
  limits: {},
  planName: null,
  planDisplayName: null,
};

const SPONSOR_FREE_PLAN_NAME = "sponsor_free";

/**
 * Framework-agnostic entitlement loader for sponsors. Works in any context:
 * MCP server, background jobs, integration adapters, tests.
 */
export async function loadSponsorEntitlements(
  supabase: SupabaseClient,
  sponsorId: string
): Promise<SponsorEntitlements> {
  const { data: sub } = await supabase
    .from("sponsor_subscriptions")
    .select(
      "plan_id, limits_snapshot, sponsor_plans(name, display_name, limits)"
    )
    .eq("sponsor_id", sponsorId)
    .eq("status", "active")
    .maybeSingle();

  if (sub) {
    const plan = sub.sponsor_plans as unknown as {
      name: string;
      display_name: string;
      limits: Record<string, number>;
    } | null;

    const limits =
      sub.limits_snapshot && typeof sub.limits_snapshot === "object"
        ? (sub.limits_snapshot as Record<string, number>)
        : plan?.limits ?? {};

    return {
      limits,
      planName: plan?.name ?? null,
      planDisplayName: plan?.display_name ?? null,
    };
  }

  const { data: freePlan } = await supabase
    .from("sponsor_plans")
    .select("name, display_name, limits")
    .eq("name", SPONSOR_FREE_PLAN_NAME)
    .single();

  if (freePlan) {
    return {
      limits: (freePlan.limits as Record<string, number>) ?? {},
      planName: freePlan.name,
      planDisplayName: freePlan.display_name,
    };
  }

  return EMPTY_ENTITLEMENTS;
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
