"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Loader2, Megaphone, Users, FileText, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const statusBadge: Record<string, string> = {
  draft: "Draft",
  active: "Active",
  ended: "Ended",
};

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
  const [selectedSpeakerIds, setSelectedSpeakerIds] = useState<Set<string>>(new Set());

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
      setStatus((d.status as "draft" | "active" | "ended") ?? "draft");
      setSelectedSpeakerIds(new Set(d.speaker_ids ?? []));
    },
    []
  );

  const closeEdit = useCallback(() => {
    setEditingId(null);
    setName("");
    setDescription("");
    setStartDate("");
    setEndDate("");
    setStatus("draft");
    setSelectedSpeakerIds(new Set());
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
    setSelectedSpeakerIds(new Set());
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
            <Card key={c.id} className="flex flex-col">
              <CardContent className="p-4 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="shrink-0 w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                      <Megaphone className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.start_date}
                        {c.end_date ? ` – ${c.end_date}` : " – ongoing"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                        c.status === "active"
                          ? "bg-green-100 text-green-800"
                          : c.status === "ended"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {statusBadge[c.status] ?? c.status}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Manage campaign</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(c.id)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600"
                          onClick={() => setDeleteId(c.id)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3" />
                    {c.speaker_count ?? 0} {speakerLabel}{c.speaker_count !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-3.5 w-3" />
                    {c.resource_count ?? 0} resource{(c.resource_count ?? 0) !== 1 ? "s" : ""}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New campaign</DialogTitle>
            <DialogDescription>Name your campaign, set the date range, and assign {speakerLabel}s.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div>
              <Label htmlFor="campaign-name" className="block mb-1.5">Campaign name</Label>
              <Input
                id="campaign-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Spring Conference Series 2026"
              />
            </div>
            <div>
              <Label htmlFor="campaign-desc" className="block mb-1.5">Description (optional)</Label>
              <Textarea
                id="campaign-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date" className="block mb-1.5">Start date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-date" className="block mb-1.5">End date (optional)</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <Label className="block mb-1.5">Assigned {speakerLabel}s (optional)</Label>
              <p className="text-xs text-muted-foreground mb-2">Select connected {speakerLabel}s in this campaign.</p>
              <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                {connectedSpeakers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No active connections yet.</p>
                ) : (
                  connectedSpeakers.map((s) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSpeakerIds.has(s.id)}
                        onChange={() => toggleSpeaker(s.id)}
                        className="rounded border-slate-300"
                      />
                      <span className="text-sm">{s.name}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={submitting || !name.trim() || !startDate}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingId} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit campaign</DialogTitle>
            <DialogDescription>Update name, dates, status, and assigned {speakerLabel}s.</DialogDescription>
          </DialogHeader>
          {loadingEdit ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-5 py-4">
              <div>
                <Label htmlFor="edit-campaign-name" className="block mb-1.5">Campaign name</Label>
                <Input
                  id="edit-campaign-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Spring Conference Series 2026"
                />
              </div>
              <div>
                <Label htmlFor="edit-campaign-desc" className="block mb-1.5">Description (optional)</Label>
                <Textarea
                  id="edit-campaign-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-start-date" className="block mb-1.5">Start date</Label>
                  <Input
                    id="edit-start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-end-date" className="block mb-1.5">End date (optional)</Label>
                  <Input
                    id="edit-end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-status" className="block mb-1.5">Status</Label>
                <select
                  id="edit-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "draft" | "active" | "ended")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="ended">Ended</option>
                </select>
              </div>
              <div>
                <Label className="block mb-1.5">Assigned {speakerLabel}s</Label>
                <p className="text-xs text-muted-foreground mb-2">Select connected {speakerLabel}s in this campaign.</p>
                <div className="border rounded-md p-3 max-h-40 overflow-y-auto space-y-2">
                  {connectedSpeakers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active connections yet.</p>
                  ) : (
                    connectedSpeakers.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedSpeakerIds.has(s.id)}
                          onChange={() => toggleSpeaker(s.id)}
                          className="rounded border-slate-300"
                        />
                        <span className="text-sm">{s.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          {!loadingEdit && (
            <DialogFooter>
              <Button variant="outline" onClick={closeEdit}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={submitting || !name.trim() || !startDate}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the campaign. {speakerLabel[0].toUpperCase() + speakerLabel.slice(1)}s and resources linked to it will no longer be grouped under this
              campaign. Resources in Library will keep their content but their campaign link will be cleared. This
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
