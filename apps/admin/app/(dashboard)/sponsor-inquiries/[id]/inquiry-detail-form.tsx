"use client";

import { useState } from "react";
import { Button } from "@fanflet/ui/button";
import { updateInquiryStatus, updateInquiryNotes } from "../actions";
import { toast } from "sonner";

interface InquiryDetailFormProps {
  inquiryId: string;
  initialStatus: string;
  initialNotes: string;
}

export function InquiryDetailForm({
  inquiryId,
  initialStatus,
  initialNotes,
}: InquiryDetailFormProps) {
  const [status, setStatus] = useState(initialStatus);
  const [notes, setNotes] = useState(initialNotes);
  const [statusSaving, setStatusSaving] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);

  async function handleStatusChange(newStatus: string) {
    setStatus(newStatus);
    setStatusSaving(true);
    const result = await updateInquiryStatus(inquiryId, newStatus);
    setStatusSaving(false);
    if (result.error) {
      toast.error(result.error);
      setStatus(initialStatus);
    } else {
      toast.success("Status updated");
    }
  }

  async function handleSaveNotes() {
    setNotesSaving(true);
    const result = await updateInquiryNotes(inquiryId, notes);
    setNotesSaving(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Notes saved");
    }
  }

  return (
    <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
      <div className="px-5 py-4 border-b border-border-subtle">
        <h2 className="text-sm font-semibold text-fg">Triage</h2>
      </div>
      <div className="px-5 py-4 space-y-6">
        <div>
          <label
            htmlFor="inquiry-status"
            className="block text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2"
          >
            Status
          </label>
          <select
            id="inquiry-status"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={statusSaving}
            className="w-full max-w-xs rounded-md border border-border-subtle bg-page px-3 py-2 text-[13px] text-fg focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          >
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
          </select>
          {statusSaving && (
            <p className="text-xs text-fg-muted mt-1">Saving...</p>
          )}
        </div>
        <div>
          <label
            htmlFor="inquiry-notes"
            className="block text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-2"
          >
            Internal notes
          </label>
          <textarea
            id="inquiry-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-md border border-border-subtle bg-page px-3 py-2 text-[13px] text-fg focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
            placeholder="Add notes for follow-up..."
          />
          <Button
            type="button"
            size="sm"
            onClick={handleSaveNotes}
            disabled={notesSaving}
            className="mt-2"
          >
            {notesSaving ? "Saving..." : "Save notes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
