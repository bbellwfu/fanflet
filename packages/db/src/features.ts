import { createClient } from "./server";

/**
 * Check if a speaker has access to a specific feature.
 *
 * Resolution order:
 * 1. Speaker-specific feature override (explicit grant/deny)
 * 2. Global feature flag (is_global = true -> everyone gets it)
 * 3. Speaker's plan -> plan_features junction
 *
 * Falls back to false if no match is found.
 */
export async function hasFeature(
  speakerId: string,
  featureKey: string
): Promise<boolean> {
  const supabase = await createClient();

  // 1. Check feature flag exists and get its properties
  const { data: flag } = await supabase
    .from("feature_flags")
    .select("id, is_global")
    .eq("key", featureKey)
    .single();

  if (!flag) return false;

  // 2. Check speaker-specific override
  const { data: override } = await supabase
    .from("speaker_feature_overrides")
    .select("enabled")
    .eq("speaker_id", speakerId)
    .eq("feature_flag_id", flag.id)
    .maybeSingle();

  if (override) return override.enabled;

  // 3. Check if globally enabled
  if (flag.is_global) return true;

  // 4. Check speaker's plan
  const { data: subscription } = await supabase
    .from("speaker_subscriptions")
    .select("plan_id")
    .eq("speaker_id", speakerId)
    .eq("status", "active")
    .maybeSingle();

  if (!subscription) return false;

  // 5. Check plan_features junction
  const { data: planFeature } = await supabase
    .from("plan_features")
    .select("plan_id")
    .eq("plan_id", subscription.plan_id)
    .eq("feature_flag_id", flag.id)
    .maybeSingle();

  return !!planFeature;
}

/**
 * Get the speaker's current plan limits.
 * Returns null if speaker has no subscription (treated as free tier).
 */
export async function getSpeakerLimits(
  speakerId: string
): Promise<Record<string, number> | null> {
  const supabase = await createClient();

  const { data: subscription } = await supabase
    .from("speaker_subscriptions")
    .select("plan_id, plans(limits)")
    .eq("speaker_id", speakerId)
    .eq("status", "active")
    .maybeSingle();

  if (!subscription) {
    // Default free tier limits
    const { data: freePlan } = await supabase
      .from("plans")
      .select("limits")
      .eq("name", "free")
      .single();

    return (freePlan?.limits as Record<string, number>) ?? null;
  }

  const plans = subscription.plans as unknown as { limits: Record<string, number> } | null;
  return plans?.limits ?? null;
}
