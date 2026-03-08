import type { SupabaseClient } from "@supabase/supabase-js";
import { McpToolError } from "../../types";

export async function adminListSponsors(
  serviceClient: SupabaseClient,
  input: {
    search?: string;
    verificationStatus?: string;
    limit: number;
    offset: number;
  }
) {
  let query = serviceClient
    .from("sponsor_accounts")
    .select(
      "id, company_name, slug, contact_email, industry, logo_url, is_verified, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(input.offset, input.offset + input.limit - 1);

  if (input.search) {
    query = query.or(
      `company_name.ilike.%${input.search}%,contact_email.ilike.%${input.search}%,slug.ilike.%${input.search}%`
    );
  }

  if (input.verificationStatus === "verified") {
    query = query.eq("is_verified", true);
  } else if (input.verificationStatus === "unverified") {
    query = query.eq("is_verified", false);
  }

  const { data: sponsors, count, error } = await query;
  if (error) throw new McpToolError("Failed to fetch sponsors");

  const withCounts = await Promise.all(
    (sponsors ?? []).map(async (s) => {
      const [connResult, leadResult] = await Promise.all([
        serviceClient
          .from("sponsor_connections")
          .select("id", { count: "exact", head: true })
          .eq("sponsor_id", s.id)
          .eq("status", "active"),
        serviceClient
          .from("sponsor_leads")
          .select("id", { count: "exact", head: true })
          .eq("sponsor_id", s.id),
      ]);

      return {
        ...s,
        connectionCount: connResult.count ?? 0,
        leadCount: leadResult.count ?? 0,
      };
    })
  );

  return { sponsors: withCounts, total: count ?? 0 };
}

export async function adminGetSponsor(
  serviceClient: SupabaseClient,
  sponsorId: string
) {
  const { data: sponsor, error } = await serviceClient
    .from("sponsor_accounts")
    .select("*")
    .eq("id", sponsorId)
    .single();

  if (error || !sponsor) throw new McpToolError("Sponsor not found");

  const [connResult, leadResult, resourceResult] = await Promise.all([
    serviceClient
      .from("sponsor_connections")
      .select("id, speaker_id, status, created_at")
      .eq("sponsor_id", sponsorId),
    serviceClient
      .from("sponsor_leads")
      .select("id", { count: "exact", head: true })
      .eq("sponsor_id", sponsorId),
    serviceClient
      .from("sponsor_resources")
      .select("id, title, type, status, created_at")
      .eq("sponsor_id", sponsorId),
  ]);

  return {
    ...sponsor,
    connections: connResult.data ?? [],
    leadCount: leadResult.count ?? 0,
    resources: resourceResult.data ?? [],
  };
}

export async function adminToggleSponsorVerification(
  serviceClient: SupabaseClient,
  sponsorId: string,
  verified: boolean
) {
  const { data: sponsor, error: lookupError } = await serviceClient
    .from("sponsor_accounts")
    .select("id, is_verified")
    .eq("id", sponsorId)
    .single();

  if (lookupError || !sponsor) throw new McpToolError("Sponsor not found");

  const { error } = await serviceClient
    .from("sponsor_accounts")
    .update({
      is_verified: verified,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sponsorId);

  if (error) throw new McpToolError("Failed to update verification status");
  return { success: true, verified };
}
