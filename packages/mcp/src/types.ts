import type { SupabaseClient } from "@supabase/supabase-js";

export interface ToolContext {
  userId: string;
  role: "speaker" | "sponsor" | "platform_admin";
  apiKeyId?: string;
  supabase: SupabaseClient;
  serviceClient: SupabaseClient;
}

export interface AdminAuditEntry {
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
