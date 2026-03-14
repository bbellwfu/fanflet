import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  const { data: connections } = await connectionsQuery;

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
        </p>
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
