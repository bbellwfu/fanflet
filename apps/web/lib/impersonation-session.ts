import { createServiceClient } from "@fanflet/db/service";

export interface ImpersonationSessionPayload {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: {
    id: string;
    aud: string;
    role: string;
    email?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  };
}

export interface ImpersonationDisplay {
  sessionId: string;
  targetName: string;
  targetEmail: string;
  targetRole: "speaker" | "sponsor";
  writeEnabled: boolean;
  expiresAt: string;
}

export interface ImpersonationSessionResult {
  payload: ImpersonationSessionPayload;
  targetRole: "speaker" | "sponsor";
}

/**
 * Load session payload and target role by session id (for __imp URL param).
 * Returns null if session not found, ended, or expired.
 */
export async function getImpersonationSessionPayload(
  sessionId: string
): Promise<ImpersonationSessionResult | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("impersonation_sessions")
    .select("id, session_payload, expires_at, ended_at, target_role")
    .eq("id", sessionId)
    .single();

  if (error || !data) return null;
  if (data.ended_at) return null;
  if (new Date(data.expires_at) < new Date()) return null;

  const payload = data.session_payload as ImpersonationSessionPayload | null;
  if (!payload) return null;
  return {
    payload,
    targetRole: data.target_role as "speaker" | "sponsor",
  };
}

/**
 * Load display info for the banner when using __imp (no cookie).
 */
export async function getImpersonationDisplayBySessionId(
  sessionId: string
): Promise<ImpersonationDisplay | null> {
  const result = await getImpersonationSessionPayload(sessionId);
  if (!result) return null;

  const sessionRow = await createServiceClient()
    .from("impersonation_sessions")
    .select("id, write_enabled, expires_at")
    .eq("id", sessionId)
    .single();

  if (sessionRow.error || !sessionRow.data) return null;

  const user = result.payload.user;
  const targetName =
    (user.user_metadata?.name as string) ?? user.email ?? "Unknown";
  const targetEmail = user.email ?? "";

  return {
    sessionId,
    targetName,
    targetEmail,
    targetRole: result.targetRole,
    writeEnabled: sessionRow.data.write_enabled ?? false,
    expiresAt: sessionRow.data.expires_at,
  };
}

/**
 * Clear session_payload when ending impersonation (stop route).
 */
export async function clearImpersonationSessionPayload(
  sessionId: string
): Promise<void> {
  const supabase = createServiceClient();
  await supabase
    .from("impersonation_sessions")
    .update({ session_payload: null })
    .eq("id", sessionId);
}
