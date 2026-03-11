"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SponsorInquiryModal } from "@/components/marketing/sponsor-inquiry-modal";

const COLORS = {
  navy: "#1B2A4A",
  blue: "#3B82F6",
  blueLight: "#DBEAFE",
  emerald: "#10B981",
  emeraldLight: "#D1FAE5",
  violet: "#7C3AED",
  violetLight: "#EDE9FE",
  gray200: "#E2E8F0",
  gray400: "#94A3B8",
  gray500: "#64748B",
  gray600: "#475569",
  gray900: "#0F172A",
} as const;

interface PlanStyleConfig {
  accentColor: string;
  accentColorLight: string;
  checkColor: string;
  topBorderColor?: string;
  ctaStyle: "primary" | "secondary" | "outline";
  ctaText: string;
  badge?: string;
  highlighted?: boolean;
}

const PLAN_STYLE_MAP: Record<string, PlanStyleConfig> = {
  free: {
    accentColor: COLORS.emerald,
    accentColorLight: COLORS.emeraldLight,
    checkColor: COLORS.emerald,
    topBorderColor: COLORS.emerald,
    ctaStyle: "outline",
    ctaText: "Get Started Free",
    badge: "After Early Access",
  },
  pro: {
    accentColor: COLORS.blue,
    accentColorLight: COLORS.blueLight,
    checkColor: COLORS.blue,
    ctaStyle: "primary",
    ctaText: "Get Pro Free",
    badge: "Free during Early Access",
    highlighted: true,
  },
  enterprise: {
    accentColor: COLORS.violet,
    accentColorLight: COLORS.violetLight,
    checkColor: COLORS.violet,
    topBorderColor: COLORS.violet,
    ctaStyle: "secondary",
    ctaText: "Get in Touch",
    badge: "For Sponsors",
  },
};

const DEFAULT_STYLE: PlanStyleConfig = {
  accentColor: COLORS.blue,
  accentColorLight: COLORS.blueLight,
  checkColor: COLORS.blue,
  ctaStyle: "outline",
  ctaText: "Learn More",
};

export interface PublicPlan {
  name: string;
  display_name: string;
  description: string | null;
  price_monthly_cents: number | null;
  limits: Record<string, number> | null;
  features: string[];
}

interface PricingTiersProps {
  plans: PublicPlan[];
}

interface PricingCardProps {
  plan: PublicPlan;
  style: PlanStyleConfig;
  onEnterpriseContactClick?: () => void;
}

function formatPrice(plan: PublicPlan): {
  price: string;
  priceSuffix?: string;
  originalPrice?: string;
  priceNote?: string;
} {
  if (plan.name === "pro") {
    return {
      price: "$0",
      priceSuffix: "/month",
      priceNote: "Full Pro features · We'll notify you before paid plans.",
    };
  }
  if (plan.name === "enterprise") {
    return { price: "Contact us" };
  }
  if (!plan.price_monthly_cents) {
    return { price: "$0", priceSuffix: "/month" };
  }
  return {
    price: `$${(plan.price_monthly_cents / 100).toFixed(0)}`,
    priceSuffix: "/month",
  };
}

function PricingCard({ plan, style, onEnterpriseContactClick }: PricingCardProps) {
  const { price, priceSuffix, originalPrice, priceNote } = formatPrice(plan);

  const ctaStyles = {
    primary: {
      className: "text-white hover:shadow-lg",
      style: {
        background: COLORS.blue,
        boxShadow: "0 4px 14px rgba(59, 130, 246, 0.3)",
      },
    },
    secondary: {
      className: "text-white hover:shadow-lg",
      style: {
        background: COLORS.navy,
        boxShadow: "0 4px 14px rgba(27, 42, 74, 0.2)",
      },
    },
    outline: {
      className: "border-2 hover:-translate-y-0.5",
      style: {
        borderColor: style.accentColor,
        color: style.accentColor,
        background: "white",
      },
    },
  };
  const cta = ctaStyles[style.ctaStyle];

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl",
        style.highlighted ? "p-1 md:-mt-4 md:mb-4" : ""
      )}
      style={
        style.highlighted
          ? {
              background: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.navy})`,
              boxShadow:
                "0 8px 40px rgba(59, 130, 246, 0.2), 0 0 0 1px rgba(59, 130, 246, 0.1)",
            }
          : undefined
      }
    >
      <div
        className={cn(
          "flex flex-col flex-1 rounded-xl p-6 sm:p-8",
          style.highlighted ? "bg-white" : ""
        )}
        style={{
          ...(!style.highlighted
            ? {
                background: "white",
                border: `1px solid ${COLORS.gray200}`,
                borderTop: `3px solid ${style.topBorderColor ?? style.accentColor}`,
              }
            : {}),
        }}
      >
        <div className="mb-4 h-7 flex items-center">
          {style.badge && (
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: style.accentColorLight,
                color: style.accentColor,
              }}
            >
              {style.badge}
            </span>
          )}
        </div>

        <h3 className="text-xl font-bold mb-2" style={{ color: COLORS.navy }}>
          {plan.display_name}
        </h3>

        <div className="flex items-baseline gap-1.5 mb-1">
          <span
            className="text-5xl font-extrabold tracking-tight"
            style={{ color: COLORS.gray900 }}
          >
            {price}
          </span>
          {priceSuffix && (
            <span
              className="text-base font-medium"
              style={{ color: COLORS.gray400 }}
            >
              {priceSuffix}
            </span>
          )}
          {originalPrice && (
            <span
              className="text-lg font-medium line-through ml-1"
              style={{ color: COLORS.gray400 }}
            >
              {originalPrice}
            </span>
          )}
        </div>

        <div className="h-5 mb-6">
          {priceNote && (
            <p className="text-xs font-medium" style={{ color: style.accentColor }}>
              {priceNote}
            </p>
          )}
        </div>

        <p className="text-sm mb-8" style={{ color: COLORS.gray500 }}>
          {plan.description}
        </p>

        {plan.name === "enterprise" ? (
          <ul className="space-y-3 mb-8 flex-1" role="list" style={{ color: COLORS.gray600 }}>
            <li className="text-sm leading-snug">Branded placement alongside speaker content</li>
            <li className="text-sm leading-snug">Lead capture and engagement analytics</li>
            <li className="text-sm leading-snug">Measurable ROI for sponsorship spend</li>
            <li className="text-sm leading-snug">Direct connections with educators and KOLs</li>
          </ul>
        ) : (
          <>
            {plan.name === "pro" && (
              <p
                className="text-sm font-medium mb-3"
                style={{ color: COLORS.gray600, fontWeight: "bold", fontSizeAdjust: ".6" }}
              >
                Everything in Free, plus:
              </p>
            )}
            <ul className="space-y-3 mb-8 flex-1" role="list">
            {plan.features.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <Check
                  className="w-4.5 h-4.5 mt-0.5 flex-shrink-0"
                  style={{ color: style.checkColor }}
                  aria-hidden
                />
                <span
                  className="text-sm leading-snug"
                  style={{ color: COLORS.gray600 }}
                >
                  {feature}
                </span>
              </li>
            ))}
            </ul>
          </>
        )}

        {plan.name === "enterprise" ? (
          <button
            type="button"
            onClick={onEnterpriseContactClick}
            className={cn(
              "inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200",
              cta.className
            )}
            style={cta.style}
          >
            {style.ctaText}
          </button>
        ) : (
          <Link
            href="/signup"
            className={cn(
              "inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200",
              cta.className
            )}
            style={cta.style}
          >
            {style.ctaText.includes("\n") ? (
              <span className="flex flex-col items-center leading-tight">
                {style.ctaText.split("\n").map((line, i) => (
                  <span
                    key={i}
                    className={
                      i === 0
                        ? "text-xs font-bold opacity-80"
                        : "text-sm font-semibold"
                    }
                  >
                    {line}
                  </span>
                ))}
              </span>
            ) : (
              <>
                {style.ctaText}
                {style.ctaStyle === "primary" && (
                  <ArrowRight className="w-4 h-4" />
                )}
              </>
            )}
          </Link>
        )}
      </div>
    </div>
  );
}

export function PricingTiers({ plans }: PricingTiersProps) {
  const [enterpriseModalOpen, setEnterpriseModalOpen] = useState(false);

  return (
    <section className="w-full py-20 sm:py-24 px-4 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-5 items-start">
          {plans.map((plan) => (
            <PricingCard
              key={plan.name}
              plan={plan}
              style={PLAN_STYLE_MAP[plan.name] ?? DEFAULT_STYLE}
              onEnterpriseContactClick={
                plan.name === "enterprise"
                  ? () => setEnterpriseModalOpen(true)
                  : undefined
              }
            />
          ))}
        </div>
      </div>
      <SponsorInquiryModal
        open={enterpriseModalOpen}
        onOpenChange={setEnterpriseModalOpen}
      />
    </section>
  );
}
