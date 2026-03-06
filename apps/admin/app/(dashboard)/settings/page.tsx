import { createClient } from "@fanflet/db/server";
import { SettingsNotificationForm } from "./settings-notification-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: prefs } = await supabase
    .from("admin_notification_preferences")
    .select("speaker_signup, sponsor_signup, fanflet_created, onboarding_completed")
    .eq("admin_user_id", user.id)
    .maybeSingle();

  const defaults = {
    speaker_signup: true,
    sponsor_signup: true,
    fanflet_created: true,
    onboarding_completed: true,
  };

  const preferences = prefs ?? defaults;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Manage your admin notification preferences.
        </p>
      </div>

      <SettingsNotificationForm initial={preferences} />
    </div>
  );
}
