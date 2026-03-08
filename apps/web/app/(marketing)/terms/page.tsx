import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/marketing/legal-page-layout";
import { loadLegalMarkdown } from "@/lib/legal-markdown";

export const metadata: Metadata = {
  title: "Terms of Service — Fanflet",
  description:
    "Fanflet Terms of Service. Read our terms governing use of the Fanflet platform for speakers, sponsors, and audience members.",
  openGraph: {
    title: "Terms of Service — Fanflet",
    description:
      "Fanflet Terms of Service. Read our terms governing use of the Fanflet platform for speakers, sponsors, and audience members.",
  },
};

export default async function TermsPage() {
  const html = await loadLegalMarkdown("TERMS_OF_SERVICE.md");

  return (
    <LegalPageLayout title="Terms of Service" lastUpdated="March 8, 2026">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </LegalPageLayout>
  );
}
