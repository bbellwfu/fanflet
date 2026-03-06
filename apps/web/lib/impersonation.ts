import { cookies } from "next/headers";
import { createServiceClient } from "@fanflet/db/service";

export interface ImpersonationMeta {
  sessionId: string;
  adminId: string;
  targetUserId: string;
  targetRole: "speaker" | "sponsor";
  writeEnabled: boolean;
  expiresAt: string;
}

export interface ImpersonationDisplay {
  targetName: string;
  targetEmail: string;
  adminName: string;
  adminEmail: string;
  targetRole: "speaker" | "sponsor";
  writeEnabled: boolean;
  expiresAt: string;
}

/**
 * Reads the httpOnly impersonation_meta cookie. Returns null if not impersonating.
 */
export async function getImpersonationMeta(): Promise<ImpersonationMeta | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("impersonation_meta")?.value;
  if (!raw) return null;

  try {
    const meta = JSON.parse(raw) as ImpersonationMeta;
    if (new Date(meta.expiresAt) < new Date()) return null;
    return meta;
  } catch {
    return null;
  }
}

/**
 * Reads the client-readable impersonation_display cookie for banner rendering.
 */
export async function getImpersonationBannerData(): Promise<ImpersonationDisplay | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("impersonation_display")?.value;
  if (!raw) return null;

  try {
    const display = JSON.parse(raw) as ImpersonationDisplay;
    if (new Date(display.expiresAt) < new Date()) return null;
    return display;
  } catch {
    return null;
  }
}

/**
 * Checks if writes should be blocked during this session.
 * Throws an error if impersonating in read-only mode.
 */
export async function blockImpersonationWrites(): Promise<void> {
  const meta = await getImpersonationMeta();
  if (meta && !meta.writeEnabled) {
    throw new Error(
      "This action is not available in read-only impersonation mode."
    );
  }
}

/**
 * Returns impersonation meta if active, for use in action logging.
 * Does NOT throw — used to conditionally log actions.
 */
export async function getImpersonationForLogging(): Promise<ImpersonationMeta | null> {
  return getImpersonationMeta();
}

/**
 * Logs an action performed during an impersonation session.
 * No-ops silently if not impersonating.
 */
export async function logImpersonationAction(
  actionType: string,
  actionPath?: string,
  actionDetails?: Record<string, unknown>
): Promise<void> {
  const meta = await getImpersonationMeta();
  if (!meta) return;

  try {
    const supabase = createServiceClient();
    await supabase.from("impersonation_actions").insert({
      session_id: meta.sessionId,
      action_type: actionType,
      action_path: actionPath,
      action_details: actionDetails ?? {},
    });
  } catch {
    // Best-effort logging — never break the user flow
  }
}
