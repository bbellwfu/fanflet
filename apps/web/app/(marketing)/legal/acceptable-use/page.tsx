import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/marketing/legal-page-layout";
import { loadLegalMarkdown } from "@/lib/legal-markdown";

export const metadata: Metadata = {
  title: "Acceptable Use Policy — Fanflet",
  description:
    "Fanflet Acceptable Use Policy. Content standards, prohibited conduct, and enforcement procedures for all users of the platform.",
  openGraph: {
    title: "Acceptable Use Policy — Fanflet",
    description:
      "Fanflet Acceptable Use Policy. Content standards, prohibited conduct, and enforcement procedures for all users of the platform.",
  },
};

export default async function AcceptableUsePage() {
  const html = await loadLegalMarkdown("ACCEPTABLE_USE_POLICY.md");

  return (
    <LegalPageLayout title="Acceptable Use Policy" lastUpdated="March 9, 2026">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </LegalPageLayout>
  );
}
