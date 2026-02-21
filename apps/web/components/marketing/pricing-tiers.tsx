"use client";

import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// PRD reference colors (PRDs/pricing/src/index.css)
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

interface TierFeature {
  text: string;
  included: boolean;
}

interface PricingCardProps {
  name: string;
  badge?: string;
  price: string;
  originalPrice?: string;
  priceSuffix?: string;
  priceNote?: string;
  description: string;
  features: TierFeature[];
  ctaText: string;
  ctaStyle: "primary" | "secondary" | "outline";
  highlighted?: boolean;
  accentColor: string;
  accentColorLight: string;
  checkColor: string;
  topBorderColor?: string;
}

function PricingCard({
  name,
  badge,
  price,
  originalPrice,
  priceSuffix,
  priceNote,
  description,
  features,
  ctaText,
  ctaStyle,
  highlighted,
  accentColor,
  accentColorLight,
  checkColor,
  topBorderColor,
}: PricingCardProps) {
  const ctaStyles = {
    primary: {
      className: "text-white hover:shadow-lg",
      style: { background: COLORS.blue, boxShadow: "0 4px 14px rgba(59, 130, 246, 0.3)" },
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
        borderColor: accentColor,
        color: accentColor,
        background: "white",
      },
    },
  };
  const style = ctaStyles[ctaStyle];

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl",
        highlighted ? "p-1 md:-mt-4 md:mb-4" : ""
      )}
      style={
        highlighted
          ? {
              background: `linear-gradient(135deg, ${COLORS.blue}, ${COLORS.navy})`,
              boxShadow: "0 8px 40px rgba(59, 130, 246, 0.2), 0 0 0 1px rgba(59, 130, 246, 0.1)",
            }
          : undefined
      }
    >
      <div
        className={cn(
          "flex flex-col flex-1 rounded-xl p-6 sm:p-8",
          highlighted ? "bg-white" : ""
        )}
        style={{
          ...(!highlighted
            ? {
                background: "white",
                border: `1px solid ${COLORS.gray200}`,
                borderTop: `3px solid ${topBorderColor ?? accentColor}`,
              }
            : {}),
        }}
      >
        <div className="mb-4 h-7 flex items-center">
          {badge && (
            <span
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: accentColorLight, color: accentColor }}
            >
              {badge}
            </span>
          )}
        </div>

        <h3 className="text-xl font-bold mb-2" style={{ color: COLORS.navy }}>
          {name}
        </h3>

        <div className="flex items-baseline gap-1.5 mb-1">
          <span
            className="text-5xl font-extrabold tracking-tight"
            style={{ color: COLORS.gray900 }}
          >
            {price}
          </span>
          {priceSuffix && (
            <span className="text-base font-medium" style={{ color: COLORS.gray400 }}>
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
            <p className="text-xs font-medium" style={{ color: accentColor }}>
              {priceNote}
            </p>
          )}
        </div>

        <p className="text-sm mb-8" style={{ color: COLORS.gray500 }}>
          {description}
        </p>

        <ul className="space-y-3 mb-8 flex-1" role="list">
          {features.map((feature, i) => (
            <li key={i} className="flex items-start gap-3">
              <Check
                className="w-4.5 h-4.5 mt-0.5 flex-shrink-0"
                style={{
                  color: feature.included ? checkColor : COLORS.gray200,
                }}
                aria-hidden
              />
              <span
                className="text-sm leading-snug"
                style={{
                  color: feature.included ? COLORS.gray600 : COLORS.gray400,
                }}
              >
                {feature.text}
              </span>
            </li>
          ))}
        </ul>

        <Link
          href="/signup"
          className={cn(
            "inline-flex items-center justify-center gap-2 w-full px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200",
            style.className
          )}
          style={style.style}
        >
          {ctaText.includes("\n") ? (
            <span className="flex flex-col items-center leading-tight">
              {ctaText.split("\n").map((line, i) => (
                <span
                  key={i}
                  className={i === 0 ? "text-xs font-bold opacity-80" : "text-sm font-semibold"}
                >
                  {line}
                </span>
              ))}
            </span>
          ) : (
            <>
              {ctaText}
              {ctaStyle === "primary" && <ArrowRight className="w-4 h-4" />}
            </>
          )}
        </Link>
      </div>
    </div>
  );
}

export function PricingTiers() {
  return (
    <section className="w-full py-20 sm:py-24 px-4 sm:px-6 bg-white">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-5 items-start">
          <PricingCard
            name="Free"
            badge="After Early Access"
            price="$0"
            priceSuffix="/month"
            description="Everything you need to get started. Our always-free tier when we launch paid plans."
            features={[
              { text: "Up to 5 fanflets", included: true },
              { text: "14-day expiration on active fanflets", included: true },
              { text: "Personalized branded URLs", included: true },
              { text: "Profile and bio with photo", included: true },
              { text: "Custom resources and links", included: true },
              { text: "1 theme color", included: true },
              { text: "Basic engagement stats", included: true },
            ]}
            ctaText="Get Started Free"
            ctaStyle="outline"
            accentColor={COLORS.emerald}
            accentColorLight={COLORS.emeraldLight}
            checkColor={COLORS.emerald}
            topBorderColor={COLORS.emerald}
          />

          <PricingCard
            name="Pro"
            badge="Free during Early Access"
            price="$0"
            priceSuffix="/month"
            priceNote="Full Pro features · We'll notify you before paid plans."
            description="Full Pro features at no cost while we're in Early Access."
            features={[
              { text: "Unlimited fanflets", included: true },
              { text: "Everything in Free", included: true },
              { text: "Multiple theme colors for your brand", included: true },
              { text: "Surveys and session feedback", included: true },
              { text: "Full engagement & click-through analytics", included: true },
              { text: "Opt-in email list building", included: true },
              { text: "Custom expiration dates (30, 60, 90 days)", included: true },
              { text: "Priority support", included: true },
            ]}
            ctaText="Get Pro Free"
            ctaStyle="primary"
            highlighted
            accentColor={COLORS.blue}
            accentColorLight={COLORS.blueLight}
            checkColor={COLORS.blue}
          />

          <PricingCard
            name="Enterprise"
            badge="Custom Pricing"
            price="Custom"
            description="For organizations and event teams"
            features={[
              { text: "Everything in Pro", included: true },
              { text: "Sponsor visibility and links", included: true },
              { text: "Custom branding and white-label", included: true },
              { text: "API access", included: true },
              { text: "Dedicated account manager", included: true },
              { text: "SSO and team management", included: true },
              { text: "Custom integrations", included: true },
            ]}
            ctaText={"Coming Soon!\nJoin the Waitlist"}
            ctaStyle="secondary"
            accentColor={COLORS.violet}
            accentColorLight={COLORS.violetLight}
            checkColor={COLORS.violet}
            topBorderColor={COLORS.violet}
          />
        </div>
      </div>
    </section>
  );
}
