"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ToggleLeftIcon,
  PackageIcon,
  CheckIcon,
  MinusIcon,
  PlusIcon,
} from "lucide-react";
import { FeatureToggle } from "./feature-toggle";

const PLAN_COLORS: Record<string, string> = {
  Free: "bg-slate-100 text-slate-700",
  "Early Access": "bg-violet-100 text-violet-700",
  Pro: "bg-primary-muted text-primary-soft",
  Business: "bg-primary-muted text-primary-soft",
  Enterprise: "bg-amber-100 text-amber-800",
  Global: "bg-success/10 text-success",
};

type Plan = {
  id: string;
  display_name: string;
  description: string | null;
  limits: Record<string, number> | null;
  sort_order: number;
  is_active: boolean;
  price_monthly_cents: number | null;
};

type FeatureFlag = {
  id: string;
  key: string;
  display_name: string;
  description: string | null;
  is_global: boolean;
};

interface FeaturesPageClientProps {
  flags: FeatureFlag[];
  plans: Plan[];
  featurePlanMap: Record<string, string[]>;
  planFeatureMap: Record<string, string[]>;
  planSubscriberCounts: Record<string, number>;
  initialTab?: string;
  initialEditPlanId?: string | null;
}

export function FeaturesPageClient({
  flags,
  plans,
  featurePlanMap,
  planFeatureMap,
  planSubscriberCounts,
  initialTab,
}: FeaturesPageClientProps) {
  const [activeTab, setActiveTab] = useState<"features" | "plans">(
    initialTab === "plans" ? "plans" : "features"
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Features & Plans
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Manage feature flags and subscription plan assignments
        </p>
      </div>

      <div className="flex gap-1 p-1 rounded-lg bg-surface-elevated border border-border-subtle w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("features")}
          className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
            activeTab === "features"
              ? "bg-primary text-primary-fg"
              : "text-fg-secondary hover:text-fg hover:bg-surface-hover"
          }`}
        >
          Product features
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("plans")}
          className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
            activeTab === "plans"
              ? "bg-primary text-primary-fg"
              : "text-fg-secondary hover:text-fg hover:bg-surface-hover"
          }`}
        >
          Plans
        </button>
      </div>

      {activeTab === "features" && (
        <>
          <details className="rounded-lg border border-border-subtle bg-surface-elevated/50">
            <summary className="px-4 py-3 text-[13px] font-medium text-fg cursor-pointer list-none">
              How to read this page
            </summary>
            <div className="px-4 pb-3 pt-0 text-[12px] text-fg-secondary space-y-1">
              <p>
                <strong>Plan tags</strong> show which plans include each feature.
                <strong> Toggle</strong>: On = Global (everyone); Off = only
                assigned plans. Use the <strong>Plans</strong> tab to edit
                plan limits and feature checkboxes.
              </p>
            </div>
          </details>

          <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
            <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary-muted flex items-center justify-center">
                <ToggleLeftIcon className="w-4 h-4 text-primary-soft" />
              </div>
              <h2 className="text-sm font-semibold text-fg">Feature Flags</h2>
              <span className="text-[12px] text-fg-muted ml-1">
                {flags.length} features
              </span>
            </div>
            <div className="divide-y divide-border-subtle">
              {flags.map((flag) => {
                const flagPlans = featurePlanMap[flag.id] ?? [];
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
                                  PLAN_COLORS[planName] ??
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
        </>
      )}

      {activeTab === "plans" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link
              href="/features/plans/new"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-fg text-[13px] font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              New plan
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((p) => {
              const planFlagIdsSet = new Set(planFeatureMap[p.id] ?? []);
              const subscriberCount = planSubscriberCounts[p.id] ?? 0;
              const limits = (p.limits ?? {}) as Record<string, number>;

              return (
                <div
                  key={p.id}
                  className={`bg-surface rounded-lg border border-border-subtle overflow-hidden ${
                    !p.is_active ? "opacity-60" : ""
                  }`}
                >
                  <div className="px-5 py-4 border-b border-border-subtle">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <PackageIcon className="w-5 h-5 text-primary-soft" />
                        <h3 className="text-[15px] font-semibold text-fg">
                          {p.display_name}
                        </h3>
                      </div>
                      {!p.is_active && (
                        <span className="text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-elevated text-fg-muted">
                          Inactive
                        </span>
                      )}
                    </div>
                    {p.description && (
                      <p className="text-[12px] text-fg-secondary">
                        {p.description}
                      </p>
                    )}
                  </div>
                  <div className="px-5 py-4 space-y-5">
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-fg-muted mb-1">
                        Pricing
                      </p>
                      {p.price_monthly_cents ? (
                        <p className="text-xl font-semibold text-fg tracking-tight">
                          ${(p.price_monthly_cents / 100).toFixed(2)}
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
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wider text-fg-muted mb-1.5">
                        Features Included
                      </p>
                      <div className="space-y-1.5">
                        {flags.map((flag) => {
                          const included = planFlagIdsSet.has(flag.id);
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
                  <div className="px-5 py-3 border-t border-border-subtle flex items-center justify-between">
                    <p className="text-[12px] text-fg-muted">
                      {subscriberCount} active subscriber
                      {subscriberCount !== 1 ? "s" : ""}
                    </p>
                    <Link
                      href={`/features/plans/${p.id}`}
                      className="text-[12px] font-medium text-primary-soft hover:text-primary transition-colors"
                    >
                      Edit plan
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
