import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Stethoscope,
  Users,
  Server,
  Mic,
  Building2,
  Heart,
  Shield,
  Eye,
  Handshake,
  CheckCircle2,
} from "lucide-react";

export const metadata: Metadata = {
  title: "About — Fanflet | Built by People Who've Been in Your Shoes",
  description:
    "Fanflet was created by a team with decades of experience in clinical dental practice, KOL management, organized dentistry leadership, and enterprise technology.",
  openGraph: {
    title: "About — Fanflet | Built by People Who've Been in Your Shoes",
    description:
      "Fanflet was created by a team with decades of experience in clinical dental practice, KOL management, organized dentistry leadership, and enterprise technology.",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Hero */}
      <div className="bg-white border-b border-slate-200 py-20 sm:py-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
            Built by People Who&apos;ve{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-500">
              Been in Your Shoes
            </span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Fanflet was created by a team that has spent decades at the intersection of
            professional education, industry leadership, and technology — and saw an
            opportunity to build something that didn&apos;t exist.
          </p>
        </div>
      </div>

      {/* Three Pillars */}
      <div className="py-20 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Our Background
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              This isn&apos;t a generic tech startup that discovered the conference space.
              It&apos;s a team with deep roots in the communities we serve.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-primary mb-6">
                <Stethoscope className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Deep Domain Expertise</h3>
              <p className="text-slate-600">
                The founding team brings decades of hands-on experience in clinical dental
                practice, continuing education program development, and the professional
                speaking circuit. We&apos;ve organized sessions, managed CE credit logistics,
                and seen firsthand how the best educators struggle to maintain audience
                connections after their talks end.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 mb-6">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">
                Industry Relationships &amp; Leadership
              </h3>
              <p className="text-slate-600">
                Our team has served in leadership roles across organized dentistry and
                industry groups, including the Academy of General Dentistry. We&apos;ve managed
                Key Opinion Leader programs, navigated the complex dynamics between educators
                and sponsors, and understand the nuanced needs of both sides.
              </p>
            </div>

            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 mb-6">
                <Server className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Enterprise Technology</h3>
              <p className="text-slate-600">
                Before Fanflet, our team built and scaled enterprise SaaS platforms. We bring
                the engineering discipline, security practices, and infrastructure thinking
                that professional speakers and their sponsors deserve — but rarely get from
                tools built as side projects.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Who It's For */}
      <div className="py-20 sm:py-24 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Who We Built This For
            </h2>
            <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
              Fanflet serves three distinct audiences, each shaped by our team&apos;s
              firsthand experience working alongside them.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-8">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center text-primary mx-auto mb-5">
                <Mic className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Speakers</h3>
              <p className="text-slate-600">
                Built by educators who understand the post-talk handoff problem — because
                we&apos;ve lived it ourselves. Your slides shouldn&apos;t disappear into an
                inbox. Your audience relationships shouldn&apos;t end at the door.
              </p>
            </div>

            <div className="text-center p-8">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 mx-auto mb-5">
                <Building2 className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Sponsors</h3>
              <p className="text-slate-600">
                Designed by people who have managed KOL programs and know what measurable
                ROI really means. No more guessing whether your sponsorship dollars are
                reaching the right audience.
              </p>
            </div>

            <div className="text-center p-8">
              <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto mb-5">
                <Heart className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Fans</h3>
              <p className="text-slate-600">
                Created for the attendees who deserve better than a hastily emailed PDF.
                Scan a code, get everything you need, and stay connected to the speakers
                who inspire you.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Why We Built Fanflet */}
      <div className="py-20 sm:py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl mb-8">
            Why We Built Fanflet
          </h2>
          <div className="space-y-6 text-lg text-slate-600 leading-relaxed">
            <p>
              We kept seeing the same problem: a speaker delivers an exceptional talk, the
              audience is energized, and then... nothing. The connection evaporates. Slides
              get emailed to a list — maybe. Sponsors get a logo on a slide — maybe. There
              is no system for the handoff.
            </p>
            <p>
              We realized the gap wasn&apos;t just a technology problem — it was a domain
              understanding problem. Generic file-sharing tools don&apos;t understand CE
              requirements. Marketing platforms don&apos;t understand the speaker–sponsor
              dynamic. Nobody was building for this specific, underserved professional
              community.
            </p>
            <p>
              So we built Fanflet: purpose-built for professional educators, their audiences,
              and their sponsors. Every feature starts with a simple question — does this make
              the speaker&apos;s life easier and their impact greater?
            </p>
          </div>
        </div>
      </div>

      {/* Our Commitment */}
      <div className="py-20 sm:py-24 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Our Commitment
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="flex gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-primary shrink-0 mt-1">
                <Mic className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">Speaker-First Design</h3>
                <p className="text-slate-600">
                  Every feature starts with the question: does this make the speaker&apos;s
                  life easier?
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600 shrink-0 mt-1">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">Privacy by Default</h3>
                <p className="text-slate-600">
                  Audience data belongs to the speaker, not to us. We don&apos;t sell data
                  or insert ourselves into the relationship.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center text-purple-600 shrink-0 mt-1">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">Sponsor Transparency</h3>
                <p className="text-slate-600">
                  We believe sponsors deserve measurable outcomes, and speakers deserve
                  tools to deliver that value.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600 shrink-0 mt-1">
                <Handshake className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">Built to Last</h3>
                <p className="text-slate-600">
                  Enterprise-grade infrastructure, not a weekend project. Your professional
                  reputation is on the line when you share a Fanflet.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-primary text-white py-20 sm:py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to see what Fanflet can do?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Join professional speakers who are building lasting relationships with their audiences.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="flex items-center gap-2 bg-white text-primary px-8 py-4 rounded-full text-lg font-bold hover:bg-slate-100 transition-colors shadow-xl"
            >
              Get Started for Free <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/demo"
              className="text-white font-semibold px-8 py-4 hover:text-cyan-300 transition-colors"
            >
              See a Live Demo
            </Link>
          </div>
          <p className="mt-6 text-sm text-blue-200">No credit card required</p>
        </div>
      </div>
    </div>
  );
}
