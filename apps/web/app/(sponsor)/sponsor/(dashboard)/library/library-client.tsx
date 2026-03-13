"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Link2,
  FileDown,
  Video,
  Building2,
  Search,
  X,
  Megaphone,
  Archive,
  Globe,
} from "lucide-react";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  createSponsorLibraryResource,
  updateSponsorLibraryResource,
  removeSponsorLibraryResource,
  setSponsorLibraryStatus,
  requestSponsorUploadSlot,
  finalizeSponsorUpload,
  cancelSponsorUploadSlot,
  type SponsorLibraryResource,
} from "./actions";
import { createClient } from "@/lib/supabase/client";
import { formatFileSize } from "@fanflet/db/storage";
import { toast } from "sonner";

const SPONSOR_BUCKET = "sponsor-file-uploads";

const typeIcons: Record<string, typeof Link2> = {
  link: Link2,
  file: FileDown,
  video: Video,
  sponsor_block: Building2,
};

const typeLabels: Record<string, string> = {
  link: "Link",
  file: "File",
  video: "Video",
  sponsor_block: "Sponsor Block",
};

const statusBadge: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
  removed: "Removed",
};

interface CampaignOption {
  id: string;
  name: string;
}

interface SponsorLibraryClientProps {
  resources: SponsorLibraryResource[];
  storageUsedBytes: number;
  storageLimitMb: number;
  maxFileMb: number;
  campaigns?: CampaignOption[];
  speakerLabel?: string;
}

export function SponsorLibraryClient({
  resources,
  storageUsedBytes,
  storageLimitMb,
  maxFileMb,
  campaigns = [],
  speakerLabel = "speaker",
}: SponsorLibraryClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [addType, setAddType] = useState<"link" | "video" | "sponsor_block" | "file">("link");
  const [addTitle, setAddTitle] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editStatus, setEditStatus] = useState<"draft" | "published" | "archived">("draft");
  const [editCampaignIds, setEditCampaignIds] = useState<Set<string>>(new Set());
  const [campaignSearch, setCampaignSearch] = useState("");

  // Filters
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterCampaignId, setFilterCampaignId] = useState<string | null>(searchParams.get("campaign"));

  const storageLimitBytes = storageLimitMb * 1024 * 1024;
  const storagePct = storageLimitBytes > 0 ? Math.min(100, (storageUsedBytes / storageLimitBytes) * 100) : 0;

  const handleCreateLink = async () => {
    if (addType === "file") return;
    const err = await createSponsorLibraryResource({
      type: addType,
      title: addTitle.trim(),
      description: addDescription.trim() || undefined,
      url: addUrl.trim() || undefined,
      availability: "draft",
    });
    if (err.error) {
      toast.error(err.error);
      return;
    }
    toast.success("Resource added.");
    setAddOpen(false);
    resetAddFrom();
    router.refresh();
  };

  const resetAddFrom = () => {
    setAddTitle("");
    setAddDescription("");
    setAddUrl("");
    setAddType("link");
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const slot = await requestSponsorUploadSlot({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        title: file.name,
      });
      if (!slot.allowed) {
        toast.error(slot.error);
        return;
      }
      const supabase = createClient();
      const { error: uploadErr } = await supabase.storage
        .from(SPONSOR_BUCKET)
        .upload(slot.path, file, { upsert: true });
      if (uploadErr) {
        await cancelSponsorUploadSlot(slot.resourceId);
        toast.error(uploadErr.message);
        return;
      }
      const finalErr = await finalizeSponsorUpload({
        resourceId: slot.resourceId,
        filePath: slot.path,
        fileSizeBytes: file.size,
        fileType: file.type,
        title: file.name,
      });
      if (finalErr.error) {
        toast.error(finalErr.error);
        return;
      }
      toast.success("File uploaded.");
      setAddOpen(false);
      router.refresh();
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleUpdate = async () => {
    if (!editId) return;
    const err = await updateSponsorLibraryResource(editId, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      url: editUrl.trim() || undefined,
      status: editStatus,
      campaign_ids: Array.from(editCampaignIds),
    });
    if (err.error) {
      toast.error(err.error);
      return;
    }
    toast.success("Updated.");
    setEditId(null);
    router.refresh();
  };

  const handleSetStatus = async (id: string, status: "published" | "archived") => {
    const err = await setSponsorLibraryStatus(id, status);
    if (err.error) {
      toast.error(err.error);
      return;
    }
    toast.success(status === "published" ? "Resource published." : "Resource archived.");
    router.refresh();
  };

  const handleRemove = async () => {
    if (!removeId) return;
    const result = await removeSponsorLibraryResource(removeId);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      result.placementCount
        ? `Resource removed. It is no longer available on ${result.placementCount} fanflet(s).`
        : "Resource removed."
    );
    setRemoveId(null);
    router.refresh();
  };

  const openEdit = (r: SponsorLibraryResource) => {
    setEditId(r.id);
    setEditTitle(r.title);
    setEditDescription(r.description ?? "");
    setEditUrl(r.url ?? "");
    setEditStatus((r.status as "draft" | "published" | "archived") ?? "draft");
    setEditCampaignIds(new Set(r.campaign_ids ?? []));
    setCampaignSearch("");
  };

  const toggleEditCampaign = (id: string) => {
    setEditCampaignIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const campaignMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of campaigns) map.set(c.id, c.name);
    return map;
  }, [campaigns]);

  // Campaigns that are actually used by at least one resource (or actively filtered)
  const usedCampaignIds = useMemo(() => {
    const ids = new Set<string>();
    if (filterCampaignId) ids.add(filterCampaignId);
    for (const r of resources) {
      for (const cid of r.campaign_ids ?? []) ids.add(cid);
    }
    return ids;
  }, [resources, filterCampaignId]);

  const filterableCampaigns = useMemo(
    () => campaigns.filter((c) => usedCampaignIds.has(c.id)),
    [campaigns, usedCampaignIds]
  );

  const filteredResources = useMemo(() => {
    let result = resources.filter((r) => r.status !== "removed");
    if (filterKeyword) {
      const kw = filterKeyword.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(kw) ||
          (r.description ?? "").toLowerCase().includes(kw)
      );
    }
    if (filterStatus) {
      result = result.filter((r) => r.status === filterStatus);
    }
    if (filterCampaignId) {
      result = result.filter((r) => (r.campaign_ids ?? []).includes(filterCampaignId));
    }
    return result;
  }, [resources, filterKeyword, filterStatus, filterCampaignId]);

  const hasActiveFilters = !!filterKeyword || !!filterStatus || !!filterCampaignId;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground">
            {formatFileSize(storageUsedBytes)} of {storageLimitMb} MB used
          </p>
          <div className="mt-1 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all"
              style={{ width: `${storagePct}%` }}
            />
          </div>
        </div>
        <Button onClick={() => setAddOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Add resource
        </Button>
      </div>

      {/* Filters */}
      {resources.filter((r) => r.status !== "removed").length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search resources…"
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status group */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">Status:</span>
              {(["draft", "published", "archived"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilterStatus(filterStatus === s ? null : s)}
                  className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    filterStatus === s
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {statusBadge[s]}
                </button>
              ))}
            </div>

            {/* Campaign group */}
            {filterableCampaigns.length > 0 && (
              <>
                <div className="h-5 border-l border-slate-200" />
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-muted-foreground">
                    {filterableCampaigns.length > 5 ? "Campaign:" : "Campaigns:"}
                  </span>
                  {filterableCampaigns.length <= 5 ? (
                    filterableCampaigns.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFilterCampaignId(filterCampaignId === c.id ? null : c.id)}
                        className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                          filterCampaignId === c.id
                            ? "border-violet-500 bg-violet-50 text-violet-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                      >
                        <Megaphone className="h-3 w-3" />
                        {c.name}
                      </button>
                    ))
                  ) : (
                    <select
                      value={filterCampaignId ?? ""}
                      onChange={(e) => setFilterCampaignId(e.target.value || null)}
                      className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-1"
                    >
                      <option value="">All campaigns</option>
                      {filterableCampaigns.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </>
            )}

            {/* Clear button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={() => {
                  setFilterKeyword("");
                  setFilterStatus(null);
                  setFilterCampaignId(null);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        <span className="font-medium">Draft</span> — only visible to you.{" "}
        <span className="font-medium">Published</span> — available for {speakerLabel}s to add to their fanflets.{" "}
        <span className="font-medium">Archived</span> — hidden from new {speakerLabel}s, but still visible on fanflets where it was already placed.
      </p>

      {filteredResources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {hasActiveFilters ? (
              <p>No resources match your filters.</p>
            ) : (
              <p>No resources yet. Add a link or upload a file to make it available to your connected {speakerLabel}s.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((r) => {
            const Icon = typeIcons[r.type] ?? Link2;
            const resourceCampaigns = (r.campaign_ids ?? [])
              .map((cid) => ({ id: cid, name: campaignMap.get(cid) }))
              .filter((c): c is { id: string; name: string } => !!c.name);
            return (
              <div
                key={r.id}
                className="rounded-xl shadow-sm border border-gray-200 overflow-hidden bg-white hover:shadow-md transition-shadow border-l-4 border-l-[#20ACE4] flex flex-col"
              >
                {/* Tinted header row */}
                <div className="bg-sky-50/70 border-b border-gray-100 flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-[#104160]" />
                    <span className="text-xs font-medium text-[#104160]">
                      {typeLabels[r.type] ?? r.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      aria-label="Edit resource"
                      onClick={() => openEdit(r)}
                      title="Edit"
                      className="p-1.5 rounded-md hover:bg-[#20ACE4]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#20ACE4] transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-[#104160]" />
                    </button>
                    {(r.status === "draft" || r.status === "archived") && (
                      <button
                        aria-label="Publish resource"
                        onClick={() => handleSetStatus(r.id, "published")}
                        title="Publish"
                        className="p-1.5 rounded-md hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 transition-colors"
                      >
                        <Globe className="w-4 h-4 text-emerald-600" />
                      </button>
                    )}
                    {r.status === "published" && (
                      <button
                        aria-label="Archive resource"
                        onClick={() => handleSetStatus(r.id, "archived")}
                        title="Archive"
                        className="p-1.5 rounded-md hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 transition-colors"
                      >
                        <Archive className="w-4 h-4 text-amber-600" />
                      </button>
                    )}
                    <button
                      aria-label="Delete resource"
                      onClick={() => setRemoveId(r.id)}
                      title="Remove"
                      className="p-1.5 rounded-md hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
                    {r.title}
                  </h3>
                  
                  {r.file_size_bytes != null && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatFileSize(r.file_size_bytes)}
                    </p>
                  )}

                  <div className="mt-auto">
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                        r.status === "published"
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : r.status === "archived"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-slate-50 text-slate-700 border-slate-200"
                      }`}>
                        {statusBadge[r.status] ?? r.status}
                      </span>

                      {resourceCampaigns.map((c) => (
                        <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-white text-gray-600 border border-gray-200 max-w-[150px] truncate">
                          <span className="text-[#20ACE4] shrink-0">⟐</span>
                          <span className="truncate">{c.name}</span>
                        </span>
                      ))}

                      {r.placement_count != null && r.placement_count > 0 && (
                        <span className="text-[11px] text-muted-foreground ml-auto">
                          On {r.placement_count} fanflet{r.placement_count !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Sheet open={addOpen} onOpenChange={(open) => {
        setAddOpen(open);
        if (!open) resetAddFrom();
      }}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col gap-0 p-0 overflow-hidden bg-slate-50">
          <SheetHeader className="px-6 py-4 border-b border-border bg-white sticky top-0 z-10">
            <SheetTitle>Add resource</SheetTitle>
            <SheetDescription>Add a link or upload a file for {speakerLabel}s to use in their fanflets.</SheetDescription>
          </SheetHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <div className="flex gap-2 flex-wrap">
              {(["link", "video", "sponsor_block", "file"] as const).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={addType === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAddType(t)}
                  className={addType === t ? "bg-[#20ACE4] hover:bg-[#20ACE4]/90" : ""}
                >
                  {typeLabels[t]}
                </Button>
              ))}
            </div>

            {addType === "file" ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="font-medium text-slate-900">Upload file</Label>
                  <Input
                    type="file"
                    accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.csv,.txt,.zip,.png,.jpg,.jpeg,.gif,.webp,.svg"
                    onChange={handleFileSelect}
                    disabled={uploading}
                    className="bg-white border-slate-200"
                  />
                  {uploading && (
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading…
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Max {maxFileMb} MB per file.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="add-title" className="font-medium text-slate-900">Title</Label>
                  <Input
                    id="add-title"
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    placeholder="Resource title"
                    className="bg-white border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-url" className="font-medium text-slate-900">URL</Label>
                  <Input
                    id="add-url"
                    type="url"
                    value={addUrl}
                    onChange={(e) => setAddUrl(e.target.value)}
                    placeholder="https://…"
                    className="bg-white border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-desc" className="font-medium text-slate-900">Description (optional)</Label>
                  <Textarea
                    id="add-desc"
                    value={addDescription}
                    onChange={(e) => setAddDescription(e.target.value)}
                    rows={4}
                    className="bg-white border-slate-200"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-border bg-white flex items-center justify-end gap-3 sticky bottom-0 z-10">
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            {addType !== "file" && (
              <Button 
                onClick={handleCreateLink} 
                className="bg-[#20ACE4] hover:bg-[#20ACE4]/90"
                disabled={!addTitle.trim()}
              >
                Add
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] flex flex-col gap-0 p-0 overflow-hidden bg-slate-50">
          <SheetHeader className="px-6 py-4 border-b border-border bg-white sticky top-0 z-10">
            <SheetTitle>Edit Resource</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            <div className="space-y-2">
              <Label htmlFor="edit-title" className="font-medium text-slate-900">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="bg-white border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-url" className="font-medium text-slate-900">URL</Label>
              <Input
                id="edit-url"
                type="url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                className="bg-white border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc" className="font-medium text-slate-900">Description</Label>
              <Textarea
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={4}
                className="bg-white border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status" className="font-medium text-slate-900">Status</Label>
              <select
                id="edit-status"
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value as "draft" | "published" | "archived")}
                className="flex h-9 w-full rounded-md border border-input bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            {campaigns.length > 0 && (() => {
              const filtered = campaignSearch
                ? campaigns.filter((c) => c.name.toLowerCase().includes(campaignSearch.toLowerCase()))
                : campaigns;
              return (
                <div className="space-y-2">
                  <Label className="font-medium text-slate-900">Campaigns (optional)</Label>
                  <p className="text-xs text-muted-foreground">Assign this resource to one or more campaigns.</p>
                  {campaigns.length > 10 && (
                    <Input
                      placeholder="Search campaigns…"
                      value={campaignSearch}
                      onChange={(e) => setCampaignSearch(e.target.value)}
                      className="bg-white"
                    />
                  )}
                  <div className="border bg-white rounded-md p-3 max-h-60 overflow-y-auto space-y-2">
                    {filtered.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No campaigns match your search.</p>
                    ) : (
                      filtered.map((c) => (
                        <label key={c.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition-colors">
                          <input
                            type="checkbox"
                            checked={editCampaignIds.has(c.id)}
                            onChange={() => toggleEditCampaign(c.id)}
                            className="rounded border-slate-300 text-[#20ACE4] focus:ring-[#20ACE4]"
                          />
                          <span className="text-sm">{c.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              );
            })()}
          </div>

          <div className="px-6 py-4 border-t border-border bg-white flex items-center justify-end gap-3 sticky bottom-0 z-10">
            <Button variant="outline" onClick={() => setEditId(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdate}
              className="bg-[#20ACE4] hover:bg-[#20ACE4]/90"
            >
              Save
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!removeId} onOpenChange={(open) => !open && setRemoveId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this resource?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make the resource unavailable. If it was placed on any fanflets, audiences will see a message that the content is no longer available. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
