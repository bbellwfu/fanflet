import { createServiceClient } from "@fanflet/db/service";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, MousePointerClick, Users } from "lucide-react";

export default async function PublicSponsorReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: tokenRow } = await supabase
    .from("sponsor_report_tokens")
    .select("fanflet_id, sponsor_id, expires_at")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!tokenRow) {
    notFound();
  }

  const { fanflet_id: fanfletId, sponsor_id: sponsorId } = tokenRow;

  const [{ data: fanflet }, { data: sponsor }, { data: sponsorBlocks }] = await Promise.all([
    supabase.from("fanflets").select("id, title").eq("id", fanfletId).single(),
    supabase.from("sponsor_accounts").select("id, company_name, logo_url").eq("id", sponsorId).single(),
    supabase
      .from("resource_blocks")
      .select("id")
      .eq("fanflet_id", fanfletId)
      .eq("sponsor_account_id", sponsorId),
  ]);

  if (!fanflet || !sponsor) notFound();

  const blockIds = (sponsorBlocks ?? []).map((b) => b.id);

  const [impressionsRes, clicksRes, leadsRes] = await Promise.all([
    supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("fanflet_id", fanfletId)
      .eq("event_type", "page_view"),
    blockIds.length > 0
      ? supabase
          .from("analytics_events")
          .select("id", { count: "exact", head: true })
          .eq("fanflet_id", fanfletId)
          .eq("event_type", "resource_click")
          .in("resource_block_id", blockIds)
      : { count: 0 },
    supabase
      .from("sponsor_leads")
      .select("id, resource_title, engagement_type, created_at, subscribers(email, name)")
      .eq("fanflet_id", fanfletId)
      .eq("sponsor_id", sponsorId)
      .order("created_at", { ascending: false }),
  ]);

  const impressions = impressionsRes.count ?? 0;
  const clicks = clicksRes.count ?? 0;
  const leads = (leadsRes.data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const sub = r.subscribers as { email?: string; name?: string | null } | { email?: string; name?: string | null }[] | null;
    const subscriber = Array.isArray(sub) ? sub[0] : sub;
    return {
      id: r.id as string,
      resource_title: (r.resource_title as string | null) ?? null,
      engagement_type: r.engagement_type as string,
      created_at: r.created_at as string,
      subscribers: subscriber ? { email: subscriber.email ?? "", name: subscriber.name ?? null } : null,
    };
  });

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sponsor report</h1>
          <p className="text-muted-foreground">{fanflet.title}</p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              {sponsor.logo_url ? (
                <img
                  src={sponsor.logo_url}
                  alt=""
                  className="h-10 w-10 rounded object-contain bg-slate-50"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-slate-200 flex items-center justify-center">
                  <Users className="w-5 h-5 text-slate-500" />
                </div>
              )}
              <div>
                <CardTitle className="text-lg">{sponsor.company_name}</CardTitle>
                <CardDescription>Engagement and leads (read-only)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{impressions.toLocaleString()}</span>
                <span className="text-muted-foreground">impressions</span>
              </div>
              <div className="flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{clicks.toLocaleString()}</span>
                <span className="text-muted-foreground">clicks</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{leads.length.toLocaleString()}</span>
                <span className="text-muted-foreground">leads</span>
              </div>
            </div>

            {leads.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 text-sm font-medium text-slate-700">
                  Lead list
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-slate-50/50">
                        <th className="text-left p-3 font-medium">Email</th>
                        <th className="text-left p-3 font-medium">Name</th>
                        <th className="text-left p-3 font-medium">Resource</th>
                        <th className="text-left p-3 font-medium">Engagement</th>
                        <th className="text-left p-3 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leads.map((lead) => (
                        <tr key={lead.id} className="border-b border-slate-100">
                          <td className="p-3">{lead.subscribers?.email ?? "—"}</td>
                          <td className="p-3">{lead.subscribers?.name ?? "—"}</td>
                          <td className="p-3">{lead.resource_title ?? "—"}</td>
                          <td className="p-3">{lead.engagement_type}</td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(lead.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          This report link expires after 7 days. Shared by the speaker via Fanflet.
        </p>
      </div>
    </div>
  );
}
