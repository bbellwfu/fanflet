import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SponsorLeadsClient } from "./leads-client";

export default async function SponsorLeadsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/sponsor/leads");

  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!sponsor) redirect("/sponsor/onboarding");

  const [leadsResult, hiddenConnectionsResult] = await Promise.all([
    supabase
      .from("sponsor_leads")
      .select(`
        id, resource_title, engagement_type, created_at,
        subscribers ( email, name ),
        fanflet_id
      `)
      .eq("sponsor_id", sponsor.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("sponsor_connections")
      .select("speaker_id")
      .eq("sponsor_id", sponsor.id)
      .eq("hidden_by_sponsor", true),
  ]);

  const leadsRows = leadsResult.data ?? [];
  const hiddenSpeakerIds = new Set(
    (hiddenConnectionsResult.data ?? []).map((c) => c.speaker_id)
  );

  const fanfletIds = [...new Set(leadsRows.map((r) => (r as { fanflet_id: string }).fanflet_id))];
  const { data: fanflets } =
    fanfletIds.length > 0
      ? await supabase.from("fanflets").select("id, title, speaker_id").in("id", fanfletIds)
      : { data: [] };
  const speakerIds = [...new Set((fanflets ?? []).map((f) => f.speaker_id))];
  const { data: speakers } =
    speakerIds.length > 0
      ? await supabase.from("speakers").select("id, name").in("id", speakerIds)
      : { data: [] };

  const fanfletMap = new Map((fanflets ?? []).map((f) => [f.id, f]));
  const speakerMap = new Map((speakers ?? []).map((s) => [s.id, s]));

  const leads = leadsRows
    .filter((r) => {
      const fanfletId = (r as { fanflet_id: string }).fanflet_id;
      const fanflet = fanfletMap.get(fanfletId);
      return !fanflet || !hiddenSpeakerIds.has(fanflet.speaker_id);
    })
    .map((r) => {
    const row = r as Record<string, unknown>;
    const sub = row.subscribers as { email?: string; name?: string | null } | { email?: string; name?: string | null }[] | null;
    const subscriber = Array.isArray(sub) ? sub[0] : sub;
    const fanfletId = row.fanflet_id as string;
    const fanflet = fanfletMap.get(fanfletId);
    const speaker = fanflet ? speakerMap.get(fanflet.speaker_id) : null;
    return {
      id: row.id as string,
      email: subscriber?.email ?? "",
      name: subscriber?.name ?? null,
      fanfletTitle: fanflet?.title ?? "—",
      speakerName: speaker?.name ?? "—",
      resourceTitle: (row.resource_title as string | null) ?? null,
      engagementType: row.engagement_type as string,
      createdAt: row.created_at as string,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leads</h1>
        <p className="text-muted-foreground">
          Consented subscribers who engaged with your content.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Lead list</CardTitle>
          <CardDescription>Export as CSV to use in your CRM or email tools.</CardDescription>
        </CardHeader>
        <CardContent>
          <SponsorLeadsClient leads={leads} />
        </CardContent>
      </Card>
    </div>
  );
}
