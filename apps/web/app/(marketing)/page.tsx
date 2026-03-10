import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, QrCode, Zap, CheckCircle2, Mic, Building2, Heart } from "lucide-react";

export const metadata: Metadata = {
  title: "Fanflet — Turn Event Talks into Lasting Engagement",
  description:
    "The professional way to share resources, capture leads, and dazzle sponsors. One QR code. Zero friction. Lifelong fans.",
  openGraph: {
    title: "Fanflet — Turn Event Talks into Lasting Engagement",
    description:
      "The professional way to share resources, capture leads, and dazzle sponsors. One QR code. Zero friction. Lifelong fans.",
  },
};

export default function MarketingHome() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden pt-16 pb-24 lg:pt-32 lg:pb-40 isolate">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/speaker_hero.png"
            alt="Keynote speaker on stage"
            fill
            priority
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-slate-900/85 z-10"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent z-10"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-20">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 px-4 py-1.5 rounded-full text-sm font-semibold text-blue-100 mb-8 animate-fade-in-up backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400"></span>
            </span>
            Now in Early Access
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 max-w-4xl mx-auto leading-tight drop-shadow-lg">
            Turn Event Talks into <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-cyan-300">Lasting Engagement</span>
          </h1>

          <p className="text-xl text-blue-100/90 mb-10 max-w-2xl mx-auto leading-relaxed drop-shadow-md">
            The professional way to share resources, capture leads, and dazzle sponsors.
            One QR code. Zero friction. Lifelong fans.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="flex items-center gap-2 bg-secondary text-slate-900 px-8 py-4 rounded-full text-lg font-bold hover:bg-white transition-all shadow-xl hover:shadow-2xl hover:shadow-cyan-500/20 hover:-translate-y-0.5">
              Create Your Fanflet <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/demo" className="text-white font-semibold px-8 py-4 hover:text-cyan-300 transition-colors flex items-center gap-2">
              See How It Works
            </Link>
          </div>
        </div>
      </div>

      {/* Social Proof / Trust */}
      <div className="border-y border-slate-200 bg-white/50 py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-6">Empowering speakers at top events</p>
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {['ADA SmileCon', 'AIDA Aspire', 'F500 SKOs', 'AARD', 'HIMSS'].map((brand) => (
              <span key={brand} className="text-xl md:text-2xl font-black text-slate-300">{brand}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Problem / Solution Grid */}
      <div className="py-24 bg-white" id="features">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Stop Losing Your Audience</h2>
            <p className="mt-4 text-lg text-slate-600">The moment your talk ends, the connection evaporates. Fanflet fixes the handoff.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:border-secondary/20 transition-colors">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-primary mb-6">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Instant Access</h3>
              <p className="text-slate-600">No app installs. No login friction. Audience scans a QR code and lands on your branded resource page instantly.</p>
            </div>

            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:border-secondary/20 transition-colors">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-6">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Lead Capture</h3>
              <p className="text-slate-600">Exchange slides and resources for email addresses. Build your own audience, independent of the event organizer.</p>
            </div>

            <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:border-secondary/20 transition-colors">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-6">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Sponsor ROI</h3>
              <p className="text-slate-600">Give sponsors measurable visibility. Track clicks and engagement on their assets, proving your value.</p>
            </div>
          </div>
        </div>
      </div>

      {/* For Speakers */}
      <div className="py-24 bg-slate-50" id="speakers">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-primary mb-6">
                <Mic className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-4">For Speakers</h2>
              <p className="text-lg text-slate-600 mb-6">
                Your stage, your audience, your platform. Share resources instantly via QR code,
                capture leads, and build lasting relationships that extend far beyond the event.
              </p>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Branded resource pages with your slides, links, files, and downloads</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Build your subscriber list independently from event organizers</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Analytics dashboard to track engagement across every talk</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Centralized resource library — update once, propagate everywhere</span>
                </li>
              </ul>
              <Link href="/signup" className="inline-flex items-center gap-2 mt-8 text-primary font-semibold hover:text-primary/80 transition-colors">
                Start sharing your resources <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="rounded-2xl border border-slate-200 shadow-lg overflow-hidden bg-white">
              <Image
                src="/marketing/speaker-dashboard.png"
                alt="Fanflet speaker dashboard showing subscriber count, resource downloads, engagement analytics, and fanflet management"
                width={1024}
                height={576}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>

      {/* For Sponsors */}
      <div className="py-24 bg-white" id="sponsors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 rounded-2xl border border-slate-200 shadow-lg overflow-hidden bg-white">
              <Image
                src="/marketing/sponsor-analytics.png"
                alt="Sponsor analytics dashboard showing content clicks, impressions, and audience breakdown"
                width={1024}
                height={576}
                className="w-full h-auto"
              />
            </div>
            <div className="order-1 md:order-2">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-6">
                <Building2 className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-4">For Sponsors</h2>
              <p className="text-lg text-slate-600 mb-6">
                Stop guessing whether your sponsorship dollars are working. Get measurable visibility
                with the professional audiences that matter most to your business.
              </p>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Track clicks and engagement on your sponsored content</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Connect directly with top educators and Key Opinion Leaders</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Branded placement alongside trusted speaker content</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Real ROI data to justify and optimize your sponsorship spend</span>
                </li>
              </ul>
              <Link href="/signup" className="inline-flex items-center gap-2 mt-8 text-primary font-semibold hover:text-primary/80 transition-colors">
                Learn about sponsoring <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* For Fans */}
      <div className="py-24 bg-slate-50" id="fans">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-6">
                <Heart className="w-6 h-6" />
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-4">For <i>Fans</i>  &nbsp; (Event Audience)</h2>
              <p className="text-lg text-slate-600 mb-6">
                Instant access to everything from your favorite speakers. No app to install,
                no account to create, no friction. Just scan and go.
              </p>
              <ul className="space-y-3 text-slate-600">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Scan a QR code and get slides, links, and resources on your phone instantly</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Bookmark via SMS so you never lose a great resource again</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Subscribe to speakers you love and stay connected</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 shrink-0" />
                  <span>Access everything on any device — mobile, tablet, or desktop</span>
                </li>
              </ul>
              <Link href="/demo" className="inline-flex items-center gap-2 mt-8 text-primary font-semibold hover:text-primary/80 transition-colors">
                See a live demo <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="rounded-2xl border border-slate-200 shadow-lg overflow-hidden bg-white">
              <Image
                src="/marketing/fan-landing-page.png"
                alt="Fanflet public landing page showing speaker profile, presentation details, email subscribe, and resource cards"
                width={1280}
                height={720}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary text-white py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to upgrade your next talk?</h2>
          <p className="text-xl text-blue-100 mb-10">Join professional speakers who are building lasting relationships with their audiences.</p>
          <Link href="/signup" className="bg-white text-primary px-8 py-4 rounded-full text-lg font-bold hover:bg-slate-100 transition-colors inline-block">
            Get Started for Free
          </Link>
          <p className="mt-6 text-sm text-blue-200">No credit card required</p>
        </div>
      </div>
    </div>
  );
}
