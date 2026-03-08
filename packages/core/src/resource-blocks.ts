import type { UserScopedClient, SpeakerEntitlements, ServiceResult } from "./types";
import { ok, err } from "./types";

/* ------------------------------------------------------------------ */
/*  Input types                                                        */
/* ------------------------------------------------------------------ */

export interface AddResourceBlockInput {
  type: string;
  title?: string;
  description?: string;
  url?: string;
  file_path?: string;
  image_url?: string;
  section_name?: string;
  metadata?: Record<string, unknown>;
  sponsor_account_id?: string | null;
}

export interface UpdateResourceBlockInput {
  title?: string;
  description?: string;
  url?: string;
  file_path?: string;
  image_url?: string;
  section_name?: string;
  metadata?: Record<string, unknown>;
  sponsor_account_id?: string | null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function ensureUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

async function getNextDisplayOrder(
  supabase: UserScopedClient,
  fanfletId: string
): Promise<number> {
  const { data: maxOrder } = await supabase
    .from("resource_blocks")
    .select("display_order")
    .eq("fanflet_id", fanfletId)
    .order("display_order", { ascending: false })
    .limit(1)
    .single();
  return (maxOrder?.display_order ?? -1) + 1;
}

/* ------------------------------------------------------------------ */
/*  Service functions                                                  */
/* ------------------------------------------------------------------ */

export async function addResourceBlock(
  supabase: UserScopedClient,
  speakerId: string,
  fanfletId: string,
  entitlements: SpeakerEntitlements,
  input: AddResourceBlockInput
): Promise<ServiceResult<{ id: string }>> {
  if (input.type === "sponsor") {
    if (!entitlements.features.has("sponsor_visibility")) {
      return err("upgrade_required", "Sponsor blocks require a higher plan. Upgrade in Settings.", {
        feature: "sponsor_visibility",
        currentPlan: entitlements.planName ?? undefined,
      });
    }
    if (input.sponsor_account_id) {
      const { data: conn } = await supabase
        .from("sponsor_connections")
        .select("id")
        .eq("speaker_id", speakerId)
        .eq("sponsor_id", input.sponsor_account_id)
        .eq("status", "active")
        .maybeSingle();
      if (!conn) {
        return err("validation_error", "Selected sponsor is not connected. Choose a connected sponsor or leave unlinked.");
      }
    }
  }

  const sectionName = input.section_name ?? (input.type === "sponsor" ? "Featured Partners" : "Resources");
  const title = input.title?.trim() ?? "";

  const { data: libItem, error: libError } = await supabase
    .from("resource_library")
    .insert({
      speaker_id: speakerId,
      type: input.type,
      title: title || "Untitled",
      description: input.description ?? null,
      url: ensureUrl(input.url),
      file_path: input.file_path ?? null,
      image_url: input.image_url ?? null,
      section_name: sectionName,
      metadata: input.metadata ?? {},
    })
    .select("id")
    .single();

  if (libError) return err("internal_error", libError.message);
  if (!libItem) return err("internal_error", "Failed to create library resource");

  const nextOrder = await getNextDisplayOrder(supabase, fanfletId);

  const insertData: Record<string, unknown> = {
    fanflet_id: fanfletId,
    library_item_id: libItem.id,
    type: input.type,
    title: title || "",
    description: input.description ?? null,
    url: ensureUrl(input.url),
    file_path: input.type === "file" ? null : (input.file_path ?? null),
    image_url: input.image_url ?? null,
    display_order: nextOrder,
    section_name: sectionName,
    metadata: input.metadata ?? {},
  };
  if (input.type === "sponsor" && input.sponsor_account_id) {
    insertData.sponsor_account_id = input.sponsor_account_id;
  }

  const { data: block, error } = await supabase
    .from("resource_blocks")
    .insert(insertData)
    .select("id")
    .single();

  if (error) {
    await supabase.from("resource_library").delete().eq("id", libItem.id).eq("speaker_id", speakerId);
    return err("internal_error", error.message);
  }

  return ok({ id: block.id });
}

export async function updateResourceBlock(
  supabase: UserScopedClient,
  blockId: string,
  input: UpdateResourceBlockInput
): Promise<ServiceResult<{ fanfletId: string }>> {
  const { data: block } = await supabase
    .from("resource_blocks")
    .select("fanflet_id")
    .eq("id", blockId)
    .single();

  if (!block) return err("not_found", "Block not found");

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.url !== undefined) updateData.url = ensureUrl(input.url);
  if (input.file_path !== undefined) updateData.file_path = input.file_path;
  if (input.image_url !== undefined) updateData.image_url = input.image_url;
  if (input.section_name !== undefined) updateData.section_name = input.section_name;
  if (input.metadata !== undefined) updateData.metadata = input.metadata;
  if (input.sponsor_account_id !== undefined) updateData.sponsor_account_id = input.sponsor_account_id || null;

  const { error } = await supabase.from("resource_blocks").update(updateData).eq("id", blockId);
  if (error) return err("internal_error", error.message);
  return ok({ fanfletId: block.fanflet_id });
}

export async function deleteResourceBlock(
  supabase: UserScopedClient,
  blockId: string
): Promise<ServiceResult<{ fanfletId: string }>> {
  const { data: block } = await supabase
    .from("resource_blocks")
    .select("fanflet_id")
    .eq("id", blockId)
    .single();

  if (!block) return err("not_found", "Block not found");

  const { error } = await supabase.from("resource_blocks").delete().eq("id", blockId);
  if (error) return err("internal_error", error.message);
  return ok({ fanfletId: block.fanflet_id });
}

export async function reorderBlock(
  supabase: UserScopedClient,
  blockId: string,
  direction: "up" | "down"
): Promise<ServiceResult<{ fanfletId: string }>> {
  const { data: block } = await supabase
    .from("resource_blocks")
    .select("id, fanflet_id, display_order")
    .eq("id", blockId)
    .single();

  if (!block) return err("not_found", "Block not found");

  const { data: blocks } = await supabase
    .from("resource_blocks")
    .select("id, display_order")
    .eq("fanflet_id", block.fanflet_id)
    .order("display_order", { ascending: true });

  if (!blocks || blocks.length < 2) return ok({ fanfletId: block.fanflet_id });

  const myIndex = blocks.findIndex((b) => b.id === blockId);
  if (myIndex === -1) return err("not_found", "Block not found");

  const swapIndex = direction === "up" ? myIndex - 1 : myIndex + 1;
  if (swapIndex < 0 || swapIndex >= blocks.length) return ok({ fanfletId: block.fanflet_id });

  const myOrder = blocks[myIndex].display_order;
  const swapOrder = blocks[swapIndex].display_order;
  const now = new Date().toISOString();

  const { error: err1 } = await supabase
    .from("resource_blocks")
    .update({ display_order: swapOrder, updated_at: now })
    .eq("id", blockId);

  if (err1) return err("internal_error", err1.message);

  const { error: err2 } = await supabase
    .from("resource_blocks")
    .update({ display_order: myOrder, updated_at: now })
    .eq("id", blocks[swapIndex].id);

  if (err2) return err("internal_error", err2.message);

  return ok({ fanfletId: block.fanflet_id });
}

export async function addLibraryBlockToFanflet(
  supabase: UserScopedClient,
  speakerId: string,
  fanfletId: string,
  libraryItemId: string,
  mode: "static" | "dynamic"
): Promise<ServiceResult<{ id: string }>> {
  const { data: libItem, error: libError } = await supabase
    .from("resource_library")
    .select("*")
    .eq("id", libraryItemId)
    .single();

  if (libError || !libItem) return err("not_found", "Library resource not found");

  let sponsorAccountIdToLink: string | null = null;
  if (libItem.type === "sponsor" && libItem.default_sponsor_account_id) {
    const { data: conn } = await supabase
      .from("sponsor_connections")
      .select("id")
      .eq("speaker_id", speakerId)
      .eq("sponsor_id", libItem.default_sponsor_account_id)
      .eq("status", "active")
      .maybeSingle();
    if (conn) sponsorAccountIdToLink = libItem.default_sponsor_account_id;
  }

  const nextOrder = await getNextDisplayOrder(supabase, fanfletId);

  const insertPayload: Record<string, unknown> = {
    fanflet_id: fanfletId,
    type: libItem.type,
    title: libItem.title,
    description: libItem.description,
    url: libItem.url,
    file_path: mode === "dynamic" && libItem.type === "file" ? null : libItem.file_path,
    image_url: libItem.image_url,
    display_order: nextOrder,
    section_name: libItem.section_name,
    metadata: libItem.metadata ?? {},
  };

  if (mode === "dynamic") insertPayload.library_item_id = libraryItemId;
  if (sponsorAccountIdToLink) insertPayload.sponsor_account_id = sponsorAccountIdToLink;

  const { data: block, error } = await supabase
    .from("resource_blocks")
    .insert(insertPayload)
    .select("id")
    .single();

  if (error) return err("internal_error", error.message);
  return ok({ id: block.id });
}
