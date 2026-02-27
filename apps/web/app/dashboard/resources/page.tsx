import { createClient } from "@/lib/supabase/server";
import { getSpeakerEntitlements } from "@fanflet/db";
import { getStorageQuota } from "@fanflet/db/storage";
import { redirect } from "next/navigation";
import { ResourceLibrary } from "@/components/dashboard/resource-library";
import { listLibraryResources, getSpeakerStorageUsage } from "./actions";

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

  const [entitlements, resourcesResult, storageResult] = await Promise.all([
    getSpeakerEntitlements(speaker.id),
    listLibraryResources(),
    getSpeakerStorageUsage(),
  ]);

  const allowSponsorVisibility = entitlements.features.has("sponsor_visibility");
  const quota = getStorageQuota(entitlements.limits);

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
        authUserId={user.id}
        allowSponsorVisibility={allowSponsorVisibility}
        storageUsedBytes={storageResult.usedBytes}
        storageLimitMb={quota.storageMb}
        maxFileMb={quota.maxFileMb}
      />
    </div>
  );
}
