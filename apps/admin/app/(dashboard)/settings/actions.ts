"use server";

import { createClient } from "@fanflet/db/server";
import { revalidatePath } from "next/cache";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const appMetadata = user.app_metadata ?? {};
  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("auth_user_id", user.id)
    .eq("role", "platform_admin")
    .maybeSingle();

  const isAdmin = roleRow != null || appMetadata.role === "platform_admin";
  if (!isAdmin) {
    return { error: "Not authorized" };
  }

  const { error } = await supabase
    .from("admin_notification_preferences")
    .upsert(
      {
        admin_user_id: user.id,
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
