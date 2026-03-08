import type { SupabaseClient } from "@supabase/supabase-js";
import { McpToolError } from "../../types";

export async function adminGetSettings(
  serviceClient: SupabaseClient,
  adminUserId: string
) {
  const { data } = await serviceClient
    .from("admin_notification_preferences")
    .select("*")
    .eq("admin_user_id", adminUserId)
    .maybeSingle();

  return {
    notifications: {
      speaker_signup: data?.speaker_signup ?? true,
      sponsor_signup: data?.sponsor_signup ?? true,
      fanflet_created: data?.fanflet_created ?? true,
      onboarding_completed: data?.onboarding_completed ?? true,
    },
    timezone: data?.timezone ?? "America/New_York",
  };
}

export async function adminUpdateSettings(
  serviceClient: SupabaseClient,
  adminUserId: string,
  input: {
    notifications?: {
      speaker_signup?: boolean;
      sponsor_signup?: boolean;
      fanflet_created?: boolean;
      onboarding_completed?: boolean;
    };
    timezone?: string;
  }
) {
  const payload: Record<string, unknown> = {
    admin_user_id: adminUserId,
    updated_at: new Date().toISOString(),
  };

  if (input.notifications) {
    Object.assign(payload, input.notifications);
  }

  if (input.timezone) {
    payload.timezone = input.timezone;
  }

  const { error } = await serviceClient
    .from("admin_notification_preferences")
    .upsert(payload, { onConflict: "admin_user_id" });

  if (error) throw new McpToolError("Failed to update settings");
  return { success: true };
}
