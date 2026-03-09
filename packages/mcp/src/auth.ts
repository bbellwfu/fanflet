import { createServiceClient } from "@fanflet/db/service";
import { createUserScopedClient } from "@fanflet/db";
import type { SupabaseClient } from "@supabase/supabase-js";
import { McpAuthError } from "./types";
import type {
  ToolContext,
  McpRole,
  RlsScopedClient,
  ServiceRoleClient,
} from "./types";
import { verifyAccessToken as verifyOAuthToken } from "./oauth";

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

/**
 * Resolves the MCP role for a user. Checks in priority order:
 * 1. platform_admin (app_metadata or user_roles)
 * 2. sponsor (has a sponsor_accounts row)
 * 3. speaker (has a speakers row — default for authenticated users)
 * 4. audience (fallback — has subscriber entries but no speaker/sponsor account)
 */
async function resolveUserRole(
  serviceClient: SupabaseClient,
  userId: string,
  appMetadataRole?: string
): Promise<McpRole> {
  if (await resolveAdminRole(serviceClient, userId, appMetadataRole)) {
    return "platform_admin";
  }

  const { data: sponsorRow } = await serviceClient
    .from("sponsor_accounts")
    .select("id")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (sponsorRow) return "sponsor";

  const { data: speakerRow } = await serviceClient
    .from("speakers")
    .select("id")
    .eq("auth_user_id", userId)
    .maybeSingle();
  if (speakerRow) return "speaker";

  return "audience";
}

function resolveApiKeyRole(
  keyRole: string,
  isAdmin: boolean
): McpRole {
  if (keyRole === "admin" && isAdmin) return "platform_admin";
  if (keyRole === "sponsor") return "sponsor";
  if (keyRole === "audience") return "audience";
  return "speaker";
}

/**
 * Builds a ToolContext with the correct Supabase client for the role.
 *
 * - platform_admin: both clients are the service-role client (full cross-tenant access)
 * - speaker/sponsor/audience: ctx.supabase is an RLS-scoped client where auth.uid()
 *   matches the authenticated user, so RLS policies enforce data isolation.
 */
async function buildToolContext(
  userId: string,
  role: McpRole,
  rawServiceClient: SupabaseClient,
  apiKeyId?: string
): Promise<ToolContext> {
  const serviceClient = rawServiceClient as ServiceRoleClient;

  // SECURITY: non-admin roles MUST get an RLS-scoped client.
  // The branded types make it a compile error to assign ServiceRoleClient
  // to the supabase field. The explicit cast here is intentional and the
  // ONLY place where this cast should appear.
  const supabase: RlsScopedClient = role === "platform_admin"
    ? (rawServiceClient as RlsScopedClient)
    : (await createUserScopedClient(userId)) as RlsScopedClient;

  return {
    userId,
    role,
    apiKeyId,
    supabase,
    serviceClient,
  };
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
  const role = resolveApiKeyRole(keyRow.role, isAdmin);

  if (keyRow.role === "admin" && role !== "platform_admin") {
    throw new McpAuthError(
      "API key has admin role but user is not a platform admin"
    );
  }

  return buildToolContext(keyRow.auth_user_id, role, serviceClient, keyRow.id);
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

  // Try MCP OAuth token first
  const oauthResult = await verifyOAuthToken(token);
  if (oauthResult) {
    const role = await resolveUserRole(serviceClient, oauthResult.userId);
    return buildToolContext(oauthResult.userId, role, serviceClient);
  }

  // Fallback: try as a raw Supabase JWT (for dev/direct access)
  const { data: userData, error: userError } =
    await serviceClient.auth.getUser(token);

  if (userError || !userData?.user) {
    throw new McpAuthError("Invalid access token");
  }

  const user = userData.user;
  const appMetadataRole = (user.app_metadata as Record<string, unknown>)
    ?.role as string | undefined;

  const role = await resolveUserRole(serviceClient, user.id, appMetadataRole);

  return buildToolContext(user.id, role, serviceClient);
}
