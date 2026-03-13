"use server";

import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSubscriberConfirmation } from "@/lib/subscriber-confirmation";

export async function subscribeToSpeaker(
  speakerId: string,
  fanfletId: string,
  email: string,
  sponsorConsent: boolean = false
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("subscribe_and_distribute_leads", {
      p_email: email.toLowerCase().trim(),
      p_name: "", // We don't capture name in this form currently, but the RPC expects it
      p_speaker_id: speakerId,
      p_fanflet_id: fanfletId,
      p_sponsor_consent: sponsorConsent,
    })
    .single();

  if (error) {
    console.error("[subscribeToSpeaker] RPC error:", error.code, error.message);
    return { error: "Something went wrong. Please try again later." };
  }

  // Run email work after the response is sent (keeps the serverless function alive)
  after(async () => {
    await sendConfirmationEmailForSubscription(
      supabase,
      fanfletId,
      speakerId,
      email.toLowerCase().trim()
    );
  });

  return { success: true, subscriber_id: data?.subscriber_id };
}

/**
 * Fetch fanflet + speaker data and send confirmation email.
 * Runs asynchronously after the subscription is recorded.
 */
async function sendConfirmationEmailForSubscription(
  supabase: Awaited<ReturnType<typeof createClient>>,
  fanfletId: string,
  speakerId: string,
  subscriberEmail: string
): Promise<void> {
  try {
    // Fetch fanflet with speaker in a single query
    const { data: fanflet, error: fanfletError } = await supabase
      .from("fanflets")
      .select(
        `
        title,
        slug,
        confirmation_email_config,
        speakers!inner (
          name,
          photo_url,
          slug,
          social_links
        )
      `
      )
      .eq("id", fanfletId)
      .eq("speaker_id", speakerId)
      .single();

    if (fanfletError || !fanflet) {
      console.error("[sendConfirmationEmail] Failed to fetch fanflet:", fanfletError?.message);
      return;
    }

    const speakerData = fanflet.speakers;
    const speaker = (Array.isArray(speakerData) ? speakerData[0] : speakerData) as {
      name: string | null;
      photo_url: string | null;
      slug: string;
      social_links: unknown;
    };

    await sendSubscriberConfirmation({
      fanfletId,
      speakerId,
      subscriberEmail,
      fanflet: {
        title: fanflet.title,
        slug: fanflet.slug,
        confirmation_email_config: fanflet.confirmation_email_config,
      },
      speaker,
    });
  } catch (err) {
    console.error("[sendConfirmationEmail] Error:", err);
  }
}
