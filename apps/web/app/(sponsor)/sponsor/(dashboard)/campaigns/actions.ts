"use server";

import { revalidatePath } from "next/cache";
import { requireSponsor } from "@/lib/auth-context";
import { loadSponsorEntitlements } from "@fanflet/db";

export interface SponsorCampaignRow {
  id: string;
  sponsor_id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  all_speakers_assigned: boolean;
  crm_reference: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  speaker_count?: number;
  resource_count?: number;
}

export async function listSponsorCampaigns(): Promise<{
  data?: SponsorCampaignRow[];
  error?: string;
}> {
  const { supabase, sponsorId } = await requireSponsor();

  const { data: campaigns, error } = await supabase
    .from("sponsor_campaigns")
    .select("id, sponsor_id, name, description, start_date, end_date, status, all_speakers_assigned, crm_reference, created_at, updated_at")
    .eq("sponsor_id", sponsorId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  const ids = (campaigns ?? []).map((c) => c.id);
  const speakerCounts: Record<string, number> = {};
  const resourceCounts: Record<string, number> = {};
  if (ids.length > 0) {
    const [speakersRes, libRes] = await Promise.all([
      supabase.from("sponsor_campaign_speakers").select("campaign_id").in("campaign_id", ids),
      supabase.from("sponsor_resource_campaigns").select("campaign_id").in("campaign_id", ids),
    ]);
    for (const r of speakersRes.data ?? []) {
      const cid = (r as { campaign_id: string }).campaign_id;
      speakerCounts[cid] = (speakerCounts[cid] ?? 0) + 1;
    }
    for (const r of libRes.data ?? []) {
      const cid = (r as { campaign_id: string | null }).campaign_id;
      if (cid) resourceCounts[cid] = (resourceCounts[cid] ?? 0) + 1;
    }
  }

  const data: SponsorCampaignRow[] = (campaigns ?? []).map((c) => ({
    ...c,
    crm_reference: (c.crm_reference as Record<string, unknown>) ?? null,
    speaker_count: speakerCounts[c.id] ?? 0,
    resource_count: resourceCounts[c.id] ?? 0,
  }));
  return { data };
}

export async function createSponsorCampaign(params: {
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  status?: "draft" | "active" | "ended";
  all_speakers_assigned?: boolean;
  speaker_ids?: string[];
}): Promise<{ error?: string; id?: string }> {
  const { supabase, sponsorId } = await requireSponsor();
  const entitlements = await loadSponsorEntitlements(supabase, sponsorId);
  if (!entitlements.features.has("sponsor_campaigns")) {
    return { error: "Upgrade to Sponsor Studio to create campaigns." };
  }

  if (!params.name?.trim()) return { error: "Campaign name is required." };
  if (!params.start_date) return { error: "Start date is required." };

  const status = params.status ?? "draft";

  const { data: campaign, error: campError } = await supabase
    .from("sponsor_campaigns")
    .insert({
      sponsor_id: sponsorId,
      name: params.name.trim(),
      description: params.description?.trim() ?? null,
      start_date: params.start_date,
      end_date: params.end_date?.trim() || null,
      status,
      all_speakers_assigned: params.all_speakers_assigned ?? false,
    })
    .select("id")
    .single();

  if (campError || !campaign) return { error: campError?.message ?? "Failed to create campaign." };

  const speakerIds = params.all_speakers_assigned ? [] : (params.speaker_ids ?? []);
  if (speakerIds.length > 0) {
    const { error: kolsError } = await supabase.from("sponsor_campaign_speakers").insert(
      speakerIds.map((speaker_id) => ({ campaign_id: campaign.id, speaker_id }))
    );
    if (kolsError) {
      await supabase.from("sponsor_campaigns").delete().eq("id", campaign.id);
      return { error: kolsError.message };
    }
  }

  revalidatePath("/sponsor/campaigns");
  return { id: campaign.id };
}

export async function getSponsorCampaign(campaignId: string): Promise<{
  data?: SponsorCampaignRow & { speaker_ids?: string[] };
  error?: string;
}> {
  const { supabase, sponsorId } = await requireSponsor();

  const { data: campaign, error } = await supabase
    .from("sponsor_campaigns")
    .select("*")
    .eq("id", campaignId)
    .eq("sponsor_id", sponsorId)
    .single();

  if (error || !campaign) return { error: error?.message ?? "Not found" };

  const { data: campaignSpeakers } = await supabase
    .from("sponsor_campaign_speakers")
    .select("speaker_id")
    .eq("campaign_id", campaignId);
  const speaker_ids = (campaignSpeakers ?? []).map((r) => (r as { speaker_id: string }).speaker_id);

  const { count: resourceCount } = await supabase
    .from("sponsor_resource_campaigns")
    .select("*", { count: "exact", head: true })
    .eq("campaign_id", campaignId);

  return {
    data: {
      ...campaign,
      crm_reference: (campaign.crm_reference as Record<string, unknown>) ?? null,
      speaker_count: speaker_ids.length,
      resource_count: resourceCount ?? 0,
      speaker_ids,
    },
  };
}

export async function updateSponsorCampaign(
  campaignId: string,
  params: {
    name?: string;
    description?: string | null;
    start_date?: string;
    end_date?: string | null;
    status?: "draft" | "active" | "ended";
    all_speakers_assigned?: boolean;
    speaker_ids?: string[];
  }
): Promise<{ error?: string }> {
  const { supabase, sponsorId } = await requireSponsor();
  const entitlements = await loadSponsorEntitlements(supabase, sponsorId);
  if (!entitlements.features.has("sponsor_campaigns")) {
    return { error: "Upgrade to Sponsor Studio to manage campaigns." };
  }

  const { data: existing } = await supabase
    .from("sponsor_campaigns")
    .select("id, all_speakers_assigned")
    .eq("id", campaignId)
    .eq("sponsor_id", sponsorId)
    .single();

  if (!existing) return { error: "Campaign not found." };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (params.name !== undefined) update.name = params.name.trim();
  if (params.description !== undefined) update.description = params.description?.trim() ?? null;
  if (params.start_date !== undefined) update.start_date = params.start_date;
  if (params.end_date !== undefined) update.end_date = params.end_date?.trim() || null;
  if (params.status !== undefined) update.status = params.status;
  if (params.all_speakers_assigned !== undefined) update.all_speakers_assigned = params.all_speakers_assigned;

  if (Object.keys(update).length > 1) {
    const { error: updateError } = await supabase
      .from("sponsor_campaigns")
      .update(update)
      .eq("id", campaignId)
      .eq("sponsor_id", sponsorId);
    if (updateError) return { error: updateError.message };
  }

  if (params.speaker_ids !== undefined || params.all_speakers_assigned !== undefined) {
    await supabase.from("sponsor_campaign_speakers").delete().eq("campaign_id", campaignId);
    
    // Check local params OR fallback to checking DB to know if we should insert speakers
    const isAllSpeakers = params.all_speakers_assigned !== undefined ? params.all_speakers_assigned : existing.all_speakers_assigned;
    const speakerIds = !isAllSpeakers && params.speaker_ids ? params.speaker_ids.filter(Boolean) : [];
    
    if (speakerIds.length > 0) {
      const { error: insertError } = await supabase.from("sponsor_campaign_speakers").insert(
        speakerIds.map((speaker_id) => ({ campaign_id: campaignId, speaker_id }))
      );
      if (insertError) return { error: insertError.message };
    }
  }

  revalidatePath("/sponsor/campaigns");
  return {};
}

export async function deleteSponsorCampaign(campaignId: string): Promise<{ error?: string }> {
  const { supabase, sponsorId } = await requireSponsor();
  const entitlements = await loadSponsorEntitlements(supabase, sponsorId);
  if (!entitlements.features.has("sponsor_campaigns")) {
    return { error: "Upgrade to Sponsor Studio to manage campaigns." };
  }

  const { data: existing } = await supabase
    .from("sponsor_campaigns")
    .select("id")
    .eq("id", campaignId)
    .eq("sponsor_id", sponsorId)
    .single();

  if (!existing) return { error: "Campaign not found." };

  await supabase.from("sponsor_campaign_speakers").delete().eq("campaign_id", campaignId);
  const { error } = await supabase
    .from("sponsor_campaigns")
    .delete()
    .eq("id", campaignId)
    .eq("sponsor_id", sponsorId);

  if (error) return { error: error.message };
  revalidatePath("/sponsor/campaigns");
  return {};
}
