"use server";

import { createServiceClient } from "@fanflet/db/service";
import { revalidatePath } from "next/cache";
import { getEmailProvider } from "@/lib/email-provider";
import type { EmailSendResult } from "@/lib/email-provider";
import { hashEmail } from "@/lib/email-hash";
import { renderAnnouncementEmail } from "@/lib/email-template";
import { requireAdmin } from "@/lib/admin-auth";
import { auditAdminAction } from "@/lib/audit";
import { z } from "zod";

const communicationIdSchema = z.string().uuid();
const createCommunicationSchema = z.object({
  title: z.string().min(1).max(500),
  sourceReference: z.string().max(500).optional(),
  subject: z.string().min(1).max(500),
  bodyHtml: z.string().max(500_000),
});
const updateDraftSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(500).optional(),
  subject: z.string().min(1).max(500).optional(),
  bodyHtml: z.string().max(500_000).optional(),
});

export interface CommunicationRow {
  id: string;
  created_at: string;
  title: string;
  status: string;
  sent_at: string | null;
  source_reference: string | null;
  delivery_count: number;
}

export async function listCommunications(): Promise<{
  data: CommunicationRow[];
  error?: string;
}> {
  try {
    await requireAdmin();
  } catch (e) {
    return { data: [], error: (e as Error).message };
  }

  const supabase = createServiceClient();
  const { data: comms, error } = await supabase
    .from("platform_communications")
    .select("id, created_at, title, status, sent_at, source_reference")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    console.error("[communications] listCommunications:", error.message);
    return { data: [], error: "Failed to load communications" };
  }

  const rows: CommunicationRow[] = await Promise.all(
    (comms ?? []).map(async (c) => {
      const { count } = await supabase
        .from("communication_deliveries")
        .select("id", { count: "exact", head: true })
        .eq("communication_id", c.id);
      return { ...c, delivery_count: count ?? 0 };
    })
  );

  return { data: rows };
}

export async function getCommunication(id: string): Promise<{
  communication: Record<string, unknown> | null;
  variants: Record<string, unknown>[];
  deliveryCount: number;
  error?: string;
}> {
  const parsed = communicationIdSchema.safeParse(id);
  if (!parsed.success) {
    return { communication: null, variants: [], deliveryCount: 0, error: "Invalid input" };
  }
  const validId = parsed.data;

  try {
    await requireAdmin();
  } catch (e) {
    return { communication: null, variants: [], deliveryCount: 0, error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: comm, error } = await supabase
    .from("platform_communications")
    .select("*")
    .eq("id", validId)
    .single();

  if (error || !comm) {
    return { communication: null, variants: [], deliveryCount: 0, error: "Communication not found" };
  }

  const { data: variants } = await supabase
    .from("platform_communication_variants")
    .select("*")
    .eq("communication_id", validId);

  const { count } = await supabase
    .from("communication_deliveries")
    .select("id", { count: "exact", head: true })
    .eq("communication_id", validId);

  return {
    communication: comm,
    variants: variants ?? [],
    deliveryCount: count ?? 0,
  };
}

export async function createCommunication(params: {
  title: string;
  sourceReference?: string;
  subject: string;
  bodyHtml: string;
}): Promise<{ id?: string; error?: string }> {
  const parsed = createCommunicationSchema.safeParse(params);
  if (!parsed.success) return { error: "Invalid input" };
  const validParams = parsed.data;

  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: comm, error: commError } = await supabase
    .from("platform_communications")
    .insert({
      created_by_admin_id: admin.user.id,
      title: validParams.title,
      source_type: "worklog_paste",
      source_reference: validParams.sourceReference ?? null,
      status: "draft",
    })
    .select("id")
    .single();

  if (commError || !comm) {
    console.error("[communications] createCommunication:", commError?.message);
    return { error: "Failed to create communication" };
  }

  const { error: variantError } = await supabase
    .from("platform_communication_variants")
    .insert({
      communication_id: comm.id,
      audience_type: "speaker",
      subject: validParams.subject,
      body_html: validParams.bodyHtml,
    });

  if (variantError) {
    console.error("[communications] createVariant:", variantError.message);
    return { error: "Failed to create variant" };
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "communication.create",
    category: "communication",
    targetType: "communication",
    targetId: comm.id,
    details: { title: validParams.title },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/communications");
  return { id: comm.id };
}

export async function updateDraft(params: {
  id: string;
  title?: string;
  subject?: string;
  bodyHtml?: string;
}): Promise<{ error?: string }> {
  const parsed = updateDraftSchema.safeParse(params);
  if (!parsed.success) return { error: "Invalid input" };
  const validParams = parsed.data;

  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: comm } = await supabase
    .from("platform_communications")
    .select("status")
    .eq("id", validParams.id)
    .single();

  if (!comm || comm.status !== "draft") {
    return { error: "Only drafts can be edited" };
  }

  if (validParams.title) {
    const { error: titleError } = await supabase
      .from("platform_communications")
      .update({ title: validParams.title, updated_at: new Date().toISOString() })
      .eq("id", validParams.id);
    if (titleError) {
      console.error("[communications] updateDraft title:", titleError.message);
      return { error: "Failed to update draft" };
    }
  }

  if (validParams.subject || validParams.bodyHtml) {
    const updates: Record<string, string> = {};
    if (validParams.subject) updates.subject = validParams.subject;
    if (validParams.bodyHtml) updates.body_html = validParams.bodyHtml;

    const { error: variantError } = await supabase
      .from("platform_communication_variants")
      .update(updates)
      .eq("communication_id", validParams.id)
      .eq("audience_type", "speaker");
    if (variantError) {
      console.error("[communications] updateDraft variant:", variantError.message);
      return { error: "Failed to update draft" };
    }
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "communication.update_draft",
    category: "communication",
    targetType: "communication",
    targetId: validParams.id,
    details: { title: validParams.title },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/communications");
  revalidatePath(`/communications/${validParams.id}`);
  return {};
}

export async function sendCommunication(
  communicationId: string
): Promise<{ sentCount?: number; error?: string }> {
  const parsed = communicationIdSchema.safeParse(communicationId);
  if (!parsed.success) return { error: "Invalid input" };
  const validCommunicationId = parsed.data;

  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: comm } = await supabase
    .from("platform_communications")
    .select("id, status, title")
    .eq("id", validCommunicationId)
    .single();

  if (!comm) return { error: "Communication not found" };
  if (comm.status === "sent") return { error: "Already sent" };

  const { data: variants } = await supabase
    .from("platform_communication_variants")
    .select("audience_type, subject, body_html, body_plain")
    .eq("communication_id", validCommunicationId);

  const speakerVariant = (variants ?? []).find((v) => v.audience_type === "speaker");
  if (!speakerVariant) return { error: "No speaker variant found" };

  const { data: optedInPrefs } = await supabase
    .from("platform_communication_preferences")
    .select("speaker_id")
    .eq("recipient_type", "speaker")
    .eq("category", "platform_announcements")
    .eq("opted_in", true)
    .not("speaker_id", "is", null);

  const optedInSpeakerIds = (optedInPrefs ?? []).map((p) => p.speaker_id as string);
  if (optedInSpeakerIds.length === 0) return { error: "No opted-in speakers found" };

  const { data: speakers } = await supabase
    .from("speakers")
    .select("id, email, name")
    .in("id", optedInSpeakerIds)
    .not("email", "is", null);

  if (!speakers || speakers.length === 0) return { error: "No speakers with email found" };

  const speakerEmails = speakers.map((s) => s.email);
  const hashes = await Promise.all(speakerEmails.map((e) => hashEmail(e)));
  const { data: unsubs } = await supabase
    .from("platform_communication_unsubscribes")
    .select("email_hash")
    .in("email_hash", hashes);
  const unsubSet = new Set((unsubs ?? []).map((u) => u.email_hash));

  const { data: delivered } = await supabase
    .from("communication_deliveries")
    .select("recipient_id")
    .eq("communication_id", validCommunicationId)
    .eq("channel", "email");
  const deliveredSet = new Set((delivered ?? []).map((d) => d.recipient_id));

  const webUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  interface Recipient {
    speaker: { id: string; email: string; name: string | null };
    emailHash: string;
  }

  const recipients: Recipient[] = [];
  for (let i = 0; i < speakers.length; i++) {
    const s = speakers[i];
    const h = hashes[i];
    if (unsubSet.has(h)) continue;
    if (deliveredSet.has(s.id)) continue;
    recipients.push({ speaker: s, emailHash: h });
  }

  if (recipients.length === 0) {
    const { error: statusError } = await supabase
      .from("platform_communications")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", validCommunicationId);
    if (statusError) {
      console.error("[communications] sendCommunication status update:", statusError.message);
    }
    revalidatePath("/communications");
    return { sentCount: 0 };
  }

  const provider = getEmailProvider();

  const messages = recipients.map((r) => {
    const unsubscribeUrl = `${webUrl}/api/communications/unsubscribe?email=${encodeURIComponent(r.speaker.email)}&comm=${validCommunicationId}`;
    const preferencesUrl = `${webUrl}/dashboard/settings#notifications`;

    const fullHtml = renderAnnouncementEmail({
      title: comm.title,
      bodyHtml: speakerVariant.body_html,
      unsubscribeUrl,
      preferencesUrl,
    });

    return {
      to: r.speaker.email,
      subject: speakerVariant.subject,
      bodyHtml: fullHtml,
      bodyPlain: speakerVariant.body_plain ?? undefined,
      replyTo: "support@fanflet.com",
    };
  });

  const results = await provider.send(messages);

  const deliveryRows = results.map((result: EmailSendResult, idx: number) => ({
    communication_id: validCommunicationId,
    audience_type: "speaker" as const,
    recipient_type: "speaker" as const,
    recipient_id: recipients[idx].speaker.id,
    email_hash: recipients[idx].emailHash,
    channel: "email" as const,
    sent_at: new Date().toISOString(),
    provider_message_id: result.externalId ?? null,
    email_provider: provider.name,
  }));

  if (deliveryRows.length > 0) {
    const { error: deliveryError } = await supabase
      .from("communication_deliveries")
      .insert(deliveryRows);
    if (deliveryError) {
      console.error("[communications] insert deliveries:", deliveryError.message);
    }
  }

  const successCount = results.filter((r) => r.success).length;

  const { error: finalStatusError } = await supabase
    .from("platform_communications")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", validCommunicationId);
  if (finalStatusError) {
    console.error("[communications] sendCommunication final status update:", finalStatusError.message);
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "communication.send",
    category: "communication",
    targetType: "communication",
    targetId: validCommunicationId,
    details: { recipientCount: recipients.length, sentCount: successCount },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/communications");
  revalidatePath(`/communications/${validCommunicationId}`);
  return { sentCount: successCount };
}

export async function sendTestEmail(
  communicationId: string
): Promise<{ error?: string; success?: string }> {
  const parsed = communicationIdSchema.safeParse(communicationId);
  if (!parsed.success) return { error: "Invalid input" };
  const validCommunicationId = parsed.data;

  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const email = admin.user.email;
  if (!email) return { error: "No email found for your account" };

  const supabase = createServiceClient();

  const { data: comm } = await supabase
    .from("platform_communications")
    .select("title")
    .eq("id", validCommunicationId)
    .single();

  if (!comm) return { error: "Communication not found" };

  const { data: variant } = await supabase
    .from("platform_communication_variants")
    .select("subject, body_html, body_plain")
    .eq("communication_id", validCommunicationId)
    .eq("audience_type", "speaker")
    .single();

  if (!variant) return { error: "No speaker variant found" };

  const webUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const fullHtml = renderAnnouncementEmail({
    title: comm.title,
    bodyHtml: variant.body_html,
    unsubscribeUrl: `${webUrl}/api/communications/unsubscribe?preview=true`,
    preferencesUrl: `${webUrl}/dashboard/settings#notifications`,
  });

  const provider = getEmailProvider();
  const [result] = await provider.send([
    {
      to: email,
      subject: `[TEST] ${variant.subject}`,
      bodyHtml: fullHtml,
      bodyPlain: variant.body_plain ?? undefined,
      replyTo: "support@fanflet.com",
    },
  ]);

  if (!result.success) {
    console.error("[communications] sendTestEmail failed:", result.error);
    return { error: "Failed to send test email" };
  }

  return { success: `Test email sent to ${email}` };
}

export async function deleteDraft(id: string): Promise<{ error?: string }> {
  const parsed = communicationIdSchema.safeParse(id);
  if (!parsed.success) return { error: "Invalid input" };
  const validId = parsed.data;

  let admin: Awaited<ReturnType<typeof requireAdmin>>;
  try {
    admin = await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: comm } = await supabase
    .from("platform_communications")
    .select("status, title")
    .eq("id", validId)
    .single();

  if (!comm) return { error: "Not found" };
  if (comm.status !== "draft") return { error: "Only drafts can be deleted" };

  const { error } = await supabase
    .from("platform_communications")
    .delete()
    .eq("id", validId);

  if (error) {
    console.error("[communications] deleteDraft:", error.message);
    return { error: "Failed to delete" };
  }

  await auditAdminAction({
    adminId: admin.user.id,
    action: "communication.delete_draft",
    category: "communication",
    targetType: "communication",
    targetId: validId,
    details: { title: comm.title },
    ipAddress: admin.ipAddress,
    userAgent: admin.userAgent,
  });

  revalidatePath("/communications");
  return {};
}
