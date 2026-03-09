import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpeakerEntitlements, SponsorEntitlements } from "@fanflet/db";

/**
 * All roles that can authenticate to the MCP server.
 * Each role gets its own tool module in `tools/{role}/`.
 *
 * - platform_admin: Full cross-tenant access via service-role client
 * - speaker: Manages own fanflets, resources, subscribers (RLS-scoped)
 * - sponsor: Manages connections, resources, leads (RLS-scoped)
 * - audience: Views bookmarked fanflets and resources (RLS-scoped)
 */
export type McpRole = "platform_admin" | "speaker" | "sponsor" | "audience";

// ── Branded Supabase client types ──────────────────────────────────────
// These compile-time brands prevent accidentally swapping service-role and
// RLS-scoped clients. Both extend SupabaseClient so they pass to functions
// typed as SupabaseClient, but they are NOT assignable to each other.
declare const __clientBrand: unique symbol;

/** RLS-scoped Supabase client. auth.uid() = authenticated user. */
export type RlsScopedClient = SupabaseClient & {
  readonly [__clientBrand]: "rls";
};

/** Service-role Supabase client. Bypasses all RLS policies. */
export type ServiceRoleClient = SupabaseClient & {
  readonly [__clientBrand]: "service";
};

export interface ToolContext {
  userId: string;
  role: McpRole;
  apiKeyId?: string;
  /**
   * User-scoped Supabase client (RLS enforced).
   * Use for speaker, sponsor, and audience tools.
   * NEVER assign a service-role client to this field.
   */
  supabase: RlsScopedClient;
  /**
   * Service-role Supabase client (bypasses RLS).
   * Use ONLY in platform_admin tools and audit middleware.
   */
  serviceClient: ServiceRoleClient;
  /** Speaker ID, resolved after auth. Available for speaker role. */
  speakerId?: string;
  /** Sponsor ID, resolved after auth. Available for sponsor role. */
  sponsorId?: string;
  /**
   * Speaker entitlements (plan, features, limits). Loaded during auth
   * for speaker role. Used for per-tool feature and limit checks.
   */
  entitlements?: SpeakerEntitlements;
  /**
   * Sponsor entitlements (plan, features, limits). Loaded during auth
   * for sponsor role. Used for per-tool feature and limit checks.
   */
  sponsorEntitlements?: SponsorEntitlements;
}

export interface AuditEntry {
  auth_user_id: string;
  api_key_id?: string | null;
  tool_name: string;
  input_summary: Record<string, unknown>;
  result_status: "success" | "error" | "denied";
  error_message?: string | null;
  duration_ms: number;
  admin_action: boolean;
  target_entity_type?: string | null;
  target_entity_id?: string | null;
}

/** @deprecated Use AuditEntry instead */
export type AdminAuditEntry = AuditEntry;

export interface DateRange {
  from: string;
  to: string;
}

export class McpToolError extends Error {
  constructor(
    message: string,
    public readonly code: string = "TOOL_ERROR"
  ) {
    super(message);
    this.name = "McpToolError";
  }
}

export class McpAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpAuthError";
  }
}

export class McpEntitlementError extends Error {
  constructor(
    message: string,
    public readonly planRequired: string = "Pro"
  ) {
    super(message);
    this.name = "McpEntitlementError";
  }
}
