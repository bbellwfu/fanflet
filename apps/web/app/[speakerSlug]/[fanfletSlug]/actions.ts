"use server";

import { createClient } from "@/lib/supabase/server";

export async function subscribeToSpeaker(
  speakerId: string,
  fanfletId: string,
  email: string,
  sponsorConsent: boolean = false
) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("subscribers")
    .insert({
      email: email.toLowerCase().trim(),
      speaker_id: speakerId,
      source_fanflet_id: fanfletId,
      sponsor_consent: sponsorConsent,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { error: "already_subscribed" };
    }
    return { error: error.message };
  }

  return { success: true, subscriber_id: data?.id ?? undefined };
}
