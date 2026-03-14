import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { cookies, headers } from "next/headers";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { CookieConsent } from "@/components/cookie-consent";
import { Analytics } from "@vercel/analytics/next";
import { getImpersonationDisplayBySessionId } from "@/lib/impersonation-session";
import "./globals.css";

const IMP_SESSION_HEADER = "x-impersonation-session-id";

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
  const headersList = await headers();
  const impSessionId = headersList.get(IMP_SESSION_HEADER);

  let impersonation: {
    targetName: string;
    targetEmail: string;
    targetRole: "speaker" | "sponsor";
    writeEnabled: boolean;
    expiresAt: string;
    sessionId?: string;
  } | null = null;

  if (impSessionId) {
    const display = await getImpersonationDisplayBySessionId(impSessionId);
    if (display) {
      impersonation = {
        targetName: display.targetName,
        targetEmail: display.targetEmail,
        targetRole: display.targetRole,
        writeEnabled: display.writeEnabled,
        expiresAt: display.expiresAt,
        sessionId: display.sessionId,
      };
    }
  }

  if (!impersonation) {
    const cookieStore = await cookies();
    const impersonationRaw = cookieStore.get("impersonation_display")?.value;
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
  }

  const adminUrl =
    process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
        style={{
          "--banner-height": impersonation ? "40px" : "0px",
        } as React.CSSProperties}
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
            impSessionId={"sessionId" in impersonation ? impersonation.sessionId : undefined}
          />
        )}
        <div style={{ paddingTop: "var(--banner-height)" }}>{children}</div>
        <Toaster position="top-right" richColors />
        <Analytics />
      </body>
    </html>
  );
}
