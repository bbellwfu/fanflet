"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import {
  createLibraryResource,
  updateLibraryResource,
  deleteLibraryResource,
} from "@/app/dashboard/resources/actions";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

type LibraryResource = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  url: string | null;
  file_path: string | null;
  image_url: string | null;
  section_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

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

const blockTypes = [
  { type: "link", label: "Link", icon: Link2 },
  { type: "file", label: "File Upload", icon: FileDown },
  { type: "text", label: "Text", icon: Type },
  { type: "sponsor", label: "Sponsor", icon: Building2 },
] as const;

interface ResourceLibraryProps {
  resources: LibraryResource[];
  authUserId: string;
}

export function ResourceLibrary({ resources, authUserId }: ResourceLibraryProps) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Add form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [sectionName, setSectionName] = useState("Resources");
  const [sponsorCta, setSponsorCta] = useState("Learn More");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [fileUploading, setFileUploading] = useState(false);
  const [filePath, setFilePath] = useState("");
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit form state
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editSectionName, setEditSectionName] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");
  const [editMetadata, setEditMetadata] = useState<Record<string, unknown>>({});

  const resetForm = () => {
    setSelectedType(null);
    setTitle("");
    setDescription("");
    setUrl("");
    setContent("");
    setSectionName("Resources");
    setSponsorCta("Learn More");
    setImageUrl("");
    setFilePath("");
    setShowAddForm(false);
  };

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setUrlFn: (url: string) => void,
    inputRef: React.RefObject<HTMLInputElement | null>
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
    setFileUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "file";
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
      const path = `${authUserId}/library/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("resources")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        toast.error(uploadError.message || "File upload failed");
        setFileUploading(false);
        return;
      }

      const { data } = supabase.storage.from("resources").getPublicUrl(path);
      setFilePath(data.publicUrl);
      if (!title) setTitle(file.name);
      setFileUploading(false);
      toast.success("File uploaded");
    } catch {
      toast.error("File upload failed");
      setFileUploading(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedType) return;
    if (!title.trim() && selectedType !== "file") {
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
    } else if (selectedType === "file") {
      payload.file_path = filePath || undefined;
      payload.description = description || undefined;
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
  };

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

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this library resource? Dynamically linked fanflet blocks will become standalone.")) return;
    setDeleting(id);
    const result = await deleteLibraryResource(id);
    setDeleting(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Resource deleted");
    router.refresh();
  };

  const showUrl = selectedType === "link" || selectedType === "sponsor";
  const showContent = selectedType === "text";
  const showFile = selectedType === "file";

  return (
    <Card className="border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between">
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
      <CardContent className="space-y-4">
        {/* Add form */}
        {showAddForm && !selectedType && (
          <div className="p-5 bg-[#1B365D] rounded-lg border border-[#1B365D] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-white/15">
              <Plus className="w-4 h-4 text-[#3BA5D9]" />
              <h3 className="text-sm font-semibold text-white">Add to Library</h3>
            </div>
            <p className="text-xs text-white/70">Choose a resource type</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {blockTypes.map(({ type, label, icon: Icon }) => (
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
          <div className="p-5 bg-[#1B365D] rounded-lg border border-[#1B365D] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/15">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#3BA5D9]" />
                <h3 className="text-sm font-semibold text-white">
                  Add {blockTypes.find((b) => b.type === selectedType)?.label} to Library
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

            <div className="space-y-2">
              <Label className="text-white/90 font-medium">
                {selectedType === "sponsor" ? "Sponsor Name" : "Title"}
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={selectedType === "sponsor" ? "Acme Health" : "My Website"}
                className="bg-white border-white/20 placeholder:text-slate-400"
              />
            </div>

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
                      onChange={(e) => handleImageUpload(e, setImageUrl, imageInputRef)}
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
                {filePath ? (
                  <div className="flex items-center gap-3 p-2 rounded-lg border border-white/20 bg-white/10">
                    <span className="text-xs text-emerald-400 font-medium flex-1 truncate">{filePath.split("/").pop()}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilePath("");
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-xs text-white/60 hover:text-white hover:bg-white/10"
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      onChange={handleFileUpload}
                      disabled={fileUploading}
                      className="bg-white border-white/20"
                    />
                    {fileUploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-md">
                        <Loader2 className="w-4 h-4 animate-spin text-[#3BA5D9]" />
                        <span className="text-xs ml-2 text-muted-foreground">Uploading...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {showFile && (
              <div className="space-y-2">
                <Label className="text-white/90 font-medium">Description (optional)</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. PDF - 4.2 MB"
                  className="bg-white border-white/20 placeholder:text-slate-400"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-white/90 font-medium">Section Name</Label>
              <Input
                value={sectionName}
                onChange={(e) => setSectionName(e.target.value)}
                placeholder="Resources"
                className="bg-white border-white/20 placeholder:text-slate-400"
              />
            </div>

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
          const Icon = typeIcons[r.type] ?? Link2;

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
                        onChange={(e) => handleImageUpload(e, setEditImageUrl, imageInputRef)}
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
              : r.description ?? r.url ?? r.file_path ?? "";

          return (
            <div
              key={r.id}
              className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 group"
            >
              {r.image_url ? (
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
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    {typeLabels[r.type] ?? r.type}
                  </span>
                  {r.section_name && (
                    <span className="text-[10px] text-slate-400">
                      &bull; {r.section_name}
                    </span>
                  )}
                </div>
                <p className="font-medium text-sm text-slate-900 truncate">{r.title || "Untitled"}</p>
                {preview && (
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {preview}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStartEdit(r)}
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(r.id)}
                  disabled={deleting === r.id}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  {deleting === r.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
