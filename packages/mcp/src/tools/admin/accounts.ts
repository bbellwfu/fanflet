import { createServiceClient } from "@fanflet/db/service";
import { FREE_PLAN_NAME } from "@fanflet/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { McpToolError } from "../../types";

export async function adminListAccounts(
  serviceClient: SupabaseClient,
  input: {
    search?: string;
    status?: string;
    createdSince?: string;
    limit: number;
    offset: number;
  }
) {
  const { data: sponsorRows } = await serviceClient
    .from("sponsor_accounts")
    .select("auth_user_id");
  const sponsorAuthIds = new Set(
    (sponsorRows ?? []).map((r) => r.auth_user_id)
  );

  let query = serviceClient
    .from("speakers")
    .select("id, name, email, slug, status, created_at, auth_user_id", {
      count: "exact",
    })
    .order("created_at", { ascending: false });

  if (input.search) {
    query = query.or(
      `name.ilike.%${input.search}%,email.ilike.%${input.search}%`
    );
  }

  if (input.status && input.status !== "all") {
    query = query.eq("status", input.status);
  }

  if (input.createdSince) {
    query = query.gte("created_at", input.createdSince);
  }

  const { data: allSpeakers, count, error } = await query;
  if (error) throw new McpToolError("Failed to fetch accounts");

  const speakers = (allSpeakers ?? []).filter(
    (s) => !sponsorAuthIds.has(s.auth_user_id)
  );

  const withCounts = await Promise.all(
    speakers.slice(input.offset, input.offset + input.limit).map(async (s) => {
      const [fanfletResult, subResult] = await Promise.all([
        serviceClient
          .from("fanflets")
          .select("id", { count: "exact", head: true })
          .eq("speaker_id", s.id),
        serviceClient
          .from("subscribers")
          .select("id", { count: "exact", head: true })
          .eq("speaker_id", s.id),
      ]);

      return {
        id: s.id,
        name: s.name,
        email: s.email,
        slug: s.slug,
        status: s.status,
        createdAt: s.created_at,
        fanfletCount: fanfletResult.count ?? 0,
        subscriberCount: subResult.count ?? 0,
      };
    })
  );

  return { accounts: withCounts, total: count ?? speakers.length };
}

export async function adminGetAccount(
  serviceClient: SupabaseClient,
  speakerId: string
) {
  const { data: speaker, error } = await serviceClient
    .from("speakers")
    .select("*")
    .eq("id", speakerId)
    .single();

  if (error || !speaker) throw new McpToolError("Speaker not found");

  const [fanfletsResult, subsResult, subscriptionResult] = await Promise.all([
    serviceClient
      .from("fanflets")
      .select("id, title, slug, status, published_at, created_at")
      .eq("speaker_id", speakerId)
      .order("created_at", { ascending: false }),
    serviceClient
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .eq("speaker_id", speakerId),
    serviceClient
      .from("speaker_subscriptions")
      .select("*, plans(name, display_name)")
      .eq("speaker_id", speakerId)
      .maybeSingle(),
  ]);

  return {
    ...speaker,
    fanflets: fanfletsResult.data ?? [],
    subscriberCount: subsResult.count ?? 0,
    subscription: subscriptionResult.data ?? null,
  };
}

export async function adminSuspendAccount(
  serviceClient: SupabaseClient,
  adminUserId: string,
  speakerId: string,
  reason?: string
) {
  const { data: speaker, error: lookupError } = await serviceClient
    .from("speakers")
    .select("id, status")
    .eq("id", speakerId)
    .single();

  if (lookupError || !speaker) throw new McpToolError("Speaker not found");
  if (speaker.status === "suspended") {
    throw new McpToolError("Account is already suspended");
  }

  const { error } = await serviceClient
    .from("speakers")
    .update({
      status: "suspended",
      suspended_at: new Date().toISOString(),
      suspended_by: adminUserId,
      suspension_reason: reason ?? null,
    })
    .eq("id", speakerId);

  if (error) throw new McpToolError("Failed to suspend account");
  return { success: true };
}

export async function adminReactivateAccount(
  serviceClient: SupabaseClient,
  speakerId: string
) {
  const { data: speaker, error: lookupError } = await serviceClient
    .from("speakers")
    .select("id, status")
    .eq("id", speakerId)
    .single();

  if (lookupError || !speaker) throw new McpToolError("Speaker not found");
  if (speaker.status !== "suspended") {
    throw new McpToolError("Account is not suspended");
  }

  const { error } = await serviceClient
    .from("speakers")
    .update({
      status: "active",
      suspended_at: null,
      suspended_by: null,
      suspension_reason: null,
    })
    .eq("id", speakerId);

  if (error) throw new McpToolError("Failed to reactivate account");
  return { success: true };
}

export async function adminResetAccount(
  serviceClient: SupabaseClient,
  speakerId: string,
  confirmName: string
) {
  const { data: speaker, error: lookupError } = await serviceClient
    .from("speakers")
    .select("id, name, auth_user_id")
    .eq("id", speakerId)
    .single();

  if (lookupError || !speaker) throw new McpToolError("Speaker not found");

  if (speaker.name.toLowerCase() !== confirmName.toLowerCase()) {
    throw new McpToolError(
      "Confirmation name does not match. Provide the speaker's exact name to confirm reset."
    );
  }

  const authUserId = speaker.auth_user_id as string | null;
  if (!authUserId) throw new McpToolError("Speaker has no linked auth user");

  await serviceClient
    .from("sponsor_connections")
    .delete()
    .eq("speaker_id", speakerId);
  await serviceClient
    .from("fanflets")
    .delete()
    .eq("speaker_id", speakerId);
  await serviceClient
    .from("subscribers")
    .delete()
    .eq("speaker_id", speakerId);
  await serviceClient
    .from("survey_questions")
    .delete()
    .eq("speaker_id", speakerId);
  await serviceClient
    .from("resource_library")
    .delete()
    .eq("speaker_id", speakerId);
  await serviceClient
    .from("speaker_feature_overrides")
    .delete()
    .eq("speaker_id", speakerId);
  await serviceClient
    .from("speaker_subscriptions")
    .delete()
    .eq("speaker_id", speakerId);

  await serviceClient
    .from("speakers")
    .update({ photo_url: null, bio: null, slug: null, social_links: {} })
    .eq("id", speakerId);

  return { success: true, message: `Account for "${speaker.name}" has been reset.` };
}

export async function adminChangeSpeakerPlan(
  serviceClient: SupabaseClient,
  speakerId: string,
  planId: string | null
) {
  const { data: speaker, error: speakerError } = await serviceClient
    .from("speakers")
    .select("id")
    .eq("id", speakerId)
    .single();

  if (speakerError || !speaker) throw new McpToolError("Speaker not found");

  if (planId === null) {
    const { error } = await serviceClient
      .from("speaker_subscriptions")
      .delete()
      .eq("speaker_id", speakerId);
    if (error) throw new McpToolError("Failed to remove subscription");
    return { success: true, plan: "free" };
  }

  const { data: plan, error: planError } = await serviceClient
    .from("plans")
    .select("id, name, limits")
    .eq("id", planId)
    .single();

  if (planError || !plan) throw new McpToolError("Plan not found");

  if (plan.name === FREE_PLAN_NAME) {
    const { error } = await serviceClient
      .from("speaker_subscriptions")
      .delete()
      .eq("speaker_id", speakerId);
    if (error) throw new McpToolError("Failed to remove subscription");
    return { success: true, plan: plan.name };
  }

  const { data: featureRows } = await serviceClient
    .from("plan_features")
    .select("feature_flags(key)")
    .eq("plan_id", planId);

  const featureKeys = (featureRows ?? [])
    .map((r) => {
      const flag = r.feature_flags as unknown as { key: string } | null;
      return flag?.key;
    })
    .filter((k): k is string => !!k);

  const { error: upsertError } = await serviceClient
    .from("speaker_subscriptions")
    .upsert(
      {
        speaker_id: speakerId,
        plan_id: planId,
        status: "active",
        limits_snapshot: plan.limits,
        features_snapshot: featureKeys,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "speaker_id" }
    );

  if (upsertError) throw new McpToolError("Failed to update subscription");
  return { success: true, plan: plan.name };
}

export async function adminLookupSpeaker(
  serviceClient: SupabaseClient,
  input: { email?: string; slug?: string }
) {
  if (!input.email && !input.slug) {
    throw new McpToolError("Provide either email or slug to look up a speaker");
  }

  let query = serviceClient
    .from("speakers")
    .select("id, name, email, slug, status, created_at, bio");

  if (input.email) {
    query = query.eq("email", input.email);
  } else if (input.slug) {
    query = query.eq("slug", input.slug);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw new McpToolError("Failed to look up speaker");
  if (!data) return { found: false, speaker: null };
  return { found: true, speaker: data };
}
