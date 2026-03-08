import Link from "next/link";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPageLayout({ title, lastUpdated, children }: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-white py-16 sm:py-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 mb-2">
          {title}
        </h1>
        <p className="text-sm text-slate-500 mb-12">
          Last updated: {lastUpdated}
        </p>

        <div
          className={[
            "legal-prose prose prose-slate max-w-none",
            "prose-headings:tracking-tight prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
            "prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-4 prose-h2:font-bold prose-h2:pb-2 prose-h2:border-b prose-h2:border-slate-200 [&>h2:first-of-type]:mt-6",
            "prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-2 prose-h3:font-semibold prose-h3:pl-4 prose-h3:border-l-4 prose-h3:border-primary/40",
            "prose-h4:text-lg prose-h4:mt-6 prose-h4:mb-2 prose-h4:font-semibold prose-h4:pl-6",
            "prose-p:leading-relaxed prose-p:my-4",
            "prose-ul:my-4 prose-ul:pl-6 prose-li:my-1",
            "prose-ol:my-4 prose-ol:pl-6",
            "prose-table:my-6 prose-th:bg-slate-100 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-td:px-4 prose-td:py-2 prose-td:border-b prose-td:border-slate-100",
            "prose-blockquote:border-primary/30 prose-blockquote:bg-slate-50 prose-blockquote:py-1 prose-blockquote:px-4",
          ].join(" ")}
        >
          {children}
        </div>

        <div className="mt-16 pt-8 border-t border-slate-200">
          <p className="text-sm text-slate-500">
            Questions about this policy?{" "}
            <Link href="/contact" className="text-primary hover:underline">
              Contact us
            </Link>{" "}
            or email{" "}
            <a href="mailto:support@fanflet.com" className="text-primary hover:underline">
              support@fanflet.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
