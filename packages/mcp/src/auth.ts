import { createServiceClient } from "@fanflet/db/service";
import type { SupabaseClient } from "@supabase/supabase-js";
import { McpAuthError } from "./types";
import type { ToolContext } from "./types";

const ADMIN_KEY_PREFIX = "fan_admin_";
const SPEAKER_KEY_PREFIX = "fan_";

async function hashKey(raw: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function resolveAdminRole(
  serviceClient: SupabaseClient,
  userId: string,
  appMetadataRole?: string
): Promise<boolean> {
  if (appMetadataRole === "platform_admin") return true;

  const { data: roleRow } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("auth_user_id", userId)
    .eq("role", "platform_admin")
    .maybeSingle();

  return !!roleRow;
}

function resolveRole(
  keyRole: string,
  isAdmin: boolean
): "speaker" | "sponsor" | "platform_admin" {
  if (keyRole === "admin" && isAdmin) return "platform_admin";
  if (keyRole === "sponsor") return "sponsor";
  return "speaker";
}

export async function authenticateFromApiKey(
  bearerToken: string
): Promise<ToolContext> {
  const serviceClient = createServiceClient();
  const keyHash = await hashKey(bearerToken);

  const { data: keyRow, error } = await serviceClient
    .from("mcp_api_keys")
    .select("id, auth_user_id, role, revoked_at, expires_at")
    .eq("key_hash", keyHash)
    .maybeSingle();

  if (error || !keyRow) {
    throw new McpAuthError("Invalid API key");
  }

  if (keyRow.revoked_at) {
    throw new McpAuthError("API key has been revoked");
  }

  if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
    throw new McpAuthError("API key has expired");
  }

  await serviceClient
    .from("mcp_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRow.id);

  const isAdmin = await resolveAdminRole(
    serviceClient,
    keyRow.auth_user_id,
    undefined
  );
  const role = resolveRole(keyRow.role, isAdmin);

  if (keyRow.role === "admin" && role !== "platform_admin") {
    throw new McpAuthError(
      "API key has admin role but user is not a platform admin"
    );
  }

  return {
    userId: keyRow.auth_user_id,
    role,
    apiKeyId: keyRow.id,
    supabase: serviceClient,
    serviceClient,
  };
}

export async function authenticateFromHeaders(
  headers: Headers
): Promise<ToolContext> {
  const authHeader = headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new McpAuthError("Missing or invalid Authorization header");
  }

  const token = authHeader.slice(7);

  if (token.startsWith(ADMIN_KEY_PREFIX) || token.startsWith(SPEAKER_KEY_PREFIX)) {
    return authenticateFromApiKey(token);
  }

  const serviceClient = createServiceClient();
  const { data: userData, error: userError } =
    await serviceClient.auth.getUser(token);

  if (userError || !userData?.user) {
    throw new McpAuthError("Invalid access token");
  }

  const user = userData.user;
  const appMetadataRole = (user.app_metadata as Record<string, unknown>)
    ?.role as string | undefined;

  const isAdmin = await resolveAdminRole(
    serviceClient,
    user.id,
    appMetadataRole
  );

  const role: "speaker" | "sponsor" | "platform_admin" = isAdmin
    ? "platform_admin"
    : "speaker";

  return {
    userId: user.id,
    role,
    supabase: serviceClient,
    serviceClient,
  };
}
