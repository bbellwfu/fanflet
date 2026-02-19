import { createClient } from "@/lib/supabase/server";
import { hasFeature } from "@fanflet/db";
import { redirect } from "next/navigation";
import { ResourceLibrary } from "@/components/dashboard/resource-library";

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

  const allowSponsorVisibility = await hasFeature(speaker.id, "sponsor_visibility");

  const { data: resources } = await supabase
    .from("resource_library")
    .select("*")
    .eq("speaker_id", speaker.id)
    .order("created_at", { ascending: true });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1B365D]">
          Resource Library
        </h1>
        <p className="text-muted-foreground mt-1">
          Save reusable resources to quickly add to any Fanflet.
        </p>
      </div>

      <ResourceLibrary
        resources={resources ?? []}
        authUserId={user.id}
        allowSponsorVisibility={allowSponsorVisibility}
      />
    </div>
  );
}
