import { createServiceClient } from "@fanflet/db/service";
import { FeaturesPageClient } from "./features-page-client";

export default async function FeaturesPage() {
  const supabase = createServiceClient();

  const [
    flagsResult,
    plansResult,
    planFeaturesResult,
    subscriptionCountsResult,
  ] = await Promise.all([
    supabase.from("feature_flags").select("*").order("display_name"),
    supabase.from("plans").select("*").order("sort_order"),
    supabase.from("plan_features").select("plan_id, feature_flag_id"),
    supabase.from("speaker_subscriptions").select("plan_id"),
  ]);

  const flags = flagsResult.data ?? [];
  const plans = plansResult.data ?? [];
  const planFeatures = planFeaturesResult.data ?? [];
  const subscriptions = subscriptionCountsResult.data ?? [];

  const featurePlanMap: Record<string, string[]> = {};
  for (const pf of planFeatures) {
    const plan = plans.find((p) => p.id === pf.plan_id);
    if (plan) {
      const existing = featurePlanMap[pf.feature_flag_id] ?? [];
      existing.push(plan.display_name);
      featurePlanMap[pf.feature_flag_id] = existing;
    }
  }

  const planFeatureMap: Record<string, string[]> = {};
  for (const pf of planFeatures) {
    const arr = planFeatureMap[pf.plan_id] ?? [];
    arr.push(pf.feature_flag_id);
    planFeatureMap[pf.plan_id] = arr;
  }

  const planSubscriberCounts: Record<string, number> = {};
  for (const sub of subscriptions) {
    planSubscriberCounts[sub.plan_id] =
      (planSubscriberCounts[sub.plan_id] ?? 0) + 1;
  }

  return (
    <FeaturesPageClient
      flags={flags}
      plans={plans}
      featurePlanMap={featurePlanMap}
      planFeatureMap={planFeatureMap}
      planSubscriberCounts={planSubscriberCounts}
    />
  );
}
