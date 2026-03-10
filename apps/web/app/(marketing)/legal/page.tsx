import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Shield, AlertTriangle, Scale } from "lucide-react";

export const metadata: Metadata = {
  title: "Legal — Fanflet",
  description:
    "Fanflet legal documents including Terms of Service, Privacy Policy, Acceptable Use Policy, and more.",
  openGraph: {
    title: "Legal — Fanflet",
    description:
      "Fanflet legal documents including Terms of Service, Privacy Policy, Acceptable Use Policy, and more.",
  },
};

const legalDocs = [
  {
    title: "Terms of Service",
    description:
      "The agreement governing your use of the Fanflet platform, including account terms, data rights, billing, and dispute resolution.",
    href: "/terms",
    icon: FileText,
    updated: "March 10, 2026",
  },
  {
    title: "Privacy Policy",
    description:
      "How Fanflet collects, uses, stores, and protects your personal information. Includes information about your data rights.",
    href: "/privacy",
    icon: Shield,
    updated: "March 10, 2026",
  },
  {
    title: "Acceptable Use Policy",
    description:
      "Content standards, prohibited conduct, file upload rules, and enforcement procedures for all users of the platform.",
    href: "/legal/acceptable-use",
    icon: AlertTriangle,
    updated: "March 9, 2026",
  },
  {
    title: "Data Processing Agreement",
    description:
      "A Data Processing Agreement for speakers collecting subscriber data will be available in a future update as part of Fanflet's international expansion.",
    href: "/legal/dpa",
    icon: Scale,
    updated: "Planned",
  },
];

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-white py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-4">
          Legal
        </h1>
        <p className="text-lg text-slate-600 mb-12">
          The policies and agreements that govern your use of Fanflet. Questions?
          Contact us at{" "}
          <a
            href="mailto:legal@fanflet.com"
            className="text-primary hover:underline"
          >
            legal@fanflet.com
          </a>
          .
        </p>

        <div className="space-y-6">
          {legalDocs.map((doc) => {
            const Icon = doc.icon;
            const isComingSoon = doc.updated === "Coming soon" || doc.updated === "Planned";

            return isComingSoon ? (
              <div
                key={doc.title}
                className="block border border-slate-200 rounded-xl p-6 opacity-60"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-1">
                      {doc.title}
                    </h2>
                    <p className="text-slate-600 text-sm mb-2">
                      {doc.description}
                    </p>
                    <p className="text-xs text-slate-400">{doc.updated}</p>
                  </div>
                </div>
              </div>
            ) : (
              <Link
                key={doc.title}
                href={doc.href}
                className="block border border-slate-200 rounded-xl p-6 hover:border-primary/30 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-primary shrink-0 mt-0.5">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-1">
                      {doc.title}
                    </h2>
                    <p className="text-slate-600 text-sm mb-2">
                      {doc.description}
                    </p>
                    <p className="text-xs text-slate-400">
                      Last updated: {doc.updated}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="mt-16 pt-8 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            For general questions, reach us at{" "}
            <a
              href="mailto:support@fanflet.com"
              className="text-primary hover:underline"
            >
              support@fanflet.com
            </a>
            . For privacy-specific inquiries, contact{" "}
            <a
              href="mailto:privacy@fanflet.com"
              className="text-primary hover:underline"
            >
              privacy@fanflet.com
            </a>
            . To report content violations, email{" "}
            <a
              href="mailto:abuse@fanflet.com"
              className="text-primary hover:underline"
            >
              abuse@fanflet.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
