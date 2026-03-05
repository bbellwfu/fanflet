"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  BookOpen,
  Link2,
  FileDown,
  Type,
  Building2,
  X,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  Presentation,
  LinkIcon,
  Download,
} from "lucide-react";
import {
  createLibraryResource,
  updateLibraryResource,
  deleteLibraryResource,
} from "@/app/dashboard/resources/actions";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  requestUploadSlot,
  confirmUpload,
  cancelUploadSlot,
} from "@/app/dashboard/resources/upload-actions";
import { createClient } from "@/lib/supabase/client";
import { STORAGE_BUCKET, isAllowedFileType, ALLOWED_EXTENSIONS, formatFileSize, extractFilename } from "@fanflet/db/storage";
import { StorageQuotaBar } from "./storage-quota-bar";
import { toast } from "sonner";

type LinkedFanflet = { id: string; title: string };

type LibraryResource = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  url: string | null;
  file_path: string | null;
  file_size_bytes: number | null;
  file_type: string | null;
  image_url: string | null;
  section_name: string | null;
  metadata: Record<string, unknown> | null;
  default_sponsor_account_id: string | null;
  created_at: string;
  updated_at: string;
  linked_fanflets_count: number;
  linked_fanflets: LinkedFanflet[];
  download_count: number;
};

function getFileIcon(fileType: string | null) {
  if (!fileType) return FileDown;
  const t = fileType.toLowerCase();
  if (t.includes("pdf")) return FileText;
  if (t.includes("presentation") || t.includes("powerpoint") || t.includes("ppt")) return Presentation;
  if (t.includes("word") || t.includes("document") || t.includes("doc")) return FileText;
  if (t.includes("spreadsheet") || t.includes("excel") || t.includes("csv")) return FileSpreadsheet;
  if (t.includes("image") || t.includes("png") || t.includes("jpg") || t.includes("jpeg")) return FileImage;
  if (t.includes("zip")) return FileArchive;
  return FileDown;
}

const typeIcons: Record<string, typeof Link2> = {
  link: Link2,
  file: FileDown,
  text: Type,
  sponsor: Building2,
};

const typeLabels: Record<string, string> = {
  link: "Link",
  file: "File",
  text: "Text",
  sponsor: "Sponsor",
};

function isImageFileType(fileType: string | null, filePath: string | null): boolean {
  if (!fileType && !filePath) return false;
  const t = (fileType ?? "").toLowerCase();
  if (t.startsWith("image/")) return true;
  if (!filePath) return false;
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(ext);
}

/** Thumbnail for file resources: shows image preview for image files, icon otherwise. */
function FileThumbnail({
  filePath,
  fileType,
  title,
  fallbackIcon: FallbackIcon,
  className,
}: {
  filePath: string | null;
  fileType: string | null;
  title: string;
  fallbackIcon: typeof FileDown;
  className?: string;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const isImage = isImageFileType(fileType, filePath);

  useEffect(() => {
    if (!isImage || !filePath || filePath.startsWith("http")) return;
    let cancelled = false;
    const supabase = createClient();
    supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, 60)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setSignedUrl(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [isImage, filePath]);

  if (signedUrl) {
    return (
      <div className={`shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white ${className ?? "w-12 h-12"}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={signedUrl}
          alt={title || "File"}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }
  return (
    <div className={`rounded-lg bg-[#1B365D]/10 flex items-center justify-center shrink-0 text-[#1B365D] ${className ?? "w-10 h-10"}`}>
      <FallbackIcon className="w-5 h-5" />
    </div>
  );
}

const blockTypes = [
  { type: "link", label: "Link", icon: Link2 },
  { type: "file", label: "File Upload", icon: FileDown },
  { type: "text", label: "Text", icon: Type },
  { type: "sponsor", label: "Sponsor", icon: Building2 },
] as const;

interface ResourceLibraryProps {
  resources: LibraryResource[];
  authUserId: string;
  allowSponsorVisibility?: boolean;
  storageUsedBytes: number;
  storageLimitMb: number;
  maxFileMb: number;
  connectedSponsors?: { id: string; company_name: string }[];
  endedSponsors?: { id: string; company_name: string; ended_at: string }[];
}

export function ResourceLibrary({
  resources,
  authUserId,
  allowSponsorVisibility = true,
  storageUsedBytes,
  storageLimitMb,
  maxFileMb,
  connectedSponsors = [],
  endedSponsors = [],
}: ResourceLibraryProps) {
  const resourceTypes = allowSponsorVisibility ? blockTypes : blockTypes.filter((t) => t.type !== "sponsor");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; resource: LibraryResource } | null>(null);

  // Add form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [sectionName, setSectionName] = useState("Resources");
  const [sponsorCta, setSponsorCta] = useState("Learn More");
  const [defaultSponsorId, setDefaultSponsorId] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState("");
  const [uploadedLibraryItemId, setUploadedLibraryItemId] = useState<string | null>(null);
  const [openLinkedId, setOpenLinkedId] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const linkedPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openLinkedId) {
      linkedPopoverRef.current = null;
      return;
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (linkedPopoverRef.current && !linkedPopoverRef.current.contains(e.target as Node)) {
        setOpenLinkedId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openLinkedId]);

  useEffect(() => {
    if (searchParams.get("focus") !== "example-link") return;
    if (resources.length > 0) return;

    setTimeout(() => {
      setShowAddForm(true);
      setSelectedType("link");
      setTitle("My Speaker Website");
      setUrl("https://example.com");
      setDescription("Learn more about my work and get in touch.");
      setSectionName("Resources");
    }, 0);

    const timeoutId = window.setTimeout(() => {
      document.getElementById("resource-add-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
      (document.getElementById("new-resource-title") as HTMLInputElement | null)?.focus();
      (document.getElementById("new-resource-title") as HTMLInputElement | null)?.select();
    }, 50);

    return () => window.clearTimeout(timeoutId);
  }, [searchParams, resources.length]);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editSectionName, setEditSectionName] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editMetadata, setEditMetadata] = useState<Record<string, unknown>>({});
  const [editDefaultSponsorId, setEditDefaultSponsorId] = useState<string>("");

  const resetForm = useCallback(() => {
    setSelectedType(null);
    setTitle("");
    setDescription("");
    setUrl("");
    setContent("");
    setSectionName("Resources");
    setSponsorCta("Learn More");
    setDefaultSponsorId("");
    setImageUrl("");
    setFileName("");
    setUploadedLibraryItemId(null);
    setUploadProgress(0);
    setShowAddForm(false);
  }, []);

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setUrlFn: (url: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setImageUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "png";
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
      const path = `${authUserId}/library/images/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("resources")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        toast.error(uploadError.message || "Image upload failed");
        setImageUploading(false);
        return;
      }

      const { data } = supabase.storage.from("resources").getPublicUrl(path);
      setUrlFn(data.publicUrl);
      setImageUploading(false);
      toast.success("Image uploaded");
    } catch {
      toast.error("Image upload failed");
      setImageUploading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isAllowedFileType(file.name)) {
      toast.error(`File type not supported. Accepted: ${ALLOWED_EXTENSIONS.join(", ")}`);
      return;
    }

    const maxBytes = maxFileMb * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error(`File too large (max ${maxFileMb} MB)`);
      return;
    }

    setFileUploading(true);
    setUploadProgress(0);
    setFileName(file.name);

    try {
      // Step 1: Request upload slot (server-side validation)
      const slot = await requestUploadSlot({
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || "application/octet-stream",
        title: title || undefined,
        description: description || undefined,
        sectionName: sectionName || undefined,
      });

      if (!slot.allowed) {
        toast.error(slot.error);
        setFileUploading(false);
        setFileName("");
        return;
      }

      setUploadedLibraryItemId(slot.libraryItemId);

      // Step 2: Upload directly to Supabase Storage (private bucket)
      const supabase = createClient();
      abortControllerRef.current = new AbortController();

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(slot.path, file, {
          upsert: false,
        });

      if (uploadError) {
        toast.error(uploadError.message || "File upload failed");
        await cancelUploadSlot(slot.libraryItemId);
        setFileUploading(false);
        setFileName("");
        setUploadedLibraryItemId(null);
        return;
      }

      setUploadProgress(100);

      // Step 3: Confirm upload (server-side finalization)
      const confirm = await confirmUpload({
        libraryItemId: slot.libraryItemId,
        filePath: slot.path,
        fileSizeBytes: file.size,
        fileType: file.type || "application/octet-stream",
        title: title || file.name,
      });

      if (confirm.error) {
        toast.error(confirm.error);
        setFileUploading(false);
        return;
      }

      setFileUploading(false);
      if (!title) setTitle(file.name);
      toast.success("File uploaded to your library");
    } catch {
      toast.error("File upload failed — please try again");
      if (uploadedLibraryItemId) {
        await cancelUploadSlot(uploadedLibraryItemId);
      }
      setFileUploading(false);
      setFileName("");
      setUploadedLibraryItemId(null);
    }
  };

  const handleCancelUpload = () => {
    abortControllerRef.current?.abort();
    if (uploadedLibraryItemId) {
      void cancelUploadSlot(uploadedLibraryItemId);
    }
    setFileUploading(false);
    setFileName("");
    setUploadedLibraryItemId(null);
    setUploadProgress(0);
  };

  const handleAdd = async () => {
    if (!selectedType) return;

    // File type resources are handled entirely by the upload flow
    if (selectedType === "file") {
      if (!uploadedLibraryItemId) {
        toast.error("Please upload a file first");
        return;
      }
      // The resource was already created by requestUploadSlot + confirmUpload
      resetForm();
      router.refresh();
      return;
    }

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);

    const payload: Parameters<typeof createLibraryResource>[0] = {
      type: selectedType,
      title: title.trim() || "Untitled",
      section_name: sectionName || undefined,
      image_url: imageUrl || undefined,
    };

    if (selectedType === "link") {
      payload.url = url || undefined;
      payload.description = description || undefined;
    } else if (selectedType === "text") {
      payload.description = content || undefined;
    } else if (selectedType === "sponsor") {
      payload.url = url || undefined;
      payload.description = description || undefined;
      payload.metadata = { cta_text: sponsorCta || "Learn More" };
      payload.default_sponsor_account_id = defaultSponsorId || null;
    }

    const result = await createLibraryResource(payload);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Resource saved to library");
    resetForm();
    router.refresh();
  };

  const handleStartEdit = (r: LibraryResource) => {
    setEditingId(r.id);
    setEditTitle(r.title ?? "");
    setEditDescription(r.description ?? "");
    setEditUrl(r.url ?? "");
    setEditSectionName(r.section_name ?? "Resources");
    setEditImageUrl(r.image_url ?? "");
    setEditMetadata(r.metadata ?? {});
    setEditDefaultSponsorId(r.default_sponsor_account_id ?? "");
  };

  const editingResource = editingId ? resources.find((r) => r.id === editingId) : null;

  const handleSaveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const result = await updateLibraryResource(editingId, {
      title: editTitle || undefined,
      description: editDescription || undefined,
      url: editUrl || undefined,
      image_url: editImageUrl || undefined,
      section_name: editSectionName || undefined,
      metadata: Object.keys(editMetadata).length ? editMetadata : undefined,
      default_sponsor_account_id: editingResource?.type === "sponsor" ? (editDefaultSponsorId || null) : undefined,
    });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Resource updated");
    setEditingId(null);
    router.refresh();
  };

  const handleDeleteClick = (id: string, resource: LibraryResource) => {
    const linkedCount = resource.linked_fanflets_count;
    if (linkedCount > 0) {
      setDeleteTarget({ id, resource });
      return;
    }
    const message = "Delete this library resource?";
    if (!confirm(message)) return;
    executeDelete(id);
  };

  const executeDelete = async (id: string, handleLinkedBlocks?: 'convert_to_static' | 'remove_from_fanflets') => {
    setDeleting(id);
    const result = await deleteLibraryResource(id, handleLinkedBlocks ? { handleLinkedBlocks } : undefined);
    setDeleting(null);
    setDeleteTarget(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(
      handleLinkedBlocks === 'convert_to_static'
        ? "Resource deleted. Blocks converted to static copies on fanflets."
        : handleLinkedBlocks === 'remove_from_fanflets'
          ? "Resource deleted. Blocks removed from fanflets."
          : "Resource deleted"
    );
    router.refresh();
  };

  const handleDeleteConfirmConvertToStatic = () => {
    if (!deleteTarget) return;
    executeDelete(deleteTarget.id, 'convert_to_static');
  };

  const handleDeleteConfirmRemoveFromFanflets = () => {
    if (!deleteTarget) return;
    executeDelete(deleteTarget.id, 'remove_from_fanflets');
  };

  const showUrl = selectedType === "link" || selectedType === "sponsor";
  const showContent = selectedType === "text";
  const showFile = selectedType === "file";

  const hasFileResources = resources.some((r) => r.type === "file" && r.file_size_bytes);

  return (
    <>
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete library resource</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>
                  This resource is linked as a <strong>dynamic</strong> block on{" "}
                  <strong>
                    {deleteTarget?.resource.linked_fanflets_count === 1
                      ? "1 fanflet"
                      : `${deleteTarget?.resource.linked_fanflets_count ?? 0} fanflets`}
                  </strong>
                  . How do you want to handle the blocks on those fanflets?
                </p>
                {deleteTarget?.resource.linked_fanflets && deleteTarget.resource.linked_fanflets.length > 0 && (
                  deleteTarget.resource.linked_fanflets.length === 1 ? (
                    <p className="text-muted-foreground text-sm">
                      {deleteTarget.resource.linked_fanflets[0].title}
                    </p>
                  ) : (
                    <ul
                      className="max-h-32 overflow-y-auto rounded-md border border-border bg-muted/30 px-3 py-2 text-sm list-disc list-inside"
                      aria-label="Linked fanflets"
                    >
                      {deleteTarget.resource.linked_fanflets.map((f) => (
                        <li key={f.id}>{f.title}</li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirmRemoveFromFanflets}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove from all fanflets
            </AlertDialogAction>
            <AlertDialogAction onClick={handleDeleteConfirmConvertToStatic}>
              Convert to static copies
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card className="border-slate-200">
      <CardHeader className="flex flex-col gap-3 px-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-[#1B365D] flex items-center gap-2">
          <BookOpen className="w-5 h-5" />
          Your Resources
        </CardTitle>
        {!showAddForm && (
          <Button
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="bg-[#1B365D] hover:bg-[#152b4d]"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Resource
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4 px-4 sm:px-6">
        {/* Storage Quota Bar */}
        {(hasFileResources || storageUsedBytes > 0) && (
          <div className="flex flex-col gap-1.5 px-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-xs font-medium text-slate-600 shrink-0">File Storage Used</span>
            <div className="min-w-0 flex-1 w-full">
              <StorageQuotaBar usedBytes={storageUsedBytes} limitMb={storageLimitMb} />
            </div>
          </div>
        )}

        {/* Add form */}
        {showAddForm && !selectedType && (
          <div className="p-5 bg-[#1B365D] rounded-lg border border-[#1B365D] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-white/15">
              <Plus className="w-4 h-4 text-[#3BA5D9]" />
              <h3 className="text-sm font-semibold text-white">Add to Library</h3>
            </div>
            <p className="text-xs text-white/70">Choose a resource type</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {resourceTypes.map(({ type, label, icon: Icon }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setSelectedType(type);
                    if (type === "sponsor") setSectionName("Featured Partners");
                  }}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg border border-white/15 bg-white/10 hover:border-[#3BA5D9] hover:bg-white/15 transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-white">{label}</span>
                </button>
              ))}
            </div>
            <Button
              size="sm"
              onClick={resetForm}
              className="bg-slate-300 text-slate-700 hover:bg-slate-400 hover:text-slate-800 border-0"
            >
              Cancel
            </Button>
          </div>
        )}

        {showAddForm && selectedType && (
          <div id="resource-add-form" className="p-5 bg-[#1B365D] rounded-lg border border-[#1B365D] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/15">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#3BA5D9]" />
                <h3 className="text-sm font-semibold text-white">
                  Add {resourceTypes.find((b) => b.type === selectedType)?.label} to Library
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedType(null)}
                className="h-8 text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {!showFile && (
              <div className="space-y-2">
                <Label className="text-white/90 font-medium">
                  {selectedType === "sponsor" ? "Sponsor Name" : "Title"}
                </Label>
                <Input
                  id="new-resource-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={selectedType === "sponsor" ? "Acme Health" : "My Website"}
                  className="bg-white border-white/20 placeholder:text-slate-400"
                />
              </div>
            )}

            {showUrl && (
              <div className="space-y-2">
                <Label className="text-white/90 font-medium">URL</Label>
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                  type="url"
                  className="bg-white border-white/20 placeholder:text-slate-400"
                />
              </div>
            )}

            {(selectedType === "link" || selectedType === "sponsor") && (
              <div className="space-y-2">
                <Label className="text-white/90 font-medium">Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  className="bg-white border-white/20 placeholder:text-slate-400"
                />
              </div>
            )}

            {selectedType === "sponsor" && (
              <div className="space-y-2">
                <Label className="text-white/90 font-medium">CTA Text</Label>
                <Input
                  value={sponsorCta}
                  onChange={(e) => setSponsorCta(e.target.value)}
                  placeholder="Learn More"
                  className="bg-white border-white/20 placeholder:text-slate-400"
                />
              </div>
            )}

            {selectedType === "sponsor" && connectedSponsors.length > 0 && (
              <div className="space-y-2">
                <Label className="text-white/90 font-medium">Link to a Connected Sponsor for tracking?</Label>
                <Select
                  value={defaultSponsorId || "none"}
                  onValueChange={(v) => setDefaultSponsorId(v === "none" ? "" : v)}
                >
                  <SelectTrigger className="bg-white border-white/20">
                    <SelectValue placeholder="None (set when adding to a Fanflet)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {connectedSponsors.filter((s) => s?.id).map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.company_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-white/60">
                  When you add this resource to a Fanflet, the block will be linked to this sponsor by default.
                </p>
              </div>
            )}

            {(selectedType === "link" || selectedType === "sponsor") && (
              <div className="space-y-2">
                <Label className="text-white/90 font-medium">
                  {selectedType === "sponsor" ? "Logo Image" : "Thumbnail Image"}{" "}
                  <span className="text-white/50 font-normal">(optional)</span>
                </Label>
                {imageUrl ? (
                  <div className="flex items-center gap-3 p-2 rounded-lg border border-white/20 bg-white/10">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt="Uploaded"
                      className="h-12 w-auto max-w-[120px] object-contain rounded"
                    />
                    <span className="text-xs text-emerald-400 font-medium flex-1">Uploaded</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setImageUrl("");
                        if (imageInputRef.current) imageInputRef.current.value = "";
                      }}
                      className="text-xs text-white/60 hover:text-white hover:bg-white/10"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, setImageUrl)}
                      disabled={imageUploading}
                      className="bg-white border-white/20"
                    />
                    {imageUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-md">
                        <Loader2 className="w-4 h-4 animate-spin text-[#3BA5D9]" />
                        <span className="text-xs ml-2 text-muted-foreground">Uploading...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {showContent && (
              <div className="space-y-2">
                <Label className="text-white/90 font-medium">Content</Label>
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Your text content..."
                  rows={4}
                  className="bg-white border-white/20 placeholder:text-slate-400"
                />
              </div>
            )}

            {showFile && (
              <div className="space-y-2">
                <Label className="text-white/90 font-medium">File</Label>
                <p className="text-[11px] text-white/50">
                  Max {maxFileMb} MB. Accepted: PDF, PPTX, DOCX, XLSX, CSV, images, ZIP
                </p>
                {uploadedLibraryItemId && fileName ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-white/20 bg-white/10">
                      <FileDown className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs text-emerald-400 font-medium truncate block">{fileName}</span>
                        {uploadProgress >= 100 && (
                          <span className="text-[10px] text-white/50">Uploaded successfully</span>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFileName("");
                          setUploadedLibraryItemId(null);
                          setUploadProgress(0);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                        }}
                        className="text-xs text-white/60 hover:text-white hover:bg-white/10"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      accept={ALLOWED_EXTENSIONS.join(",")}
                      onChange={handleFileUpload}
                      disabled={fileUploading}
                      className="bg-white border-white/20"
                    />
                    {fileUploading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 rounded-md gap-1">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-[#3BA5D9]" />
                          <span className="text-xs text-muted-foreground">
                            Uploading {fileName}...
                          </span>
                        </div>
                        <div className="w-3/4 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#3BA5D9] rounded-full transition-all"
                            style={{ width: `${Math.max(uploadProgress, 10)}%` }}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={handleCancelUpload}
                          className="text-[10px] text-slate-500 hover:text-slate-700 mt-0.5"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {showFile && (
              <div className="space-y-2">
                <Label className="text-white/90 font-medium">Title (optional)</Label>
                <Input
                  id="new-resource-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={fileName || "e.g. Conference Slide Deck"}
                  className="bg-white border-white/20 placeholder:text-slate-400"
                />
              </div>
            )}

            {showFile && (
              <div className="space-y-2">
                <Label className="text-white/90 font-medium">Description (optional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Slides from my talk at..."
                  className="bg-white border-white/20 placeholder:text-slate-400"
                />
              </div>
            )}

            {!showFile && (
              <div className="space-y-2">
                <Label className="text-white/90 font-medium">Section Name</Label>
                <Input
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="Resources"
                  className="bg-white border-white/20 placeholder:text-slate-400"
                />
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={saving || imageUploading || fileUploading}
                className="bg-[#3BA5D9] hover:bg-[#3BA5D9]/90 text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save to Library"}
              </Button>
              <Button
                size="sm"
                onClick={resetForm}
                className="bg-slate-300 text-slate-700 hover:bg-slate-400 hover:text-slate-800 border-0"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Resource list */}
        {resources.length === 0 && !showAddForm && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No resources in your library yet. Add one to reuse across your Fanflets.
          </div>
        )}

        {resources.map((r) => {
          const Icon = r.type === "file" && r.file_type
            ? getFileIcon(r.file_type)
            : typeIcons[r.type] ?? Link2;

          if (editingId === r.id) {
            return (
              <div
                key={r.id}
                className="p-4 bg-slate-50 rounded-lg border border-[#3BA5D9]/40 space-y-3"
              >
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="border-[#e2e8f0]"
                  />
                </div>
                {r.type !== "text" && (
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Optional description"
                      className="border-[#e2e8f0]"
                    />
                  </div>
                )}
                {(r.type === "link" || r.type === "sponsor") && (
                  <div className="space-y-2">
                    <Label>URL</Label>
                    <Input
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="https://..."
                      type="url"
                      className="border-[#e2e8f0]"
                    />
                  </div>
                )}
                {r.type === "sponsor" && (
                  <div className="space-y-2">
                    <Label>CTA Text</Label>
                    <Input
                      value={(editMetadata?.cta_text as string) ?? "Learn More"}
                      onChange={(e) =>
                        setEditMetadata({ ...editMetadata, cta_text: e.target.value })
                      }
                      placeholder="Learn More"
                      className="border-[#e2e8f0]"
                    />
                  </div>
                )}
                {r.type === "sponsor" && (connectedSponsors.length > 0 || endedSponsors.length > 0) && (
                  <div className="space-y-2">
                    <Label>Default sponsor</Label>
                    {editDefaultSponsorId && endedSponsors.some((s) => s.id === editDefaultSponsorId) && (
                      <p className="text-sm text-slate-600 rounded-md border border-slate-200 bg-slate-50 p-2">
                        Connection ended on{" "}
                        {new Date(endedSponsors.find((s) => s.id === editDefaultSponsorId)!.ended_at).toLocaleDateString()};
                        no new data is sent to them. Choose None below to clear.
                      </p>
                    )}
                    <Select
                      value={editDefaultSponsorId || "none"}
                      onValueChange={(v) => setEditDefaultSponsorId(v === "none" ? "" : v)}
                    >
                      <SelectTrigger className="border-[#e2e8f0]">
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {connectedSponsors.filter((s) => s?.id).map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.company_name}
                          </SelectItem>
                        ))}
                        {endedSponsors.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.company_name} (ended)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {r.type === "text" && (
                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      rows={4}
                      className="border-[#e2e8f0]"
                    />
                  </div>
                )}
                {(r.type === "link" || r.type === "sponsor") && (
                  <div className="space-y-2">
                    <Label>
                      {r.type === "sponsor" ? "Logo Image" : "Thumbnail Image"}{" "}
                      <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    {editImageUrl ? (
                      <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 bg-slate-50">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={editImageUrl}
                          alt="Uploaded"
                          className="h-12 w-auto max-w-[120px] object-contain rounded"
                        />
                        <span className="text-xs text-emerald-600 font-medium flex-1">Uploaded</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditImageUrl("")}
                          className="text-xs text-muted-foreground"
                        >
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, setEditImageUrl)}
                        disabled={imageUploading}
                        className="border-[#e2e8f0]"
                      />
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Section Name</Label>
                  <Input
                    value={editSectionName}
                    onChange={(e) => setEditSectionName(e.target.value)}
                    placeholder="Resources"
                    className="border-[#e2e8f0]"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="bg-[#1B365D] hover:bg-[#152b4d]"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            );
          }

          const preview =
            r.type === "text"
              ? (r.description ?? "").slice(0, 80) + ((r.description?.length ?? 0) > 80 ? "..." : "")
              : r.type === "file"
                ? (r.description ?? (r.file_path
                    ? `${extractFilename(r.file_path)}${r.file_size_bytes != null && r.file_size_bytes > 0 ? ` · ${formatFileSize(r.file_size_bytes)}` : ""}`
                    : ""))
                : r.description ?? r.url ?? "";

          return (
            <div
              key={r.id}
              className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 group"
            >
              {r.type === "file" ? (
                <FileThumbnail
                  filePath={r.file_path}
                  fileType={r.file_type}
                  title={r.title || "File"}
                  fallbackIcon={Icon}
                />
              ) : r.image_url ? (
                <div className="w-12 h-12 rounded-lg border border-slate-200 bg-white flex items-center justify-center shrink-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={r.image_url}
                    alt={r.title || "Resource"}
                    className="w-full h-full object-contain p-0.5"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-lg bg-[#1B365D]/10 flex items-center justify-center shrink-0 text-[#1B365D]">
                  <Icon className="w-5 h-5" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    {typeLabels[r.type] ?? r.type}
                  </span>
                  {r.section_name && (
                    <span className="text-[10px] text-slate-400">
                      &bull; {r.section_name}
                    </span>
                  )}
                  {r.file_size_bytes != null && r.file_size_bytes > 0 && (
                    <span className="text-[10px] text-slate-400">
                      &bull; {formatFileSize(r.file_size_bytes)}
                    </span>
                  )}
                  {r.created_at && (
                    <span className="text-[10px] text-slate-400" title="Upload date">
                      &bull; {new Date(r.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  )}
                </div>
                <p className="font-medium text-sm text-slate-900 truncate">{r.title || "Untitled"}</p>
                {preview && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {preview}
                  </p>
                )}
                {/* Usage badges */}
                <div className="flex items-center gap-3 mt-1.5">
                  {r.linked_fanflets_count > 0 ? (
                    <div
                      className="relative"
                      ref={(el) => {
                        if (openLinkedId === r.id)
                          (linkedPopoverRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setOpenLinkedId(openLinkedId === r.id ? null : r.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-medium text-[#3BA5D9] hover:underline cursor-pointer"
                        aria-expanded={openLinkedId === r.id}
                        aria-haspopup="true"
                      >
                        <LinkIcon className="w-3 h-3" />
                        {r.linked_fanflets_count} fanflet{r.linked_fanflets_count !== 1 ? "s" : ""}
                      </button>
                      {openLinkedId === r.id && (r.linked_fanflets ?? []).length > 0 && (
                        <div className="absolute left-0 top-full z-50 mt-1 min-w-[180px] max-w-[min(180px,calc(100vw-2rem))] rounded-md border border-slate-200 bg-white py-1 shadow-lg">
                          <p className="px-2 py-1 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                            Linked to
                          </p>
                          {r.linked_fanflets.map((f) => (
                            <Link
                              key={f.id}
                              href={`/dashboard/fanflets/${f.id}`}
                              className="block px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-100 truncate"
                              onClick={() => setOpenLinkedId(null)}
                            >
                              {f.title || "Untitled"}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400">Unused</span>
                  )}
                  {r.download_count > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500">
                      <Download className="w-3 h-3" />
                      {r.download_count}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 opacity-100 transition-opacity shrink-0 sm:opacity-0 sm:group-hover:opacity-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStartEdit(r)}
                  className="gap-2"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteClick(r.id, r)}
                  disabled={deleting === r.id}
                  className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  {deleting === r.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
    </>
  );
}
