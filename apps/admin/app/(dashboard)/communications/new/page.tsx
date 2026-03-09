import { createServiceClient } from "@fanflet/db/service";
import { NewCommunicationForm } from "./new-communication-form";
import type { WorklogEntry } from "@/lib/worklog-types";

let worklogIndex: WorklogEntry[] = [];
try {
  worklogIndex = (await import("@/generated/worklog-index.json")).default as WorklogEntry[];
} catch {
  // No worklog index available (first build or no worklogs)
}

export default async function NewCommunicationPage({
  searchParams,
}: {
  searchParams: Promise<{ draft?: string; worklog?: string }>;
}) {
  const params = await searchParams;
  const draftId = params.draft;
  const worklogFilename = params.worklog;

  const supabase = createServiceClient();

  let existingDraft: {
    id: string;
    title: string;
    sourceReference: string | null;
    subject: string;
    bodyHtml: string;
  } | null = null;

  if (draftId) {
    const { data: comm } = await supabase
      .from("platform_communications")
      .select("id, title, source_reference, status")
      .eq("id", draftId)
      .single();

    if (comm && comm.status === "draft") {
      const { data: variant } = await supabase
        .from("platform_communication_variants")
        .select("subject, body_html")
        .eq("communication_id", draftId)
        .eq("audience_type", "speaker")
        .single();

      existingDraft = {
        id: comm.id,
        title: comm.title,
        sourceReference: comm.source_reference,
        subject: variant?.subject ?? "",
        bodyHtml: variant?.body_html ?? "",
      };
    }
  }

  // Identify which worklogs already have a sent or draft communication
  const { data: existingComms } = await supabase
    .from("platform_communications")
    .select("source_reference, status")
    .not("source_reference", "is", null);

  const commsByRef = new Map<string, string>();
  for (const c of existingComms ?? []) {
    if (c.source_reference) {
      const refs = c.source_reference.split("|").map((r: string) => r.trim()).filter(Boolean);
      for (const ref of refs) {
        commsByRef.set(ref, c.status);
      }
    }
  }

  const worklogsWithStatus = worklogIndex.map((w) => {
    const ref = `worklog/${w.filename}`;
    const commStatus = commsByRef.get(ref) ?? null;
    return { ...w, commStatus };
  });

  // Get opted-in speaker count
  const { count: optedInCount } = await supabase
    .from("platform_communication_preferences")
    .select("id", { count: "exact", head: true })
    .eq("recipient_type", "speaker")
    .eq("category", "platform_announcements")
    .eq("opted_in", true);

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          {existingDraft ? "Edit Draft" : "New Communication"}
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Compose and send an announcement to opted-in speakers
          {optedInCount != null && (
            <span className="font-medium"> ({optedInCount} opted in)</span>
          )}
        </p>
      </div>

      <NewCommunicationForm
        draft={existingDraft}
        worklogs={worklogsWithStatus}
        preselectedWorklog={worklogFilename ?? null}
      />
    </div>
  );
}
