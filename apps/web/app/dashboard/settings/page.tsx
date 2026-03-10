import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@fanflet/db/service";
import { getSpeakerEntitlements } from "@fanflet/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { NotificationPreferences } from "@/components/dashboard/notification-preferences";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSiteUrl } from "@/lib/config";
import { CopyFanfletUrlButton } from "@/app/dashboard/fanflets/copy-fanflet-url-button";
import { SignInOptionsCard } from "@/components/dashboard/sign-in-options-card";
import { DeleteAccountCard } from "@/components/dashboard/delete-account-card";
import { checkDeletionRequestStatus } from "./deletion-actions";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const initialProviders: string[] = Array.isArray((user as { identities?: { provider: string }[] }).identities)
    ? (user as { identities?: { provider: string }[] }).identities!.map((i) => i.provider)
    : [];

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id, name, bio, photo_url, slug, social_links, timezone")
    .eq("auth_user_id", user.id)
    .single();

  const entitlements = speaker ? await getSpeakerEntitlements(speaker.id) : null;
  const allowMultipleThemes = entitlements?.features.has("multiple_theme_colors") ?? false;
  const currentPlanDisplayName = entitlements?.planDisplayName ?? "Free";
  const mcpServerUrl = `${getSiteUrl().replace(/\/$/, "")}/api/mcp`;

  const deletionStatus = await checkDeletionRequestStatus();

  let platformAnnouncementsOptedIn = false;
  if (speaker) {
    const serviceSupabase = createServiceClient();
    const { data: pref } = await serviceSupabase
      .from("platform_communication_preferences")
      .select("opted_in")
      .eq("speaker_id", speaker.id)
      .eq("category", "platform_announcements")
      .maybeSingle();
    platformAnnouncementsOptedIn = pref?.opted_in ?? false;
  }

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

        <NotificationPreferences initialOptedIn={platformAnnouncementsOptedIn} />

        <SignInOptionsCard initialProviders={initialProviders} />

        <Card id="subscription" className="border-[#e2e8f0]">
          <CardHeader>
            <CardTitle className="text-[#1B365D]">Subscription &amp; Account</CardTitle>
            <CardDescription>
              Manage your plan or close your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-[#1B365D] font-medium">
                  Current plan: {currentPlanDisplayName}
                </p>
                <p className="text-xs text-muted-foreground">
                  View plan details, compare features, or change your plan.
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="border-[#1B365D] text-[#1B365D] hover:bg-[#1B365D]/5">
                <Link href="/dashboard/billing">Manage plan</Link>
              </Button>
            </div>

            <div className="border-t border-[#e2e8f0] pt-5 space-y-2">
              <p className="text-sm font-medium text-[#1B365D]">Close account</p>
              <p className="text-sm text-muted-foreground">
                If you no longer wish to use Fanflet, you can close your account.
                Your data will be retained for 90 days in case you change your mind,
                after which it will be permanently removed. Any active subscription
                will be cancelled.
              </p>
              <Button
                variant="outline"
                className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:text-amber-800"
                disabled
              >
                Close Account
                <span className="ml-2 text-[10px] font-normal uppercase tracking-wider bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded">
                  Coming soon
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card id="ai-assistant" className="border-[#e2e8f0]">
          <CardHeader>
            <CardTitle className="text-[#1B365D]">Use Fanflet in AI assistants</CardTitle>
            <CardDescription>
              Create and manage fanflets, check analytics, and draft subscriber emails directly
              from Claude Desktop, Cursor, or any MCP-compatible AI assistant.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-[#1B365D]">How to connect</p>
                <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
                  <li>In your AI assistant, add a new remote MCP server.</li>
                  <li>Enter the server URL below.</li>
                  <li>Sign in with your Fanflet account when prompted.</li>
                </ol>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Server URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border border-[#e2e8f0] bg-slate-50 px-3 py-2 text-sm font-mono text-[#1B365D] select-all">
                    {mcpServerUrl}
                  </code>
                  <CopyFanfletUrlButton url={mcpServerUrl} />
                </div>
              </div>
            </div>
            <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
              Once connected, ask your AI assistant things like &ldquo;show my fanflets,&rdquo;
              &ldquo;create a fanflet for my next talk,&rdquo; or &ldquo;how many subscribers did I
              get this week?&rdquo;
            </div>
          </CardContent>
        </Card>

        <div id="data-privacy" className="space-y-3 pt-4">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Data &amp; Privacy</h2>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              Exercise your data rights under GDPR, CCPA, and other privacy regulations.
            </p>
          </div>
          <DeleteAccountCard
            userEmail={user.email ?? ""}
            pendingRequest={
              deletionStatus.status
                ? { status: deletionStatus.status, createdAt: deletionStatus.createdAt! }
                : null
            }
          />
        </div>
    </div>
  );
}
