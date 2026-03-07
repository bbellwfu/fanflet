/**
 * Admin notification utility: send email to platform admins based on their
 * preferences. Uses Resend; gracefully no-ops if RESEND_API_KEY is not set.
 * Server-only — do not import in client code.
 */

import { createServiceClient } from "@fanflet/db/service";
import { Resend } from "resend";

export type AdminNotificationEvent =
  | "speaker_signup"
  | "sponsor_signup"
  | "fanflet_created"
  | "onboarding_completed";

export interface SpeakerSignupPayload {
  speakerId: string;
  email: string;
  name: string;
}

export interface SponsorSignupPayload {
  sponsorId: string;
  companyName: string;
  contactEmail: string;
}

export interface FanfletCreatedPayload {
  fanfletId: string;
  title: string;
  speakerId: string;
  speakerName: string;
  speakerEmail: string;
}

export interface OnboardingCompletedPayload {
  speakerId: string;
  speakerName: string;
  speakerEmail: string;
}

export type AdminNotificationPayload =
  | SpeakerSignupPayload
  | SponsorSignupPayload
  | FanfletCreatedPayload
  | OnboardingCompletedPayload;

const EVENT_COLUMN: Record<AdminNotificationEvent, keyof {
  speaker_signup: boolean;
  sponsor_signup: boolean;
  fanflet_created: boolean;
  onboarding_completed: boolean;
}> = {
  speaker_signup: "speaker_signup",
  sponsor_signup: "sponsor_signup",
  fanflet_created: "fanflet_created",
  onboarding_completed: "onboarding_completed",
};

function getResendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key?.trim()) return null;
  return new Resend(key);
}

function getFromAddress(): string {
  return process.env.RESEND_FROM ?? "Fanflet <onboarding@resend.dev>";
}

/**
 * Fetch admin user IDs that have the given event type enabled, then resolve
 * their emails via Auth Admin API.
 */
async function getAdminEmailsForEvent(event: AdminNotificationEvent): Promise<string[]> {
  const supabase = createServiceClient();
  const column = EVENT_COLUMN[event];

  const { data: rows, error } = await supabase
    .from("admin_notification_preferences")
    .select("admin_user_id")
    .eq(column, true);

  if (error || !rows?.length) return [];

  const emails: string[] = [];
  for (const row of rows) {
    const { data: { user } } = await supabase.auth.admin.getUserById(row.admin_user_id);
    if (user?.email) emails.push(user.email);
  }
  return emails;
}

function buildSubjectAndBody(
  event: AdminNotificationEvent,
  payload: AdminNotificationPayload
): { subject: string; html: string } {
  switch (event) {
    case "speaker_signup": {
      const p = payload as SpeakerSignupPayload;
      return {
        subject: `New speaker signup: ${p.name || p.email}`,
        html: `<p>A new speaker signed up.</p><ul><li>Name: ${escapeHtml(p.name) || "—"}</li><li>Email: ${escapeHtml(p.email)}</li></ul><p><a href="${getAdminUrl()}/accounts/${p.speakerId}">View account</a></p>`,
      };
    }
    case "sponsor_signup": {
      const p = payload as SponsorSignupPayload;
      return {
        subject: `New sponsor signup: ${p.companyName}`,
        html: `<p>A new sponsor signed up.</p><ul><li>Company: ${escapeHtml(p.companyName)}</li><li>Contact: ${escapeHtml(p.contactEmail)}</li></ul><p><a href="${getAdminUrl()}/sponsors/${p.sponsorId}">View sponsor</a></p>`,
      };
    }
    case "fanflet_created": {
      const p = payload as FanfletCreatedPayload;
      return {
        subject: `New Fanflet: ${p.title}`,
        html: `<p>A speaker created a new Fanflet.</p><ul><li>Title: ${escapeHtml(p.title)}</li><li>Speaker: ${escapeHtml(p.speakerName)} (${escapeHtml(p.speakerEmail)})</li></ul><p><a href="${getAdminUrl()}/fanflets">View fanflets</a></p>`,
      };
    }
    case "onboarding_completed": {
      const p = payload as OnboardingCompletedPayload;
      return {
        subject: `Onboarding completed: ${p.speakerName}`,
        html: `<p>A speaker completed their onboarding checklist.</p><ul><li>Name: ${escapeHtml(p.speakerName)}</li><li>Email: ${escapeHtml(p.speakerEmail)}</li></ul><p><a href="${getAdminUrl()}/accounts/${p.speakerId}">View account</a></p>`,
      };
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getAdminUrl(): string {
  return process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://admin.fanflet.com";
}

/**
 * Notify admins who have opted in for the given event. Sends one email per
 * admin. Does not throw; logs and returns on missing config or errors.
 *
 * IMPORTANT: Call this inside next/server `after()` so the serverless function
 * stays alive long enough to complete the async email work.
 */
export async function notifyAdmins(
  event: AdminNotificationEvent,
  payload: AdminNotificationPayload
): Promise<void> {
  try {
    const resend = getResendClient();
    if (!resend) {
      console.warn("[admin-notifications] RESEND_API_KEY not set; skipping", event);
      return;
    }

    const emails = await getAdminEmailsForEvent(event);
    if (emails.length === 0) {
      console.warn("[admin-notifications] No admin emails found for event:", event);
      return;
    }

    const { subject, html } = buildSubjectAndBody(event, payload);
    const from = getFromAddress();

    const { error } = await resend.emails.send({ from, to: emails, subject, html });
    if (error) {
      console.error("[admin-notifications] Resend API error for", event, ":", error);
    } else {
      console.log("[admin-notifications] Sent", event, "to", emails.length, "admin(s)");
    }
  } catch (err) {
    console.error("[admin-notifications] Failed to send", event, ":", err);
  }
}
