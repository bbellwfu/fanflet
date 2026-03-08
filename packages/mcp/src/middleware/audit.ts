import { createServiceClient } from "@fanflet/db/service";
import type { AdminAuditEntry, ToolContext } from "../types";

function sanitizeInput(
  input: Record<string, unknown>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" && value.length > 200) {
      sanitized[key] = value.slice(0, 200) + "[truncated]";
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function extractEntityType(toolName: string): string | null {
  if (toolName.includes("account") || toolName.includes("speaker")) return "speaker";
  if (toolName.includes("sponsor")) return "sponsor";
  if (toolName.includes("fanflet")) return "fanflet";
  if (toolName.includes("plan")) return "plan";
  if (toolName.includes("feature")) return "feature_flag";
  if (toolName.includes("subscriber")) return "subscriber";
  if (toolName.includes("waiting")) return "marketing_subscriber";
  if (toolName.includes("impersonat")) return "impersonation";
  return null;
}

function extractEntityId(input: Record<string, unknown>): string | null {
  for (const key of [
    "speakerId",
    "sponsorId",
    "fanfletId",
    "planId",
    "featureFlagId",
  ]) {
    const val = input[key];
    if (typeof val === "string") return val;
  }
  return null;
}

export async function writeAuditLog(
  ctx: ToolContext,
  toolName: string,
  input: Record<string, unknown>,
  status: "success" | "error" | "denied",
  durationMs: number,
  errorMessage?: string
): Promise<void> {
  try {
    const serviceClient = createServiceClient();
    const entry: AdminAuditEntry = {
      auth_user_id: ctx.userId,
      api_key_id: ctx.apiKeyId ?? null,
      tool_name: toolName,
      input_summary: sanitizeInput(input),
      result_status: status,
      error_message: errorMessage ?? null,
      duration_ms: durationMs,
      admin_action: ctx.role === "platform_admin",
      target_entity_type: extractEntityType(toolName),
      target_entity_id: extractEntityId(input),
    };

    await serviceClient.from("mcp_audit_log").insert(entry);
  } catch {
    // Audit logging should never cause a tool call to fail
  }
}
