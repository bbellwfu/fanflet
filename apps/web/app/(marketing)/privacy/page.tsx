import type { Metadata } from "next";
import { LegalPageLayout } from "@/components/marketing/legal-page-layout";
import { loadLegalMarkdown } from "@/lib/legal-markdown";

export const metadata: Metadata = {
  title: "Privacy Policy — Fanflet",
  description:
    "Fanflet Privacy Policy. Learn how we collect, use, and protect your information when you use the Fanflet platform.",
  openGraph: {
    title: "Privacy Policy — Fanflet",
    description:
      "Fanflet Privacy Policy. Learn how we collect, use, and protect your information when you use the Fanflet platform.",
  },
};

export default async function PrivacyPage() {
  const html = await loadLegalMarkdown("PRIVACY_POLICY.md");

  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated="March 10, 2026">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </LegalPageLayout>
  );
}
