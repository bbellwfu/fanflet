"use server";

import { createClient } from "@fanflet/db/server";
import { headers } from "next/headers";

export type AdminRole = "super_admin" | "platform_admin";

export interface AdminContext {
  user: { id: string; email: string };
  role: AdminRole;
  supabase: Awaited<ReturnType<typeof createClient>>;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * Verify the caller is an active admin (super_admin or platform_admin).
 * Checks user_roles table as source of truth, with app_metadata as fast-path fallback.
 */
export async function requireAdmin(): Promise<AdminContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("auth_user_id", user.id)
    .in("role", ["super_admin", "platform_admin"])
    .filter("removed_at", "is", "null")
    .maybeSingle();

  let resolvedRole: AdminRole | null = null;

  if (roleRow) {
    resolvedRole = roleRow.role as AdminRole;
  } else {
    const appMetadata = user.app_metadata ?? {};
    if (
      appMetadata.role === "platform_admin" ||
      appMetadata.role === "super_admin"
    ) {
      resolvedRole = appMetadata.role as AdminRole;
    }
  }

  if (!resolvedRole) throw new Error("Not authorized");

  const hdrs = await headers();

  return {
    user: { id: user.id, email: user.email ?? "" },
    role: resolvedRole,
    supabase,
    ipAddress: hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: hdrs.get("user-agent"),
  };
}

/**
 * Verify the caller is a super_admin. Throws if they are a regular platform_admin.
 */
export async function requireSuperAdmin(): Promise<AdminContext> {
  const ctx = await requireAdmin();
  if (ctx.role !== "super_admin") {
    throw new Error("Insufficient privileges");
  }
  return ctx;
}
