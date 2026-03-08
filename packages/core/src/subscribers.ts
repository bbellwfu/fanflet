import type { UserScopedClient, ServiceResult } from "./types";
import { ok, err } from "./types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SubscriberRow {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  source_fanflet_id: string | null;
  source_fanflet_title: string | null;
}

/* ------------------------------------------------------------------ */
/*  Service functions                                                  */
/* ------------------------------------------------------------------ */

export async function listSubscribers(
  supabase: UserScopedClient,
  speakerId: string
): Promise<ServiceResult<SubscriberRow[]>> {
  const { data: subscribers, error } = await supabase
    .from("subscribers")
    .select("id, email, name, created_at, source_fanflet_id")
    .eq("speaker_id", speakerId)
    .order("created_at", { ascending: false });

  if (error) return err("internal_error", error.message);

  const fanfletIds = [
    ...new Set(
      (subscribers ?? [])
        .map((s) => s.source_fanflet_id)
        .filter(Boolean) as string[]
    ),
  ];

  let fanfletTitles: Record<string, string> = {};
  if (fanfletIds.length > 0) {
    const { data: fanflets } = await supabase
      .from("fanflets")
      .select("id, title")
      .in("id", fanfletIds);

    if (fanflets) {
      fanfletTitles = Object.fromEntries(fanflets.map((f) => [f.id, f.title]));
    }
  }

  const rows: SubscriberRow[] = (subscribers ?? []).map((s) => ({
    id: s.id,
    email: s.email,
    name: s.name,
    created_at: s.created_at,
    source_fanflet_id: s.source_fanflet_id,
    source_fanflet_title: s.source_fanflet_id
      ? (fanfletTitles[s.source_fanflet_id] ?? null)
      : null,
  }));

  return ok(rows);
}

export async function getSubscriberCount(
  supabase: UserScopedClient,
  speakerId: string,
  fanfletId?: string
): Promise<ServiceResult<{ total: number }>> {
  let query = supabase
    .from("subscribers")
    .select("id", { count: "exact", head: true })
    .eq("speaker_id", speakerId);

  if (fanfletId) query = query.eq("source_fanflet_id", fanfletId);

  const { count, error } = await query;
  if (error) return err("internal_error", error.message);
  return ok({ total: count ?? 0 });
}

export async function deleteSubscriber(
  supabase: UserScopedClient,
  speakerId: string,
  subscriberId: string
): Promise<ServiceResult> {
  const { error } = await supabase
    .from("subscribers")
    .delete()
    .eq("id", subscriberId)
    .eq("speaker_id", speakerId);

  if (error) return err("internal_error", error.message);
  return ok(undefined);
}

export async function deleteSubscribers(
  supabase: UserScopedClient,
  speakerId: string,
  subscriberIds: string[]
): Promise<ServiceResult<{ deletedCount: number }>> {
  if (subscriberIds.length === 0) return err("validation_error", "No subscribers selected");

  const { error, count } = await supabase
    .from("subscribers")
    .delete({ count: "exact" })
    .in("id", subscriberIds)
    .eq("speaker_id", speakerId);

  if (error) return err("internal_error", error.message);
  return ok({ deletedCount: count ?? 0 });
}
