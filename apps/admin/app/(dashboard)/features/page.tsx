import { createServiceClient } from "@fanflet/db/service";
import { Card, CardContent, CardHeader, CardTitle } from "@fanflet/ui/card";
import Link from "next/link";
import { ToggleLeft, Package } from "lucide-react";
import { FeatureToggle } from "./feature-toggle";

export default async function FeaturesPage() {
  const supabase = createServiceClient();

  const [flagsResult, plansResult, planFeaturesResult] = await Promise.all([
    supabase
      .from("feature_flags")
      .select("*")
      .order("display_name"),
    supabase
      .from("plans")
      .select("*")
      .order("sort_order"),
    supabase
      .from("plan_features")
      .select("plan_id, feature_flag_id"),
  ]);

  const flags = flagsResult.data ?? [];
  const plans = plansResult.data ?? [];
  const planFeatures = planFeaturesResult.data ?? [];

  // Build a map: feature_flag_id -> [plan names]
  const featurePlanMap = new Map<string, string[]>();
  for (const pf of planFeatures) {
    const plan = plans.find((p) => p.id === pf.plan_id);
    if (plan) {
      const existing = featurePlanMap.get(pf.feature_flag_id) ?? [];
      existing.push(plan.display_name);
      featurePlanMap.set(pf.feature_flag_id, existing);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Features & Plans</h1>
          <p className="text-muted-foreground mt-1">
            Manage feature flags and subscription plan assignments
          </p>
        </div>
        <Link
          href="/features/plans"
          className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
        >
          <Package className="w-4 h-4" />
          Manage Plans
        </Link>
      </div>

      {/* Feature Flags */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ToggleLeft className="w-5 h-5 text-muted-foreground" />
            <CardTitle className="text-base">Feature Flags</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {flags.map((flag) => (
              <div
                key={flag.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{flag.display_name}</p>
                    <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
                      {flag.key}
                    </code>
                  </div>
                  {flag.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {flag.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {flag.is_global ? (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-medium">
                        Global
                      </span>
                    ) : (
                      <>
                        {(featurePlanMap.get(flag.id) ?? []).map((planName) => (
                          <span
                            key={planName}
                            className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium"
                          >
                            {planName}
                          </span>
                        ))}
                        {(featurePlanMap.get(flag.id) ?? []).length === 0 && (
                          <span className="text-[10px] text-muted-foreground">
                            No plans assigned
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <FeatureToggle flagId={flag.id} isGlobal={flag.is_global} />
              </div>
            ))}
            {flags.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No feature flags configured
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
