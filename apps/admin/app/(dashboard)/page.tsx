import { createServiceClient } from "@fanflet/db/service";
import { Card, CardContent, CardHeader, CardTitle } from "@fanflet/ui/card";
import { Users, FileText, BarChart3, Mail, TrendingUp, Activity } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ElementType;
}

function StatCard({ title, value, description, icon: Icon }: StatCardProps) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground break-words min-w-0">
          {title}
        </CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function AdminOverviewPage() {
  const supabase = createServiceClient();

  // Fetch all platform metrics in parallel
  const [
    speakersResult,
    fanfletsResult,
    subscribersResult,
    pageViewsResult,
    recentSignupsResult,
    activeFanfletsResult,
  ] = await Promise.all([
    supabase.from("speakers").select("id", { count: "exact", head: true }),
    supabase.from("fanflets").select("id, status", { count: "exact" }),
    supabase.from("subscribers").select("id", { count: "exact", head: true }),
    supabase
      .from("analytics_events")
      .select("id", { count: "exact", head: true })
      .eq("event_type", "page_view"),
    supabase
      .from("speakers")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from("analytics_events")
      .select("fanflet_id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const totalSpeakers = speakersResult.count ?? 0;
  const totalFanflets = fanfletsResult.count ?? 0;
  const totalSubscribers = subscribersResult.count ?? 0;
  const totalPageViews = pageViewsResult.count ?? 0;
  const recentSignups = recentSignupsResult.count ?? 0;
  const activeFanflets7d = activeFanfletsResult.count ?? 0;

  // Count fanflets by status
  const fanflets = fanfletsResult.data ?? [];
  const publishedCount = fanflets.filter((f) => f.status === "published").length;
  const draftCount = fanflets.filter((f) => f.status === "draft").length;

  // Recent speakers
  const { data: recentSpeakers } = await supabase
    .from("speakers")
    .select("id, name, email, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  // Recent published fanflets
  const { data: recentFanflets } = await supabase
    .from("fanflets")
    .select("id, title, status, published_at, speaker_id")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          Platform Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Key metrics across the Fanflet platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard
          title="Total Speakers"
          value={totalSpeakers}
          icon={Users}
        />
        <StatCard
          title="Total Fanflets"
          value={totalFanflets}
          description={`${publishedCount} published, ${draftCount} draft`}
          icon={FileText}
        />
        <StatCard
          title="Total Subscribers"
          value={totalSubscribers}
          icon={Mail}
        />
        <StatCard
          title="Page Views"
          value={totalPageViews.toLocaleString()}
          icon={BarChart3}
        />
        <StatCard
          title="New Signups (30d)"
          value={recentSignups}
          icon={TrendingUp}
        />
        <StatCard
          title="Active Fanflets (7d)"
          value={activeFanflets7d}
          icon={Activity}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Speakers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Signups</CardTitle>
          </CardHeader>
          <CardContent>
            {recentSpeakers && recentSpeakers.length > 0 ? (
              <div className="space-y-3">
                {recentSpeakers.map((speaker) => (
                  <div key={speaker.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {speaker.name || "Unnamed"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {speaker.email}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(speaker.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No speakers yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Published Fanflets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recently Published</CardTitle>
          </CardHeader>
          <CardContent>
            {recentFanflets && recentFanflets.length > 0 ? (
              <div className="space-y-3">
                {recentFanflets.map((fanflet) => (
                  <div key={fanflet.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{fanflet.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {fanflet.published_at
                        ? new Date(fanflet.published_at).toLocaleDateString()
                        : "N/A"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No published fanflets yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
