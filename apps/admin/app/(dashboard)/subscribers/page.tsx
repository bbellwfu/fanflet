import { createClient } from "@fanflet/db/server";
import { createServiceClient } from "@fanflet/db/service";
import { formatDate } from "@fanflet/db/timezone";
import Link from "next/link";
import { MailIcon } from "lucide-react";
import { getNonDemoScope } from "../analytics/actions";

type SubscriberRow = {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
  speaker_id: string;
  source_fanflet_id: string | null;
  speakers: { name: string | null; email: string } | null;
};

export default async function SubscribersPage() {
  const supabase = createServiceClient();

  const authSupabase = await createClient();
  const { data: { user } } = await authSupabase.auth.getUser();
  const { data: adminPrefs } = await supabase
    .from("admin_notification_preferences")
    .select("timezone")
    .eq("admin_user_id", user!.id)
    .maybeSingle();
  const adminTimezone = adminPrefs?.timezone ?? null;

  const { speakerIds } = await getNonDemoScope(supabase);

  const { data: subscribers, error } = await supabase
    .from("subscribers")
    .select("id, email, name, created_at, speaker_id, source_fanflet_id, speakers(name, email)")
    .in("speaker_id", speakerIds)
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="bg-error/10 text-error rounded-lg p-4 text-sm">
        Failed to load subscribers: {error.message}
      </div>
    );
  }

  const rows = (subscribers ?? []) as unknown as SubscriberRow[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Subscribers
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Email signups collected from fanflet pages
        </p>
      </div>

      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-success/10 flex items-center justify-center">
            <MailIcon className="w-4 h-4 text-success" />
          </div>
          <h2 className="text-sm font-semibold text-fg">
            {rows.length} Subscriber{rows.length !== 1 ? "s" : ""}
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[600px]">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted whitespace-nowrap">
                  Email
                </th>
                <th className="hidden sm:table-cell px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted whitespace-nowrap">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Speaker (account)
                </th>
                <th className="hidden sm:table-cell px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Signed up
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {rows.map((sub) => (
                <tr
                  key={sub.id}
                  className="hover:bg-surface-elevated/50 transition-colors min-h-[44px]"
                >
                  <td className="px-5 py-3.5 text-fg whitespace-nowrap align-middle">
                    {sub.email}
                  </td>
                  <td className="hidden sm:table-cell px-5 py-3.5 text-fg-secondary align-middle">
                    {sub.name ?? "—"}
                  </td>
                  <td className="px-5 py-3.5 align-middle">
                    <Link
                      href={`/accounts/${sub.speaker_id}`}
                      className="text-primary-soft hover:text-primary transition-colors py-2 -my-2 block whitespace-nowrap"
                    >
                      {sub.speakers?.name || sub.speakers?.email || "—"}
                    </Link>
                  </td>
                  <td className="hidden sm:table-cell px-5 py-3.5 text-[12px] text-fg-muted align-middle">
                    {formatDate(sub.created_at, adminTimezone)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-5 py-10 text-center text-[13px] text-fg-muted"
                  >
                    No subscribers yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
