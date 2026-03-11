import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}

export interface SpeakerContext {
  user: AuthUser;
  speakerId: string;
  demoEnvironmentId: string | null;
  supabase: SupabaseClient;
}

export interface SponsorContext {
  user: AuthUser;
  sponsorId: string;
  demoEnvironmentId: string | null;
  supabase: SupabaseClient;
}

export interface AudienceContext {
  user: AuthUser;
  audienceId: string;
  supabase: SupabaseClient;
}

export interface FanfletOwnerContext extends SpeakerContext {
  fanfletId: string;
}

/**
 * Require an authenticated speaker. Redirects to login if not authenticated,
 * or to the sponsor portal if the user is a sponsor without a speaker profile.
 * Cached per request via React cache().
 */
export const requireSpeaker = cache(async (): Promise<SpeakerContext> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id, demo_environment_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!speaker) {
    redirect("/login");
  }

  return {
    user,
    speakerId: speaker.id,
    demoEnvironmentId: speaker.demo_environment_id ?? null,
    supabase,
  };
});

/**
 * Require an authenticated sponsor. Redirects to login if not authenticated,
 * or to the speaker dashboard if the user is a speaker without a sponsor profile.
 * Cached per request via React cache().
 */
export const requireSponsor = cache(async (): Promise<SponsorContext> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id, demo_environment_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!sponsor) {
    redirect("/sponsor/onboarding");
  }

  return {
    user,
    sponsorId: sponsor.id,
    demoEnvironmentId: sponsor.demo_environment_id ?? null,
    supabase,
  };
});

/**
 * Require an authenticated audience member. Redirects to login if not
 * authenticated or if no audience_accounts row exists for this user.
 * Cached per request via React cache().
 */
export const requireAudience = cache(async (): Promise<AudienceContext> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: audience } = await supabase
    .from("audience_accounts")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!audience) {
    redirect("/login");
  }

  return { user, audienceId: audience.id, supabase };
});

/**
 * Require that the current user owns the specified fanflet.
 * Returns the speaker context plus the verified fanflet ID.
 */
export async function requireFanfletOwner(fanfletId: string): Promise<FanfletOwnerContext> {
  const ctx = await requireSpeaker();

  const { data: fanflet } = await ctx.supabase
    .from("fanflets")
    .select("id, speaker_id")
    .eq("id", fanfletId)
    .single();

  if (!fanflet || fanflet.speaker_id !== ctx.speakerId) {
    throw new Error("Fanflet not found");
  }

  return { ...ctx, fanfletId: fanflet.id };
}
