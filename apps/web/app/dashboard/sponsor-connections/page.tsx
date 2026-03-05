import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SponsorDirectory } from "./sponsor-directory";
import { ConnectionRow } from "./connection-row";
import { listAvailableSponsors } from "./actions";
import { getSpeakerEntitlements } from "@fanflet/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function SponsorConnectionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id, name, bio, photo_url")
    .eq("auth_user_id", user.id)
    .single();

  if (!speaker) redirect("/dashboard/settings");

  const allowSponsorVisibility = (await getSpeakerEntitlements(speaker.id)).features.has("sponsor_visibility");

  if (!allowSponsorVisibility) {
    return (
      <div className="max-w-2xl space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sponsor connections</h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>Sponsor blocks and connections are available on higher plans.</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/settings#subscription">View plans</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [connectionsResult, availableResult] = await Promise.all([
    supabase
      .from("sponsor_connections")
      .select(`
        id, status, initiated_by, message, created_at, ended_at,
        sponsor_accounts ( id, company_name, slug )
      `)
      .eq("speaker_id", speaker.id)
      .or("hidden_by_speaker.is.null,hidden_by_speaker.eq.false")
      .order("created_at", { ascending: false }),
    listAvailableSponsors(),
  ]);

  const connections = connectionsResult.data;
  const list = (connections ?? []).map((c) => {
    const row = c as Record<string, unknown>;
    const acc = row.sponsor_accounts as { company_name?: string; slug?: string } | { company_name?: string; slug?: string }[] | null;
    const sponsorAccount = Array.isArray(acc) ? acc[0] : acc;
    return {
      id: row.id as string,
      status: row.status as string,
      initiatedBy: row.initiated_by as string,
      message: (row.message as string | null) ?? null,
      createdAt: row.created_at as string,
      endedAt: (row.ended_at as string | null) ?? null,
      companyName: sponsorAccount?.company_name ?? "—",
      sponsorSlug: sponsorAccount?.slug ?? null,
    };
  });

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sponsor connections</h1>
        <p className="text-muted-foreground">
          Browse verified sponsors and connect to share their content in your fanflets.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sponsor directory</CardTitle>
          <CardDescription>
            Verified sponsors available for connection. Select a sponsor to send a connection request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SponsorDirectory
            sponsors={availableResult.sponsors}
            speakerProfile={{
              name: speaker.name ?? "",
              bio: speaker.bio ?? null,
              photoUrl: speaker.photo_url ?? null,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your connections</CardTitle>
          <CardDescription>Pending, active, and declined connection requests.</CardDescription>
        </CardHeader>
        <CardContent>
          {list.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No connections yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {list.map((conn) => (
                <ConnectionRow
                  key={conn.id}
                  id={conn.id}
                  companyName={conn.companyName}
                  status={conn.status}
                  initiatedBy={conn.initiatedBy}
                  createdAt={conn.createdAt}
                  endedAt={conn.endedAt}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
