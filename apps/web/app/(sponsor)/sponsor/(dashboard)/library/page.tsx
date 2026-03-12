import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { loadSponsorEntitlements } from "@fanflet/db";
import { getStorageQuota } from "@fanflet/db/storage";
import {
  listSponsorLibraryResources,
  getSponsorStorageUsage,
} from "./actions";
import { listSponsorCampaigns } from "../campaigns/actions";
import { SponsorLibraryClient } from "./library-client";

export default async function SponsorLibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/sponsor/library");

  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id, speaker_label")
    .eq("auth_user_id", user.id)
    .single();

  if (!sponsor) redirect("/sponsor/onboarding");

  const speakerLabel = (sponsor as { speaker_label?: string }).speaker_label ?? "speaker";

  const [entitlements, resourcesResult, storageResult, campaignsResult] = await Promise.all([
    loadSponsorEntitlements(supabase, sponsor.id),
    listSponsorLibraryResources(),
    getSponsorStorageUsage(),
    listSponsorCampaigns(),
  ]);

  const hasLibrary = entitlements.features.has("sponsor_resource_library");
  const hasCampaigns = entitlements.features.has("sponsor_campaigns");
  const quota = getStorageQuota(entitlements.limits);
  const resources = resourcesResult.data ?? [];
  const storageUsedBytes = storageResult.usedBytes ?? 0;
  const campaigns = hasCampaigns ? (campaignsResult.data ?? []) : [];

  if (!hasLibrary) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Library</h1>
          <p className="text-muted-foreground mt-1">
            Upload and manage content for your connected {speakerLabel}s.
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="font-medium text-amber-900">Upgrade to Pro or Enterprise</p>
          <p className="text-sm text-amber-800 mt-1">
            The Library lets you upload files and links that connected {speakerLabel}s can add to their fanflets. Upgrade your plan to unlock it.
          </p>
          <a
            href="/sponsor/settings"
            className="mt-4 inline-flex items-center rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
          >
            View plans
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Library</h1>
        <p className="text-muted-foreground mt-1">
          Upload and manage content that your connected {speakerLabel}s can add to their fanflets.
        </p>
      </div>

      <SponsorLibraryClient
        resources={resources}
        storageUsedBytes={storageUsedBytes}
        storageLimitMb={quota.storageMb}
        maxFileMb={100}
        campaigns={campaigns}
        speakerLabel={speakerLabel}
      />
    </div>
  );
}
