import { createServiceClient } from "@fanflet/db/service";
import Link from "next/link";
import { MailIcon } from "lucide-react";

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

  const { data: subscribers, error } = await supabase
    .from("subscribers")
    .select("id, email, name, created_at, speaker_id, source_fanflet_id, speakers(name, email)")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="bg-error/10 text-error rounded-lg p-4 text-sm">
        Failed to load subscribers: {error.message}
      </div>
    );
  }

  const rows = (subscribers ?? []) as SubscriberRow[];

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
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-border-subtle">
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Email
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Name
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Speaker (account)
                </th>
                <th className="px-5 py-3 text-left text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                  Signed up
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-subtle">
              {rows.map((sub) => (
                <tr
                  key={sub.id}
                  className="hover:bg-surface-elevated/50 transition-colors"
                >
                  <td className="px-5 py-3.5 text-fg">
                    {sub.email}
                  </td>
                  <td className="px-5 py-3.5 text-fg-secondary">
                    {sub.name ?? "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <Link
                      href={`/accounts/${sub.speaker_id}`}
                      className="text-primary-soft hover:text-primary transition-colors"
                    >
                      {sub.speakers?.name || sub.speakers?.email || "—"}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-[12px] text-fg-muted">
                    {new Date(sub.created_at).toLocaleDateString()}
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
