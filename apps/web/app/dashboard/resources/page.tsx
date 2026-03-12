import { createClient } from "@/lib/supabase/server";
import { getSpeakerEntitlements } from "@fanflet/db";
import { getStorageQuota } from "@fanflet/db/storage";
import { redirect } from "next/navigation";
import { ResourceLibrary } from "@/components/dashboard/resource-library";
import { listLibraryResources, getSpeakerStorageUsage, listSponsorResourcesForSpeaker } from "./actions";

export default async function ResourceLibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!speaker) {
    redirect("/dashboard/settings");
  }

  const [entitlements, resourcesResult, sponsorResourcesResult, storageResult, activeConnectionsResult, endedConnectionsResult, fanfletsResult] = await Promise.all([
    getSpeakerEntitlements(speaker.id),
    listLibraryResources(),
    listSponsorResourcesForSpeaker(),
    getSpeakerStorageUsage(),
    supabase
      .from("sponsor_connections")
      .select("sponsor_id, sponsor_accounts(id, company_name)")
      .eq("speaker_id", speaker.id)
      .eq("status", "active")
      .is("ended_at", null),
    supabase
      .from("sponsor_connections")
      .select("sponsor_id, ended_at, sponsor_accounts(id, company_name)")
      .eq("speaker_id", speaker.id)
      .eq("status", "active")
      .not("ended_at", "is", null),
    supabase
      .from("fanflets")
      .select("id, title, status")
      .eq("speaker_id", speaker.id)
      .order("created_at", { ascending: false }),
  ]);

  const allowSponsorVisibility = entitlements.features.has("sponsor_visibility");
  const quota = getStorageQuota(entitlements.limits);
  const sponsorResources = sponsorResourcesResult.data ?? [];
  const speakerFanflets = (fanfletsResult.data ?? []).map((f) => ({
    id: f.id,
    title: f.title ?? "Untitled",
    status: f.status as string,
  }));

  const connectedSponsors = (activeConnectionsResult.data ?? []).map((c) => {
    const row = c as Record<string, unknown>;
    const acc = row.sponsor_accounts as { id: string; company_name: string } | { id: string; company_name: string }[] | null;
    const sponsor = Array.isArray(acc) ? acc[0] : acc;
    return sponsor;
  }).filter(Boolean) as { id: string; company_name: string }[];
  const uniqueSponsors = Array.from(new Map(connectedSponsors.map((s) => [s.id, s])).values());

  const endedSponsors = (endedConnectionsResult.data ?? []).map((c) => {
    const row = c as Record<string, unknown>;
    const acc = row.sponsor_accounts as { id: string; company_name: string } | { id: string; company_name: string }[] | null;
    const sponsor = Array.isArray(acc) ? acc[0] : acc;
    const endedAt = row.ended_at as string | null;
    return sponsor && endedAt ? { id: sponsor.id, company_name: sponsor.company_name, ended_at: endedAt } : null;
  }).filter(Boolean) as { id: string; company_name: string; ended_at: string }[];

  return (
    <div className="w-full min-w-0 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1B365D]">
          Resource Library
        </h1>
        <p className="text-muted-foreground mt-1">
          Save reusable resources to quickly add to any Fanflet.
        </p>
      </div>

      <ResourceLibrary
        resources={resourcesResult.data ?? []}
        sponsorResources={sponsorResources}
        authUserId={user.id}
        allowSponsorVisibility={allowSponsorVisibility}
        storageUsedBytes={storageResult.usedBytes}
        storageLimitMb={quota.storageMb}
        maxFileMb={quota.maxFileMb}
        connectedSponsors={uniqueSponsors}
        endedSponsors={endedSponsors}
        speakerFanflets={speakerFanflets}
      />
    </div>
  );
}
