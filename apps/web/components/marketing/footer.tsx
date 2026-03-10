import Link from "next/link";
import Image from "next/image";

export function MarketingFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid sm:grid-cols-2 md:grid-cols-4 gap-8">
        <div className="sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/">
              <Image src="/logo.png" alt="Fanflet Logo" width={24} height={24} className="w-6 h-6" />
            </Link>
            <span className="text-lg font-bold text-white">Fanflet</span>
          </div>
          <p className="text-sm max-w-xs">
            Empowering speakers to turn one-time presentations into lifelong audience relationships.
          </p>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Product</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/#features" className="hover:text-white transition-colors">
                Features
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="hover:text-white transition-colors">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/demo" className="hover:text-white transition-colors">
                Demo
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Company</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/about" className="hover:text-white transition-colors">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-white transition-colors">
                Contact
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="text-white font-semibold mb-4">Legal</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="/legal/acceptable-use" className="hover:text-white transition-colors">
                Acceptable Use
              </Link>
            </li>
            <li>
              <Link href="/legal" className="hover:text-white transition-colors">
                All Policies
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-slate-800 text-xs text-center flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
        <span>&copy; {new Date().getFullYear()} Fanflet, LLC. All rights reserved.</span>
        <span className="hidden sm:inline text-slate-700">&middot;</span>
        <div className="flex items-center gap-4">
          <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
