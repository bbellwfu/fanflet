import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { loadSponsorEntitlements } from "@fanflet/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { ConnectionsList } from "./connections-list";

export default async function SponsorConnectionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/sponsor/connections");

  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id, demo_environment_id, speaker_label")
    .eq("auth_user_id", user.id)
    .single();

  if (!sponsor) redirect("/sponsor/onboarding");

  const speakerLabel = sponsor.speaker_label ?? "speaker";

  let connectionsQuery = supabase
    .from("sponsor_connections")
    .select(`
      id, status, initiated_by, message, created_at, responded_at, ended_at,
      speakers ( id, name, slug )
    `)
    .eq("sponsor_id", sponsor.id)
    .or("hidden_by_sponsor.is.null,hidden_by_sponsor.eq.false")
    .order("created_at", { ascending: false });

  if (sponsor.demo_environment_id) {
    const { data: speakersInDemo } = await supabase
      .from("speakers")
      .select("id")
      .eq("demo_environment_id", sponsor.demo_environment_id);
    const speakerIds = (speakersInDemo ?? []).map((s) => s.id);
    if (speakerIds.length > 0) {
      connectionsQuery = connectionsQuery.in("speaker_id", speakerIds);
    } else {
      connectionsQuery = connectionsQuery.eq("speaker_id", "00000000-0000-0000-0000-000000000000");
    }
  }

  const [{ data: connections }, entitlements] = await Promise.all([
    connectionsQuery,
    loadSponsorEntitlements(supabase, sponsor.id),
  ]);

  const activeCount = (connections ?? []).filter(
    (c) => (c as Record<string, unknown>).status === "active" && !(c as Record<string, unknown>).ended_at
  ).length;
  const maxConnections = entitlements.limits.max_connections;
  const hasLimit = typeof maxConnections === "number" && maxConnections !== -1;
  const atLimit = hasLimit && activeCount >= maxConnections;

  const list = (connections ?? []).map((c) => {
    const row = c as Record<string, unknown>;
    const speakers = row.speakers as { name?: string | null; slug?: string | null } | { name?: string | null; slug?: string | null }[] | null;
    const speaker = Array.isArray(speakers) ? speakers[0] : speakers;
    return {
      id: row.id as string,
      status: row.status as string,
      initiatedBy: row.initiated_by as string,
      message: (row.message as string | null) ?? null,
      createdAt: row.created_at as string,
      respondedAt: (row.responded_at as string | null) ?? null,
      endedAt: (row.ended_at as string | null) ?? null,
      speakerName: speaker?.name ?? (speakerLabel[0].toUpperCase() + speakerLabel.slice(1)),
      speakerSlug: speaker?.slug ?? null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Connections</h1>
        <p className="text-muted-foreground">
          {speakerLabel[0].toUpperCase() + speakerLabel.slice(1)} connection requests. Accept to allow them to link your company to their fanflets.
          {hasLimit && (
            <span className={`ml-2 text-sm font-medium ${atLimit ? "text-amber-600" : "text-muted-foreground"}`}>
              ({activeCount}/{maxConnections} active)
            </span>
          )}
        </p>
        {atLimit && (
          <p className="text-sm text-amber-600 mt-1">
            You&apos;ve reached the connection limit for your plan. <Link href="/sponsor/settings" className="underline font-medium">Upgrade to Sponsor Studio</Link> for unlimited connections.
          </p>
        )}
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Connection requests</CardTitle>
          <CardDescription>Pending requests need your response.</CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectionsList connections={list} speakerLabel={speakerLabel} />
        </CardContent>
      </Card>
    </div>
  );
}
