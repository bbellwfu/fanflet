"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@fanflet/ui/button";
import { Input } from "@fanflet/ui/input";
import { Label } from "@fanflet/ui/label";
import { Textarea } from "@fanflet/ui/textarea";
import { toast } from "sonner";
import {
  SendIcon,
  SaveIcon,
  EyeIcon,
  FlaskConicalIcon,
  Loader2Icon,
  ArrowLeftIcon,
  TrashIcon,
} from "lucide-react";
import {
  createCommunication,
  updateDraft,
  sendCommunication,
  sendTestEmail,
  deleteDraft,
} from "../actions";
import Link from "next/link";

interface DraftData {
  id: string;
  title: string;
  sourceReference: string | null;
  subject: string;
  bodyHtml: string;
}

interface NewCommunicationFormProps {
  draft: DraftData | null;
}

type Step = "compose" | "preview";

export function NewCommunicationForm({ draft }: NewCommunicationFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [draftId, setDraftId] = useState(draft?.id ?? null);
  const [title, setTitle] = useState(draft?.title ?? "");
  const [sourceRef, setSourceRef] = useState(draft?.sourceReference ?? "");
  const [subject, setSubject] = useState(draft?.subject ?? "");
  const [body, setBody] = useState(draft?.bodyHtml ?? "");
  const [step, setStep] = useState<Step>("compose");
  const [sending, setSending] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const canSave = title.trim() && subject.trim() && body.trim();

  function handleSaveDraft() {
    if (!canSave) return;
    startTransition(async () => {
      if (draftId) {
        const result = await updateDraft({
          id: draftId,
          title,
          subject,
          bodyHtml: body,
        });
        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success("Draft saved");
        }
      } else {
        const result = await createCommunication({
          title,
          sourceReference: sourceRef || undefined,
          subject,
          bodyHtml: body,
        });
        if (result.error) {
          toast.error(result.error);
        } else if (result.id) {
          setDraftId(result.id);
          toast.success("Draft created");
          router.replace(`/communications/new?draft=${result.id}`);
        }
      }
    });
  }

  function handlePreview() {
    if (!canSave) {
      toast.error("Fill in title, subject, and body first");
      return;
    }
    if (!draftId) {
      startTransition(async () => {
        const result = await createCommunication({
          title,
          sourceReference: sourceRef || undefined,
          subject,
          bodyHtml: body,
        });
        if (result.error) {
          toast.error(result.error);
          return;
        }
        if (result.id) {
          setDraftId(result.id);
          setStep("preview");
        }
      });
    } else {
      startTransition(async () => {
        await updateDraft({ id: draftId, title, subject, bodyHtml: body });
        setStep("preview");
      });
    }
  }

  function handleSendTest() {
    if (!draftId) return;
    setSendingTest(true);
    startTransition(async () => {
      const result = await sendTestEmail(draftId);
      setSendingTest(false);
      if (result.error) {
        toast.error(result.error);
      } else if (result.success) {
        toast.success(result.success);
      }
    });
  }

  function handleSend() {
    if (!draftId) return;
    setSending(true);
    startTransition(async () => {
      const result = await sendCommunication(draftId);
      setSending(false);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Sent to ${result.sentCount} speaker${result.sentCount !== 1 ? "s" : ""}`);
        router.push(`/communications/${draftId}`);
      }
    });
  }

  function handleDelete() {
    if (!draftId) return;
    if (!confirm("Delete this draft?")) return;
    startTransition(async () => {
      const result = await deleteDraft(draftId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Draft deleted");
        router.push("/communications");
      }
    });
  }

  if (step === "preview") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setStep("compose")}>
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back to edit
          </Button>
        </div>

        {/* Preview card */}
        <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
          <div className="bg-[#1B365D] px-6 py-5">
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/60 mb-1">
              Fanflet
            </p>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
          </div>
          <div className="px-6 py-5">
            <p className="text-[12px] font-medium text-fg-muted mb-1">Subject</p>
            <p className="text-[14px] text-fg mb-4">{subject}</p>
            <p className="text-[12px] font-medium text-fg-muted mb-1">Body</p>
            <div
              className="prose prose-sm max-w-none text-fg"
              dangerouslySetInnerHTML={{ __html: body }}
            />
          </div>
          <div className="px-6 py-3 border-t border-border-subtle text-center">
            <p className="text-[11px] text-fg-muted">
              You&apos;re receiving this because you opted in to platform announcements.
            </p>
            <p className="text-[11px] text-fg-muted">
              Manage preferences &middot; Unsubscribe
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={handleSendTest}
            variant="outline"
            disabled={sendingTest || isPending}
          >
            {sendingTest ? (
              <Loader2Icon className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <FlaskConicalIcon className="w-4 h-4 mr-1.5" />
            )}
            Send test to me
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || isPending}
            className="bg-[#1B365D] hover:bg-[#1B365D]/90"
          >
            {sending ? (
              <Loader2Icon className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <SendIcon className="w-4 h-4 mr-1.5" />
            )}
            Send to speakers
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/communications">
            <ArrowLeftIcon className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
      </div>

      <div className="bg-surface rounded-lg border border-border-subtle p-6 space-y-5">
        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="title" className="text-[13px] font-medium text-fg">
            Title
          </Label>
          <Input
            id="title"
            placeholder="e.g. March 2026 Release Notes"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <p className="text-[11px] text-fg-muted">
            Internal title for your reference (not sent to recipients).
          </p>
        </div>

        {/* Source reference */}
        <div className="space-y-1.5">
          <Label htmlFor="source" className="text-[13px] font-medium text-fg">
            Source reference <span className="text-fg-muted">(optional)</span>
          </Label>
          <Input
            id="source"
            placeholder="e.g. worklog/260306 Impersonation Emails Analytics"
            value={sourceRef}
            onChange={(e) => setSourceRef(e.target.value)}
          />
        </div>

        {/* Subject */}
        <div className="space-y-1.5">
          <Label htmlFor="subject" className="text-[13px] font-medium text-fg">
            Email subject
          </Label>
          <Input
            id="subject"
            placeholder="e.g. What's new on Fanflet — March 2026"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        {/* Body */}
        <div className="space-y-1.5">
          <Label htmlFor="body" className="text-[13px] font-medium text-fg">
            Email body <span className="text-fg-muted">(HTML or plain text — paste from worklog Release Summary)</span>
          </Label>
          <Textarea
            id="body"
            placeholder={"Paste your Release Summary content here...\n\nHTML is supported. Wrap paragraphs in <p> tags for best results."}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
            className="font-mono text-[13px]"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={handleSaveDraft}
          variant="outline"
          disabled={!canSave || isPending}
        >
          {isPending ? (
            <Loader2Icon className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <SaveIcon className="w-4 h-4 mr-1.5" />
          )}
          {draftId ? "Save draft" : "Create draft"}
        </Button>
        <Button onClick={handlePreview} disabled={!canSave || isPending}>
          <EyeIcon className="w-4 h-4 mr-1.5" />
          Preview & send
        </Button>
        {draftId && (
          <Button
            onClick={handleDelete}
            variant="ghost"
            className="text-error hover:text-error ml-auto"
            disabled={isPending}
          >
            <TrashIcon className="w-4 h-4 mr-1.5" />
            Delete draft
          </Button>
        )}
      </div>
    </div>
  );
}
