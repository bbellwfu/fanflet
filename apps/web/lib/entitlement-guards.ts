import { getSpeakerEntitlements } from "@fanflet/db";
import type { SupabaseClient } from "@supabase/supabase-js";

export class EntitlementError extends Error {
  readonly feature: string;

  constructor(feature: string, message?: string) {
    super(message ?? `Feature "${feature}" is required for this action.`);
    this.name = "EntitlementError";
    this.feature = feature;
  }
}

/**
 * Throws EntitlementError if the speaker's plan does not include the given feature.
 * Uses the cached getSpeakerEntitlements under the hood — safe to call multiple
 * times per request without extra DB round-trips.
 */
export async function requireFeature(
  speakerId: string,
  feature: string
): Promise<void> {
  const entitlements = await getSpeakerEntitlements(speakerId);
  if (!entitlements.features.has(feature)) {
    throw new EntitlementError(feature);
  }
}

/**
 * Throws EntitlementError if the speaker does not have an active, non-ended
 * connection to the given sponsor.
 */
export async function requireActiveConnection(
  supabase: SupabaseClient,
  speakerId: string,
  sponsorId: string
): Promise<void> {
  const { data: conn } = await supabase
    .from("sponsor_connections")
    .select("id")
    .eq("speaker_id", speakerId)
    .eq("sponsor_id", sponsorId)
    .eq("status", "active")
    .is("ended_at", null)
    .maybeSingle();

  if (!conn) {
    throw new EntitlementError(
      "active_sponsor_connection",
      "Selected sponsor is not connected. Choose a connected sponsor or leave unlinked."
    );
  }
}

/**
 * Converts an EntitlementError (or any Error) to the `{ error: string }`
 * shape that server actions return. Use in catch blocks.
 */
export function entitlementErrorToResult(
  err: unknown
): { error: string } {
  if (err instanceof EntitlementError) {
    if (err.feature === "active_sponsor_connection") {
      return { error: err.message };
    }
    return { error: "This feature requires a higher plan. Upgrade in Settings." };
  }
  return { error: err instanceof Error ? err.message : "An unexpected error occurred." };
}
