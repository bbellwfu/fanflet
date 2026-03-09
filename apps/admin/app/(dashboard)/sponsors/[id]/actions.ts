"use server";

import { createServiceClient } from "@fanflet/db/service";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin-auth";
import { auditAdminAction } from "@/lib/audit";
import { z } from "zod";

const toggleSponsorVerificationSchema = z.object({
  sponsorId: z.string().uuid(),
  currentlyVerified: z.boolean(),
});

export async function toggleSponsorVerification(
  sponsorId: string,
  currentlyVerified: boolean
) {
  const parsed = toggleSponsorVerificationSchema.safeParse({
    sponsorId,
    currentlyVerified,
  });
  if (!parsed.success) return { error: "Invalid input" };
  const { sponsorId: validSponsorId, currentlyVerified: validCurrentlyVerified } = parsed.data;

  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("sponsor_accounts")
    .update({
      is_verified: !validCurrentlyVerified,
      updated_at: new Date().toISOString(),
    })
    .eq("id", validSponsorId);

  if (error) {
    return { error: "Failed to update verification status" };
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: validCurrentlyVerified
      ? "sponsor.unverify"
      : "sponsor.verify",
    category: "sponsor",
    targetType: "sponsor",
    targetId: validSponsorId,
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath(`/sponsors/${validSponsorId}`);
  revalidatePath("/sponsors");
  return { success: true };
}
