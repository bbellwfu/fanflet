import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { SubscribeForm } from "@/components/marketing/subscribe-form";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Pricing — Fanflet | Free During Early Access",
  description:
    "Fanflet is free during Early Access. Get full access to personalized resource pages, audience engagement tools, and analytics — no credit card required.",
  openGraph: {
    title: "Pricing — Fanflet | Free During Early Access",
    description:
      "Fanflet is free during Early Access. Get full access to personalized resource pages, audience engagement tools, and analytics — no credit card required.",
  },
};

/** One-line feature labels for scannable grid (PRD benefit-oriented, condensed) */
const FEATURES = [
  "Personalized branded URLs for every fanflet",
  "Profile and bio with photo",
  "Multiple theme colors for your brand",
  "Optional expiration dates (30, 60, 90 days or none)",
  "Custom resources and links",
  "Surveys and session feedback",
  "Sponsor visibility and links",
  "Engagement and click-through analytics",
  "Opt-in email list building from your audience",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Section 1 — Hero: one headline, one CTA */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 border border-primary/20 px-3.5 py-1 text-sm font-medium text-primary mb-6"
            aria-hidden
          >
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            Early Access
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl mb-4">
            Free during Early Access
          </h1>
          <p className="text-lg text-slate-600 max-w-xl mx-auto mb-8 leading-relaxed">
            Full access for KOLs who want to engage audiences after every talk. No credit card required.
          </p>
          <div className="flex flex-col items-center gap-2">
            <Button asChild size="lg" className="rounded-full px-8 font-semibold shadow-lg shadow-primary/20">
              <Link href="/signup" className="inline-flex items-center gap-2">
                Get Started Free
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <span className="text-xs text-slate-400">No credit card required</span>
          </div>
        </div>
      </section>

      {/* Section 2 — Features: compact 3-column grid */}
      <section className="py-12 md:py-16 px-4 bg-white border-y border-slate-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-8">
            Everything you need to extend the impact of your talks
          </h2>
          <ul
            role="list"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4"
          >
            {FEATURES.map((feature, i) => (
              <li key={i} className="flex items-start gap-3 py-1">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
                </span>
                <span className="text-sm text-slate-700 leading-snug">{feature}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Section 3 — Future teaser: one short block */}
      <section className="py-12 md:py-14 px-4 bg-slate-50">
        <div className="max-w-lg mx-auto text-center">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">What&apos;s next</h3>
          <p className="text-slate-600 leading-relaxed">
            We&apos;re building premium plans for teams that need more. Early access users get a discount and will be
            first to know when they launch.
          </p>
        </div>
      </section>

      {/* Section 4 — CTA card: primary CTA + divider + email signup */}
      <section className="py-16 px-4">
        <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-10 text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Ready to get started?</h2>
          <p className="text-slate-600 mb-8">Create your account and get full access today.</p>

          <Button asChild size="lg" className="rounded-full px-8 font-semibold shadow-lg shadow-primary/20">
            <Link href="/signup" className="inline-flex items-center gap-2">
              Get Started Free
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>

          <div
            className="flex items-center gap-4 my-8"
            role="presentation"
            aria-hidden
          >
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">or</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <p className="text-sm text-slate-500 mb-4">Not ready yet? Get notified when we announce plans.</p>
          <SubscribeForm />

          <p className="mt-6 text-xs text-slate-400">
            Questions?{" "}
            <a href="mailto:hello@fanflet.com" className="underline hover:text-slate-600">
              hello@fanflet.com
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
