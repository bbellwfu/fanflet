"use server";

import { createServiceClient } from "@fanflet/db/service";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { z } from "zod";

const auditLogFiltersSchema = z.object({
  category: z.string().max(100).optional(),
  adminId: z.string().uuid().optional(),
  startDate: z.string().max(50).optional(),
  endDate: z.string().max(50).optional(),
  page: z.number().int().min(1).max(1000).optional(),
});

export interface AuditLogEntry {
  id: string;
  admin_id: string;
  admin_email: string | null;
  action: string;
  category: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  category?: string;
  adminId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
}

const PAGE_SIZE = 50;

export async function getAuditLog(filters: AuditLogFilters = {}): Promise<{
  entries: AuditLogEntry[];
  totalCount: number;
  error?: string;
}> {
  const parsed = auditLogFiltersSchema.safeParse(filters);
  const validFilters = parsed.success ? parsed.data : {};

  try {
    await requireSuperAdmin();
  } catch (e) {
    return { entries: [], totalCount: 0, error: (e as Error).message };
  }

  const supabase = createServiceClient();
  const page = validFilters.page ?? 1;
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("admin_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (validFilters.category) {
    query = query.eq("category", validFilters.category);
  }
  if (validFilters.adminId) {
    query = query.eq("admin_id", validFilters.adminId);
  }
  if (validFilters.startDate) {
    query = query.gte("created_at", validFilters.startDate);
  }
  if (validFilters.endDate) {
    query = query.lte("created_at", validFilters.endDate + "T23:59:59.999Z");
  }

  const { data, count, error } = await query;

  if (error) {
    console.error("[audit-log] fetch error:", error.message);
    return { entries: [], totalCount: 0, error: "Failed to load audit log" };
  }

  const rows = data ?? [];
  const adminIds = [...new Set(rows.map((r) => r.admin_id))];

  // Resolve admin emails
  const emailMap = new Map<string, string>();
  if (adminIds.length > 0) {
    const { data: adminUsers } = await supabase.auth.admin.listUsers({
      perPage: 100,
    });
    if (adminUsers?.users) {
      for (const u of adminUsers.users) {
        if (adminIds.includes(u.id)) {
          emailMap.set(u.id, u.email ?? "");
        }
      }
    }
  }

  const entries: AuditLogEntry[] = rows.map((row) => ({
    id: row.id,
    admin_id: row.admin_id,
    admin_email: emailMap.get(row.admin_id) ?? null,
    action: row.action,
    category: row.category,
    target_type: row.target_type,
    target_id: row.target_id,
    details: (row.details ?? {}) as Record<string, unknown>,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    created_at: row.created_at,
  }));

  return { entries, totalCount: count ?? 0 };
}

export async function getAuditAdminUsers(): Promise<{
  admins: { id: string; email: string }[];
  error?: string;
}> {
  try {
    await requireSuperAdmin();
  } catch (e) {
    return { admins: [], error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: roles } = await supabase
    .from("user_roles")
    .select("auth_user_id, role")
    .in("role", ["super_admin", "platform_admin"]);

  const adminIds = (roles ?? []).map((r) => r.auth_user_id);
  if (adminIds.length === 0) return { admins: [] };

  const { data: users } = await supabase.auth.admin.listUsers({ perPage: 100 });
  const admins = (users?.users ?? [])
    .filter((u) => adminIds.includes(u.id))
    .map((u) => ({ id: u.id, email: u.email ?? "" }));

  return { admins };
}

export async function exportAuditLogCsv(filters: AuditLogFilters = {}): Promise<{
  csv?: string;
  error?: string;
}> {
  const parsed = auditLogFiltersSchema.safeParse(filters);
  const validFilters = parsed.success ? parsed.data : {};

  try {
    await requireSuperAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  let query = supabase
    .from("admin_audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10000);

  if (validFilters.category) {
    query = query.eq("category", validFilters.category);
  }
  if (validFilters.adminId) {
    query = query.eq("admin_id", validFilters.adminId);
  }
  if (validFilters.startDate) {
    query = query.gte("created_at", validFilters.startDate);
  }
  if (validFilters.endDate) {
    query = query.lte("created_at", validFilters.endDate + "T23:59:59.999Z");
  }

  const { data, error } = await query;
  if (error) return { error: "Failed to export" };

  const rows = data ?? [];

  // Resolve admin emails
  const adminIds = [...new Set(rows.map((r) => r.admin_id))];
  const emailMap = new Map<string, string>();
  if (adminIds.length > 0) {
    const { data: users } = await supabase.auth.admin.listUsers({ perPage: 100 });
    for (const u of users?.users ?? []) {
      if (adminIds.includes(u.id)) {
        emailMap.set(u.id, u.email ?? "");
      }
    }
  }

  const header = "Timestamp,Admin Email,Action,Category,Target Type,Target ID,Details,IP Address";
  const csvRows = rows.map((r) => {
    const email = emailMap.get(r.admin_id) ?? r.admin_id;
    const details = JSON.stringify(r.details ?? {}).replace(/"/g, '""');
    return `"${r.created_at}","${email}","${r.action}","${r.category}","${r.target_type ?? ""}","${r.target_id ?? ""}","${details}","${r.ip_address ?? ""}"`;
  });

  return { csv: [header, ...csvRows].join("\n") };
}
