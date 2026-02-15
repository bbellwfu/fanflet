"use server";

import { createClient } from "@/lib/supabase/server";

export async function subscribeToSpeaker(
  speakerId: string,
  fanfletId: string,
  email: string
) {
  const supabase = await createClient();

  const { error } = await supabase.from("subscribers").insert({
    email: email.toLowerCase().trim(),
    speaker_id: speakerId,
    source_fanflet_id: fanfletId,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "already_subscribed" };
    }
    return { error: error.message };
  }

  return { success: true };
}
