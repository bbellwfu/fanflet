import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { exportSponsorAnalyticsCSV } from "@fanflet/core";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "30";
  const speakerIdFilter = searchParams.get("speakerId") || "all";
  const campaignIdFilter = searchParams.get("campaignId") || "all";
  const type = (searchParams.get("type") as "aggregated" | "raw") || "aggregated";
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!sponsor) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // 1. Resolve Scope
  const [connectionsRes, campaignsRes] = await Promise.all([
    supabase.from("sponsor_connections").select("speaker_id").eq("sponsor_id", sponsor.id).eq("status", "active"),
    supabase.from("sponsor_campaigns").select("id, name, all_speakers_assigned").eq("sponsor_id", sponsor.id),
  ]);

  let availableSpeakerIds = (connectionsRes.data ?? []).map(c => c.speaker_id);
  const availableCampaigns = campaignsRes.data ?? [];

  if (campaignIdFilter !== "all") {
    const selectedCampaign = availableCampaigns.find(c => c.id === campaignIdFilter);
    if (selectedCampaign && !selectedCampaign.all_speakers_assigned) {
      const { data: kolRes } = await supabase.from("sponsor_campaign_speakers").select("speaker_id").eq("campaign_id", campaignIdFilter);
      const campaignKOLs = (kolRes ?? []).map(k => k.speaker_id);
      availableSpeakerIds = availableSpeakerIds.filter(id => campaignKOLs.includes(id));
    }
  }

  if (speakerIdFilter !== "all") {
    availableSpeakerIds = availableSpeakerIds.includes(speakerIdFilter) ? [speakerIdFilter] : [];
  }

  if (availableSpeakerIds.length === 0) {
    return new NextResponse("", { status: 200, headers: { "Content-Type": "text/csv" } });
  }

  // 2. Resolve Fanflets and Blocks
  const { data: fanflets } = await supabase.from("fanflets").select("id").in("speaker_id", availableSpeakerIds);
  const fanfletIds = (fanflets ?? []).map(f => f.id);

  if (fanfletIds.length === 0) {
    return new NextResponse("", { status: 200, headers: { "Content-Type": "text/csv" } });
  }

  let blockQuery = supabase.from("resource_blocks").select("id").eq("sponsor_account_id", sponsor.id).in("fanflet_id", fanfletIds);
  if (campaignIdFilter !== "all") {
    const { data: rc } = await supabase.from("sponsor_resource_campaigns").select("resource_id").eq("campaign_id", campaignIdFilter);
    const libIds = (rc ?? []).map(r => r.resource_id);
    if (libIds.length > 0) blockQuery = blockQuery.in("sponsor_library_item_id", libIds);
    else blockQuery = blockQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  }

  const { data: blocks } = await blockQuery;
  const blockIds = (blocks ?? []).map(b => b.id);

  if (blockIds.length === 0) {
    return new NextResponse("", { status: 200, headers: { "Content-Type": "text/csv" } });
  }

  // 3. Resolve Date Range
  let dateRange;
  if (range === "custom" && fromParam) {
    const fromDate = new Date(fromParam);
    const toDate = toParam ? new Date(toParam) : new Date();
    if (toParam && !toParam.includes("T")) toDate.setHours(23, 59, 59, 999);
    dateRange = { from: fromDate.toISOString(), to: toDate.toISOString() };
  } else if (range !== "all") {
    const days = parseInt(range.replace("d", ""), 10);
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
    dateRange = { from: fromDate.toISOString(), to: toDate.toISOString() };
  }

  // 4. Generate CSV using Core
  const result = await exportSponsorAnalyticsCSV(
    supabase,
    sponsor.id,
    fanfletIds,
    blockIds,
    dateRange,
    type
  );

  if (result.error) {
    return new NextResponse(result.error.message, { status: 500 });
  }

  const filename = `sponsor_analytics_${type}_${range}_${new Date().toISOString().split('T')[0]}.csv`;

  return new NextResponse(result.data, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
