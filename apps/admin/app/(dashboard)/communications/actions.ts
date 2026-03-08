"use server";

import { createClient } from "@fanflet/db/server";
import { createServiceClient } from "@fanflet/db/service";
import { revalidatePath } from "next/cache";
import { getEmailProvider } from "@/lib/email-provider";
import type { EmailSendResult } from "@/lib/email-provider";
import { hashEmail } from "@/lib/email-hash";
import { renderAnnouncementEmail } from "@/lib/email-template";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: roleRow } = await supabase
    .from("user_roles")
    .select("role")
    .eq("auth_user_id", user.id)
    .eq("role", "platform_admin")
    .maybeSingle();

  const appMetadata = user.app_metadata ?? {};
  const isAdmin = roleRow != null || appMetadata.role === "platform_admin";
  if (!isAdmin) throw new Error("Not authorized");

  return { user, supabase };
}

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
  try {
    await requireAdmin();
  } catch (e) {
    return { communication: null, variants: [], deliveryCount: 0, error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: comm, error } = await supabase
    .from("platform_communications")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !comm) {
    return { communication: null, variants: [], deliveryCount: 0, error: "Communication not found" };
  }

  const { data: variants } = await supabase
    .from("platform_communication_variants")
    .select("*")
    .eq("communication_id", id);

  const { count } = await supabase
    .from("communication_deliveries")
    .select("id", { count: "exact", head: true })
    .eq("communication_id", id);

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
      title: params.title,
      source_type: "worklog_paste",
      source_reference: params.sourceReference ?? null,
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
      subject: params.subject,
      body_html: params.bodyHtml,
    });

  if (variantError) {
    console.error("[communications] createVariant:", variantError.message);
    return { error: "Failed to create variant" };
  }

  revalidatePath("/communications");
  return { id: comm.id };
}

export async function updateDraft(params: {
  id: string;
  title?: string;
  subject?: string;
  bodyHtml?: string;
}): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: comm } = await supabase
    .from("platform_communications")
    .select("status")
    .eq("id", params.id)
    .single();

  if (!comm || comm.status !== "draft") {
    return { error: "Only drafts can be edited" };
  }

  if (params.title) {
    await supabase
      .from("platform_communications")
      .update({ title: params.title, updated_at: new Date().toISOString() })
      .eq("id", params.id);
  }

  if (params.subject || params.bodyHtml) {
    const updates: Record<string, string> = {};
    if (params.subject) updates.subject = params.subject;
    if (params.bodyHtml) updates.body_html = params.bodyHtml;

    await supabase
      .from("platform_communication_variants")
      .update(updates)
      .eq("communication_id", params.id)
      .eq("audience_type", "speaker");
  }

  revalidatePath("/communications");
  revalidatePath(`/communications/${params.id}`);
  return {};
}

export async function sendCommunication(
  communicationId: string
): Promise<{ sentCount?: number; error?: string }> {
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
    .eq("id", communicationId)
    .single();

  if (!comm) return { error: "Communication not found" };
  if (comm.status === "sent") return { error: "Already sent" };

  const { data: variants } = await supabase
    .from("platform_communication_variants")
    .select("audience_type, subject, body_html, body_plain")
    .eq("communication_id", communicationId);

  const speakerVariant = (variants ?? []).find((v) => v.audience_type === "speaker");
  if (!speakerVariant) return { error: "No speaker variant found" };

  // Resolve opted-in speakers
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

  // Exclude globally unsubscribed
  const speakerEmails = speakers.map((s) => s.email);
  const hashes = await Promise.all(speakerEmails.map((e) => hashEmail(e)));
  const { data: unsubs } = await supabase
    .from("platform_communication_unsubscribes")
    .select("email_hash")
    .in("email_hash", hashes);
  const unsubSet = new Set((unsubs ?? []).map((u) => u.email_hash));

  // Exclude already-delivered (idempotency)
  const { data: delivered } = await supabase
    .from("communication_deliveries")
    .select("recipient_id")
    .eq("communication_id", communicationId)
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
    // Mark sent even if no recipients (all unsubscribed/already sent)
    await supabase
      .from("platform_communications")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", communicationId);
    revalidatePath("/communications");
    return { sentCount: 0 };
  }

  const provider = getEmailProvider();

  const messages = recipients.map((r) => {
    const unsubscribeUrl = `${webUrl}/api/communications/unsubscribe?email=${encodeURIComponent(r.speaker.email)}&comm=${communicationId}`;
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
    };
  });

  const results = await provider.send(messages);

  // Record deliveries
  const deliveryRows = results.map((result: EmailSendResult, idx: number) => ({
    communication_id: communicationId,
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

  await supabase
    .from("platform_communications")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", communicationId);

  revalidatePath("/communications");
  revalidatePath(`/communications/${communicationId}`);
  return { sentCount: successCount };
}

export async function sendTestEmail(
  communicationId: string
): Promise<{ error?: string; success?: string }> {
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
    .eq("id", communicationId)
    .single();

  if (!comm) return { error: "Communication not found" };

  const { data: variant } = await supabase
    .from("platform_communication_variants")
    .select("subject, body_html, body_plain")
    .eq("communication_id", communicationId)
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
    },
  ]);

  if (!result.success) {
    return { error: `Send failed: ${result.error}` };
  }

  return { success: `Test email sent to ${email}` };
}

export async function deleteDraft(id: string): Promise<{ error?: string }> {
  try {
    await requireAdmin();
  } catch (e) {
    return { error: (e as Error).message };
  }

  const supabase = createServiceClient();

  const { data: comm } = await supabase
    .from("platform_communications")
    .select("status")
    .eq("id", id)
    .single();

  if (!comm) return { error: "Not found" };
  if (comm.status !== "draft") return { error: "Only drafts can be deleted" };

  const { error } = await supabase
    .from("platform_communications")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[communications] deleteDraft:", error.message);
    return { error: "Failed to delete" };
  }

  revalidatePath("/communications");
  return {};
}
