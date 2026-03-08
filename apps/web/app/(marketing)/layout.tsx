import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Fanflet",
      url: "https://fanflet.com",
      logo: "https://fanflet.com/logo.png",
      description:
        "Digital resource platform for professional speakers. Attendees scan a QR code and get instant access to curated resources.",
      contactPoint: {
        "@type": "ContactPoint",
        email: "support@fanflet.com",
        contactType: "customer support",
        url: "https://fanflet.com/contact",
      },
    },
    {
      "@type": "SoftwareApplication",
      name: "Fanflet",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://fanflet.com",
      description:
        "The professional way to share resources, capture leads, and deliver sponsor ROI. One QR code. Zero friction.",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Pro free during Early Access",
        url: "https://fanflet.com/pricing",
      },
    },
  ],
};

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MarketingNavbar />
      {children}
      <MarketingFooter />
    </>
  );
}
