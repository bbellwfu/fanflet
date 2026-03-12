import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { loadSponsorEntitlements } from "@fanflet/db";
import Link from "next/link";
import { listSponsorCampaigns } from "./actions";
import { CampaignsClient } from "./campaigns-client";

export default async function SponsorCampaignsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/sponsor/campaigns");

  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id, speaker_label")
    .eq("auth_user_id", user.id)
    .single();

  if (!sponsor) redirect("/sponsor/onboarding");

  const speakerLabel = (sponsor as { speaker_label?: string }).speaker_label ?? "speaker";

  const [entitlements, campaignsResult] = await Promise.all([
    loadSponsorEntitlements(supabase, sponsor.id),
    listSponsorCampaigns(),
  ]);

  const hasCampaigns = entitlements.features.has("sponsor_campaigns");
  const campaigns = campaignsResult.data ?? [];

  const { data: connections } = await supabase
    .from("sponsor_connections")
    .select("speaker_id, speakers(id, name)")
    .eq("sponsor_id", sponsor.id)
    .eq("status", "active")
    .is("ended_at", null);

  const connectedSpeakers = (connections ?? []).map((c) => {
    const s = (c as { speakers: { id: string; name: string } | { id: string; name: string }[] }).speakers;
    return Array.isArray(s) ? s[0] : s;
  }).filter(Boolean) as { id: string; name: string }[];

  if (!hasCampaigns) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Campaigns</h1>
          <p className="text-muted-foreground mt-1">
            Group your {speakerLabel}s and resources into campaigns for rollup analytics and CRM sync.
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="font-medium text-amber-900">Enterprise feature</p>
          <p className="text-sm text-amber-800 mt-1">
            Campaigns are available on Sponsor Enterprise. Upgrade to organize activity by initiative and sync with your CRM.
          </p>
          <Link
            href="/sponsor/settings"
            className="mt-4 inline-flex items-center rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            View plans
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Campaigns</h1>
        <p className="text-muted-foreground mt-1">
          Create campaigns to group {speakerLabel}s and resources and view rollup analytics.
        </p>
      </div>

      <CampaignsClient
        campaigns={campaigns}
        connectedSpeakers={connectedSpeakers}
        speakerLabel={speakerLabel}
      />
    </div>
  );
}
