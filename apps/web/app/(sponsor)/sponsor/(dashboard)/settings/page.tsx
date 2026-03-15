import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SponsorSettingsForm } from "@/components/sponsor/sponsor-settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSiteUrl } from "@/lib/config";
import { CopyFanfletUrlButton } from "@/app/dashboard/fanflets/copy-fanflet-url-button";
import { ShieldCheck, ArrowRight } from "lucide-react";
import Link from "next/link";

export default async function SponsorSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id, company_name, slug, description, logo_url, website_url, contact_email, industry, timezone, speaker_label")
    .eq("auth_user_id", user.id)
    .single();

  if (!sponsor) {
    redirect("/sponsor/onboarding");
  }

  const speakerLabel = (sponsor as { speaker_label?: string }).speaker_label ?? "speaker";

  const mcpServerUrl = `${getSiteUrl().replace(/\/$/, "")}/api/mcp`;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Company Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Update your sponsor profile. {speakerLabel[0].toUpperCase() + speakerLabel.slice(1)}s see this when reviewing connection requests.
        </p>
      </div>

      <SponsorSettingsForm sponsor={sponsor} authUserId={user.id} userEmail={user.email ?? ""} />

      <Card id="subscription" className="border-zinc-200">
        <CardHeader>
          <CardTitle className="text-zinc-900">Plan &amp; Billing</CardTitle>
          <CardDescription>
            View your current plan, usage, and upgrade options.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/sponsor/billing"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#1B365D] hover:underline"
          >
            Go to Billing
            <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>

      <Card id="data-privacy" className="border-zinc-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
            <CardTitle className="text-zinc-900">Data Privacy</CardTitle>
          </div>
          <CardDescription>
            How your data is protected on Fanflet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-zinc-700">
          <p>
            Your engagement data, leads, and {speakerLabel} connections are fully isolated to your account.
            Other sponsors connected to the same {speakerLabel}s cannot see your analytics, lead information, or connection activity.
          </p>
          <p>
            This isolation is enforced at the database level using row-level security policies.
            Each query is scoped to your sponsor account, ensuring that no cross-sponsor data is accessible regardless of shared {speakerLabel} relationships.
          </p>
        </CardContent>
      </Card>

      <Card id="ai-assistant" className="border-zinc-200">
        <CardHeader>
          <CardTitle className="text-zinc-900">Use Fanflet in AI assistants</CardTitle>
          <CardDescription>
            Manage sponsor resources, view connections, and track leads from Claude Desktop,
            Cursor, or any MCP-compatible AI assistant.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-zinc-900">How to connect</p>
              <ol className="mt-2 space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
                <li>In your AI assistant, add a new remote MCP server.</li>
                <li>Enter the server URL below.</li>
                <li>Sign in with your Fanflet sponsor account when prompted.</li>
              </ol>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Server URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-mono text-zinc-900 select-all">
                  {mcpServerUrl}
                </code>
                <CopyFanfletUrlButton url={mcpServerUrl} />
              </div>
            </div>
          </div>
          <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
            Once connected, try asking &ldquo;show my sponsor resources,&rdquo;
            &ldquo;list my {speakerLabel} connections,&rdquo; or &ldquo;how are my resources performing?&rdquo;
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
