"use server";

import { revalidatePath } from "next/cache";
import { requireSponsor } from "@/lib/auth-context";
import { loadSponsorEntitlements } from "@fanflet/db";
import { getStorageQuota } from "@fanflet/db/storage";
import {
  isAllowedFileType,
  ALLOWED_EXTENSIONS,
} from "@fanflet/db/storage";

const SPONSOR_FILE_BUCKET = "sponsor-file-uploads";
const MAX_FILE_MB = 100;

function buildSponsorStoragePath(
  sponsorId: string,
  resourceId: string,
  originalFilename: string
): string {
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}-${originalFilename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  return `${sponsorId}/${resourceId}/${safeName}`;
}

function ensureUrl(url: string | null | undefined): string | null {
  if (url == null || url.trim() === "") return null;
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export interface SponsorLibraryResource {
  id: string;
  sponsor_id: string;
  type: string;
  title: string;
  description: string | null;
  url: string | null;
  file_path: string | null;
  file_size_bytes: number | null;
  file_type: string | null;
  image_url: string | null;
  media_metadata: Record<string, unknown> | null;
  campaign_ids: string[];
  availability: string;
  available_to: string[];
  status: string;
  created_at: string;
  updated_at: string;
  placement_count?: number;
}

export interface SponsorCampaignOption {
  id: string;
  name: string;
}

export async function listSponsorLibraryResources(): Promise<{
  data?: SponsorLibraryResource[];
  error?: string;
}> {
  const { supabase, sponsorId } = await requireSponsor();

  const { data: items, error } = await supabase
    .from("sponsor_resource_library")
    .select("id, sponsor_id, type, title, description, url, file_path, file_size_bytes, file_type, image_url, media_metadata, availability, available_to, status, created_at, updated_at")
    .eq("sponsor_id", sponsorId)
    .order("created_at", { ascending: false });

  if (error) return { error: error.message };

  const ids = (items ?? []).map((r) => r.id);
  const placementCounts: Record<string, number> = {};
  const campaignMap: Record<string, string[]> = {};
  if (ids.length > 0) {
    const [blocksRes, campaignsRes] = await Promise.all([
      supabase
        .from("resource_blocks")
        .select("sponsor_library_item_id")
        .in("sponsor_library_item_id", ids),
      supabase
        .from("sponsor_resource_campaigns")
        .select("resource_id, campaign_id")
        .in("resource_id", ids),
    ]);
    for (const b of blocksRes.data ?? []) {
      const id = (b as { sponsor_library_item_id: string | null }).sponsor_library_item_id;
      if (id) placementCounts[id] = (placementCounts[id] ?? 0) + 1;
    }
    for (const rc of campaignsRes.data ?? []) {
      const row = rc as { resource_id: string; campaign_id: string };
      if (!campaignMap[row.resource_id]) campaignMap[row.resource_id] = [];
      campaignMap[row.resource_id].push(row.campaign_id);
    }
  }

  const data: SponsorLibraryResource[] = (items ?? []).map((r) => ({
    ...r,
    available_to: Array.isArray(r.available_to) ? r.available_to : [],
    media_metadata: (r.media_metadata as Record<string, unknown>) ?? null,
    campaign_ids: campaignMap[r.id] ?? [],
    placement_count: placementCounts[r.id] ?? 0,
  }));
  return { data };
}

export async function getSponsorStorageUsage(): Promise<{
  usedBytes: number;
  error?: string;
}> {
  const { supabase, sponsorId } = await requireSponsor();
  const { data, error } = await supabase.rpc("sponsor_storage_used_bytes", {
    p_sponsor_id: sponsorId,
  });
  if (error) return { usedBytes: 0, error: error.message };
  const usedBytes = typeof data === "number" ? data : 0;
  return { usedBytes };
}

export async function createSponsorLibraryResource(params: {
  type: "link" | "video" | "sponsor_block";
  title: string;
  description?: string;
  url?: string;
  image_url?: string;
  availability: "all" | "specific" | "draft";
  available_to?: string[];
}): Promise<{ error?: string; id?: string }> {
  const { supabase, sponsorId } = await requireSponsor();
  const entitlements = await loadSponsorEntitlements(supabase, sponsorId);
  if (!entitlements.features.has("sponsor_resource_library")) {
    return { error: "Upgrade to Pro or Enterprise to use the Library." };
  }

  if (!params.title?.trim()) return { error: "Title is required." };
  if (!["link", "video", "sponsor_block"].includes(params.type)) {
    return { error: "Invalid resource type." };
  }

  const { data: row, error } = await supabase
    .from("sponsor_resource_library")
    .insert({
      sponsor_id: sponsorId,
      type: params.type,
      title: params.title.trim(),
      description: params.description?.trim() ?? null,
      url: params.url ? ensureUrl(params.url) : null,
      image_url: params.image_url ?? null,
      availability: params.availability ?? "draft",
      available_to: params.available_to ?? [],
      status: "draft",
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
  revalidatePath("/sponsor/library");
  return { id: row.id };
}

export async function updateSponsorLibraryResource(
  id: string,
  params: {
    title?: string;
    description?: string;
    url?: string;
    image_url?: string;
    status?: "draft" | "published" | "archived";
    campaign_ids?: string[];
  }
): Promise<{ error?: string }> {
  const { supabase, sponsorId, user } = await requireSponsor();

  const { data: existing } = await supabase
    .from("sponsor_resource_library")
    .select("id, status")
    .eq("id", id)
    .eq("sponsor_id", sponsorId)
    .single();

  if (!existing) return { error: "Resource not found." };

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (params.title !== undefined) update.title = params.title.trim();
  if (params.description !== undefined) update.description = params.description?.trim() ?? null;
  if (params.url !== undefined) update.url = params.url ? ensureUrl(params.url) : null;
  if (params.status !== undefined) {
    if (!["draft", "published", "archived"].includes(params.status)) {
      return { error: "Invalid status." };
    }
    update.status = params.status;
    // When publishing, ensure availability is set so connected speakers can see it
    if (params.status === "published") {
      update.availability = "all";
    }
    const eventType = params.status === "published" ? "published" : params.status === "archived" ? "archived" : null;
    if (eventType) {
      await insertSponsorResourceEvent(supabase, sponsorId, user.id, id, eventType, null);
    }
  }

  const { error } = await supabase
    .from("sponsor_resource_library")
    .update(update)
    .eq("id", id)
    .eq("sponsor_id", sponsorId);

  if (error) return { error: error.message };

  // Sync campaign assignments via junction table
  if (params.campaign_ids !== undefined) {
    await supabase
      .from("sponsor_resource_campaigns")
      .delete()
      .eq("resource_id", id);
    const campaignIds = params.campaign_ids.filter(Boolean);
    if (campaignIds.length > 0) {
      const { error: insertErr } = await supabase
        .from("sponsor_resource_campaigns")
        .insert(campaignIds.map((campaign_id) => ({ resource_id: id, campaign_id })));
      if (insertErr) return { error: insertErr.message };
    }
  }

  revalidatePath("/sponsor/library");
  return {};
}

async function insertSponsorResourceEvent(
  supabase: Awaited<ReturnType<typeof requireSponsor>>["supabase"],
  sponsorId: string,
  actorId: string,
  resourceId: string,
  eventType: string,
  metadata: Record<string, unknown> | null
): Promise<void> {
  await supabase.from("sponsor_resource_events").insert({
    sponsor_resource_id: resourceId,
    sponsor_id: sponsorId,
    event_type: eventType,
    actor_id: actorId,
    metadata: metadata ?? null,
  }).select("id");
}

export async function setSponsorLibraryStatus(
  id: string,
  status: "published" | "archived"
): Promise<{ error?: string }> {
  return updateSponsorLibraryResource(id, { status });
}

export async function removeSponsorLibraryResource(id: string): Promise<{
  error?: string;
  placementCount?: number;
}> {
  const { supabase, sponsorId, user } = await requireSponsor();

  const { data: row, error: fetchErr } = await supabase
    .from("sponsor_resource_library")
    .select("id, file_path, status")
    .eq("id", id)
    .eq("sponsor_id", sponsorId)
    .single();

  if (fetchErr || !row) return { error: "Resource not found." };

  const { count } = await supabase
    .from("resource_blocks")
    .select("*", { count: "exact", head: true })
    .eq("sponsor_library_item_id", id);
  const placementCount = typeof count === "number" ? count : 0;

  if (row.file_path) {
    const pathParts = row.file_path.split("/");
    if (pathParts[0] === sponsorId) {
      await supabase.storage.from(SPONSOR_FILE_BUCKET).remove([row.file_path]);
    }
  }

  await insertSponsorResourceEvent(supabase, sponsorId, user.id, id, "removed", { placement_count: placementCount });

  const { error: updateErr } = await supabase
    .from("sponsor_resource_library")
    .update({
      status: "removed",
      file_path: null,
      file_size_bytes: null,
      file_type: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("sponsor_id", sponsorId);

  if (updateErr) return { error: updateErr.message };
  revalidatePath("/sponsor/library");
  return { placementCount };
}

export type RequestSponsorUploadResult =
  | { allowed: true; path: string; resourceId: string; sponsorId: string }
  | { allowed: false; error: string };

export async function requestSponsorUploadSlot(params: {
  fileName: string;
  fileSize: number;
  fileType: string;
  title?: string;
  description?: string;
}): Promise<RequestSponsorUploadResult> {
  const { supabase, sponsorId } = await requireSponsor();
  const entitlements = await loadSponsorEntitlements(supabase, sponsorId);
  if (!entitlements.features.has("sponsor_resource_library")) {
    return { allowed: false, error: "Upgrade to Pro or Enterprise to use the Library." };
  }

  if (!isAllowedFileType(params.fileName)) {
    return {
      allowed: false,
      error: `File type not supported. Accepted: ${ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }

  const quota = getStorageQuota(entitlements.limits);
  const maxFileBytes = Math.min(quota.maxFileBytes, MAX_FILE_MB * 1024 * 1024);
  if (params.fileSize > maxFileBytes) {
    return {
      allowed: false,
      error: `File too large (max ${MAX_FILE_MB} MB).`,
    };
  }

  const { data: used } = await supabase.rpc("sponsor_storage_used_bytes", {
    p_sponsor_id: sponsorId,
  });
  const currentUsage = typeof used === "number" ? used : 0;
  if (currentUsage + params.fileSize > quota.storageBytes) {
    return {
      allowed: false,
      error: `Not enough storage. You're using ${Math.round(currentUsage / 1024 / 1024)} MB of ${quota.storageMb} MB`,
    };
  }

  const { data: resource, error: insertErr } = await supabase
    .from("sponsor_resource_library")
    .insert({
      sponsor_id: sponsorId,
      type: "file",
      title: params.title?.trim() || params.fileName,
      description: params.description?.trim() ?? null,
      availability: "draft",
      status: "draft",
    })
    .select("id")
    .single();

  if (insertErr || !resource) {
    return { allowed: false, error: insertErr?.message ?? "Failed to create library entry." };
  }

  const path = buildSponsorStoragePath(sponsorId, resource.id, params.fileName);
  return {
    allowed: true,
    path,
    resourceId: resource.id,
    sponsorId,
  };
}

export async function finalizeSponsorUpload(params: {
  resourceId: string;
  filePath: string;
  fileSizeBytes: number;
  fileType: string;
  title?: string;
}): Promise<{ error?: string }> {
  const { supabase, sponsorId } = await requireSponsor();

  const update: Record<string, unknown> = {
    file_path: params.filePath,
    file_size_bytes: params.fileSizeBytes,
    file_type: params.fileType,
    updated_at: new Date().toISOString(),
  };
  if (params.title) update.title = params.title.trim();

  const { error } = await supabase
    .from("sponsor_resource_library")
    .update(update)
    .eq("id", params.resourceId)
    .eq("sponsor_id", sponsorId);

  if (error) return { error: error.message };
  revalidatePath("/sponsor/library");
  return {};
}

export async function cancelSponsorUploadSlot(resourceId: string): Promise<void> {
  const { supabase, sponsorId } = await requireSponsor();
  await supabase
    .from("sponsor_resource_library")
    .delete()
    .eq("id", resourceId)
    .eq("sponsor_id", sponsorId)
    .is("file_path", null);
  revalidatePath("/sponsor/library");
}
