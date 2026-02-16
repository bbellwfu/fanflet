"use server";

import { createServiceClient } from "@fanflet/db/service";
import { createClient } from "@fanflet/db/server";
import { revalidatePath } from "next/cache";

export async function toggleSuspension(
  speakerId: string,
  currentStatus: string,
  reason?: string
) {
  // Verify the caller is an admin
  const userSupabase = await createClient();
  const {
    data: { user },
  } = await userSupabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const appMetadata = user.app_metadata ?? {};
  if (appMetadata.role !== "platform_admin") {
    return { error: "Not authorized" };
  }

  const supabase = createServiceClient();

  if (currentStatus === "active") {
    // Suspend
    const { error } = await supabase
      .from("speakers")
      .update({
        status: "suspended",
        suspended_at: new Date().toISOString(),
        suspended_by: user.id,
        suspension_reason: reason ?? null,
      })
      .eq("id", speakerId);

    if (error) {
      return { error: "Failed to suspend account" };
    }
  } else {
    // Reactivate
    const { error } = await supabase
      .from("speakers")
      .update({
        status: "active",
        suspended_at: null,
        suspended_by: null,
        suspension_reason: null,
      })
      .eq("id", speakerId);

    if (error) {
      return { error: "Failed to reactivate account" };
    }
  }

  revalidatePath(`/accounts/${speakerId}`);
  revalidatePath("/accounts");
  return { success: true };
}
