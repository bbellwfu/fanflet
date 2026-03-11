"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceClient } from "@fanflet/db/service";
import { requireAdmin } from "@/lib/admin-auth";
import { auditAdminAction } from "@/lib/audit";

const statusSchema = z.enum(["new", "contacted", "closed"]);
const notesSchema = z.string().max(10000);

export async function updateInquiryStatus(
  inquiryId: string,
  status: string
): Promise<{ error?: string }> {
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { error: "Invalid status" };

  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("sponsor_inquiries")
    .update({ status: parsed.data })
    .eq("id", inquiryId);

  if (error) {
    console.error("[sponsor-inquiries] updateInquiryStatus failed:", error.message);
    return { error: "Failed to update status" };
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "sponsor_inquiry.update_status",
    category: "sponsor_inquiry",
    targetId: inquiryId,
    details: { status: parsed.data },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/sponsor-inquiries");
  revalidatePath(`/sponsor-inquiries/${inquiryId}`);
  return {};
}

export async function updateInquiryNotes(
  inquiryId: string,
  notes: string
): Promise<{ error?: string }> {
  const parsed = notesSchema.safeParse(notes);
  if (!parsed.success) return { error: "Notes too long" };

  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("sponsor_inquiries")
    .update({ notes: parsed.data })
    .eq("id", inquiryId);

  if (error) {
    console.error("[sponsor-inquiries] updateInquiryNotes failed:", error.message);
    return { error: "Failed to update notes" };
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "sponsor_inquiry.update_notes",
    category: "sponsor_inquiry",
    targetId: inquiryId,
    details: { notes_length: parsed.data.length },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/sponsor-inquiries");
  revalidatePath(`/sponsor-inquiries/${inquiryId}`);
  return {};
}
