import Link from "next/link";
import Image from "next/image";
import { ArrowRight, QrCode, Zap, Smartphone, CheckCircle2 } from "lucide-react";

export default function MarketingHome() {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="Fanflet Logo" width={40} height={40} className="w-10 h-10" />
              <span className="text-2xl font-bold tracking-tight text-primary">Fanflet</span>
            </div>
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
              <Link href="#features" className="hover:text-primary transition-colors">Features</Link>
              <Link href="#benefits" className="hover:text-primary transition-colors">For Speakers</Link>
              <Link href="#sponsors" className="hover:text-primary transition-colors">For Sponsors</Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-primary hidden sm:block">Log in</Link>
              <Link href="/signup" className="bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

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

      {/* CTA Section */}
      <div className="bg-primary text-white py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-secondary/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">Ready to upgrade your next talk?</h2>
          <p className="text-xl text-blue-100 mb-10">Join professional speakers who are building lasting relationships with their audiences.</p>
          <Link href="/signup" className="bg-white text-primary px-8 py-4 rounded-full text-lg font-bold hover:bg-slate-100 transition-colors inline-block">
            Get Started for Free
          </Link>
          <p className="mt-6 text-sm text-blue-200">No credit card required • Free tier forever</p>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <Image src="/logo.png" alt="Fanflet Logo" width={24} height={24} className="w-6 h-6" />
              <span className="text-lg font-bold text-white">Fanflet</span>
            </div>
            <p className="text-sm max-w-xs">
              Empowering speakers to turn one-time presentations into lifelong audience relationships.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white">Features</Link></li>
              <li><Link href="#" className="hover:text-white">Pricing</Link></li>
              <li><Link href="#" className="hover:text-white">Showcase</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white">About</Link></li>
              <li><Link href="#" className="hover:text-white">Blog</Link></li>
              <li><Link href="#" className="hover:text-white">Contact</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-slate-800 text-xs text-center">
          © 2026 Fanflet Inc. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
