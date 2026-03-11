"use server";

import { createServiceClient } from "@fanflet/db/service";

export type AuditCategory =
  | "account"
  | "plan"
  | "feature"
  | "sponsor"
  | "sponsor_inquiry"
  | "communication"
  | "admin_management"
  | "setting"
  | "impersonation"
  | "system"
  | "compliance";

export interface AuditEntry {
  adminId: string;
  action: string;
  category: AuditCategory;
  targetType?: string;
  targetId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Record an admin action in the audit log. Fire-and-forget — failures
 * are logged to console but never block the calling operation.
 */
export async function auditAdminAction(entry: AuditEntry): Promise<void> {
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("admin_audit_log").insert({
      admin_id: entry.adminId,
      action: entry.action,
      category: entry.category,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      details: entry.details ?? {},
      ip_address: entry.ipAddress ?? null,
      user_agent: entry.userAgent ?? null,
    });
    if (error) {
      console.error("[audit] Failed to write audit log:", error.message);
    }
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}
