import { createClient } from "@/lib/supabase/server";
import { hasFeature } from "@fanflet/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

  const allowMultipleThemes = speaker
    ? await hasFeature(speaker.id, "multiple_theme_colors")
    : false;

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
          allowMultipleThemes={allowMultipleThemes}
        />

        <Card id="subscription" className="border-[#e2e8f0]">
          <CardHeader>
            <CardTitle className="text-[#1B365D]">Subscription</CardTitle>
            <CardDescription>
              Manage your plan and unlock more themes, analytics, and features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="border-[#1B365D] text-[#1B365D] hover:bg-[#1B365D]/5">
              <Link href="/pricing">View plans and upgrade</Link>
            </Button>
          </CardContent>
        </Card>
    </div>
  );
}
