"use server";

import { createServiceClient } from "@fanflet/db/service";

export type AuditCategory =
  | "account"
  | "plan"
  | "feature"
  | "sponsor"
  | "sponsor_inquiry"
  | "communication"
  | "worklog"
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

export interface AuditResult {
  success: boolean;
  error?: string;
}

/**
 * Record an admin action in the audit log.
 * Returns { success, error? } so compliance-sensitive callers can decide
 * whether to proceed when the audit trail cannot be written.
 */
export async function auditAdminAction(entry: AuditEntry): Promise<AuditResult> {
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
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[audit] Failed to write audit log:", message);
    return { success: false, error: message };
  }
}
