import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { Toaster } from "sonner";
import { cookies } from "next/headers";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Fanflet - Turn Event Talks into Lasting Engagement",
    template: "%s | Fanflet",
  },
  description: "The professional way to share resources, capture leads, and dazzle sponsors. One QR code. Zero friction. Lifelong fans.",
  icons: {
    icon: [
      { url: "/favicon.ico?v=20260215", sizes: "32x32" },
      { url: "/icon.png?v=20260215", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png?v=20260215", sizes: "180x180", type: "image/png" }],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const impersonationRaw = cookieStore.get("impersonation_display")?.value;
  let impersonation: {
    targetName: string;
    targetEmail: string;
    targetRole: "speaker" | "sponsor";
    writeEnabled: boolean;
    expiresAt: string;
  } | null = null;

  if (impersonationRaw) {
    try {
      const parsed = JSON.parse(impersonationRaw);
      if (new Date(parsed.expiresAt) > new Date()) {
        impersonation = parsed;
      }
    } catch {
      // Ignore malformed cookie
    }
  }

  const adminUrl =
    process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

  return (
    <html lang="en" suppressHydrationWarning>
      {GTM_ID && (
        <Script id="gtm-head" strategy="beforeInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
        </Script>
      )}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        {impersonation && (
          <ImpersonationBanner
            targetName={impersonation.targetName}
            targetEmail={impersonation.targetEmail}
            targetRole={impersonation.targetRole}
            writeEnabled={impersonation.writeEnabled}
            expiresAt={impersonation.expiresAt}
            adminUrl={adminUrl}
          />
        )}
        {impersonation ? (
          <div style={{ paddingTop: "40px" }}>{children}</div>
        ) : (
          children
        )}
        <Toaster position="top-right" richColors />
        <Analytics />
      </body>
    </html>
  );
}
