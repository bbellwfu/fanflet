"use server";

import { Resend } from "resend";
import { revalidatePath } from "next/cache";
import { isValidTimezone } from "@fanflet/db/timezone";
import { requireAdmin } from "@/lib/admin-auth";
import { auditAdminAction } from "@/lib/audit";
import { z } from "zod";

const notificationPreferencesSchema = z.object({
  speaker_signup: z.boolean().optional(),
  sponsor_signup: z.boolean().optional(),
  fanflet_created: z.boolean().optional(),
  onboarding_completed: z.boolean().optional(),
});
const timezoneSchema = z.string().min(1).max(100);

export type NotificationPreferenceKey =
  | "speaker_signup"
  | "sponsor_signup"
  | "fanflet_created"
  | "onboarding_completed";

export async function updateNotificationPreferences(updates: {
  speaker_signup?: boolean;
  sponsor_signup?: boolean;
  fanflet_created?: boolean;
  onboarding_completed?: boolean;
}): Promise<{ error?: string }> {
  const parsed = notificationPreferencesSchema.safeParse(updates);
  if (!parsed.success) return { error: "Invalid input" };
  const validUpdates = parsed.data;

  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { error } = await admin.supabase
    .from("admin_notification_preferences")
    .upsert(
      {
        admin_user_id: admin.user.id,
        ...validUpdates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "admin_user_id" }
    );

  if (error) {
    console.error("[admin settings] updateNotificationPreferences failed:", error.message, error.code);
    return { error: "Failed to update preferences" };
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "setting.update_notifications",
    category: "setting",
    details: validUpdates as Record<string, unknown>,
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/settings");
  return {};
}

export async function updateAdminTimezone(tz: string): Promise<{ error?: string }> {
  const parsed = timezoneSchema.safeParse(tz);
  if (!parsed.success) return { error: "Invalid input" };
  const validTz = parsed.data;

  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (!isValidTimezone(validTz)) {
    return { error: "Invalid timezone identifier" };
  }

  const { error } = await admin.supabase
    .from("admin_notification_preferences")
    .upsert(
      {
        admin_user_id: admin.user.id,
        timezone: validTz,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "admin_user_id" }
    );

  if (error) {
    console.error("[admin settings] updateAdminTimezone failed:", error.message, error.code);
    return { error: "Failed to update timezone" };
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "setting.update_timezone",
    category: "setting",
    details: { timezone: validTz },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/settings");
  return {};
}

export async function sendTestNotification(): Promise<{ error?: string; success?: string }> {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey?.trim()) {
    return { error: "RESEND_API_KEY is not configured on this deployment." };
  }

  const email = admin.user.email;
  if (!email) {
    return { error: "No email address found for your account." };
  }

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM ?? "Fanflet <onboarding@resend.dev>";
  const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://admin.fanflet.com";

  const { error: sendError } = await resend.emails.send({
    from,
    to: [email],
    subject: "Fanflet test notification",
    html: `<p>This is a test notification from your Fanflet admin portal.</p>
<p>If you received this email, your notification pipeline is working correctly.</p>
<p><a href="${adminUrl}/settings">Back to settings</a></p>`,
  });

  if (sendError) {
    console.error("[admin settings] sendTestNotification failed:", sendError);
    return { error: "Failed to send test notification" };
  }

  return { success: `Test email sent to ${email}` };
}
