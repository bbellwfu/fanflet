"use server";

import { createServiceClient } from "@fanflet/db/service";
import { requireSpeaker } from "@/lib/auth-context";
import { blockImpersonationWrites } from "@/lib/impersonation";

export async function requestAccountDeletion() {
  await blockImpersonationWrites();
  const { user, speakerId, supabase } = await requireSpeaker();

  const { data: speaker } = await supabase
    .from("speakers")
    .select("email, name")
    .eq("id", speakerId)
    .single();

  if (!speaker) return { error: "Speaker not found" };

  const serviceClient = createServiceClient();

  const { data: existing } = await serviceClient
    .from("data_subject_requests")
    .select("id, status")
    .eq("subject_email", speaker.email)
    .eq("request_type", "erasure")
    .in("status", ["pending", "approved", "processing"])
    .maybeSingle();

  if (existing) {
    return { error: "You already have a pending deletion request. Our team will process it shortly." };
  }

  let regulatoryDeadline: string | null = null;
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + 30);
  regulatoryDeadline = deadline.toISOString();

  const { error } = await serviceClient
    .from("data_subject_requests")
    .insert({
      subject_auth_user_id: user.id,
      subject_email: speaker.email,
      subject_type: "speaker",
      subject_name: speaker.name,
      request_type: "erasure",
      source: "user_self_service",
      source_reference: "Requested via speaker dashboard settings",
      regulation: null,
      regulatory_deadline: regulatoryDeadline,
      status: "pending",
      created_by: user.id,
      notification_email: speaker.email,
    });

  if (error) return { error: "Failed to submit deletion request. Please try again or contact support." };

  await serviceClient
    .from("speakers")
    .update({ status: "pending_delete" })
    .eq("id", speakerId);

  return { success: true };
}

export async function checkDeletionRequestStatus() {
  const { supabase } = await requireSpeaker();

  const { data: speaker } = await supabase
    .from("speakers")
    .select("email")
    .single();

  if (!speaker) return { status: null };

  const serviceClient = createServiceClient();
  const { data: request } = await serviceClient
    .from("data_subject_requests")
    .select("id, status, created_at")
    .eq("subject_email", speaker.email)
    .eq("request_type", "erasure")
    .in("status", ["pending", "approved", "processing"])
    .order("created_at", { ascending: false })
    .maybeSingle();

  if (!request) return { status: null };

  return {
    status: request.status as string,
    createdAt: request.created_at as string,
  };
}
