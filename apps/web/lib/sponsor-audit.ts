import type { SupabaseClient } from "@supabase/supabase-js";

type AuditCategory =
  | "settings"
  | "team"
  | "campaigns"
  | "connections"
  | "library"
  | "leads"
  | "integrations"
  | "billing";

interface AuditEntry {
  sponsorId: string;
  actorId: string;
  action: string;
  category: AuditCategory;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
}

/**
 * Log an action to the sponsor audit log.
 * Fire-and-forget — never throws or blocks the calling action.
 */
export async function logSponsorAudit(
  supabase: SupabaseClient,
  entry: AuditEntry
): Promise<void> {
  try {
    await supabase.from("sponsor_audit_log").insert({
      sponsor_id: entry.sponsorId,
      actor_id: entry.actorId,
      action: entry.action,
      category: entry.category,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      details: entry.details ?? {},
    });
  } catch {
    // Audit logging is best-effort — never fail the parent action
  }
}
