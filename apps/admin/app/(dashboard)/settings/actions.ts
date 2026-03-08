"use server";

import { createClient } from "@fanflet/db/server";
import { revalidatePath } from "next/cache";
import { isValidTimezone } from "@fanflet/db/timezone";

export type NotificationPreferenceKey =
  | "speaker_signup"
  | "sponsor_signup"
  | "fanflet_created"
  | "onboarding_completed";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const appMetadata = user.app_metadata ?? {};
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("auth_user_id", user.id)
    .eq("role", "platform_admin")
    .maybeSingle();

  const isAdmin = roleRow != null || appMetadata.role === "platform_admin";
  if (!isAdmin) throw new Error("Not authorized");

  return { user, supabase };
}

export async function updateNotificationPreferences(updates: {
  speaker_signup?: boolean;
  sponsor_signup?: boolean;
  fanflet_created?: boolean;
  onboarding_completed?: boolean;
}): Promise<{ error?: string }> {
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
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "admin_user_id" }
    );

  if (error) {
    console.error("[admin settings] updateNotificationPreferences failed:", error.message, error.code);
    return { error: "Failed to update preferences" };
  }

  revalidatePath("/settings");
  return {};
}

export async function updateAdminTimezone(tz: string): Promise<{ error?: string }> {
  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  if (!isValidTimezone(tz)) {
    return { error: "Invalid timezone identifier" };
  }

  const { error } = await admin.supabase
    .from("admin_notification_preferences")
    .upsert(
      {
        admin_user_id: admin.user.id,
        timezone: tz,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "admin_user_id" }
    );

  if (error) {
    console.error("[admin settings] updateAdminTimezone failed:", error.message, error.code);
    return { error: "Failed to update timezone" };
  }

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

  const { Resend } = await import("resend");
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
    return { error: `Resend API error: ${sendError.message}` };
  }

  return { success: `Test email sent to ${email}` };
}
