import { createServiceClient } from "@fanflet/db/service";
import Link from "next/link";
import { ArrowLeft, PackageIcon, CheckIcon, MinusIcon } from "lucide-react";

export default async function PlansPage() {
  const supabase = createServiceClient();

  const [plansResult, flagsResult, planFeaturesResult, subscriptionCountsResult] =
    await Promise.all([
      supabase.from("plans").select("*").order("sort_order"),
      supabase
        .from("feature_flags")
        .select("id, key, display_name")
        .order("display_name"),
      supabase.from("plan_features").select("plan_id, feature_flag_id"),
      supabase.from("speaker_subscriptions").select("plan_id"),
    ]);

  const plans = plansResult.data ?? [];
  const flags = flagsResult.data ?? [];
  const planFeatures = planFeaturesResult.data ?? [];
  const subscriptions = subscriptionCountsResult.data ?? [];

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
    <div className="space-y-8">
      <div>
        <Link
          href="/features"
          className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Features
        </Link>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Subscription Plans
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Define plan tiers, pricing, limits, and feature assignments
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const planFlagIds = planFeatureMap.get(plan.id) ?? new Set();
          const subscriberCount = planSubscriberCounts.get(plan.id) ?? 0;
          const limits = (plan.limits ?? {}) as Record<string, number>;

          return (
            <div
              key={plan.id}
              className={`bg-surface rounded-lg border border-border-subtle overflow-hidden ${
                !plan.is_active ? "opacity-60" : ""
              }`}
            >
              {/* Plan Header */}
              <div className="px-5 py-4 border-b border-border-subtle">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <PackageIcon className="w-5 h-5 text-primary-soft" />
                    <h3 className="text-[15px] font-semibold text-fg">
                      {plan.display_name}
                    </h3>
                  </div>
                  {!plan.is_active && (
                    <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-elevated text-fg-muted">
                      Inactive
                    </span>
                  )}
                </div>
                {plan.description && (
                  <p className="text-[12px] text-fg-secondary">
                    {plan.description}
                  </p>
                )}
              </div>

              {/* Plan Body */}
              <div className="px-5 py-4 space-y-5">
                {/* Pricing */}
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-fg-muted mb-1">
                    Pricing
                  </p>
                  {plan.price_monthly_cents ? (
                    <p className="text-xl font-semibold text-fg tracking-tight">
                      ${(plan.price_monthly_cents / 100).toFixed(2)}
                      <span className="text-[13px] font-normal text-fg-secondary">
                        /mo
                      </span>
                    </p>
                  ) : (
                    <p className="text-xl font-semibold text-fg tracking-tight">
                      Free
                    </p>
                  )}
                </div>

                {/* Limits */}
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-fg-muted mb-1">
                    Limits
                  </p>
                  <div className="space-y-1 text-[13px] text-fg-secondary">
                    <p>
                      Fanflets:{" "}
                      <span className="font-medium text-fg">
                        {limits.max_fanflets === -1
                          ? "Unlimited"
                          : limits.max_fanflets ?? "—"}
                      </span>
                    </p>
                    <p>
                      Resources/fanflet:{" "}
                      <span className="font-medium text-fg">
                        {limits.max_resources_per_fanflet === -1
                          ? "Unlimited"
                          : limits.max_resources_per_fanflet ?? "—"}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Features */}
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-fg-muted mb-1.5">
                    Features Included
                  </p>
                  <div className="space-y-1.5">
                    {flags.map((flag) => {
                      const included = planFlagIds.has(flag.id);
                      return (
                        <div
                          key={flag.id}
                          className="flex items-center gap-2 text-[13px]"
                        >
                          {included ? (
                            <CheckIcon className="w-3.5 h-3.5 text-success shrink-0" />
                          ) : (
                            <MinusIcon className="w-3.5 h-3.5 text-fg-muted shrink-0" />
                          )}
                          <span
                            className={
                              included
                                ? "text-fg"
                                : "text-fg-muted line-through"
                            }
                          >
                            {flag.display_name}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Plan Footer */}
              <div className="px-5 py-3 border-t border-border-subtle">
                <p className="text-[12px] text-fg-muted">
                  {subscriberCount} active subscriber
                  {subscriberCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
