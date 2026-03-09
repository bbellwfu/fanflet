import Script from "next/script";
import { MarketingNavbar } from "@/components/marketing/navbar";
import { MarketingFooter } from "@/components/marketing/footer";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

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
      {GA_MEASUREMENT_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');
            `}
          </Script>
        </>
      )}
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
