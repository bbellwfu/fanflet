import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, MousePointerClick, Link2, Bell } from "lucide-react";

export default async function SponsorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/sponsor/dashboard");

  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!sponsor) redirect("/sponsor/onboarding");

  const [
    { count: connectionsCount },
    { count: leadsCount },
    { count: pendingCount },
  ] = await Promise.all([
    supabase
      .from("sponsor_connections")
      .select("*", { count: "exact", head: true })
      .eq("sponsor_id", sponsor.id)
      .eq("status", "active"),
    supabase
      .from("sponsor_leads")
      .select("*", { count: "exact", head: true })
      .eq("sponsor_id", sponsor.id),
    supabase
      .from("sponsor_connections")
      .select("*", { count: "exact", head: true })
      .eq("sponsor_id", sponsor.id)
      .eq("status", "pending"),
  ]);

  const blockIdsRes = await supabase
    .from("resource_blocks")
    .select("id")
    .eq("sponsor_account_id", sponsor.id);

  const blockIds = (blockIdsRes.data ?? []).map((b) => b.id);
  let clicksCount = 0;
  if (blockIds.length > 0) {
    const { count } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "resource_click")
      .in("resource_block_id", blockIds);
    clicksCount = count ?? 0;
  }

  const pendingRequests = pendingCount ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your engagement and leads.</p>
      </div>

      {pendingRequests > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Bell className="h-5 w-5 text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-900">
              {pendingRequests} connection request{pendingRequests !== 1 ? "s" : ""} waiting for your review
            </p>
            <p className="text-xs text-amber-800 mt-0.5">
              Accept or decline speaker requests to control who can feature your content.
            </p>
          </div>
          <Link
            href="/sponsor/connections"
            className="shrink-0 inline-flex items-center rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            Review requests
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active connections</CardTitle>
            <Link2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{connectionsCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">Speakers you're connected with</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{leadsCount ?? 0}</p>
            <p className="text-xs text-muted-foreground">Consented subscribers who engaged</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total clicks</CardTitle>
            <MousePointerClick className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{clicksCount}</p>
            <p className="text-xs text-muted-foreground">Clicks on your content</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick links</CardTitle>
          <CardDescription>View and export leads, or manage speaker connections.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Link
            href="/sponsor/leads"
            className="inline-flex items-center rounded-md bg-[#1B365D] px-4 py-2 text-sm font-medium text-white hover:bg-[#152b4d]"
          >
            View leads
          </Link>
          <Link
            href="/sponsor/connections"
            className="inline-flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Connections
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
