import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Download, ExternalLink, Mail, Linkedin, Twitter, Globe, ChevronRight, Sparkles, Smartphone } from "lucide-react";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-50">
      {/* Header / Hero — mobile-first, clean & engaging */}
      <div className="relative overflow-hidden">
        {/* Background gradient with brand feel */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1B365D] via-[#1e3f6e] to-[#0f2440]"></div>
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#3BA5D9]/15 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-[#3BA5D9]/10 rounded-full blur-3xl -ml-16 -mb-16"></div>

        <div className="relative z-10 px-5 pt-10 pb-14 max-w-lg mx-auto">
          {/* Event badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-semibold text-blue-200 border border-white/15">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              HealthTech Summit 2026
            </div>
          </div>

          {/* Speaker info — horizontal layout for space efficiency */}
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-20 h-20 ring-[3px] ring-white/30 ring-offset-2 ring-offset-transparent shadow-xl shrink-0">
              <AvatarImage src="/placeholder-speaker.jpg" alt="Jane Duncan" className="object-cover" />
              <AvatarFallback className="text-lg font-bold bg-slate-700 text-white">JD</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">Jane Duncan</h1>
              <p className="text-blue-200/90 text-sm font-medium mt-0.5">Chief Product Officer, TechCorp</p>
              <div className="flex items-center gap-2 mt-2">
                <a href="#" className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-blue-200 hover:text-white transition-colors">
                  <Linkedin className="w-3.5 h-3.5" />
                </a>
                <a href="#" className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-blue-200 hover:text-white transition-colors">
                  <Twitter className="w-3.5 h-3.5" />
                </a>
                <a href="#" className="w-7 h-7 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-blue-200 hover:text-white transition-colors">
                  <Globe className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Talk title */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-4">
            <p className="text-[11px] uppercase tracking-widest text-blue-300/70 font-semibold mb-1.5">Presentation</p>
            <h2 className="text-lg font-semibold text-white leading-snug">
              The Future of Patient-Centric Design
            </h2>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-5 space-y-5 relative z-10 pb-16">
        {/* Subscribe Card (Primary CTA) */}
        <Card className="shadow-xl border-0 bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3BA5D9] to-[#1B365D] flex items-center justify-center">
                <Mail className="h-4 w-4 text-white" />
              </div>
              Stay Connected
            </CardTitle>
            <CardDescription className="text-[13px]">
              Get the slides and my monthly design newsletter.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-5">
            <div className="flex gap-2">
              <Input placeholder="your@email.com" className="bg-slate-50 border-slate-200 text-sm h-10" />
              <Button className="bg-[#1B365D] hover:bg-[#152b4d] text-white shrink-0 h-10 px-5 font-semibold text-sm">
                Subscribe
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Join 1,240+ subscribers. No spam, ever.
            </p>
          </CardContent>
        </Card>

        {/* Bookmark via SMS */}
        <Card className="shadow-lg border-0 bg-gradient-to-r from-slate-900 to-[#1B365D] text-white">
          <CardContent className="py-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-[#3BA5D9]/20 flex items-center justify-center shrink-0 mt-0.5">
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
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1">Resources</h3>

          {/* Slides Download */}
          <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group border-slate-200/80 hover:border-[#3BA5D9]/30">
            <div className="p-4 flex items-center gap-4">
              <div className="h-11 w-11 bg-blue-50 rounded-xl flex items-center justify-center text-[#1B365D] group-hover:bg-[#1B365D] group-hover:text-white transition-colors shrink-0">
                <Download className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-900 text-sm">Presentation Slides</h4>
                <p className="text-xs text-slate-400">PDF • 4.2 MB</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#3BA5D9] transition-colors" />
            </div>
          </Card>

          {/* External Link */}
          <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group border-slate-200/80 hover:border-purple-300/40">
            <div className="p-4 flex items-center gap-4">
              <div className="h-11 w-11 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors shrink-0">
                <ExternalLink className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-900 text-sm">Patient Journey Map Template</h4>
                <p className="text-xs text-slate-400">Figma Community File</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-500 transition-colors" />
            </div>
          </Card>

          {/* Bonus resource */}
          <Card className="overflow-hidden hover:shadow-lg transition-all cursor-pointer group border-slate-200/80 hover:border-emerald-300/40">
            <div className="p-4 flex items-center gap-4">
              <div className="h-11 w-11 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-slate-900 text-sm">Design System Starter Kit</h4>
                <p className="text-xs text-slate-400">Notion Template</p>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
            </div>
          </Card>
        </div>

        {/* Sponsors Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em]">Featured Partner</span>
            <Separator className="flex-1" />
          </div>

          <Card className="bg-slate-900 text-white overflow-hidden border-0 shadow-lg">
            <div className="p-5 text-center space-y-3">
              <div className="h-10 mx-auto flex items-center justify-center">
                <span className="text-xl font-black tracking-tighter">Acme<span className="text-[#3BA5D9]">Health</span></span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Leading the way in digital therapeutics. Exclusive demo for conference attendees.
              </p>
              <Button className="w-full bg-[#3BA5D9] hover:bg-[#2d8fbd] text-white font-semibold text-sm h-10">
                Request Demo
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center pb-8 px-4 border-t border-slate-200/60 pt-6">
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          Powered by <span className="font-bold text-[#1B365D] flex items-center gap-1">
            <Image src="/logo.png" alt="Fanflet Logo" width={14} height={14} className="w-3.5 h-3.5" />
            Fanflet
          </span>
        </p>
        <div className="flex justify-center gap-4 mt-3 text-[11px] text-slate-400">
          <a href="#" className="hover:text-[#1B365D] transition-colors">Create your own</a>
          <a href="#" className="hover:text-[#1B365D] transition-colors">Privacy</a>
          <a href="#" className="hover:text-[#1B365D] transition-colors">Terms</a>
        </div>
      </div>
    </div>
  );
}
