"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Loader2, Megaphone, Users, FileText, Pencil, Trash2, BarChart3 } from "lucide-react";
import { addDays, endOfMonth, addMonths, endOfQuarter, addQuarters, endOfYear, format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  createSponsorCampaign,
  updateSponsorCampaign,
  deleteSponsorCampaign,
  getSponsorCampaign,
  type SponsorCampaignRow,
} from "./actions";
import { toast } from "sonner";
import { DateRangeField } from "@/components/ui/date-range-field";

const statusBadge: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  ended: "Ended",
};

function formatLocalDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10)).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type EndDatePresetKey = "30d" | "eom" | "eonm" | "eoq" | "eonq" | "eoy";

const END_DATE_PRESETS: { key: EndDatePresetKey; label: string; compute: (base: Date) => string }[] = [
  { key: "30d", label: "30 days", compute: (base) => format(addDays(base, 30), "yyyy-MM-dd") },
  { key: "eom", label: "End of month", compute: (base) => format(endOfMonth(base), "yyyy-MM-dd") },
  { key: "eonm", label: "End of next month", compute: (base) => format(endOfMonth(addMonths(base, 1)), "yyyy-MM-dd") },
  { key: "eoq", label: "End of quarter", compute: (base) => format(endOfQuarter(base), "yyyy-MM-dd") },
  { key: "eonq", label: "End of next quarter", compute: (base) => format(endOfQuarter(addQuarters(base, 1)), "yyyy-MM-dd") },
  { key: "eoy", label: "End of year", compute: (base) => format(endOfYear(base), "yyyy-MM-dd") },
];

function EndDatePresets({
  activePreset,
  onSelect,
  baseDate,
}: {
  activePreset: EndDatePresetKey | null;
  onSelect: (key: EndDatePresetKey, value: string) => void;
  baseDate: string;
}) {
  const base = useMemo(() => {
    if (!baseDate) return new Date();
    const parts = baseDate.split("-");
    if (parts.length !== 3) return new Date();
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }, [baseDate]);

  return (
    <div className="flex flex-wrap gap-1.5">
      {END_DATE_PRESETS.map((p) => (
        <button
          key={p.key}
          type="button"
          onClick={() => onSelect(p.key, p.compute(base))}
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors ${
            activePreset === p.key
              ? "border-teal-500 bg-teal-50 text-teal-700"
              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

interface CampaignsClientProps {
  campaigns: SponsorCampaignRow[];
  connectedSpeakers: { id: string; name: string }[];
  speakerLabel?: string;
}

export function CampaignsClient({ campaigns, connectedSpeakers, speakerLabel = "speaker" }: CampaignsClientProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "ended">("draft");
  const [endDatePreset, setEndDatePreset] = useState<EndDatePresetKey | null>(null);
  const [selectedSpeakerIds, setSelectedSpeakerIds] = useState<Set<string>>(new Set());
  const [assignAllSpeakers, setAssignAllSpeakers] = useState(false);
  const [resourceCount, setResourceCount] = useState(0);

  const toggleSpeaker = (id: string) => {
    setSelectedSpeakerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openEdit = useCallback(
    async (campaignId: string) => {
      setEditingId(campaignId);
      setLoadingEdit(true);
      const result = await getSponsorCampaign(campaignId);
      setLoadingEdit(false);
      if (result.error || !result.data) {
        toast.error(result.error ?? "Failed to load campaign.");
        setEditingId(null);
        return;
      }
      const d = result.data;
      setName(d.name);
      setDescription(d.description ?? "");
      setStartDate(d.start_date);
      setEndDate(d.end_date ?? "");
      setEndDatePreset(null);
      setStatus((d.status as "draft" | "active" | "ended") ?? "draft");
      setSelectedSpeakerIds(new Set(d.speaker_ids ?? []));
      setAssignAllSpeakers(!!d.all_speakers_assigned);
      setResourceCount(d.resource_count ?? 0);
    },
    []
  );

  const closeEdit = useCallback(() => {
    setEditingId(null);
    setName("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setEndDatePreset(null);
    setStatus("draft");
    setSelectedSpeakerIds(new Set());
    setAssignAllSpeakers(false);
    setResourceCount(0);
  }, []);

  const selectEndDatePreset = useCallback((key: EndDatePresetKey, value: string) => {
    setEndDate(value);
    setEndDatePreset(key);
  }, []);

  const handleEndDateManualChange = useCallback((value: string) => {
    setEndDate(value);
    setEndDatePreset(null);
  }, []);

  const handleStartDateChange = useCallback((value: string) => {
    setStartDate(value);
    setEndDatePreset(null);
  }, []);

  const handleUpdate = async () => {
    if (!editingId) return;
    if (!name.trim()) {
      toast.error("Campaign name is required.");
      return;
    }
    if (!startDate) {
      toast.error("Start date is required.");
      return;
    }
    setSubmitting(true);
    const result = await updateSponsorCampaign(editingId, {
      name: name.trim(),
      description: description.trim() || null,
      start_date: startDate,
      end_date: endDate.trim() || undefined,
      status,
      all_speakers_assigned: assignAllSpeakers,
      speaker_ids: Array.from(selectedSpeakerIds),
    });
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Campaign updated.");
    closeEdit();
    router.refresh();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSubmitting(true);
    const result = await deleteSponsorCampaign(deleteId);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Campaign deleted.");
    setDeleteId(null);
    router.refresh();
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Campaign name is required.");
      return;
    }
    if (!startDate) {
      toast.error("Start date is required.");
      return;
    }
    setSubmitting(true);
    const result = await createSponsorCampaign({
      name: name.trim(),
      description: description.trim() || undefined,
      start_date: startDate,
      end_date: endDate.trim() || undefined,
      status,
      all_speakers_assigned: assignAllSpeakers,
      speaker_ids: Array.from(selectedSpeakerIds),
    });
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Campaign created.");
    setCreateOpen(false);
    setName("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setEndDatePreset(null);
    setStatus("draft");
    setSelectedSpeakerIds(new Set());
    setAssignAllSpeakers(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New campaign
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No campaigns yet. Create one to group {speakerLabel}s and resources and track performance by initiative.</p>
            <Button className="mt-4" variant="outline" onClick={() => setCreateOpen(true)}>
              Create campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((c) => (
            <div
              key={c.id}
              className="rounded-xl shadow-sm border border-gray-200 overflow-hidden bg-white hover:shadow-md transition-shadow border-l-4 border-l-violet-500 flex flex-col"
            >
              <div className="bg-violet-50/70 border-b border-gray-100 flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-violet-700" />
                  <span className="text-xs font-medium text-violet-700">
                    Campaign
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Link
                    href={`/sponsor/analytics?campaignId=${c.id}`}
                    aria-label="View analytics"
                    title="Analytics"
                    className="p-1.5 rounded-md hover:bg-violet-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4 text-violet-700" />
                  </Link>
                  <button
                    aria-label="Edit campaign"
                    onClick={() => openEdit(c.id)}
                    title="Edit"
                    className="p-1.5 rounded-md hover:bg-violet-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-violet-700" />
                  </button>
                  <button
                    aria-label="Delete campaign"
                    onClick={() => setDeleteId(c.id)}
                    title="Delete"
                    className="p-1.5 rounded-md hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col">
                <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                  {c.name}
                </h3>
                
                <p className="text-xs text-muted-foreground mt-1">
                  Date Range: {formatLocalDate(c.start_date)}
                  {c.end_date ? ` to ${formatLocalDate(c.end_date)}` : " to ongoing"}
                </p>

                <div className="mt-auto pt-4">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                        c.status === "active"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : c.status === "ended"
                            ? "bg-slate-50 text-slate-700 border-slate-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {statusBadge[c.status] ?? c.status}
                    </span>

                    <div className="flex items-center gap-3 ml-auto text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {c.all_speakers_assigned ? (
                          "All speakers"
                        ) : (
                          `${c.speaker_count ?? 0} ${speakerLabel}${(c.speaker_count ?? 0) !== 1 ? "s" : ""}`
                        )}
                      </span>
                      <Link 
                        href={`/sponsor/library?campaign=${c.id}`}
                        className="flex items-center gap-1 hover:text-violet-600 hover:underline transition-colors"
                      >
                        <FileText className="h-3 w-3" />
                        {c.resource_count ?? 0} resource{(c.resource_count ?? 0) !== 1 ? "s" : ""}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col gap-0 p-0 overflow-hidden bg-slate-50">
          <SheetHeader className="px-6 py-4 border-b border-border bg-white sticky top-0 z-10">
            <SheetTitle>New campaign</SheetTitle>
            <SheetDescription>Name your campaign, set the date range, and assign {speakerLabel}s.</SheetDescription>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="campaign-name" className="font-medium text-slate-900">Campaign name</Label>
              <Input
                id="campaign-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Spring Conference Series 2026"
                className="bg-white border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-desc" className="font-medium text-slate-900">Description (optional)</Label>
              <Textarea
                id="campaign-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="bg-white border-slate-200"
              />
            </div>
            
            <DateRangeField
              from={startDate}
              to={endDate}
              onFromChange={handleStartDateChange}
              onToChange={handleEndDateManualChange}
              fromId="create-start-date"
              toId="create-end-date"
              toLabel="End date (optional)"
              className="mt-1"
            >
              <div className="mt-2 text-slate-900">
                <EndDatePresets activePreset={endDatePreset} onSelect={selectEndDatePreset} baseDate={startDate} />
              </div>
            </DateRangeField>

            <div className="space-y-2">
              <Label htmlFor="create-status" className="font-medium text-slate-900">Status</Label>
              <select
                id="create-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "active" | "ended")}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="ended">Ended</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="font-medium text-slate-900">Assigned {speakerLabel}s (optional)</Label>
              <p className="text-xs text-muted-foreground">Select connected {speakerLabel}s in this campaign.</p>
              
              <label className="flex items-center gap-2 cursor-pointer p-2 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
                <input
                  type="checkbox"
                  checked={assignAllSpeakers}
                  onChange={(e) => setAssignAllSpeakers(e.target.checked)}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm font-medium">Assign to all current and future connected {speakerLabel}s</span>
              </label>

              {!assignAllSpeakers && (
                <div className="border bg-white rounded-md p-3 max-h-40 overflow-y-auto space-y-2 text-slate-900">
                  {connectedSpeakers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active connections yet.</p>
                  ) : (
                    connectedSpeakers.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                        <input
                          type="checkbox"
                          checked={selectedSpeakerIds.has(s.id)}
                          onChange={() => toggleSpeaker(s.id)}
                          className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span className="text-sm">{s.name}</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border bg-white flex items-center justify-end gap-3 sticky bottom-0 z-10">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={submitting || !name.trim() || !startDate}
              className="bg-violet-600 hover:bg-violet-700"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editingId} onOpenChange={(open) => !open && closeEdit()}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col gap-0 p-0 overflow-hidden bg-slate-50">
          <SheetHeader className="px-6 py-4 border-b border-border bg-white sticky top-0 z-10">
            <SheetTitle>Edit campaign</SheetTitle>
            <SheetDescription>Update name, dates, status, and assigned {speakerLabel}s.</SheetDescription>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {loadingEdit ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="edit-campaign-name" className="font-medium text-slate-900">Campaign name</Label>
                  <Input
                    id="edit-campaign-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Spring Conference Series 2026"
                    className="bg-white border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-campaign-desc" className="font-medium text-slate-900">Description (optional)</Label>
                  <Textarea
                    id="edit-campaign-desc"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="bg-white border-slate-200"
                  />
                </div>
                {resourceCount > 0 && (
                  <div className="flex items-center justify-between bg-violet-50/50 border border-violet-100 p-3 rounded-md">
                    <div className="flex items-center gap-2 text-violet-800">
                      <FileText className="h-4 w-4" />
                      <span className="text-sm font-medium">{resourceCount} Linked resource{resourceCount !== 1 && 's'}</span>
                    </div>
                    <Button variant="outline" size="sm" asChild className="h-7 text-xs bg-white text-violet-800 border-violet-200 hover:bg-violet-50 hover:text-violet-900">
                      <Link href={`/sponsor/library?campaign=${editingId}`} target="_blank">
                        View in Library
                      </Link>
                    </Button>
                  </div>
                )}
                
                <DateRangeField
                  from={startDate}
                  to={endDate}
                  onFromChange={handleStartDateChange}
                  onToChange={handleEndDateManualChange}
                  fromId="edit-start-date"
                  toId="edit-end-date"
                  toLabel="End date (optional)"
                  className="mt-1"
                >
                  <div className="mt-2 text-slate-900">
                    <EndDatePresets activePreset={endDatePreset} onSelect={selectEndDatePreset} baseDate={startDate} />
                  </div>
                </DateRangeField>

                <div className="space-y-2">
                  <Label htmlFor="edit-status" className="font-medium text-slate-900">Status</Label>
                  <select
                    id="edit-status"
                    value={status}
                    onChange={(e) => setStatus(e.target.value as "draft" | "active" | "ended")}
                    className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="ended">Ended</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="font-medium text-slate-900">Assigned {speakerLabel}s</Label>
                  <p className="text-xs text-muted-foreground">Select connected {speakerLabel}s in this campaign.</p>

                  <label className="flex items-center gap-2 cursor-pointer p-2 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={assignAllSpeakers}
                      onChange={(e) => setAssignAllSpeakers(e.target.checked)}
                      className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                    />
                    <span className="text-sm font-medium">Assign to all current and future connected {speakerLabel}s</span>
                  </label>

                  {!assignAllSpeakers && (
                    <div className="border bg-white rounded-md p-3 max-h-40 overflow-y-auto space-y-2 text-slate-900">
                      {connectedSpeakers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No active connections yet.</p>
                      ) : (
                        connectedSpeakers.map((s) => (
                          <label key={s.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded">
                            <input
                              type="checkbox"
                              checked={selectedSpeakerIds.has(s.id)}
                              onChange={() => toggleSpeaker(s.id)}
                              className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                            />
                            <span className="text-sm">{s.name}</span>
                          </label>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {!loadingEdit && (
            <div className="px-6 py-4 border-t border-border bg-white flex items-center justify-end gap-3 sticky bottom-0 z-10">
              <Button variant="outline" onClick={closeEdit}>
                Cancel
              </Button>
              <Button 
                onClick={handleUpdate} 
                disabled={submitting || !name.trim() || !startDate}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the campaign. {speakerLabel[0].toUpperCase() + speakerLabel.slice(1)}s and resources linked to it will no longer be grouped under this
              campaign. Resources in the Resource Library will keep their content but their campaign link will be cleared. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
