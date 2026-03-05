"use server";

import { createServiceClient } from "@fanflet/db/service";
import { createClient } from "@fanflet/db/server";
import { revalidatePath } from "next/cache";

export async function toggleSponsorVerification(
  sponsorId: string,
  currentlyVerified: boolean
) {
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

  const { error } = await supabase
    .from("sponsor_accounts")
    .update({
      is_verified: !currentlyVerified,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sponsorId);

  if (error) {
    return { error: "Failed to update verification status" };
  }

  revalidatePath(`/sponsors/${sponsorId}`);
  revalidatePath("/sponsors");
  return { success: true };
}
