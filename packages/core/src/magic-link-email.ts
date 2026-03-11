/**
 * Branded email templates for magic link and password recovery emails.
 * Shared across web and admin apps.
 */

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface MagicLinkEmailParams {
  /** The magic link URL the user clicks. */
  linkUrl: string;
  /** Main heading text. */
  heading: string;
  /** Body paragraph(s) above the CTA button. */
  bodyText: string;
  /** CTA button label. */
  ctaLabel: string;
  /** Optional footer note (e.g., "This link expires in 1 hour."). */
  expiryNote?: string;
}

/* ------------------------------------------------------------------ */
/*  Template                                                           */
/* ------------------------------------------------------------------ */

export function renderMagicLinkEmail({
  linkUrl,
  heading,
  bodyText,
  ctaLabel,
  expiryNote = "This link expires in 1 hour. If you didn\u2019t request this, you can safely ignore this email.",
}: MagicLinkEmailParams): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(heading)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="background:#ffffff;border-radius:8px;overflow:hidden;">
      <!-- Header -->
      <div style="background:#1B365D;padding:24px 32px;">
        <div style="margin-bottom:16px;">
          <img src="https://fanflet.com/logo.png" alt="Fanflet" width="32" height="32" style="display:inline-block;vertical-align:middle;border-radius:6px;" />
          <span style="display:inline-block;vertical-align:middle;color:#ffffff;font-size:18px;font-weight:600;margin-left:10px;letter-spacing:-0.2px;">Fanflet</span>
        </div>
        <h1 style="color:#ffffff;font-size:20px;font-weight:600;margin:0;">${escapeHtml(heading)}</h1>
      </div>
      <!-- Body -->
      <div style="padding:32px;color:#334155;font-size:15px;line-height:1.6;">
        <p style="margin:0 0 24px;">${escapeHtml(bodyText)}</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${escapeHtml(linkUrl)}" style="display:inline-block;background:#1B365D;color:#ffffff;padding:14px 32px;border-radius:6px;text-decoration:none;font-size:15px;font-weight:600;letter-spacing:-0.1px;">${escapeHtml(ctaLabel)}</a>
        </div>
        <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.5;">${escapeHtml(expiryNote)}</p>
        <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">
          If the button doesn't work, copy and paste this link: ${escapeHtml(linkUrl)}
        </p>
      </div>
      <!-- Footer -->
      <div style="padding:20px 32px;border-top:1px solid #e2e8f0;text-align:center;">
        <p style="color:#94a3b8;font-size:12px;margin:0;">Sent by Fanflet &bull; <a href="https://fanflet.com" style="color:#94a3b8;text-decoration:underline;">fanflet.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/* ------------------------------------------------------------------ */
/*  Pre-built email builders                                           */
/* ------------------------------------------------------------------ */

export function buildDemoSignInEmail(
  linkUrl: string,
  portalType: "speaker" | "sponsor",
  companyOrName: string,
): string {
  const portalLabel = portalType === "sponsor" ? "Sponsor Portal" : "Speaker Dashboard";
  return renderMagicLinkEmail({
    linkUrl,
    heading: `Sign in to your ${portalLabel} demo`,
    bodyText: `You've been invited to explore a personalized ${portalLabel} demo on Fanflet, set up for ${companyOrName}. Click below to sign in — no password needed.`,
    ctaLabel: `Sign In to ${portalLabel}`,
  });
}

export function buildPasswordResetEmail(linkUrl: string): string {
  return renderMagicLinkEmail({
    linkUrl,
    heading: "Reset your password",
    bodyText: "We received a request to reset your Fanflet password. Click the button below to set a new password.",
    ctaLabel: "Reset Password",
  });
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
