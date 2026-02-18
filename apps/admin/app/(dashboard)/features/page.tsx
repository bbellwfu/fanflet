import { createServiceClient } from "@fanflet/db/service";
import Link from "next/link";
import { ToggleLeftIcon, SettingsIcon } from "lucide-react";
import { FeatureToggle } from "./feature-toggle";

export default async function FeaturesPage() {
  const supabase = createServiceClient();

  const [flagsResult, plansResult, planFeaturesResult] = await Promise.all([
    supabase.from("feature_flags").select("*").order("display_name"),
    supabase.from("plans").select("*").order("sort_order"),
    supabase.from("plan_features").select("plan_id, feature_flag_id"),
  ]);

  const flags = flagsResult.data ?? [];
  const plans = plansResult.data ?? [];
  const planFeatures = planFeaturesResult.data ?? [];

  const featurePlanMap = new Map<string, string[]>();
  for (const pf of planFeatures) {
    const plan = plans.find((p) => p.id === pf.plan_id);
    if (plan) {
      const existing = featurePlanMap.get(pf.feature_flag_id) ?? [];
      existing.push(plan.display_name);
      featurePlanMap.set(pf.feature_flag_id, existing);
    }
  }

  const planColors: Record<string, string> = {
    Pro: "bg-primary-muted text-primary-soft",
    Business: "bg-info/10 text-info",
    Global: "bg-success/10 text-success",
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-fg tracking-tight">
            Features & Plans
          </h1>
          <p className="text-sm text-fg-secondary mt-1">
            Manage feature flags and subscription plan assignments
          </p>
        </div>
        <Link
          href="/features/plans"
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-fg text-[13px] font-medium rounded-lg hover:bg-primary/90 transition-colors"
        >
          <SettingsIcon className="w-4 h-4" />
          Manage Plans
        </Link>
      </div>

      {/* Feature Flags Card */}
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        {/* Card Header */}
        <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-primary-muted flex items-center justify-center">
            <ToggleLeftIcon className="w-4 h-4 text-primary-soft" />
          </div>
          <h2 className="text-sm font-semibold text-fg">Feature Flags</h2>
          <span className="text-[12px] text-fg-muted ml-1">
            {flags.length} features
          </span>
        </div>

        {/* Feature List */}
        <div className="divide-y divide-border-subtle">
          {flags.map((flag) => {
            const flagPlans = featurePlanMap.get(flag.id) ?? [];
            return (
              <div
                key={flag.id}
                className="px-5 py-4 flex items-center justify-between"
              >
                <div className="min-w-0 flex-1 mr-6">
                  <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                    <h3 className="text-[13px] font-semibold text-fg">
                      {flag.display_name}
                    </h3>
                    <code className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-surface-elevated text-fg-muted">
                      {flag.key}
                    </code>
                  </div>
                  {flag.description && (
                    <p className="text-[12px] text-fg-secondary mb-2">
                      {flag.description}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5">
                    {flag.is_global ? (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-success/10 text-success">
                        Global
                      </span>
                    ) : (
                      <>
                        {flagPlans.map((planName) => (
                          <span
                            key={planName}
                            className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              planColors[planName] ??
                              "bg-surface-elevated text-fg-muted"
                            }`}
                          >
                            {planName}
                          </span>
                        ))}
                        {flagPlans.length === 0 && (
                          <span className="text-[10px] text-fg-muted">
                            No plans assigned
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <FeatureToggle flagId={flag.id} isGlobal={flag.is_global} />
              </div>
            );
          })}
          {flags.length === 0 && (
            <div className="px-5 py-10 text-center">
              <p className="text-[13px] text-fg-muted">
                No feature flags configured
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
