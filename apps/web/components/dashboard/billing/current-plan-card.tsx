"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, Sparkles, CheckCircle2, Crown } from "lucide-react";
import { refreshPlanEntitlements } from "@/app/dashboard/billing/actions";
import { FEATURE_METADATA } from "@/lib/plan-features";

interface CurrentPlanCardProps {
  planName: string | null;
  planDisplayName: string | null;
  limits: Record<string, number>;
  fanfletCount: number;
  drift: {
    hasDrift: boolean;
    added: string[];
    removed: string[];
  };
}

const PLAN_ACCENT: Record<string, { bg: string; text: string; badge: string }> = {
  free: { bg: "bg-emerald-50", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-700" },
  pro: { bg: "bg-blue-50", text: "text-blue-700", badge: "bg-blue-100 text-blue-700" },
  early_access: { bg: "bg-blue-50", text: "text-blue-700", badge: "bg-blue-100 text-blue-700" },
  enterprise: { bg: "bg-violet-50", text: "text-violet-700", badge: "bg-violet-100 text-violet-700" },
};

function getFeatureLabel(key: string): string {
  return FEATURE_METADATA[key]?.label ?? key.replace(/_/g, " ");
}

export function CurrentPlanCard({
  planName,
  planDisplayName,
  limits,
  fanfletCount,
  drift,
}: CurrentPlanCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [refreshResult, setRefreshResult] = useState<{
    added: string[];
    removed: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const accent = PLAN_ACCENT[planName ?? "free"] ?? PLAN_ACCENT.free;
  const maxFanflets = limits.max_fanflets ?? 0;
  const isUnlimited = maxFanflets === -1;
  const usagePercent = isUnlimited ? 0 : maxFanflets > 0 ? Math.min(100, (fanfletCount / maxFanflets) * 100) : 0;

  function handleRefresh() {
    setError(null);
    setRefreshResult(null);
    startTransition(async () => {
      const result = await refreshPlanEntitlements();
      if (result.error) {
        setError(result.error);
      } else {
        setRefreshResult({ added: result.added ?? [], removed: result.removed ?? [] });
        router.refresh();
      }
    });
  }

  const showDrift = drift.hasDrift && !refreshResult;

  return (
    <Card className="border-[#e2e8f0]">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[#1B365D] text-lg">Your Plan</CardTitle>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${accent.badge}`}>
              <Crown className="w-3 h-3" />
              {planDisplayName ?? "Free"}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-100 text-emerald-700">
              Active
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Fanflets</span>
            <span className="font-medium text-[#1B365D]">
              {fanfletCount} {isUnlimited ? "used" : `of ${maxFanflets}`}
            </span>
          </div>
          {!isUnlimited && (
            <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-blue-500 transition-all duration-500"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          )}
          {isUnlimited && (
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Unlimited fanflets on your plan
            </div>
          )}
        </div>

        {showDrift && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 space-y-3">
            <div className="flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-blue-900">
                  Your plan has been updated
                </p>
                <p className="text-xs text-blue-700">
                  {drift.added.length > 0 && (
                    <>
                      {drift.added.length} new feature{drift.added.length > 1 ? "s" : ""} added
                      {drift.removed.length > 0 ? " and " : ""}
                    </>
                  )}
                  {drift.removed.length > 0 && (
                    <>
                      {drift.removed.length} feature{drift.removed.length > 1 ? "s" : ""} updated
                    </>
                  )}
                  . Refresh to get the latest entitlements.
                </p>
              </div>
            </div>
            {drift.added.length > 0 && (
              <ul className="ml-6 space-y-1">
                {drift.added.map((key) => (
                  <li key={key} className="flex items-center gap-1.5 text-xs text-blue-800">
                    <span className="w-1 h-1 rounded-full bg-blue-500" />
                    {getFeatureLabel(key)}
                  </li>
                ))}
              </ul>
            )}
            <Button
              size="sm"
              onClick={handleRefresh}
              disabled={isPending}
              className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPending ? "animate-spin" : ""}`} />
              {isPending ? "Refreshing..." : "Refresh my plan"}
            </Button>
          </div>
        )}

        {refreshResult && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-medium text-emerald-900">
                  Plan refreshed successfully
                </p>
                {refreshResult.added.length > 0 && (
                  <p className="text-xs text-emerald-700">
                    {refreshResult.added.length} new feature{refreshResult.added.length > 1 ? "s" : ""} activated.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
