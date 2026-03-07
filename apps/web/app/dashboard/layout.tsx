import { redirect } from "next/navigation";
import { after } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { hasStoredDefaultThemePreset, isOnboardingNotificationSent } from "@/lib/speaker-preferences";
import { notifyAdmins } from "@/lib/admin-notifications";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: speaker } = await supabase
    .from("speakers")
    .select("*")
    .eq("auth_user_id", user.id)
    .single();

  if (!speaker) {
    const { data: sponsor } = await supabase
      .from("sponsor_accounts")
      .select("id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (sponsor) {
      redirect("/sponsor/dashboard");
    }
    redirect("/login");
  }

  let fanfletCount = 0;
  let publishedFanfletCount = 0;
  let surveyQuestionCount = 0;
  let resourceLibraryCount = 0;
  if (speaker?.id) {
    const { count: totalCount } = await supabase
      .from("fanflets")
      .select("id", { count: "exact", head: true })
      .eq("speaker_id", speaker.id);
    fanfletCount = totalCount ?? 0;

    const { count: publishedCount } = await supabase
      .from("fanflets")
      .select("id", { count: "exact", head: true })
      .eq("speaker_id", speaker.id)
      .eq("status", "published");
    publishedFanfletCount = publishedCount ?? 0;

    const { count: surveyCount } = await supabase
      .from("survey_questions")
      .select("id", { count: "exact", head: true })
      .eq("speaker_id", speaker.id);
    surveyQuestionCount = surveyCount ?? 0;

    const { count: resourceCount } = await supabase
      .from("resource_library")
      .select("id", { count: "exact", head: true })
      .eq("speaker_id", speaker.id);
    resourceLibraryCount = resourceCount ?? 0;

    const hasCreatedFanflet = fanfletCount > 0;
    const allOnboardingComplete =
      Boolean(speaker.name?.trim()) &&
      Boolean(speaker.photo_url) &&
      Boolean(speaker.slug?.trim()) &&
      hasStoredDefaultThemePreset(speaker.social_links ?? null) &&
      surveyQuestionCount > 0 &&
      resourceLibraryCount > 0 &&
      hasCreatedFanflet &&
      publishedFanfletCount > 0;

    if (allOnboardingComplete && !isOnboardingNotificationSent(speaker.social_links ?? null)) {
      after(async () => {
        await notifyAdmins("onboarding_completed", {
          speakerId: speaker.id,
          speakerName: speaker.name ?? "",
          speakerEmail: speaker.email ?? "",
        })
      });

      const currentSocialLinks = (speaker.social_links && typeof speaker.social_links === "object")
        ? (speaker.social_links as Record<string, unknown>)
        : {};
      const onboarding = (currentSocialLinks.onboarding && typeof currentSocialLinks.onboarding === "object")
        ? (currentSocialLinks.onboarding as Record<string, unknown>)
        : {};
      await supabase
        .from("speakers")
        .update({
          social_links: {
            ...currentSocialLinks,
            onboarding: { ...onboarding, notification_sent: true },
          },
        })
        .eq("id", speaker.id);
    }
  }

  const cookieStore = await cookies();
  const activeRole = cookieStore.get("active_role")?.value ?? "speaker";

  return (
    <Sidebar
      user={user}
      speaker={speaker}
      fanfletCount={fanfletCount}
      publishedFanfletCount={publishedFanfletCount}
      surveyQuestionCount={surveyQuestionCount}
      resourceLibraryCount={resourceLibraryCount}
      activeRole={activeRole}
    >
      {children}
    </Sidebar>
  );
}
