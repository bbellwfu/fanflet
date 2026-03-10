"use client";

import { useState } from "react";
import { Check, ArrowRight, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UpgradeModal } from "./upgrade-modal";

interface PlanCardData {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  price_monthly_cents: number | null;
  features: string[];
  sort_order: number;
}

interface PlanComparisonGridProps {
  plans: PlanCardData[];
  currentPlanName: string | null;
}

const PLAN_ORDER = ["free", "pro", "enterprise"];

const PLAN_STYLES: Record<string, {
  accent: string;
  accentLight: string;
  border: string;
  ctaClass: string;
  highlighted?: boolean;
  badge?: string;
}> = {
  free: {
    accent: "#10B981",
    accentLight: "#D1FAE5",
    border: "border-emerald-200",
    ctaClass: "border-emerald-500 text-emerald-700 hover:bg-emerald-50",
    badge: "After Early Access",
  },
  pro: {
    accent: "#3B82F6",
    accentLight: "#DBEAFE",
    border: "border-blue-300",
    ctaClass: "bg-blue-600 text-white hover:bg-blue-700",
    highlighted: true,
    badge: "Free during Early Access",
  },
  enterprise: {
    accent: "#7C3AED",
    accentLight: "#EDE9FE",
    border: "border-violet-200",
    ctaClass: "bg-[#1B2A4A] text-white hover:bg-[#1B2A4A]/90",
    badge: "Custom Pricing",
  },
};

function formatPrice(plan: PlanCardData): { price: string; suffix?: string; note?: string } {
  if (plan.name === "pro") {
    return { price: "$0", suffix: "/mo", note: "Free during Early Access" };
  }
  if (plan.name === "enterprise") {
    return { price: "Custom" };
  }
  if (!plan.price_monthly_cents) {
    return { price: "$0", suffix: "/mo" };
  }
  return { price: `$${(plan.price_monthly_cents / 100).toFixed(0)}`, suffix: "/mo" };
}

function getCtaConfig(
  planName: string,
  currentPlanName: string | null
): { label: string; disabled: boolean; action: "switch" | "contact" | "current" } {
  const currentIdx = PLAN_ORDER.indexOf(currentPlanName ?? "free");
  const targetIdx = PLAN_ORDER.indexOf(planName);

  if (planName === currentPlanName || (planName === "free" && !currentPlanName)) {
    return { label: "Current plan", disabled: true, action: "current" };
  }

  if (planName === "enterprise") {
    return { label: "Contact us", disabled: false, action: "contact" };
  }

  if (targetIdx > currentIdx) {
    return { label: `Upgrade to ${planName === "pro" ? "Pro" : planName}`, disabled: false, action: "switch" };
  }

  return { label: "Downgrade", disabled: true, action: "switch" };
}

export function PlanComparisonGrid({ plans, currentPlanName }: PlanComparisonGridProps) {
  const [modalState, setModalState] = useState<{
    open: boolean;
    planId: string;
    planName: string;
    planDisplayName: string;
    isUpgrade: boolean;
  }>({ open: false, planId: "", planName: "", planDisplayName: "", isUpgrade: true });

  const sortedPlans = [...plans].sort(
    (a, b) => PLAN_ORDER.indexOf(a.name) - PLAN_ORDER.indexOf(b.name)
  );

  const currentDisplayName = plans.find((p) => p.name === currentPlanName)?.display_name
    ?? plans.find((p) => p.name === "free")?.display_name
    ?? "Free";

  function handleCtaClick(plan: PlanCardData) {
    const cta = getCtaConfig(plan.name, currentPlanName);
    if (cta.action === "contact") {
      window.location.assign("mailto:hello@fanflet.com?subject=Enterprise%20Plan%20Inquiry");
      return;
    }
    if (cta.action === "switch" && !cta.disabled) {
      const currentIdx = PLAN_ORDER.indexOf(currentPlanName ?? "free");
      const targetIdx = PLAN_ORDER.indexOf(plan.name);
      setModalState({
        open: true,
        planId: plan.id,
        planName: plan.name,
        planDisplayName: plan.display_name,
        isUpgrade: targetIdx > currentIdx,
      });
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sortedPlans.map((plan) => {
          const style = PLAN_STYLES[plan.name] ?? PLAN_STYLES.free;
          const isCurrent = plan.name === currentPlanName || (plan.name === "free" && !currentPlanName);
          const { price, suffix, note } = formatPrice(plan);
          const cta = getCtaConfig(plan.name, currentPlanName);

          return (
            <div
              key={plan.id}
              className={`relative rounded-xl border ${style.border} bg-white overflow-hidden transition-shadow ${
                isCurrent ? "ring-2 ring-blue-500 ring-offset-2" : "hover:shadow-md"
              }`}
            >
              {isCurrent && (
                <div className="absolute top-0 right-0 px-3 py-1 bg-blue-500 text-white text-[10px] font-bold uppercase tracking-wider rounded-bl-lg">
                  Current
                </div>
              )}

              <div className="p-5 space-y-4">
                {style.badge && (
                  <span
                    className="inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-semibold"
                    style={{ background: style.accentLight, color: style.accent }}
                  >
                    {style.badge}
                  </span>
                )}

                <div>
                  <h3 className="text-base font-bold text-[#1B2A4A]">{plan.display_name}</h3>
                  {plan.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{plan.description}</p>
                  )}
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-[#0F172A]">{price}</span>
                  {suffix && <span className="text-sm text-slate-400">{suffix}</span>}
                </div>
                {note && (
                  <p className="text-[11px] font-medium" style={{ color: style.accent }}>{note}</p>
                )}

                <Button
                  variant={cta.action === "current" ? "outline" : "default"}
                  size="sm"
                  className={`w-full ${cta.disabled ? "opacity-60 cursor-default" : style.ctaClass}`}
                  disabled={cta.disabled}
                  onClick={() => handleCtaClick(plan)}
                >
                  {cta.action === "contact" && <Mail className="w-3.5 h-3.5 mr-1.5" />}
                  {cta.action === "switch" && !cta.disabled && <ArrowRight className="w-3.5 h-3.5 mr-1.5" />}
                  {cta.label}
                </Button>

                <ul className="space-y-2 pt-2 border-t border-slate-100">
                  {plan.features.slice(0, 6).map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs text-slate-600">
                      <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: style.accent }} />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {plan.features.length > 6 && (
                    <li className="text-xs text-slate-400 pl-5">
                      +{plan.features.length - 6} more features
                    </li>
                  )}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      <UpgradeModal
        open={modalState.open}
        onOpenChange={(open) => setModalState((s) => ({ ...s, open }))}
        targetPlanId={modalState.planId}
        targetPlanName={modalState.planName}
        targetPlanDisplayName={modalState.planDisplayName}
        currentPlanDisplayName={currentDisplayName}
        isUpgrade={modalState.isUpgrade}
      />
    </>
  );
}
