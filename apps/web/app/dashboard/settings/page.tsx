import { createClient } from "@/lib/supabase/server";
import { getSpeakerEntitlements } from "@fanflet/db";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSiteUrl } from "@/lib/config";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id, name, bio, photo_url, slug, social_links, timezone")
    .eq("auth_user_id", user.id)
    .single();

  const entitlements = speaker ? await getSpeakerEntitlements(speaker.id) : null;
  const allowMultipleThemes = entitlements?.features.has("multiple_theme_colors") ?? false;
  const currentPlanDisplayName = entitlements?.planDisplayName ?? "Free";
  const mcpServerUrl = `${getSiteUrl().replace(/\/$/, "")}/api/mcp`;

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
          <CardContent className="space-y-4">
            <p className="text-sm text-[#1B365D] font-medium">
              Current subscription plan: {currentPlanDisplayName}
            </p>
            <Button asChild variant="outline" className="border-[#1B365D] text-[#1B365D] hover:bg-[#1B365D]/5">
              <Link href="/pricing">View plans and upgrade</Link>
            </Button>
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
                <code className="block rounded-md border border-[#e2e8f0] bg-slate-50 px-3 py-2 text-sm font-mono text-[#1B365D] select-all">
                  {mcpServerUrl}
                </code>
              </div>
            </div>
            <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
              Once connected, ask your AI assistant things like &ldquo;show my fanflets,&rdquo;
              &ldquo;create a fanflet for my next talk,&rdquo; or &ldquo;how many subscribers did I
              get this week?&rdquo;
            </div>
          </CardContent>
        </Card>
    </div>
  );
}
