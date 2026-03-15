import { requireSponsor } from "@/lib/auth-context";
import { loadSponsorEntitlements } from "@fanflet/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, ScrollText } from "lucide-react";
import Link from "next/link";
import { AuditLogTable } from "./audit-log-table";

export default async function SponsorAuditLogPage() {
  const { supabase, sponsorId } = await requireSponsor();
  const entitlements = await loadSponsorEntitlements(supabase, sponsorId);
  const hasAuditLog = entitlements.features.has("sponsor_audit_log");

  if (!hasAuditLog) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            <ScrollText className="h-6 w-6" />
            Activity Log
          </h1>
          <p className="text-muted-foreground mt-1">
            Track all actions taken on your sponsor account.
          </p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="mx-auto h-10 w-10 text-slate-300 mb-3" />
            <h3 className="text-lg font-medium text-slate-900">Sponsor Studio feature</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              The activity log is available on Sponsor Studio. Upgrade to track all actions across your team with 12-month retention and CSV export.
            </p>
            <Link
              href="/sponsor/billing"
              className="mt-4 inline-flex items-center rounded-md bg-[#1B365D] px-4 py-2 text-sm font-medium text-white hover:bg-[#152b4d]"
            >
              View plans
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: entries } = await supabase
    .from("sponsor_audit_log")
    .select("id, actor_id, action, category, target_type, target_id, details, created_at")
    .eq("sponsor_id", sponsorId)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
          <ScrollText className="h-6 w-6" />
          Activity Log
        </h1>
        <p className="text-muted-foreground mt-1">
          Track all actions taken on your sponsor account. Entries are retained for 12 months.
        </p>
      </div>

      <AuditLogTable entries={entries ?? []} />
    </div>
  );
}
