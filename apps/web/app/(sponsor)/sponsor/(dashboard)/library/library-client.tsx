"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  MoreVertical,
} from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  sponsor_block: "Sponsor block",
};

const statusBadge: Record<string, string> = {
  draft: "Draft",
  available: "Available",
  unpublished: "Unpublished",
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
  const [editAvailability, setEditAvailability] = useState<"all" | "specific" | "draft">("draft");
  const [editCampaignId, setEditCampaignId] = useState<string | null>(null);

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
    resetAddForm();
    router.refresh();
  };

  const resetAddForm = () => {
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
      availability: editAvailability,
      campaign_id: editCampaignId ?? undefined,
    });
    if (err.error) {
      toast.error(err.error);
      return;
    }
    toast.success("Updated.");
    setEditId(null);
    router.refresh();
  };

  const handleSetStatus = async (id: string, status: "available" | "unpublished") => {
    const err = await setSponsorLibraryStatus(id, status);
    if (err.error) {
      toast.error(err.error);
      return;
    }
    toast.success(status === "available" ? "Resource is now available to speakers." : "Resource unpublished.");
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
    setEditAvailability(r.availability as "all" | "specific" | "draft");
    setEditCampaignId(r.campaign_id ?? null);
  };

  const filteredResources = resources.filter((r) => r.status !== "removed");

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

      {filteredResources.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No resources yet. Add a link or upload a file to make it available to your connected {speakerLabel}s.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((r) => {
            const Icon = typeIcons[r.type] ?? Link2;
            return (
              <Card key={r.id} className="flex flex-col">
                <CardContent className="p-4 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="shrink-0 w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Icon className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{r.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {typeLabels[r.type] ?? r.type}
                          {r.file_size_bytes != null && ` · ${formatFileSize(r.file_size_bytes)}`}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEdit(r)}>Edit</DropdownMenuItem>
                        {r.status === "draft" || r.status === "unpublished" ? (
                          <DropdownMenuItem onClick={() => handleSetStatus(r.id, "available")}>
                            Make available
                          </DropdownMenuItem>
                        ) : r.status === "available" ? (
                          <DropdownMenuItem onClick={() => handleSetStatus(r.id, "unpublished")}>
                            Unpublish
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setRemoveId(r.id)}
                        >
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="mt-2 flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                        r.status === "available"
                          ? "bg-green-100 text-green-800"
                          : r.status === "unpublished"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {statusBadge[r.status] ?? r.status}
                    </span>
                    {r.placement_count != null && r.placement_count > 0 && (
                      <span className="text-xs text-muted-foreground">
                        On {r.placement_count} fanflet{r.placement_count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add resource</DialogTitle>
            <DialogDescription>Add a link or upload a file for {speakerLabel}s to use in their fanflets.</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="flex gap-2 flex-wrap">
              {(["link", "video", "sponsor_block", "file"] as const).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={addType === t ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAddType(t)}
                >
                  {typeLabels[t]}
                </Button>
              ))}
            </div>
            {addType === "file" ? (
              <div>
                <Label className="block mb-1.5">Upload file</Label>
                <Input
                  type="file"
                  className="mt-2"
                  accept=".pdf,.pptx,.ppt,.docx,.doc,.xlsx,.xls,.csv,.txt,.zip,.png,.jpg,.jpeg,.gif,.webp,.svg"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                {uploading && (
                  <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading…
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-1">Max {maxFileMb} MB per file.</p>
              </div>
            ) : (
              <>
                <div>
                  <Label htmlFor="add-title" className="block mb-1.5">Title</Label>
                  <Input
                    id="add-title"
                    value={addTitle}
                    onChange={(e) => setAddTitle(e.target.value)}
                    placeholder="Resource title"
                  />
                </div>
                <div>
                  <Label htmlFor="add-url" className="block mb-1.5">URL</Label>
                  <Input
                    id="add-url"
                    type="url"
                    value={addUrl}
                    onChange={(e) => setAddUrl(e.target.value)}
                    placeholder="https://…"
                  />
                </div>
                <div>
                  <Label htmlFor="add-desc" className="block mb-1.5">Description (optional)</Label>
                  <Textarea
                    id="add-desc"
                    value={addDescription}
                    onChange={(e) => setAddDescription(e.target.value)}
                    rows={2}
                  />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateLink} disabled={!addTitle.trim()}>
                    Add
                  </Button>
                </DialogFooter>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit resource</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div>
              <Label htmlFor="edit-title" className="block mb-1.5">Title</Label>
              <Input
                id="edit-title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-url" className="block mb-1.5">URL</Label>
              <Input
                id="edit-url"
                type="url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-desc" className="block mb-1.5">Description</Label>
              <Textarea
                id="edit-desc"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div>
              <Label className="block mb-1.5">Availability</Label>
              <div className="flex gap-2 mt-1">
                {(["all", "specific", "draft"] as const).map((a) => (
                  <Button
                    key={a}
                    type="button"
                    variant={editAvailability === a ? "default" : "outline"}
                    size="sm"
                    onClick={() => setEditAvailability(a)}
                  >
                    {a === "all" ? "All connected" : a === "specific" ? `Specific ${speakerLabel}s` : "Draft"}
                  </Button>
                ))}
              </div>
            </div>
            {campaigns.length > 0 && (
              <div>
                <Label className="block mb-1.5">Campaign (optional)</Label>
                <select
                  value={editCampaignId ?? ""}
                  onChange={(e) => setEditCampaignId(e.target.value || null)}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">None</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
