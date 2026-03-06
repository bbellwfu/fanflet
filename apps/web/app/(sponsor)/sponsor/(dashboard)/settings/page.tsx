import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SponsorSettingsForm } from "@/components/sponsor/sponsor-settings-form";

export default async function SponsorSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id, company_name, slug, description, logo_url, website_url, contact_email, industry")
    .eq("auth_user_id", user.id)
    .single();

  if (!sponsor) {
    redirect("/sponsor/onboarding");
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Company Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Update your sponsor profile. Speakers see this when reviewing connection requests.
        </p>
      </div>

      <SponsorSettingsForm sponsor={sponsor} authUserId={user.id} userEmail={user.email ?? ""} />
    </div>
  );
}
