import type { UserScopedClient, ServiceResult } from "./types";
import { ok, err } from "./types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SponsorConnection {
  id: string;
  sponsor_id: string;
  speaker_id: string;
  status: string;
  initiated_by: string;
  message: string | null;
  created_at: string;
  ended_at: string | null;
}

/* ------------------------------------------------------------------ */
/*  Speaker-side functions                                             */
/* ------------------------------------------------------------------ */

export async function requestSponsorConnection(
  supabase: UserScopedClient,
  speakerId: string,
  sponsorId: string,
  message?: string
): Promise<ServiceResult<{ connectionId: string }>> {
  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id")
    .eq("id", sponsorId)
    .single();

  if (!sponsor) return err("not_found", "Sponsor not found");

  const { data: existing } = await supabase
    .from("sponsor_connections")
    .select("id, status")
    .eq("speaker_id", speakerId)
    .eq("sponsor_id", sponsorId)
    .maybeSingle();

  if (existing) {
    if (existing.status === "active") {
      return err("conflict", "You already have an active connection with this sponsor.");
    }
    if (existing.status === "pending") {
      return err("conflict", "A connection request is already pending.");
    }
    const { error } = await supabase
      .from("sponsor_connections")
      .update({
        status: "pending",
        initiated_by: "speaker",
        message: message ?? null,
        ended_at: null,
        hidden_by_speaker: false,
        hidden_by_sponsor: false,
      })
      .eq("id", existing.id);
    if (error) return err("internal_error", error.message);
    return ok({ connectionId: existing.id });
  }

  const { data: conn, error } = await supabase
    .from("sponsor_connections")
    .insert({
      speaker_id: speakerId,
      sponsor_id: sponsorId,
      status: "pending",
      initiated_by: "speaker",
      message: message ?? null,
    })
    .select("id")
    .single();

  if (error) return err("internal_error", error.message);
  return ok({ connectionId: conn.id });
}

export async function endSpeakerSponsorConnection(
  supabase: UserScopedClient,
  speakerId: string,
  connectionId: string
): Promise<ServiceResult> {
  const { data: conn } = await supabase
    .from("sponsor_connections")
    .select("id, status, speaker_id")
    .eq("id", connectionId)
    .eq("speaker_id", speakerId)
    .single();

  if (!conn) return err("not_found", "Connection not found");
  if (conn.status !== "active") return err("validation_error", "Can only end active connections.");

  const { error } = await supabase
    .from("sponsor_connections")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", connectionId);

  if (error) return err("internal_error", error.message);
  return ok(undefined);
}

/* ------------------------------------------------------------------ */
/*  Sponsor-side functions                                             */
/* ------------------------------------------------------------------ */

export async function respondToConnection(
  supabase: UserScopedClient,
  sponsorId: string,
  connectionId: string,
  accept: boolean
): Promise<ServiceResult> {
  const { data: conn } = await supabase
    .from("sponsor_connections")
    .select("id, status, sponsor_id")
    .eq("id", connectionId)
    .eq("sponsor_id", sponsorId)
    .single();

  if (!conn) return err("not_found", "Connection not found");
  if (conn.status !== "pending") return err("validation_error", "Can only respond to pending requests.");

  const { error } = await supabase
    .from("sponsor_connections")
    .update({ status: accept ? "active" : "declined" })
    .eq("id", connectionId);

  if (error) return err("internal_error", error.message);
  return ok(undefined);
}

export async function endSponsorConnection(
  supabase: UserScopedClient,
  sponsorId: string,
  connectionId: string
): Promise<ServiceResult> {
  const { data: conn } = await supabase
    .from("sponsor_connections")
    .select("id, status, sponsor_id")
    .eq("id", connectionId)
    .eq("sponsor_id", sponsorId)
    .single();

  if (!conn) return err("not_found", "Connection not found");
  if (conn.status !== "active") return err("validation_error", "Can only end active connections.");

  const { error } = await supabase
    .from("sponsor_connections")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", connectionId);

  if (error) return err("internal_error", error.message);
  return ok(undefined);
}

export async function listSponsorConnections(
  supabase: UserScopedClient,
  sponsorId: string,
  options?: { status?: string; includeHidden?: boolean }
): Promise<ServiceResult<Record<string, unknown>[]>> {
  let query = supabase
    .from("sponsor_connections")
    .select("*, speakers(id, name, slug, email)")
    .eq("sponsor_id", sponsorId);

  if (!options?.includeHidden) {
    query = query.eq("hidden_by_sponsor", false);
  }
  if (options?.status) {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) return err("internal_error", error.message);
  return ok((data ?? []) as Record<string, unknown>[]);
}
