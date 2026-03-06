"use server";

import { createClient } from "@/lib/supabase/server";

export async function subscribeToSpeaker(
  speakerId: string,
  fanfletId: string,
  email: string,
  sponsorConsent: boolean = false
) {
  const supabase = await createClient();

  // Generate the ID server-side so we can return it without INSERT ... RETURNING.
  // RETURNING requires a SELECT RLS policy, which anon users don't have on subscribers.
  const id = crypto.randomUUID();

  const { error } = await supabase.from("subscribers").insert({
    id,
    email: email.toLowerCase().trim(),
    speaker_id: speakerId,
    source_fanflet_id: fanfletId,
    sponsor_consent: sponsorConsent,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "already_subscribed" };
    }
    console.error("[subscribeToSpeaker] Supabase error:", error.code, error.message);
    return { error: "Something went wrong. Please try again later." };
  }

  return { success: true, subscriber_id: id };
}
