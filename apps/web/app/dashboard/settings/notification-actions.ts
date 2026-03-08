"use server";

import { requireSpeaker } from "@/lib/auth-context";
import { createServiceClient } from "@fanflet/db/service";
import { revalidatePath } from "next/cache";

export async function getPlatformNotificationPreference(): Promise<{
  optedIn: boolean;
  error?: string;
}> {
  const { speakerId } = await requireSpeaker();
  const supabase = createServiceClient();

  const { data } = await supabase
    .from("platform_communication_preferences")
    .select("opted_in")
    .eq("speaker_id", speakerId)
    .eq("category", "platform_announcements")
    .maybeSingle();

  return { optedIn: data?.opted_in ?? false };
}

export async function updatePlatformNotificationPreference(
  optedIn: boolean
): Promise<{ error?: string }> {
  const { speakerId } = await requireSpeaker();
  const supabase = createServiceClient();

  const { error } = await supabase
    .from("platform_communication_preferences")
    .upsert(
      {
        recipient_type: "speaker",
        speaker_id: speakerId,
        category: "platform_announcements",
        opted_in: optedIn,
        opted_in_at: optedIn ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "speaker_id,category" }
    );

  if (error) {
    console.error(
      "[settings] updatePlatformNotificationPreference:",
      error.message
    );
    return { error: "Failed to update preference" };
  }

  revalidatePath("/dashboard/settings");
  return {};
}
