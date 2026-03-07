/**
 * Subscriber confirmation email: sends a confirmation email with a link
 * to the fanflet when someone subscribes. Uses Resend; gracefully no-ops
 * if RESEND_API_KEY is not set.
 * Server-only — do not import in client code.
 */

import { Resend } from "resend";
import { getSiteUrl } from "@fanflet/db";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export interface ConfirmationEmailConfig {
  enabled: boolean;
  subject: string | null;
  body: string | null;
}

export interface ConfirmationEmailData {
  speakerName: string;
  speakerPhotoUrl: string | null;
  fanfletTitle: string;
  fanfletUrl: string;
  subscriberEmail: string;
  customSubject: string | null;
  customBody: string | null;
}

// -----------------------------------------------------------------------------
// Config resolution
// -----------------------------------------------------------------------------

/**
 * Resolve the confirmation email config for a fanflet, falling back to
 * speaker defaults. Returns enabled=true if neither fanflet nor speaker
 * has explicit settings.
 */
export function getConfirmationEmailConfig(
  fanflet: { confirmation_email_config: unknown },
  speaker: { social_links: unknown }
): ConfirmationEmailConfig {
  // Check fanflet-level override first
  const fanfletConfig = fanflet.confirmation_email_config as {
    enabled?: boolean;
    subject?: string;
    body?: string;
  } | null;

  if (fanfletConfig && typeof fanfletConfig.enabled === "boolean") {
    return {
      enabled: fanfletConfig.enabled,
      subject: fanfletConfig.subject ?? null,
      body: fanfletConfig.body ?? null,
    };
  }

  // Fall back to speaker default
  const speakerLinks = speaker.social_links as {
    confirmation_email?: {
      enabled?: boolean;
      subject?: string;
      body?: string;
    };
  } | null;

  const speakerConfig = speakerLinks?.confirmation_email;

  return {
    enabled: speakerConfig?.enabled ?? true, // Default: enabled
    subject: speakerConfig?.subject ?? null,
    body: speakerConfig?.body ?? null,
  };
}

// -----------------------------------------------------------------------------
// Default templates
// -----------------------------------------------------------------------------

const DEFAULT_SUBJECT = "Resources from {{speaker_name}}: {{fanflet_title}}";

const DEFAULT_BODY = `Hi there,

Thanks for signing up to get resources from {{speaker_name}}.

You can access "{{fanflet_title}}" anytime at the link below.

See you there!`;

// -----------------------------------------------------------------------------
// Token replacement
// -----------------------------------------------------------------------------

function replaceTokens(template: string, data: ConfirmationEmailData): string {
  return template
    .replace(/\{\{speaker_name\}\}/g, data.speakerName)
    .replace(/\{\{fanflet_title\}\}/g, data.fanfletTitle)
    .replace(/\{\{subscriber_email\}\}/g, data.subscriberEmail);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// -----------------------------------------------------------------------------
// HTML builder
// -----------------------------------------------------------------------------

function buildEmailHtml(data: ConfirmationEmailData): string {
  const body = replaceTokens(data.customBody || DEFAULT_BODY, data);
  const bodyHtml = body
    .split("\n")
    .map((line) => (line.trim() ? `<p style="margin: 0 0 16px 0;">${escapeHtml(line)}</p>` : ""))
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
             line-height: 1.6; color: #1B365D; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
  
  ${
    data.speakerPhotoUrl
      ? `
  <img src="${escapeHtml(data.speakerPhotoUrl)}" 
       alt="${escapeHtml(data.speakerName)}" 
       style="width: 64px; height: 64px; border-radius: 50%; margin-bottom: 24px; object-fit: cover;">
  `
      : ""
  }
  
  ${bodyHtml}
  
  <a href="${escapeHtml(data.fanfletUrl)}" 
     style="display: inline-block; background: #1B365D; color: white; 
            padding: 12px 24px; border-radius: 6px; text-decoration: none; 
            font-weight: 500; margin: 16px 0;">
    View Resources
  </a>
  
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;">
  
  <p style="font-size: 12px; color: #64748b; margin: 0;">
    You received this email because you subscribed via 
    <a href="${escapeHtml(data.fanfletUrl)}" style="color: #3BA5D9;">${escapeHtml(data.fanfletTitle)}</a>.
    <br>Sent via Fanflet
  </p>
</body>
</html>`.trim();
}

// -----------------------------------------------------------------------------
// Resend client
// -----------------------------------------------------------------------------

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key?.trim()) return null;
  return new Resend(key);
}

function getFromAddress(): string {
  return process.env.RESEND_FROM ?? "Fanflet <noreply@fanflet.com>";
}

// -----------------------------------------------------------------------------
// Send email
// -----------------------------------------------------------------------------

/**
 * Send a confirmation email to a subscriber. Fire-and-forget: does not throw;
 * logs errors and returns silently on missing config or failures.
 */
export async function sendConfirmationEmail(data: ConfirmationEmailData): Promise<void> {
  // #region agent log
  console.error(`[DEBUG-e3217b] sendConfirmationEmail: ENTERED`, { fanfletUrl: data.fanfletUrl, hasResendKey: !!process.env.RESEND_API_KEY, resendKeyLength: process.env.RESEND_API_KEY?.length ?? 0, fromAddress: getFromAddress(), nodeEnv: process.env.NODE_ENV });
  // #endregion
  try {
    const resend = getResendClient();
    if (!resend) {
      // #region agent log
      console.error(`[DEBUG-e3217b] sendConfirmationEmail: NO RESEND CLIENT — key missing or empty`);
      // #endregion
      if (process.env.NODE_ENV === "development") {
        console.log("[subscriber-confirmation] RESEND_API_KEY not set; skipping email");
        console.log("[subscriber-confirmation] Would send to:", data.subscriberEmail);
        console.log("[subscriber-confirmation] Fanflet URL:", data.fanfletUrl);
      }
      return;
    }

    const subject = replaceTokens(data.customSubject || DEFAULT_SUBJECT, data);
    const html = buildEmailHtml(data);
    const from = getFromAddress();

    // #region agent log
    console.error(`[DEBUG-e3217b] sendConfirmationEmail: about to call resend.emails.send`, { from, subject });
    // #endregion

    const { error, data: sendResult } = await resend.emails.send({
      from,
      to: data.subscriberEmail,
      subject,
      html,
    });

    // #region agent log
    console.error(`[DEBUG-e3217b] sendConfirmationEmail: Resend response`, { error: error ?? null, sendResultId: sendResult?.id ?? null });
    // #endregion

    if (error) {
      console.error("[subscriber-confirmation] Resend error:", error);
    }
  } catch (err) {
    console.error("[subscriber-confirmation] Failed to send:", err);
  }
}

// -----------------------------------------------------------------------------
// High-level helper for subscribe action
// -----------------------------------------------------------------------------

export interface SendConfirmationParams {
  fanfletId: string;
  speakerId: string;
  subscriberEmail: string;
  fanflet: {
    title: string;
    slug: string;
    confirmation_email_config: unknown;
  };
  speaker: {
    name: string | null;
    photo_url: string | null;
    slug: string;
    social_links: unknown;
  };
}

/**
 * Orchestrates sending a confirmation email for a new subscriber.
 * Checks config to see if emails are enabled, builds the URL, and sends.
 */
export async function sendSubscriberConfirmation(params: SendConfirmationParams): Promise<void> {
  const { fanflet, speaker, subscriberEmail } = params;

  // #region agent log
  console.error(`[DEBUG-e3217b] sendSubscriberConfirmation: ENTERED`, { fanfletTitle: fanflet.title, speakerSlug: speaker.slug, email: '***' });
  // #endregion

  const config = getConfirmationEmailConfig(fanflet, speaker);
  // #region agent log
  console.error(`[DEBUG-e3217b] sendSubscriberConfirmation: config resolved`, { enabled: config.enabled, hasSubject: !!config.subject, hasBody: !!config.body });
  // #endregion
  if (!config.enabled) {
    return;
  }

  const siteUrl = getSiteUrl();
  const fanfletUrl = `${siteUrl}/${speaker.slug}/${fanflet.slug}`;

  await sendConfirmationEmail({
    speakerName: speaker.name || "the speaker",
    speakerPhotoUrl: speaker.photo_url,
    fanfletTitle: fanflet.title,
    fanfletUrl,
    subscriberEmail,
    customSubject: config.subject,
    customBody: config.body,
  });
}
