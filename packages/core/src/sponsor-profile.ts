import type { UserScopedClient, ServiceResult } from "./types";
import { ok, err } from "./types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface UpdateSponsorProfileInput {
  company_name?: string;
  slug?: string;
  description?: string;
  contact_email?: string;
  website_url?: string;
  industry?: string;
}

/* ------------------------------------------------------------------ */
/*  Service functions                                                  */
/* ------------------------------------------------------------------ */

export async function getSponsorProfile(
  supabase: UserScopedClient,
  sponsorId: string
): Promise<ServiceResult<Record<string, unknown>>> {
  const { data, error } = await supabase
    .from("sponsor_accounts")
    .select("*")
    .eq("id", sponsorId)
    .single();

  if (error) return err("not_found", "Sponsor profile not found");
  return ok(data as Record<string, unknown>);
}

export async function updateSponsorProfile(
  supabase: UserScopedClient,
  sponsorId: string,
  input: UpdateSponsorProfileInput
): Promise<ServiceResult> {
  if (input.slug) {
    const { data: existing } = await supabase
      .from("sponsor_accounts")
      .select("id")
      .eq("slug", input.slug)
      .neq("id", sponsorId)
      .maybeSingle();

    if (existing) return err("conflict", "This URL slug is already taken.");
  }

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.company_name !== undefined) updateData.company_name = input.company_name;
  if (input.slug !== undefined) updateData.slug = input.slug;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.contact_email !== undefined) updateData.contact_email = input.contact_email;
  if (input.website_url !== undefined) updateData.website_url = input.website_url;
  if (input.industry !== undefined) updateData.industry = input.industry;

  const { error } = await supabase.from("sponsor_accounts").update(updateData).eq("id", sponsorId);
  if (error) return err("internal_error", error.message);
  return ok(undefined);
}

export async function checkSponsorSlugAvailability(
  supabase: UserScopedClient,
  sponsorId: string,
  slug: string
): Promise<ServiceResult<{ available: boolean }>> {
  const { data: existing } = await supabase
    .from("sponsor_accounts")
    .select("id")
    .eq("slug", slug)
    .neq("id", sponsorId)
    .maybeSingle();

  return ok({ available: !existing });
}

export async function updateSponsorLogo(
  supabase: UserScopedClient,
  sponsorId: string,
  logoUrl: string
): Promise<ServiceResult> {
  const { error } = await supabase
    .from("sponsor_accounts")
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq("id", sponsorId);

  if (error) return err("internal_error", error.message);
  return ok(undefined);
}

export async function removeSponsorLogo(
  supabase: UserScopedClient,
  sponsorId: string
): Promise<ServiceResult> {
  const { error } = await supabase
    .from("sponsor_accounts")
    .update({ logo_url: null, updated_at: new Date().toISOString() })
    .eq("id", sponsorId);

  if (error) return err("internal_error", error.message);
  return ok(undefined);
}

export async function getSponsorLeads(
  supabase: UserScopedClient,
  sponsorId: string,
  options?: { excludeHiddenConnections?: boolean }
): Promise<ServiceResult<Record<string, unknown>[]>> {
  let hiddenSpeakerIds: string[] = [];
  if (options?.excludeHiddenConnections) {
    const { data: hiddenConns } = await supabase
      .from("sponsor_connections")
      .select("speaker_id")
      .eq("sponsor_id", sponsorId)
      .eq("hidden_by_sponsor", true);
    hiddenSpeakerIds = (hiddenConns ?? []).map((c) => c.speaker_id);
  }

  let query = supabase
    .from("sponsor_leads")
    .select("*, subscribers(email, name), fanflets(title, slug), speakers(name, slug)")
    .eq("sponsor_id", sponsorId)
    .order("created_at", { ascending: false });

  if (hiddenSpeakerIds.length > 0) {
    query = query.not("speaker_id", "in", `(${hiddenSpeakerIds.join(",")})`);
  }

  const { data, error } = await query;
  if (error) return err("internal_error", error.message);
  return ok((data ?? []) as Record<string, unknown>[]);
}
