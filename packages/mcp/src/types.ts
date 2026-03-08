import type { SupabaseClient } from "@supabase/supabase-js";

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

export interface ToolContext {
  userId: string;
  role: McpRole;
  apiKeyId?: string;
  /**
   * User-scoped Supabase client (RLS enforced).
   * Use for speaker, sponsor, and audience tools.
   */
  supabase: SupabaseClient;
  /**
   * Service-role Supabase client (bypasses RLS).
   * Use ONLY for platform_admin tools.
   */
  serviceClient: SupabaseClient;
  /** Speaker ID, resolved after auth. Available for speaker role. */
  speakerId?: string;
  /** Sponsor ID, resolved after auth. Available for sponsor role. */
  sponsorId?: string;
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
