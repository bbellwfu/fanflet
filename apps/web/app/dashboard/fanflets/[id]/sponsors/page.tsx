import { createClient } from "@/lib/supabase/server";
import { getSpeakerEntitlements } from "@fanflet/db";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Eye, MousePointerClick, Users } from "lucide-react";
import { SponsorReportClient } from "./sponsor-report-client";

export default async function FanfletSponsorsReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: fanfletId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!speaker) redirect("/dashboard/settings");

  const { data: fanflet } = await supabase
    .from("fanflets")
    .select("id, title")
    .eq("id", fanfletId)
    .eq("speaker_id", speaker.id)
    .single();

  if (!fanflet) notFound();

  const entitlements = await getSpeakerEntitlements(speaker.id);
  const hasSponsorReports = entitlements.features.has("sponsor_reports");

  if (!hasSponsorReports) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href={`/dashboard/fanflets/${fanfletId}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Fanflet
        </Link>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Users className="w-12 h-12 text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700">Sponsor reports</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Sponsor engagement reports are available on Pro and Enterprise plans.
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard/settings#subscription">View plans</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Blocks with a linked sponsor on this fanflet
  const { data: sponsorBlocks } = await supabase
    .from("resource_blocks")
    .select("id, title, sponsor_account_id, sponsor_accounts(id, company_name, logo_url)")
    .eq("fanflet_id", fanfletId)
    .not("sponsor_account_id", "is", null);

  const sponsorIds = [...new Set((sponsorBlocks ?? []).map((b) => (b as Record<string, unknown>).sponsor_account_id as string))];
  const blockIdsBySponsor: Record<string, string[]> = {};
  const sponsorMeta: Record<string, { company_name: string; logo_url: string | null }> = {};

  for (const b of sponsorBlocks ?? []) {
    const row = b as Record<string, unknown>;
    const sid = row.sponsor_account_id as string;
    if (!sid) continue;
    if (!blockIdsBySponsor[sid]) blockIdsBySponsor[sid] = [];
    blockIdsBySponsor[sid].push(row.id as string);
    const acc = row.sponsor_accounts as { company_name: string; logo_url: string | null } | { company_name: string; logo_url: string | null }[] | null;
    const sponsorAccount = Array.isArray(acc) ? acc[0] : acc;
    if (sponsorAccount && !sponsorMeta[sid]) {
      sponsorMeta[sid] = {
        company_name: sponsorAccount.company_name,
        logo_url: sponsorAccount.logo_url,
      };
    }
  }

  // Page views for this fanflet (impressions; exclude portfolio revisits for sponsor accuracy)
  const { count: impressions } = await supabase
    .from("analytics_events")
    .select("*", { count: "exact", head: true })
    .eq("fanflet_id", fanfletId)
    .eq("event_type", "page_view")
    .or("source.is.null,source.neq.portfolio");

  // Clicks per sponsor (resource_click where resource_block_id in sponsor's blocks)
  const allBlockIds = Object.values(blockIdsBySponsor).flat();
  const { data: clickEvents } =
    allBlockIds.length > 0
      ? await supabase
          .from("analytics_events")
          .select("resource_block_id")
          .eq("fanflet_id", fanfletId)
          .eq("event_type", "resource_click")
          .in("resource_block_id", allBlockIds)
      : { data: [] };

  const clicksByBlock: Record<string, number> = {};
  for (const e of clickEvents ?? []) {
    const bid = e.resource_block_id as string;
    clicksByBlock[bid] = (clicksByBlock[bid] ?? 0) + 1;
  }

  const clicksBySponsor: Record<string, number> = {};
  for (const [sid, bids] of Object.entries(blockIdsBySponsor)) {
    clicksBySponsor[sid] = bids.reduce((sum, bid) => sum + (clicksByBlock[bid] ?? 0), 0);
  }

  // Leads per sponsor
  const { data: leadsRows } =
    sponsorIds.length > 0
      ? await supabase
          .from("sponsor_leads")
          .select("id, sponsor_id, subscriber_id, resource_title, engagement_type, created_at, subscribers(email, name)")
          .eq("fanflet_id", fanfletId)
          .in("sponsor_id", sponsorIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const leadsBySponsor: Record<
    string,
    Array<{
      id: string;
      email: string;
      name: string | null;
      resource_title: string | null;
      engagement_type: string;
      created_at: string;
    }>
  > = {};
  for (const row of leadsRows ?? []) {
    const r = row as Record<string, unknown>;
    const sub = r.subscribers as { email?: string; name?: string | null } | { email?: string; name?: string | null }[] | null;
    const subscriber = Array.isArray(sub) ? sub[0] : sub;
    const sponsorId = r.sponsor_id as string;
    if (!leadsBySponsor[sponsorId]) leadsBySponsor[sponsorId] = [];
    leadsBySponsor[sponsorId].push({
      id: r.id as string,
      email: subscriber?.email ?? "",
      name: subscriber?.name ?? null,
      resource_title: (r.resource_title as string | null) ?? null,
      engagement_type: r.engagement_type as string,
      created_at: r.created_at as string,
    });
  }

  const sponsors = sponsorIds.map((sid) => ({
    id: sid,
    company_name: sponsorMeta[sid]?.company_name ?? "Unknown",
    logo_url: sponsorMeta[sid]?.logo_url ?? null,
    impressions: impressions ?? 0,
    clicks: clicksBySponsor[sid] ?? 0,
    leadCount: (leadsBySponsor[sid] ?? []).length,
    leads: leadsBySponsor[sid] ?? [],
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/fanflets/${fanfletId}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-1"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Fanflet
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Sponsor report
          </h1>
          <p className="text-muted-foreground">{fanflet.title}</p>
        </div>
      </div>

      {sponsors.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No sponsor blocks linked yet.</p>
            <p className="text-sm mt-1">
              Add sponsor blocks to this Fanflet and link them to a sponsor to see engagement and leads here.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href={`/dashboard/fanflets/${fanfletId}`}>Edit Fanflet</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <SponsorReportClient
          fanfletId={fanfletId}
          fanfletTitle={fanflet.title}
          sponsors={sponsors}
        />
      )}
    </div>
  );
}
