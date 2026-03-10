import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { cookies } from "next/headers";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { CookieConsent } from "@/components/cookie-consent";
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        <CookieConsent gtmId={GTM_ID} />
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
