/**
 * Pricing page — matches PRDs/pricing (App.tsx + components).
 * Order: PricingHero → PricingTiers → FeatureComparison → FAQ → BottomCTA.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SubscribeForm } from "@/components/marketing/subscribe-form";
import { PricingTiers } from "@/components/marketing/pricing-tiers";
import { FeatureComparison } from "@/components/marketing/feature-comparison";
import { PricingFAQ } from "@/components/marketing/pricing-faq";

export const metadata: Metadata = {
  title: "Pricing — Fanflet | Pro Free During Early Access",
  description:
    "Get Pro free during Early Access. Full Pro features — unlimited fanflets, analytics, and more — at no cost. No credit card required. Compare Free, Pro, and Enterprise.",
  openGraph: {
    title: "Pricing — Fanflet | Pro Free During Early Access",
    description:
      "Get Pro free during Early Access. Full Pro features — unlimited fanflets, analytics, and more — at no cost. No credit card required.",
  },
};

// PRD reference colors (PRDs/pricing/src/index.css)
const NAVY = "#1B2A4A";
const BLUE = "#3B82F6";
const GRAY_200 = "#E2E8F0";
const GRAY_400 = "#94A3B8";
const GRAY_600 = "#475569";
const EMERALD = "#10B981";

export default function PricingPage() {
  return (
    <div className="w-full min-h-screen bg-white">
      {/* PricingHero — PRD structure and copy */}
      <section
        className="relative w-full overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #EFF6FF 0%, #F8FAFC 40%, #FFFFFF 100%)",
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute -top-24 -right-24 w-96 h-96 rounded-full opacity-[0.07]"
            style={{ background: BLUE }}
          />
          <div
            className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full opacity-[0.04]"
            style={{ background: NAVY }}
          />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-24 sm:py-32 lg:py-40 text-center">
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-8"
            style={{ borderColor: GRAY_200, background: "white" }}
          >
            <span
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: EMERALD }}
              aria-hidden
            />
            <span className="text-sm font-medium" style={{ color: NAVY }}>
              Early Access
            </span>
          </div>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6"
            style={{ color: NAVY }}
          >
            Pro free during Early Access
          </h1>
          <p
            className="text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed"
            style={{ color: GRAY_600 }}
          >
            Sign up now and get full Pro features — unlimited fanflets, analytics, and more — at no cost. No credit card required.
          </p>
          <div className="flex flex-col items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg text-white font-semibold text-base transition-all duration-200 hover:shadow-lg"
              style={{
                background: NAVY,
                boxShadow: "0 4px 14px rgba(27, 42, 74, 0.25)",
              }}
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <span className="text-sm" style={{ color: GRAY_400 }}>
              No credit card required
            </span>
          </div>
        </div>
      </section>

      <PricingTiers />
      <FeatureComparison />
      <PricingFAQ />

      {/* BottomCTA — PRD structure + SubscribeForm */}
      <section
        className="w-full py-20 sm:py-28 px-4 sm:px-6 relative overflow-hidden"
        style={{ background: NAVY }}
      >
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div
            className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full opacity-[0.06]"
            style={{
              background: `radial-gradient(circle, ${BLUE} 0%, transparent 70%)`,
              transform: "translate(30%, -40%)",
            }}
          />
          <div
            className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-[0.04]"
            style={{
              background: `radial-gradient(circle, ${BLUE} 0%, transparent 70%)`,
              transform: "translate(-30%, 40%)",
            }}
          />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-5">
            Start engaging your audience today
          </h2>
          <p
            className="text-lg sm:text-xl mb-10 leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.7)" }}
          >
            Join speakers who are extending the impact of every talk.
          </p>
          <div className="flex flex-col items-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-lg font-semibold text-base transition-all duration-200 hover:shadow-xl"
              style={{
                background: "white",
                color: NAVY,
                boxShadow: "0 4px 20px rgba(0, 0, 0, 0.15)",
              }}
            >
              Get Pro Free
              <ArrowRight className="w-4 h-4" aria-hidden />
            </Link>
            <span
              className="text-sm"
              style={{ color: "rgba(255, 255, 255, 0.45)" }}
            >
              Pro free during Early Access · No credit card required
            </span>
          </div>

          <div className="flex items-center gap-4 my-10" role="presentation" aria-hidden>
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-xs font-medium text-white/50 uppercase tracking-wide">
              or
            </span>
            <div className="flex-1 h-px bg-white/20" />
          </div>
          <p className="text-sm text-white/70 mb-4">
            Not ready yet? Get notified when we announce plans.
          </p>
          <div className="max-w-md mx-auto">
            <SubscribeForm />
          </div>
          <p className="mt-8 text-xs text-white/50">
            Questions?{" "}
            <a href="mailto:hello@fanflet.com" className="underline hover:text-white">
              hello@fanflet.com
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
