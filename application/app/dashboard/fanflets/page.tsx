import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Plus, FileText, Pencil, ExternalLink } from "lucide-react";

export default async function FanfletsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id, slug")
    .eq("auth_user_id", user.id)
    .single();

  if (!speaker) {
    redirect("/dashboard/settings");
  }

  const { data: fanflets } = await supabase
    .from("fanflets")
    .select("id, title, event_name, event_date, slug, status, created_at")
    .eq("speaker_id", speaker.id)
    .order("created_at", { ascending: false });

  const fanfletIds = fanflets?.map((f) => f.id) ?? [];
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3002";

  const pageViewsMap: Record<string, number> = {};
  const subscribersMap: Record<string, number> = {};

  if (fanfletIds.length > 0) {
    const [viewsRes, subsRes] = await Promise.all([
      supabase
        .from("analytics_events")
        .select("fanflet_id")
        .in("fanflet_id", fanfletIds)
        .eq("event_type", "page_view"),
      supabase
        .from("subscribers")
        .select("source_fanflet_id")
        .in("source_fanflet_id", fanfletIds),
    ]);

    if (viewsRes.data) {
      for (const row of viewsRes.data) {
        if (row.fanflet_id) {
          pageViewsMap[row.fanflet_id] = (pageViewsMap[row.fanflet_id] ?? 0) + 1;
        }
      }
    }
    if (subsRes.data) {
      for (const row of subsRes.data) {
        if (row.source_fanflet_id) {
          subscribersMap[row.source_fanflet_id] =
            (subscribersMap[row.source_fanflet_id] ?? 0) + 1;
        }
      }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "published":
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700">
            Live
          </span>
        );
      case "archived":
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
            Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-200 text-slate-600">
            Draft
          </span>
        );
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return null;
    return new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const publicUrl = speaker.slug
    ? `${baseUrl}/${speaker.slug}`
    : null;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1B365D]">
            My Fanflets
          </h1>
          <p className="text-muted-foreground mt-1">
            Create and manage your event resource pages.
          </p>
        </div>
        <Button asChild className="bg-[#1B365D] hover:bg-[#152b4d] gap-2">
          <Link href="/dashboard/fanflets/new">
            <Plus className="w-4 h-4" />
            Create New Fanflet
          </Link>
        </Button>
      </div>

      {!fanflets || fanflets.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50">
          <CardContent className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-16 h-16 rounded-2xl bg-[#1B365D]/10 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-[#1B365D]" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              Create your first Fanflet
            </h3>
            <p className="text-muted-foreground text-center text-sm max-w-sm mb-6">
              Share resources, capture leads, and delight sponsors with a single
              QR code for your next talk.
            </p>
            <Button asChild className="bg-[#1B365D] hover:bg-[#152b4d] gap-2">
              <Link href="/dashboard/fanflets/new">
                <Plus className="w-4 h-4" />
                Create New Fanflet
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {fanflets.map((fanflet) => {
            const viewUrl =
              fanflet.status === "published" && publicUrl
                ? `${publicUrl}/${fanflet.slug}`
                : null;
            return (
              <Card
                key={fanflet.id}
                className="border-slate-200 hover:border-[#3BA5D9]/40 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-slate-900">
                        {fanflet.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {fanflet.event_name}
                        {fanflet.event_date &&
                          ` • ${formatDate(fanflet.event_date)}`}
                      </p>
                    </div>
                    {getStatusBadge(fanflet.status)}
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                    <span>
                      {pageViewsMap[fanflet.id] ?? 0} page views
                    </span>
                    <span>
                      {subscribersMap[fanflet.id] ?? 0} subscribers
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/fanflets/${fanflet.id}`}>
                        <Pencil className="w-4 h-4" />
                        Edit
                      </Link>
                    </Button>
                    {viewUrl && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={viewUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-4 h-4" />
                          View
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
