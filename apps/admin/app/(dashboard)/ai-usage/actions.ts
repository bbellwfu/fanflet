"use server";

import { createServiceClient } from "@fanflet/db/service";
import { requireSuperAdmin } from "@/lib/admin-auth";
import { z } from "zod";

const aiUsageFiltersSchema = z.object({
  featureName: z.string().optional(),
  adminId: z.string().uuid().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.number().int().min(1).optional(),
});

export type AiUsageFilters = z.infer<typeof aiUsageFiltersSchema>;

const PAGE_SIZE = 50;

export async function getAiUsageLogs(filters: AiUsageFilters = {}) {
  try {
    await requireSuperAdmin();
  } catch {
    return { entries: [], totalCount: 0, error: "Unauthorized" };
  }

  const supabase = createServiceClient();
  const page = filters.page ?? 1;
  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("ai_usage_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (filters.featureName) query = query.eq("feature_name", filters.featureName);
  if (filters.adminId) query = query.eq("admin_id", filters.adminId);
  if (filters.startDate) query = query.gte("created_at", filters.startDate);
  if (filters.endDate) query = query.lte("created_at", filters.endDate + "T23:59:59.999Z");

  const { data, count, error } = await query;

  if (error) {
    console.error("[ai-usage] fetch logs error:", error.message);
    return { entries: [], totalCount: 0, error: "Failed to load logs" };
  }

  // Resolve admin emails
  const adminIds = [...new Set((data ?? []).map((r) => r.admin_id))];
  const emailMap = new Map<string, string>();
  if (adminIds.length > 0) {
    const { data: users } = await supabase.auth.admin.listUsers();
    users?.users.forEach((u) => {
      if (adminIds.includes(u.id)) {
        emailMap.set(u.id, u.email ?? "");
      }
    });
  }

  const entries = (data ?? []).map((row) => ({
    ...row,
    admin_email: emailMap.get(row.admin_id) || row.admin_id,
  }));

  return { entries, totalCount: count ?? 0 };
}

export async function getAiUsageStats() {
  try {
    await requireSuperAdmin();
  } catch {
    return { stats: null, error: "Unauthorized" };
  }

  const supabase = createServiceClient();

  // Aggregate stats using a single query (or multiple if complex)
  // For now, let's just do basic aggregates
  const { data: totals, error } = await supabase
    .from("ai_usage_logs")
    .select("total_tokens, estimated_cost_usd, status");

  if (error) {
    console.error("[ai-usage] fetch stats error:", error.message);
    return { stats: null, error: "Failed to load statistics" };
  }

  const stats = {
    totalTokens: 0,
    totalCostUsd: 0,
    successCount: 0,
    errorCount: 0,
    totalRequests: totals?.length ?? 0,
  };

  totals?.forEach((row) => {
    stats.totalTokens += row.total_tokens || 0;
    stats.totalCostUsd += Number(row.estimated_cost_usd || 0);
    if (row.status === "success") stats.successCount++;
    else stats.errorCount++;
  });

  return { stats };
}

export async function getAiUsageAdmins() {
  try {
    await requireSuperAdmin();
  } catch {
    return { admins: [] };
  }

  const supabase = createServiceClient();
  const { data: roles } = await supabase
    .from("user_roles")
    .select("auth_user_id")
    .in("role", ["super_admin", "platform_admin"]);

  const adminIds = (roles ?? []).map((r) => r.auth_user_id);
  if (adminIds.length === 0) return { admins: [] };

  const { data: users } = await supabase.auth.admin.listUsers();
  const admins = (users?.users ?? [])
    .filter((u) => adminIds.includes(u.id))
    .map((u) => ({ id: u.id, email: u.email ?? "" }));

  return { admins };
}
