import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/dashboard/settings-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id, name, bio, photo_url, slug, social_links")
    .eq("auth_user_id", user.id)
    .single();

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#1B365D]">
            Profile Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Update your speaker profile. This information appears on your Fanflet pages.
          </p>
        </div>

        <SettingsForm
          speaker={speaker}
          authUserId={user.id}
          userEmail={user.email ?? ""}
        />
    </div>
  );
}
