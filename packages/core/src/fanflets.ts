import type { UserScopedClient, SpeakerEntitlements, ServiceResult } from "./types";
import { ok, err } from "./types";

/* ------------------------------------------------------------------ */
/*  Input types                                                        */
/* ------------------------------------------------------------------ */

export interface CreateFanfletInput {
  title: string;
  event_name: string;
  slug: string;
  event_date?: string | null;
  show_event_name?: boolean;
  theme_config?: Record<string, unknown>;
  expiration_date?: string | null;
  expiration_preset?: string;
  show_expiration_notice?: boolean;
}

export interface UpdateFanfletInput {
  title?: string;
  description?: string | null;
  event_name?: string;
  show_event_name?: boolean;
  event_date?: string | null;
  slug?: string;
  survey_question_id?: string | null;
  survey_question_ids?: string[];
  theme_config?: Record<string, unknown>;
  expiration_date?: string | null;
  expiration_preset?: string;
  show_expiration_notice?: boolean;
  confirmation_email_config?: { enabled?: boolean; body?: string } | null;
}

/* ------------------------------------------------------------------ */
/*  Service functions                                                  */
/* ------------------------------------------------------------------ */

export async function createFanflet(
  supabase: UserScopedClient,
  speakerId: string,
  entitlements: SpeakerEntitlements,
  input: CreateFanfletInput
): Promise<ServiceResult<{ id: string; slug: string }>> {
  const maxFanflets = entitlements.limits.max_fanflets;
  if (typeof maxFanflets === "number" && maxFanflets !== -1) {
    const { count, error: countError } = await supabase
      .from("fanflets")
      .select("id", { count: "exact", head: true })
      .eq("speaker_id", speakerId);
    if (countError) return err("internal_error", "Could not check fanflet limit");
    if ((count ?? 0) >= maxFanflets) {
      return err(
        "limit_reached",
        `You've reached the limit of ${maxFanflets} Fanflets for your plan. Upgrade your subscription to create more.`
      );
    }
  }

  const { data: existing } = await supabase
    .from("fanflets")
    .select("id")
    .eq("speaker_id", speakerId)
    .eq("slug", input.slug)
    .maybeSingle();

  if (existing) {
    return err("conflict", "You already have a Fanflet with this URL slug");
  }

  const baseInsert: Record<string, unknown> = {
    speaker_id: speakerId,
    title: input.title,
    event_name: input.event_name,
    event_date: input.event_date ?? null,
    show_event_name: input.show_event_name ?? true,
    slug: input.slug,
    status: "draft",
    theme_config: input.theme_config ?? {},
  };

  let result = await supabase
    .from("fanflets")
    .insert({
      ...baseInsert,
      expiration_date: input.expiration_date ?? null,
      expiration_preset: input.expiration_preset ?? "none",
      show_expiration_notice: input.show_expiration_notice ?? true,
    })
    .select("id, slug")
    .single();

  if (
    result.error &&
    (result.error.code === "42703" ||
      result.error.code === "PGRST204" ||
      result.error.message?.includes("schema cache"))
  ) {
    result = await supabase
      .from("fanflets")
      .insert(baseInsert)
      .select("id, slug")
      .single();
  }

  if (result.error) return err("internal_error", result.error.message);
  return ok({ id: result.data.id, slug: result.data.slug });
}

export async function publishFanflet(
  supabase: UserScopedClient,
  speakerId: string,
  fanfletId: string,
  computeExpirationDate?: (
    preset: string,
    customDate: string | null,
    referenceDate: Date
  ) => string | null
): Promise<ServiceResult<{ firstPublished: boolean }>> {
  const { count: existingPublishedCount } = await supabase
    .from("fanflets")
    .select("id", { count: "exact", head: true })
    .eq("speaker_id", speakerId)
    .eq("status", "published");

  const publishedAt = new Date();
  const basePayload: Record<string, unknown> = {
    status: "published",
    published_at: publishedAt.toISOString(),
    updated_at: publishedAt.toISOString(),
  };

  if (computeExpirationDate) {
    const { data: current } = await supabase
      .from("fanflets")
      .select("expiration_preset")
      .eq("id", fanfletId)
      .single();

    const preset = current?.expiration_preset as string | undefined;
    if (preset === "30d" || preset === "60d" || preset === "90d") {
      basePayload.expiration_date = computeExpirationDate(preset, null, publishedAt);
    }
  }

  let result = await supabase.from("fanflets").update(basePayload).eq("id", fanfletId);
  if (
    result.error &&
    (result.error.code === "42703" ||
      result.error.code === "PGRST204" ||
      result.error.message?.includes("schema cache"))
  ) {
    const { expiration_date: _drop, ...safePayload } = basePayload;
    result = await supabase.from("fanflets").update(safePayload).eq("id", fanfletId);
  }

  if (result.error) return err("internal_error", result.error.message);
  return ok({ firstPublished: (existingPublishedCount ?? 0) === 0 });
}

export async function unpublishFanflet(
  supabase: UserScopedClient,
  fanfletId: string
): Promise<ServiceResult> {
  const { error } = await supabase
    .from("fanflets")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("id", fanfletId);

  if (error) return err("internal_error", error.message);
  return ok(undefined);
}

export async function updateFanfletDetails(
  supabase: UserScopedClient,
  speakerId: string,
  fanfletId: string,
  input: UpdateFanfletInput
): Promise<ServiceResult> {
  if (input.slug) {
    const { data: existing } = await supabase
      .from("fanflets")
      .select("id")
      .eq("speaker_id", speakerId)
      .eq("slug", input.slug)
      .neq("id", fanfletId)
      .maybeSingle();

    if (existing) {
      return err("conflict", "You already have a Fanflet with this URL slug");
    }
  }

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.title !== undefined) updatePayload.title = input.title;
  if (input.description !== undefined) updatePayload.description = input.description ?? null;
  if (input.event_name !== undefined) updatePayload.event_name = input.event_name;
  if (input.show_event_name !== undefined) updatePayload.show_event_name = input.show_event_name;
  if (input.event_date !== undefined) updatePayload.event_date = input.event_date ?? null;
  if (input.slug !== undefined) updatePayload.slug = input.slug;
  if (input.survey_question_id !== undefined) updatePayload.survey_question_id = input.survey_question_id ?? null;
  if (input.survey_question_ids !== undefined) updatePayload.survey_question_ids = input.survey_question_ids;
  if (input.theme_config !== undefined) updatePayload.theme_config = input.theme_config;
  if (input.confirmation_email_config !== undefined) updatePayload.confirmation_email_config = input.confirmation_email_config;

  const expirationFields: Record<string, unknown> = {};
  if (input.expiration_date !== undefined) expirationFields.expiration_date = input.expiration_date ?? null;
  if (input.expiration_preset !== undefined) expirationFields.expiration_preset = input.expiration_preset;
  if (input.show_expiration_notice !== undefined) expirationFields.show_expiration_notice = input.show_expiration_notice;

  const fullPayload = { ...updatePayload, ...expirationFields };

  let result = await supabase.from("fanflets").update(fullPayload).eq("id", fanfletId);
  if (
    result.error &&
    (result.error.code === "42703" ||
      result.error.code === "PGRST204" ||
      result.error.message?.includes("schema cache"))
  ) {
    result = await supabase.from("fanflets").update(updatePayload).eq("id", fanfletId);
  }

  if (result.error) return err("internal_error", result.error.message);
  return ok(undefined);
}

export async function cloneFanflet(
  supabase: UserScopedClient,
  speakerId: string,
  entitlements: SpeakerEntitlements,
  sourceFanfletId: string
): Promise<ServiceResult<{ id: string; slug: string }>> {
  const maxFanflets = entitlements.limits.max_fanflets;
  if (typeof maxFanflets === "number" && maxFanflets !== -1) {
    const { count, error: countError } = await supabase
      .from("fanflets")
      .select("id", { count: "exact", head: true })
      .eq("speaker_id", speakerId);
    if (countError) return err("internal_error", "Could not check fanflet limit");
    if ((count ?? 0) >= maxFanflets) {
      return err(
        "limit_reached",
        `You've reached the limit of ${maxFanflets} Fanflets for your plan. Upgrade your subscription to create more.`
      );
    }
  }

  const { data: source, error: sourceError } = await supabase
    .from("fanflets")
    .select(
      "id, speaker_id, title, description, event_name, event_date, slug, theme_config, survey_question_id, survey_question_ids, expiration_date, expiration_preset, show_expiration_notice"
    )
    .eq("id", sourceFanfletId)
    .eq("speaker_id", speakerId)
    .single();

  if (sourceError || !source) {
    return err("not_found", "Fanflet not found or you do not have permission to clone it.");
  }

  let candidateSlug = `${source.slug}-copy`;
  let suffix = 2;
  for (;;) {
    const { data: existing } = await supabase
      .from("fanflets")
      .select("id")
      .eq("speaker_id", speakerId)
      .eq("slug", candidateSlug)
      .maybeSingle();
    if (!existing) break;
    candidateSlug = `${source.slug}-copy-${suffix}`;
    suffix += 1;
  }

  const { data: newFanflet, error: insertError } = await supabase
    .from("fanflets")
    .insert({
      speaker_id: speakerId,
      title: `${source.title} (Copy)`,
      description: source.description,
      event_name: source.event_name,
      event_date: source.event_date,
      slug: candidateSlug,
      status: "draft",
      published_at: null,
      theme_config: source.theme_config,
      survey_question_id: source.survey_question_id,
      survey_question_ids: source.survey_question_ids ?? [],
      expiration_date: source.expiration_date,
      expiration_preset: source.expiration_preset,
      show_expiration_notice: source.show_expiration_notice,
    })
    .select("id, slug")
    .single();

  if (insertError) return err("internal_error", insertError.message);
  if (!newFanflet) return err("internal_error", "Failed to create cloned fanflet.");

  const { data: blocks, error: blocksError } = await supabase
    .from("resource_blocks")
    .select(
      "library_item_id, type, title, description, url, file_path, image_url, display_order, section_name, metadata"
    )
    .eq("fanflet_id", sourceFanfletId)
    .order("display_order", { ascending: true });

  if (blocksError) return err("internal_error", "Could not load resource blocks to copy.");

  if (blocks && blocks.length > 0) {
    const inserts = blocks.map((b) => ({
      fanflet_id: newFanflet.id,
      library_item_id: b.library_item_id,
      type: b.type,
      title: b.title ?? "",
      description: b.description ?? null,
      url: b.url ?? null,
      file_path: b.file_path ?? null,
      image_url: b.image_url ?? null,
      display_order: b.display_order,
      section_name: b.section_name ?? null,
      metadata: b.metadata ?? {},
    }));
    const { error: blocksInsertError } = await supabase.from("resource_blocks").insert(inserts);
    if (blocksInsertError) return err("internal_error", "Could not copy resource blocks.");
  }

  return ok({ id: newFanflet.id, slug: newFanflet.slug });
}

export async function getFanflet(
  supabase: UserScopedClient,
  fanfletId: string
): Promise<ServiceResult<Record<string, unknown>>> {
  const { data, error } = await supabase
    .from("fanflets")
    .select(
      `*, resource_blocks(id, type, title, description, url, file_path, image_url, display_order, section_name, metadata, sponsor_account_id, library_item_id), survey_questions(id, question_text)`
    )
    .eq("id", fanfletId)
    .single();

  if (error) return err("not_found", "Fanflet not found");
  return ok(data as Record<string, unknown>);
}

export async function listFanflets(
  supabase: UserScopedClient,
  speakerId: string,
  options?: { status?: string; limit?: number; offset?: number }
): Promise<ServiceResult<Record<string, unknown>[]>> {
  let query = supabase
    .from("fanflets")
    .select("id, title, slug, status, event_name, event_date, published_at, created_at, updated_at, expiration_date")
    .eq("speaker_id", speakerId)
    .order("updated_at", { ascending: false });

  if (options?.status) query = query.eq("status", options.status);
  if (options?.limit) query = query.limit(options.limit);
  if (options?.offset) query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);

  const { data, error } = await query;
  if (error) return err("internal_error", error.message);
  return ok((data ?? []) as Record<string, unknown>[]);
}
