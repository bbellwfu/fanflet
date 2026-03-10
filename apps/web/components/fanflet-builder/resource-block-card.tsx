"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link2, FileDown, Type, Building2 } from "lucide-react";
import {
  updateResourceBlock,
  deleteResourceBlock,
  reorderBlock,
} from "@/app/dashboard/fanflets/[id]/actions";
import { createClient } from "@/lib/supabase/client";
import { STORAGE_BUCKET, extractFilename, formatFileSize } from "@fanflet/db/storage";
import { toast } from "sonner";
import { formatDate } from "@fanflet/db/timezone";
import { useTimezone } from "@/lib/timezone-context";
import { ChevronUp, ChevronDown, Pencil, Trash2, Loader2, Link as LinkIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const typeIcons: Record<string, typeof Link2> = {
  link: Link2,
  file: FileDown,
  text: Type,
  sponsor: Building2,
  embed: Link2,
};

const typeLabels: Record<string, string> = {
  link: "Link",
  file: "File",
  text: "Text",
  sponsor: "Sponsor",
  embed: "Embed",
};

export type ResourceBlock = {
  id: string;
  type: string;
  title: string | null;
  description: string | null;
  url: string | null;
  file_path: string | null;
  image_url: string | null;
  display_order: number;
  section_name: string | null;
  metadata: Record<string, unknown> | null;
  library_item_id?: string | null;
  sponsor_account_id?: string | null;
  /** When block is linked from library (dynamic), file_path/file_type may come from here */
  resource_library?: { file_path: string | null; file_type: string | null; file_size_bytes?: number | null } | null;
};

function isImageFileType(fileType: string | null | undefined, filePath: string | null): boolean {
  if (fileType?.toLowerCase().startsWith("image/")) return true;
  if (!filePath) return false;
  const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
  return [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(ext);
}

/** Thumbnail for file blocks: image preview from private storage or icon. */
function BlockFileThumbnail({
  filePath,
  fileType,
  title,
  fallbackIcon: FallbackIcon,
}: {
  filePath: string | null;
  fileType: string | null | undefined;
  title: string | null;
  fallbackIcon: typeof FileDown;
}) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const isImage = isImageFileType(fileType ?? null, filePath);

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
      <div className="w-12 h-12 rounded-lg border border-slate-200 bg-white shrink-0 overflow-hidden flex items-center justify-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={signedUrl} alt={title || "File"} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-[#1B365D]/10 flex items-center justify-center shrink-0 text-[#1B365D]">
      <FallbackIcon className="w-5 h-5" />
    </div>
  );
}

interface ResourceBlockCardProps {
  block: ResourceBlock;
  fanfletId: string;
  authUserId: string;
  isFirst: boolean;
  isLast: boolean;
  connectedSponsors?: { id: string; company_name: string }[];
  endedSponsors?: { id: string; company_name: string; ended_at: string }[];
}

export function ResourceBlockCard({
  block,
  fanfletId,
  authUserId,
  isFirst,
  isLast,
  connectedSponsors = [],
  endedSponsors = [],
}: ResourceBlockCardProps) {
  const router = useRouter();
  const timezone = useTimezone();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  const [title, setTitle] = useState(block.title ?? "");
  const [description, setDescription] = useState(block.description ?? "");
  const [url, setUrl] = useState(block.url ?? "");
  const [imageUrl, setImageUrl] = useState(block.image_url ?? "");
  const [sectionName, setSectionName] = useState(block.section_name ?? "Resources");
  const [metadata, setMetadata] = useState<Record<string, unknown>>(
    block.metadata ?? {}
  );
  const [sponsorAccountId, setSponsorAccountId] = useState<string | null>(
    block.sponsor_account_id ?? null
  );
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      const path = `${authUserId}/${fanfletId}/images/${safeName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("resources")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        toast.error(uploadError.message || "Image upload failed");
        setImageUploading(false);
        return;
      }

      if (!uploadData?.path) {
        console.error("Upload returned no path:", uploadData);
        toast.error("Upload failed — no file path returned");
        setImageUploading(false);
        return;
      }

      const { data } = supabase.storage.from("resources").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      setImageUploading(false);
      toast.success("Image uploaded");
    } catch (err) {
      console.error("Image upload exception:", err);
      toast.error("Image upload failed — check console for details");
      setImageUploading(false);
    }
  };

  const Icon = typeIcons[block.type] ?? Link2;
  const isDynamic = !!block.library_item_id;
  const resolvedFilePath = block.file_path ?? block.resource_library?.file_path ?? null;
  const resolvedFileType = block.resource_library?.file_type ?? null;
  const resolvedFileSize = block.resource_library?.file_size_bytes ?? null;

  const handleSave = async () => {
    setSaving(true);
    const result = await updateResourceBlock(block.id, {
      title: title || undefined,
      description: description || undefined,
      url: url || undefined,
      image_url: imageUrl || undefined,
      section_name: sectionName || undefined,
      metadata: Object.keys(metadata).length ? metadata : undefined,
      ...(connectedSponsors.length > 0 && { sponsor_account_id: sponsorAccountId || null }),
    });
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Block updated");
    setEditing(false);
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this resource block?")) return;
    setDeleting(true);
    const result = await deleteResourceBlock(block.id);
    setDeleting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Block deleted");
    router.refresh();
  };

  const handleMoveUp = async () => {
    const result = await reorderBlock(block.id, "up");
    if (result.error) toast.error(result.error);
    else router.refresh();
  };

  const handleMoveDown = async () => {
    const result = await reorderBlock(block.id, "down");
    if (result.error) toast.error(result.error);
    else router.refresh();
  };

  const ctaText = (metadata?.cta_text as string) ?? "Learn More";

  if (editing && isDynamic) {
    return (
      <Card className="border-[#3BA5D9]/40 bg-slate-50/50">
        <CardContent className="p-4 space-y-4">
          {/* Resource identity header */}
          <div className="flex items-start gap-3">
            {block.type === "file" && resolvedFilePath ? (
              <BlockFileThumbnail
                filePath={resolvedFilePath}
                fileType={resolvedFileType}
                title={block.title}
                fallbackIcon={Icon}
              />
            ) : block.image_url ? (
              <div className="w-10 h-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center shrink-0 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={block.image_url}
                  alt={block.title || "Resource"}
                  className="w-full h-full object-contain p-0.5"
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-lg bg-[#1B365D]/10 flex items-center justify-center shrink-0 text-[#1B365D]">
                <Icon className="w-5 h-5" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {typeLabels[block.type] ?? block.type}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#3BA5D9]/10 text-[#3BA5D9] border border-[#3BA5D9]/20">
                  <LinkIcon className="w-2.5 h-2.5" />
                  Linked
                </span>
              </div>
              <p className="font-medium text-slate-900 truncate">
                {block.title || "Untitled"}
              </p>
              {block.description && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {block.description}
                </p>
              )}
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            This resource is dynamically linked to your Resource Library. To edit its content, go to{" "}
            <Link href="/dashboard/resources" className="text-[#3BA5D9] hover:underline font-medium">
              Resource Library
            </Link>
            . Changes there will automatically update this fanflet.
          </p>
          <div className="space-y-2">
            <Label>Section Name</Label>
            <Input
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="Resources"
              className="border-[#e2e8f0]"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={async () => {
                setSaving(true);
                const result = await updateResourceBlock(block.id, {
                  section_name: sectionName || undefined,
                });
                setSaving(false);
                if (result.error) {
                  toast.error(result.error);
                  return;
                }
                toast.success("Section name updated");
                setEditing(false);
                router.refresh();
              }}
              disabled={saving}
              className="bg-[#1B365D] hover:bg-[#152b4d]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (editing) {
    return (
      <Card className="border-[#3BA5D9]/40 bg-slate-50/50">
        <CardContent className="p-4 space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Block title"
              className="border-[#e2e8f0]"
            />
          </div>
          {block.type !== "text" && (
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
                className="border-[#e2e8f0]"
              />
            </div>
          )}
          {(block.type === "link" || block.type === "sponsor") && (
            <div className="space-y-2">
              <Label>URL</Label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                type="url"
                className="border-[#e2e8f0]"
              />
            </div>
          )}
          {block.type === "sponsor" && (sponsorAccountId || block.sponsor_account_id) && (() => {
            const linkedId = sponsorAccountId || block.sponsor_account_id;
            const ended = linkedId ? endedSponsors.find((s) => s.id === linkedId) : null;
            const isConnected = linkedId ? connectedSponsors.some((s) => s.id === linkedId) : false;
            if (ended) {
              return (
                <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm text-slate-700">
                    Linked to {ended.company_name}. Connection ended on{" "}
                    {formatDate(ended.ended_at, timezone)}; no new data is sent to them.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      setSaving(true);
                      const result = await updateResourceBlock(block.id, { sponsor_account_id: null });
                      setSaving(false);
                      if (result.error) toast.error(result.error);
                      else {
                        setSponsorAccountId(null);
                        toast.success("Sponsor unlinked");
                        router.refresh();
                      }
                    }}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlink"}
                  </Button>
                </div>
              );
            }
            if (linkedId && !isConnected) {
              return (
                <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50/80 p-3">
                  <p className="text-sm text-amber-900">
                    Linked to a sponsor you&apos;re no longer connected to. Unlink to remove the association.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-amber-300 text-amber-800 hover:bg-amber-100"
                    onClick={async () => {
                      setSaving(true);
                      const result = await updateResourceBlock(block.id, { sponsor_account_id: null });
                      setSaving(false);
                      if (result.error) toast.error(result.error);
                      else {
                        setSponsorAccountId(null);
                        toast.success("Sponsor unlinked");
                        router.refresh();
                      }
                    }}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlink"}
                  </Button>
                </div>
              );
            }
            return null;
          })()}
          {connectedSponsors.length > 0 && (
            <div className="space-y-2">
              <Label>Attribute to sponsor</Label>
              <Select
                value={sponsorAccountId && sponsorAccountId !== "" ? sponsorAccountId : "__none__"}
                onValueChange={(v) => setSponsorAccountId(v === "__none__" ? null : v)}
              >
                <SelectTrigger className="border-[#e2e8f0]">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {connectedSponsors.filter((s) => s?.id).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Clicks and downloads on this resource will be attributed to the selected sponsor.
              </p>
            </div>
          )}
          {block.type === "sponsor" && (
            <div className="space-y-2">
              <Label>CTA Text</Label>
              <Input
                value={ctaText}
                onChange={(e) =>
                  setMetadata({ ...metadata, cta_text: e.target.value })
                }
                placeholder="Learn More"
                className="border-[#e2e8f0]"
              />
            </div>
          )}
          {block.type === "text" && (
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Your text content..."
                rows={4}
                className="border-[#e2e8f0]"
              />
            </div>
          )}
          {(block.type === "link" || block.type === "sponsor") && (
            <div className="space-y-2">
              <Label>
                {block.type === "sponsor" ? "Logo Image" : "Thumbnail Image"}{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              {imageUrl ? (
                <div className="flex items-center gap-3 p-2 rounded-lg border border-slate-200 bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl}
                    alt="Uploaded"
                    className="h-12 w-auto max-w-[120px] object-contain rounded"
                  />
                  <span className="text-xs text-emerald-600 font-medium flex-1">Uploaded</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setImageUrl("");
                      if (imageInputRef.current) imageInputRef.current.value = "";
                    }}
                    className="text-xs text-muted-foreground"
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
                    onChange={handleImageUpload}
                    disabled={imageUploading}
                    className="border-[#e2e8f0]"
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
          <div className="space-y-2">
            <Label>Section Name</Label>
            <Input
              value={sectionName}
              onChange={(e) => setSectionName(e.target.value)}
              placeholder="Resources"
              className="border-[#e2e8f0]"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="bg-[#1B365D] hover:bg-[#152b4d]"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save"
              )}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const preview =
    block.type === "text"
      ? (block.description ?? "").slice(0, 80) + (block.description && block.description.length > 80 ? "..." : "")
      : block.type === "file"
        ? (block.description ?? (resolvedFilePath
            ? `${extractFilename(resolvedFilePath)}${resolvedFileSize != null && resolvedFileSize > 0 ? ` · ${formatFileSize(resolvedFileSize)}` : ""}`
            : ""))
        : block.description ?? block.url ?? "";

  return (
    <Card className="border-slate-200 hover:border-[#3BA5D9]/30 transition-colors group">
      <CardContent className="p-4 flex items-start gap-4">
        {block.type === "file" && resolvedFilePath ? (
          <BlockFileThumbnail
            filePath={resolvedFilePath}
            fileType={resolvedFileType}
            title={block.title}
            fallbackIcon={Icon}
          />
        ) : block.image_url ? (
          <div className="w-12 h-12 rounded-lg border border-slate-200 bg-white flex items-center justify-center shrink-0 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={block.image_url}
              alt={block.title || "Resource"}
              className="w-full h-full object-contain p-0.5"
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-lg bg-[#1B365D]/10 flex items-center justify-center shrink-0 text-[#1B365D]">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground uppercase">
              {typeLabels[block.type] ?? block.type}
            </span>
            {block.section_name && (
              <span className="text-xs text-slate-400">
                &bull; {block.section_name}
              </span>
            )}
            {isDynamic && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#3BA5D9]/10 text-[#3BA5D9] border border-[#3BA5D9]/20">
                <LinkIcon className="w-2.5 h-2.5" />
                Linked
              </span>
            )}
          </div>
          <p className="font-medium text-slate-900 truncate">{block.title || "Untitled"}</p>
          {preview && (
            <p className="text-sm text-muted-foreground truncate mt-0.5">
              {preview}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleMoveUp}
            disabled={isFirst}
            className="h-10 w-10 md:h-8 md:w-8"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleMoveDown}
            disabled={isLast}
            className="h-10 w-10 md:h-8 md:w-8"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setEditing(true)}
            className="h-10 w-10 md:h-8 md:w-8"
          >
            <Pencil className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
            disabled={deleting}
            className="h-10 w-10 md:h-8 md:w-8 text-destructive hover:text-destructive"
          >
            {deleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
