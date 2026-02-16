import { createServiceClient } from "@fanflet/db/service";
import { Card, CardContent, CardHeader, CardTitle } from "@fanflet/ui/card";
import Link from "next/link";
import { ArrowLeft, Package } from "lucide-react";

export default async function PlansPage() {
  const supabase = createServiceClient();

  const [plansResult, flagsResult, planFeaturesResult, subscriptionCountsResult] =
    await Promise.all([
      supabase.from("plans").select("*").order("sort_order"),
      supabase.from("feature_flags").select("id, key, display_name").order("display_name"),
      supabase.from("plan_features").select("plan_id, feature_flag_id"),
      supabase.from("speaker_subscriptions").select("plan_id"),
    ]);

  const plans = plansResult.data ?? [];
  const flags = flagsResult.data ?? [];
  const planFeatures = planFeaturesResult.data ?? [];
  const subscriptions = subscriptionCountsResult.data ?? [];

  // Build maps
  const planFeatureMap = new Map<string, Set<string>>();
  for (const pf of planFeatures) {
    const set = planFeatureMap.get(pf.plan_id) ?? new Set();
    set.add(pf.feature_flag_id);
    planFeatureMap.set(pf.plan_id, set);
  }

  const planSubscriberCounts = new Map<string, number>();
  for (const sub of subscriptions) {
    planSubscriberCounts.set(
      sub.plan_id,
      (planSubscriberCounts.get(sub.plan_id) ?? 0) + 1
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/features"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Features
        </Link>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Subscription Plans
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Define plan tiers, pricing, limits, and feature assignments
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const planFlagIds = planFeatureMap.get(plan.id) ?? new Set();
          const subscriberCount = planSubscriberCounts.get(plan.id) ?? 0;
          const limits = (plan.limits ?? {}) as Record<string, number>;

          return (
            <Card key={plan.id} className={!plan.is_active ? "opacity-60" : ""}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">{plan.display_name}</CardTitle>
                  </div>
                  {!plan.is_active && (
                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">
                      Inactive
                    </span>
                  )}
                </div>
                {plan.description && (
                  <p className="text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pricing */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Pricing
                  </p>
                  {plan.price_monthly_cents ? (
                    <p className="text-lg font-bold">
                      ${(plan.price_monthly_cents / 100).toFixed(2)}
                      <span className="text-sm font-normal text-muted-foreground">
                        /mo
                      </span>
                    </p>
                  ) : (
                    <p className="text-lg font-bold">Free</p>
                  )}
                </div>

                {/* Limits */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Limits
                  </p>
                  <div className="space-y-1 text-sm">
                    <p>
                      Fanflets:{" "}
                      <strong>
                        {limits.max_fanflets === -1
                          ? "Unlimited"
                          : limits.max_fanflets ?? "—"}
                      </strong>
                    </p>
                    <p>
                      Resources/fanflet:{" "}
                      <strong>
                        {limits.max_resources_per_fanflet === -1
                          ? "Unlimited"
                          : limits.max_resources_per_fanflet ?? "—"}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                    Features Included
                  </p>
                  <div className="space-y-1">
                    {flags.map((flag) => {
                      const included = planFlagIds.has(flag.id);
                      return (
                        <div
                          key={flag.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span
                            className={
                              included
                                ? "text-emerald-400"
                                : "text-slate-600"
                            }
                          >
                            {included ? "+" : "-"}
                          </span>
                          <span
                            className={
                              included
                                ? "text-foreground"
                                : "text-muted-foreground line-through"
                            }
                          >
                            {flag.display_name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stats */}
                <div className="pt-3 border-t">
                  <p className="text-xs text-muted-foreground">
                    {subscriberCount} active subscriber{subscriberCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
