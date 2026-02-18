import Link from "next/link";
import Image from "next/image";

export function MarketingNavbar() {
  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-2">
            <Link href="/">
              <Image src="/logo.png" alt="Fanflet Logo" width={40} height={40} className="w-10 h-10" />
            </Link>
            <Link href="/" className="text-2xl font-bold tracking-tight text-primary">
              Fanflet
            </Link>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link href="/#features" className="hover:text-primary transition-colors">
              Features
            </Link>
            <Link href="/pricing" className="hover:text-primary transition-colors">
              Pricing
            </Link>
            <Link href="/#benefits" className="hover:text-primary transition-colors">
              For Speakers
            </Link>
            <Link href="/#sponsors" className="hover:text-primary transition-colors">
              For Sponsors
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-primary hidden sm:block"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="bg-primary text-white px-4 py-2 rounded-full text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
