import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SponsorSettingsForm } from "@/components/sponsor/sponsor-settings-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSiteUrl } from "@/lib/config";

export default async function SponsorSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id, company_name, slug, description, logo_url, website_url, contact_email, industry, timezone")
    .eq("auth_user_id", user.id)
    .single();

  if (!sponsor) {
    redirect("/sponsor/onboarding");
  }

  const mcpServerUrl = `${getSiteUrl().replace(/\/$/, "")}/api/mcp`;

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
              <code className="block rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-mono text-zinc-900 select-all">
                {mcpServerUrl}
              </code>
            </div>
          </div>
          <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
            Once connected, try asking &ldquo;show my sponsor resources,&rdquo;
            &ldquo;list my speaker connections,&rdquo; or &ldquo;how are my resources performing?&rdquo;
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
