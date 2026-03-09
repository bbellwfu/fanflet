import { createClient } from "@fanflet/db/server";
import { SettingsNotificationForm } from "./settings-notification-form";
import { CopyUrlButton } from "./copy-url-button";

function getAdminMcpUrl(): string {
  const url = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";
  return `${url.replace(/\/$/, "")}/api/mcp`;
}

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
    .select("speaker_signup, sponsor_signup, fanflet_created, onboarding_completed, timezone")
    .eq("admin_user_id", user.id)
    .maybeSingle();

  const defaults = {
    speaker_signup: true,
    sponsor_signup: true,
    fanflet_created: true,
    onboarding_completed: true,
    timezone: null as string | null,
  };

  const preferences = prefs ?? defaults;
  const mcpServerUrl = getAdminMcpUrl();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Manage your admin preferences.
        </p>
      </div>

      <SettingsNotificationForm initial={preferences} />

      <div className="max-w-xl rounded-lg border border-border-subtle bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-fg">Use Fanflet Admin in AI assistants</h2>
          <p className="text-[12px] text-fg-muted mt-1">
            Run platform admin tasks — accounts, analytics, feature flags, and more — from
            Claude Desktop, Cursor, or any MCP-compatible AI assistant.
          </p>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-3">
            <div>
              <p className="text-[13px] font-medium text-fg">How to connect</p>
              <ol className="mt-2 space-y-1.5 text-[13px] text-fg-secondary list-decimal list-inside">
                <li>In your AI assistant, add a new remote MCP server.</li>
                <li>Enter the server URL below.</li>
                <li>Sign in with your admin account when prompted.</li>
              </ol>
            </div>
            <div>
              <p className="text-[12px] font-medium text-fg-muted mb-1">Server URL</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md border border-border-subtle bg-page px-3 py-2 text-[13px] font-mono text-fg select-all">
                  {mcpServerUrl}
                </code>
                <CopyUrlButton url={mcpServerUrl} />
              </div>
            </div>
          </div>
          <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2 text-[12px] text-blue-800">
            Once connected, try asking &ldquo;show platform overview,&rdquo;
            &ldquo;list recent signups,&rdquo; or &ldquo;what feature flags are enabled?&rdquo;
          </div>
        </div>
      </div>
    </div>
  );
}
