import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Users, ArrowUpRight, MousePointerClick } from "lucide-react";
import DashboardChart from "@/components/dashboard-chart";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id, name")
    .eq("auth_user_id", user.id)
    .single();

  if (!speaker) redirect("/dashboard/settings");

  const displayName = speaker.name || user.user_metadata?.full_name || user.email?.split("@")[0] || "there";

  // Fetch speaker's fanflets
  const { data: fanflets } = await supabase
    .from("fanflets")
    .select("id, title, slug, status, event_name, event_date, created_at")
    .eq("speaker_id", speaker.id)
    .order("updated_at", { ascending: false });

  const fanfletIds = (fanflets ?? []).map((f) => f.id);

  // Total subscribers (speaker-level)
  const { count: subscriberCount } = await supabase
    .from("subscribers")
    .select("*", { count: "exact", head: true })
    .eq("speaker_id", speaker.id);

  // Total page views (across all speaker's fanflets)
  let pageViewCount = 0;
  if (fanfletIds.length > 0) {
    const { count } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "page_view")
      .in("fanflet_id", fanfletIds);
    pageViewCount = count ?? 0;
  }

  // Total resource clicks
  let resourceClickCount = 0;
  if (fanfletIds.length > 0) {
    const { count } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("event_type", "resource_click")
      .in("fanflet_id", fanfletIds);
    resourceClickCount = count ?? 0;
  }

  // Chart data: last 60 days - subscribers, page_views, resource_clicks by date
  const chartData: { date: string; subscribers: number; pageViews: number; resourceClicks: number }[] = [];
  const now = new Date();

  for (let i = 59; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    chartData.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      subscribers: 0,
      pageViews: 0,
      resourceClicks: 0,
    });
  }

  if (fanfletIds.length > 0) {
    // Subscribers by created_at
    const { data: subsByDate } = await supabase
      .from("subscribers")
      .select("created_at")
      .eq("speaker_id", speaker.id)
      .gte("created_at", new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString());

    // Analytics events by date
    const { data: events } = await supabase
      .from("analytics_events")
      .select("event_type, created_at")
      .in("fanflet_id", fanfletIds)
      .gte("created_at", new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString());

    const dateCounts: Record<string, { subscribers: number; pageViews: number; resourceClicks: number }> = {};
    chartData.forEach((row, idx) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (59 - idx));
      const key = d.toISOString().split("T")[0];
      dateCounts[key] = { subscribers: 0, pageViews: 0, resourceClicks: 0 };
    });

    subsByDate?.forEach((s) => {
      const key = (s.created_at as string).split("T")[0];
      if (dateCounts[key]) dateCounts[key].subscribers++;
    });

    events?.forEach((e) => {
      const key = (e.created_at as string).split("T")[0];
      if (dateCounts[key]) {
        if (e.event_type === "page_view") dateCounts[key].pageViews++;
        else if (e.event_type === "resource_click") dateCounts[key].resourceClicks++;
      }
    });

    chartData.forEach((row, idx) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (59 - idx));
      const key = d.toISOString().split("T")[0];
      const counts = dateCounts[key];
      if (counts) {
        row.subscribers = counts.subscribers;
        row.pageViews = counts.pageViews;
        row.resourceClicks = counts.resourceClicks;
      }
    });
  }

  const publishedCount = (fanflets ?? []).filter((f) => f.status === "published").length;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Overview</h1>
          <p className="text-muted-foreground">
            Welcome back, {displayName}. Here&apos;s what&apos;s happening with your Fanflets.
          </p>
        </div>
        <Button className="gap-2" asChild>
          <Link href="/dashboard/fanflets/new">
            <Plus className="w-4 h-4" /> Create New Fanflet
          </Link>
        </Button>
      </div>

      {fanflets && fanflets.length === 0 ? (
        <Card className="border-[#1B365D]/20">
          <CardContent className="py-16 text-center">
            <p className="text-lg font-medium text-slate-800 mb-2">
              Welcome to Fanflet!
            </p>
            <p className="text-muted-foreground mb-6">
              Create your first Fanflet to start engaging your audience.
            </p>
            <Button asChild className="bg-[#1B365D] hover:bg-[#152b4d]">
              <Link href="/dashboard/fanflets/new">
                <Plus className="w-4 h-4 mr-2" /> Create Your First Fanflet
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{subscriberCount ?? 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Email signups across your Fanflets
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Page Views</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pageViewCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {publishedCount} published Fanflet{publishedCount !== 1 ? "s" : ""}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resource Clicks</CardTitle>
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{resourceClickCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Links and downloads
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your engagement over the last 60 days.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <DashboardChart data={chartData} />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Your Fanflets</CardTitle>
                <CardDescription>
                  Quick access to active pages.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(fanflets ?? []).slice(0, 5).map((fanflet) => {
                    const initials = fanflet.title
                      .split(" ")
                      .map((w: string) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    const statusColor =
                      fanflet.status === "published"
                        ? "bg-green-100 text-green-700"
                        : fanflet.status === "archived"
                          ? "bg-slate-200 text-slate-600"
                          : "bg-slate-200 text-slate-600";
                    const dateStr = fanflet.event_date
                      ? new Date(fanflet.event_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : new Date(fanflet.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                    return (
                      <Link
                        key={fanflet.id}
                        href={`/dashboard/fanflets/${fanflet.id}`}
                        className="flex items-center gap-4 p-3 bg-slate-50 rounded-lg border hover:border-[#3BA5D9]/30 transition-colors"
                      >
                        <div className="w-10 h-10 bg-[#1B365D]/10 rounded flex items-center justify-center text-[#1B365D] font-bold text-sm">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{fanflet.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {dateStr} • {fanflet.status.charAt(0).toUpperCase() + fanflet.status.slice(1)}
                          </p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded capitalize ${statusColor}`}>
                          {fanflet.status}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
