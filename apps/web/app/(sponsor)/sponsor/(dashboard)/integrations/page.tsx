import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { IntegrationsHub } from "./integrations-hub";
import { listIntegrations, getRecentEvents } from "./actions";

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/sponsor/integrations");

  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!sponsor) redirect("/sponsor/onboarding");

  const [{ connections }, { events }] = await Promise.all([
    listIntegrations(),
    getRecentEvents(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Integrations
        </h1>
        <p className="text-muted-foreground">
          Connect your CRM, email, and marketing tools to automatically sync
          leads and engagement data.
        </p>
      </div>
      <IntegrationsHub connections={connections} recentEvents={events} />
    </div>
  );
}
