import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { listSubscribers } from "./actions";
import { SubscribersDashboard } from "@/components/dashboard/subscribers-dashboard";

export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: speaker } = await supabase
    .from("speakers")
    .select("id, name, email")
    .eq("auth_user_id", user.id)
    .single();

  if (!speaker) {
    redirect("/dashboard/settings");
  }

  const result = await listSubscribers();
  const params = await searchParams;
  const initialSource = typeof params.source === "string" ? params.source : undefined;

  return (
    <div className="w-full min-w-0 space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#1B365D]">
          Subscribers
        </h1>
        <p className="text-muted-foreground mt-1">
          People who subscribed through your Fanflets. Export, manage, or reach out to your audience.
        </p>
      </div>

      <SubscribersDashboard
        subscribers={result.data ?? []}
        speakerName={speaker.name ?? ""}
        speakerEmail={speaker.email ?? user.email ?? ""}
        initialSourceFilter={initialSource}
      />
    </div>
  );
}
