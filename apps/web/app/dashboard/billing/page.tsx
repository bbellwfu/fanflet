import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { getSpeakerEntitlements } from "@fanflet/db";
import { redirect } from "next/navigation";
import { CreditCard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CurrentPlanCard } from "@/components/dashboard/billing/current-plan-card";
import { PlanComparisonGrid } from "@/components/dashboard/billing/plan-comparison-grid";
import { FeatureComparisonDashboard } from "@/components/dashboard/billing/feature-comparison-dashboard";
import { getEntitlementDrift } from "./actions";

export const metadata: Metadata = {
  title: "Billing & Plans — Fanflet",
};

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!speaker) redirect("/login");

  const [entitlements, plansResult, planFeaturesResult, fanfletCountResult, drift] =
    await Promise.all([
      getSpeakerEntitlements(speaker.id),
      supabase
        .from("plans")
        .select("id, name, display_name, description, price_monthly_cents, limits, is_public, sort_order")
        .eq("is_public", true)
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("plan_features")
        .select("plan_id, feature_flags(key, display_name), plans!inner(name)")
        .eq("plans.is_public", true),
      supabase
        .from("fanflets")
        .select("id", { count: "exact", head: true })
        .eq("speaker_id", speaker.id),
      getEntitlementDrift(speaker.id),
    ]);

  const rawPlans = plansResult.data ?? [];
  const rawPlanFeatures = planFeaturesResult.data ?? [];
  const fanfletCount = fanfletCountResult.count ?? 0;

  const planFeatureMap: Record<string, string[]> = {};
  const featureMatrix: Record<string, string[]> = {};
  const featureDisplayNames: Record<string, string> = {};

  for (const pf of rawPlanFeatures) {
    const plan = pf.plans as unknown as { name: string } | null;
    const flag = pf.feature_flags as unknown as {
      key: string;
      display_name: string;
    } | null;
    if (plan?.name && flag?.display_name) {
      const arr = planFeatureMap[plan.name] ?? [];
      arr.push(flag.display_name);
      planFeatureMap[plan.name] = arr;
      const keys = featureMatrix[plan.name] ?? [];
      if (flag.key && !keys.includes(flag.key)) keys.push(flag.key);
      featureMatrix[plan.name] = keys;
      if (flag.key) featureDisplayNames[flag.key] = flag.display_name;
    }
  }

  const planCards = rawPlans.map((p) => ({
    id: p.id,
    name: p.name,
    display_name: p.display_name,
    description: p.description,
    price_monthly_cents: p.price_monthly_cents,
    features: planFeatureMap[p.name] ?? [],
    sort_order: p.sort_order,
  }));

  const comparisonPlans = rawPlans.map((p) => ({
    name: p.name,
    display_name: p.display_name,
    limits: (p.limits as Record<string, number>) ?? {},
  }));

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1B365D]">
          Billing &amp; Plans
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and compare available plans.
        </p>
      </div>

      <CurrentPlanCard
        planName={entitlements.planName}
        planDisplayName={entitlements.planDisplayName}
        limits={entitlements.limits}
        fanfletCount={fanfletCount}
        drift={drift}
      />

      <div className="space-y-3">
        <h2 className="text-base font-semibold text-[#1B365D]">Available Plans</h2>
        <PlanComparisonGrid
          plans={planCards}
          currentPlanName={entitlements.planName}
        />
      </div>

      <FeatureComparisonDashboard
        plans={comparisonPlans}
        featureMatrix={featureMatrix}
        featureDisplayNames={featureDisplayNames}
        currentPlanName={entitlements.planName}
      />

      <Card className="border-[#e2e8f0]">
        <CardContent className="py-5">
          <div className="flex items-start gap-3">
            <CreditCard className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-[#1B365D]">
                Payment &amp; billing
              </p>
              <p className="text-xs text-slate-500">
                All plans are free during Early Access. Payment management and
                invoice history will be available here when paid billing is
                introduced. We&apos;ll notify you before any changes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
