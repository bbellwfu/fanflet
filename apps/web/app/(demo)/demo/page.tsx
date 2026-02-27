import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  Download,
  ExternalLink,
  Mail,
  Linkedin,
  Globe,
  ChevronRight,
  Smartphone,
} from "lucide-react";

export const metadata = {
  title: "Demo | Fanflet",
  description:
    "See how a Fanflet looks to your audience — dental CE resources, downloads, and sponsor content.",
};

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50">
      {/* Demo Banner */}
      <div className="bg-[#1B365D] text-white text-center py-2.5 px-4 text-sm font-medium sticky top-0 z-50">
        Demo — See how a Fanflet looks to your audience.{" "}
        <Link
          href="/"
          className="underline font-semibold hover:text-white/90"
        >
          Back to Fanflet
        </Link>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#1B365D] via-[#1e3f6e] to-[#0f2440]" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#3BA5D9]/15 rounded-full blur-3xl -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#3BA5D9]/10 rounded-full blur-3xl -ml-16 -mb-16" />

        <div className="relative z-10 px-5 sm:px-8 pt-10 sm:pt-12 pb-16 max-w-lg md:max-w-2xl mx-auto">
          {/* Event badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-sm font-semibold text-blue-200 border border-white/15">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Southwest Dental Conference 2026
            </div>
          </div>

          {/* Speaker info */}
          <div className="flex items-start gap-5 mb-6">
            <Avatar className="w-20 h-20 sm:w-24 sm:h-24 ring-[3px] ring-white/30 ring-offset-2 ring-offset-transparent shadow-xl shrink-0">
              <AvatarImage
                src="/placeholder-speaker.jpg"
                alt="Dr. Sarah Mitchell, DDS"
                className="object-cover"
              />
              <AvatarFallback className="text-xl font-bold bg-slate-700 text-white">
                SM
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 pt-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight">
                Dr. Sarah Mitchell, DDS
              </h1>
              <p className="text-sm sm:text-base font-medium mt-1 leading-relaxed text-blue-200/90">
                Restorative &amp; Digital Dentistry Specialist
              </p>
              <div className="flex items-center gap-2.5 mt-3">
                <a
                  href="#"
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-blue-200 hover:text-white transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-blue-200 hover:text-white transition-colors"
                  aria-label="Website"
                >
                  <Globe className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Talk title + description */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-5 sm:px-6 py-5">
            <p className="text-xs uppercase tracking-widest font-semibold mb-2 text-[#7db0d4]">
              Presentation
            </p>
            <h2 className="text-xl sm:text-2xl font-semibold text-white leading-snug">
              Predictable Posterior Composites: Simplifying Direct Restorations
            </h2>
            <p className="text-sm sm:text-base mt-2 leading-relaxed text-blue-200/90">
              A step-by-step clinical workflow for faster, more predictable Class II composites — with hands-on tips you can use Monday morning.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg md:max-w-2xl mx-auto px-4 sm:px-8 -mt-5 space-y-6 relative z-10 pb-16">
        {/* Subscribe Card */}
        <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#3BA5D9] to-[#1B365D] flex items-center justify-center">
                <Mail className="h-4 w-4 text-white" />
              </div>
              Stay Connected
            </CardTitle>
            <CardDescription className="text-sm">
              Get the slides and future updates from this speaker.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="flex gap-2">
              <Input
                placeholder="your@email.com"
                className="bg-slate-50 border-slate-200 text-sm h-10"
              />
              <Button className="bg-[#1B365D] hover:bg-[#0f2440] text-white shrink-0 h-10 px-5 font-semibold text-sm">
                Subscribe
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Join 380+ subscribers. No spam, ever.
            </p>
          </CardContent>
        </Card>

        {/* SMS Bookmark */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-slate-900 to-[#1B365D] text-white">
          <CardContent className="py-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[#3BA5D9]/20 flex items-center justify-center shrink-0 mt-0.5">
                <Smartphone className="h-4 w-4 text-[#3BA5D9]" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Bookmark this page</h3>
                <p className="text-[12px] text-slate-300 mt-0.5">
                  We&apos;ll text you a link so you can find it later.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="(555) 123-4567"
                className="bg-white/10 border-white/15 text-white placeholder:text-slate-400 text-sm h-10 focus-visible:ring-[#3BA5D9]"
              />
              <Button className="bg-[#3BA5D9] hover:bg-[#2d8fbd] text-white shrink-0 h-10 px-5 font-semibold text-sm">
                Send
              </Button>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              Standard messaging rates apply. One text, no follow-ups.
            </p>
          </CardContent>
        </Card>

        {/* Resources Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1">
            Resources
          </h3>

          {/* File: Presentation Slides */}
          <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group border-slate-200/80 hover:border-slate-300">
            <div className="p-4 sm:p-5 flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#1B365D] group-hover:bg-[#1B365D] group-hover:text-white transition-colors shrink-0">
                <Download className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-900">
                  Presentation Slides
                </h4>
                <p className="text-sm text-slate-400">PDF &middot; 6.8 MB</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#3BA5D9] transition-colors" />
            </div>
          </Card>

          {/* Link: CE Credit Info */}
          <a href="#" className="block">
            <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group border-slate-200/80 hover:border-purple-300/40">
              <div className="p-4 sm:p-5 flex items-center gap-4">
                <div className="h-12 w-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900">
                    Claim Your CE Credits
                  </h4>
                  <p className="text-sm text-slate-400">
                    1.5 hours CE &middot; AGD-approved
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 transition-colors" />
              </div>
            </Card>
          </a>

          {/* File: Clinical Protocol */}
          <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group border-slate-200/80 hover:border-slate-300">
            <div className="p-4 sm:p-5 flex items-center gap-4">
              <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-[#1B365D] group-hover:bg-[#1B365D] group-hover:text-white transition-colors shrink-0">
                <Download className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-900">
                  Clinical Protocol: Class II Composite Workflow
                </h4>
                <p className="text-sm text-slate-400">PDF &middot; 1.2 MB</p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#3BA5D9] transition-colors" />
            </div>
          </Card>

          {/* Link: Product Recommendations */}
          <a href="#" className="block">
            <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group border-slate-200/80 hover:border-purple-300/40">
              <div className="p-4 sm:p-5 flex items-center gap-4">
                <div className="h-12 w-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                  <ExternalLink className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900">
                    My Recommended Materials &amp; Instruments
                  </h4>
                  <p className="text-sm text-slate-400">
                    Curated product list with purchase links
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-purple-500 transition-colors" />
              </div>
            </Card>
          </a>
        </div>

        {/* Text Block Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1">
            About Dr. Mitchell
          </h3>

          <div className="rounded-xl border border-slate-200/80 bg-white p-5">
            <h4 className="font-semibold text-slate-900 mb-1">
              A Note from Dr. Mitchell
            </h4>
            <p className="text-sm sm:text-base text-slate-500 whitespace-pre-wrap leading-relaxed">
              Thank you for attending my session today! I hope you found the clinical tips practical and actionable. If you have questions about the protocol or want to discuss cases, feel free to connect with me on LinkedIn.{"\n\n"}I&apos;ll also be at the Hands-On Workshop tomorrow at 2 PM in Room 204 if you want to practice the technique live.
            </p>
          </div>
        </div>

        {/* Sponsor Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">
              Featured Partner
            </span>
            <Separator className="flex-1" />
          </div>

          <Card className="bg-slate-900 text-white overflow-hidden border-0 shadow-lg">
            <div className="p-6 text-center space-y-4">
              <h3 className="text-2xl font-black tracking-tighter">
                Apex<span className="text-[#3BA5D9]">Dental</span>
              </h3>
              <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-md mx-auto">
                Next-generation composite systems engineered for predictable posterior restorations. Conference attendees get 15% off your first order.
              </p>
              <Button className="w-full bg-[#3BA5D9] hover:bg-[#2d8fbd] text-white font-semibold text-base h-11">
                Shop Now — 15% Off
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Referral CTA Footer */}
      <div className="border-t border-slate-200/60 bg-slate-50/80 px-6 py-10 text-center">
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <Image
            src="/logo.png"
            alt="Fanflet"
            width={32}
            height={32}
            className="w-8 h-8"
          />
          <span className="text-lg font-bold tracking-tight text-[#1B365D]">
            Fanflet
          </span>
        </div>
        <p className="text-base font-medium text-slate-700 mb-1">
          Engage your audience after every talk.
        </p>
        <p className="text-sm text-slate-500 mb-5">
          Share resources. Capture leads. Delight sponsors.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 rounded-lg bg-[#1B365D] px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#152b4d] transition-colors"
        >
          Get your free Fanflet
          <ChevronRight className="w-4 h-4" />
        </Link>
        <div className="flex justify-center gap-4 mt-6 text-xs text-slate-400">
          <Link href="#" className="hover:text-slate-600 transition-colors">
            Privacy
          </Link>
          <Link href="#" className="hover:text-slate-600 transition-colors">
            Terms
          </Link>
        </div>
      </div>
    </div>
  );
}
