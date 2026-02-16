import { createServiceClient } from "@fanflet/db/service";
import { Card, CardContent, CardHeader, CardTitle } from "@fanflet/ui/card";
import Link from "next/link";

interface SpeakerWithCounts {
  id: string;
  name: string;
  email: string;
  slug: string | null;
  status: string;
  created_at: string;
  fanflet_count: number;
  subscriber_count: number;
}

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string }>;
}) {
  const params = await searchParams;
  const supabase = createServiceClient();

  // Fetch speakers
  let query = supabase
    .from("speakers")
    .select("id, name, email, slug, status, created_at")
    .order("created_at", { ascending: false });

  if (params.search) {
    query = query.or(
      `name.ilike.%${params.search}%,email.ilike.%${params.search}%`
    );
  }

  if (params.status && params.status !== "all") {
    query = query.eq("status", params.status);
  }

  const { data: speakers, error } = await query;

  if (error) {
    return (
      <div className="text-destructive">
        Failed to load accounts: {error.message}
      </div>
    );
  }

  // Fetch counts for each speaker
  const speakersWithCounts: SpeakerWithCounts[] = await Promise.all(
    (speakers ?? []).map(async (speaker) => {
      const [fanfletResult, subscriberResult] = await Promise.all([
        supabase
          .from("fanflets")
          .select("id", { count: "exact", head: true })
          .eq("speaker_id", speaker.id),
        supabase
          .from("subscribers")
          .select("id", { count: "exact", head: true })
          .eq("speaker_id", speaker.id),
      ]);

      return {
        ...speaker,
        fanflet_count: fanfletResult.count ?? 0,
        subscriber_count: subscriberResult.count ?? 0,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Accounts</h1>
        <p className="text-muted-foreground mt-1">
          Manage speaker accounts across the platform
        </p>
      </div>

      {/* Search & Filter */}
      <Card>
        <CardContent className="pt-6">
          <form className="flex flex-col sm:flex-row gap-3">
            <input
              name="search"
              type="text"
              placeholder="Search by name or email..."
              defaultValue={params.search ?? ""}
              className="flex-1 h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
            />
            <select
              name="status"
              defaultValue={params.status ?? "all"}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>
            <button
              type="submit"
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              Filter
            </button>
          </form>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {speakersWithCounts.length} Speaker{speakersWithCounts.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="pb-3 font-medium text-muted-foreground">Name</th>
                  <th className="pb-3 font-medium text-muted-foreground">Email</th>
                  <th className="pb-3 font-medium text-muted-foreground">Slug</th>
                  <th className="pb-3 font-medium text-muted-foreground text-center">Fanflets</th>
                  <th className="pb-3 font-medium text-muted-foreground text-center">Subscribers</th>
                  <th className="pb-3 font-medium text-muted-foreground">Status</th>
                  <th className="pb-3 font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody>
                {speakersWithCounts.map((speaker) => (
                  <tr key={speaker.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3">
                      <Link
                        href={`/accounts/${speaker.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        {speaker.name || "Unnamed"}
                      </Link>
                    </td>
                    <td className="py-3 text-muted-foreground">{speaker.email}</td>
                    <td className="py-3 text-muted-foreground font-mono text-xs">
                      {speaker.slug ?? "—"}
                    </td>
                    <td className="py-3 text-center">{speaker.fanflet_count}</td>
                    <td className="py-3 text-center">{speaker.subscriber_count}</td>
                    <td className="py-3">
                      <StatusBadge status={speaker.status} />
                    </td>
                    <td className="py-3 text-muted-foreground text-xs">
                      {new Date(speaker.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {speakersWithCounts.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      No accounts found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    suspended: "bg-amber-100 text-amber-700",
    deactivated: "bg-red-100 text-red-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
        styles[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}
