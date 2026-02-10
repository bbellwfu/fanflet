"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Link2, FileDown, Type, Building2, Plus, X, ImageIcon, Upload } from "lucide-react";
import { addResourceBlock } from "@/app/dashboard/fanflets/[id]/actions";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const blockTypes = [
  { type: "link", label: "Link", icon: Link2 },
  { type: "file", label: "File Upload", icon: FileDown },
  { type: "text", label: "Text", icon: Type },
  { type: "sponsor", label: "Sponsor", icon: Building2 },
] as const;

interface AddBlockFormProps {
  fanfletId: string;
  authUserId: string;
  onAdded: () => void;
}

export function AddBlockForm({
  fanfletId,
  authUserId,
  onAdded,
}: AddBlockFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [content, setContent] = useState("");
  const [sectionName, setSectionName] = useState("Resources");
  const [sponsorCta, setSponsorCta] = useState("Learn More");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setSelectedType(null);
    setTitle("");
    setDescription("");
    setUrl("");
    setContent("");
    setSectionName("Resources");
    setSponsorCta("Learn More");
    setImageUrl("");
    setOpen(false);
  };

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

  const handleAdd = async () => {
    if (!selectedType) return;

    if (selectedType === "file") {
      const file = fileInputRef.current?.files?.[0];
      if (!file) {
        toast.error("Please select a file to upload");
        return;
      }
      setUploading(true);
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "file";
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
      const path = `${authUserId}/${fanfletId}/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("resources")
        .upload(path, file, { upsert: true });

      if (uploadError) {
        toast.error(uploadError.message || "Upload failed");
        setUploading(false);
        return;
      }

      const { data } = supabase.storage.from("resources").getPublicUrl(path);
      const filePath = data.publicUrl;

      setUploading(false);
      setSubmitting(true);

      const result = await addResourceBlock(fanfletId, {
        type: "file",
        title: title || file.name,
        description: description || undefined,
        file_path: filePath,
        section_name: sectionName || undefined,
      });

      setSubmitting(false);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Resource added");
      reset();
      router.refresh();
      onAdded();
      return;
    }

    setSubmitting(true);

    const payload: Parameters<typeof addResourceBlock>[1] = {
      type: selectedType,
      title: title || undefined,
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
      payload.metadata = {
        cta_text: sponsorCta || "Learn More",
      };
    }

    const result = await addResourceBlock(fanfletId, payload);
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Resource added");
    reset();
    router.refresh();
    onAdded();
  };

  if (!open) {
    return (
      <Button
        variant="outline"
        className="border-dashed border-2 border-slate-200 hover:border-[#3BA5D9] hover:bg-[#3BA5D9]/5 gap-2 w-full"
        onClick={() => setOpen(true)}
      >
        <Plus className="w-4 h-4" />
        Add Resource
      </Button>
    );
  }

  if (!selectedType) {
    return (
      <div className="rounded-lg border-2 border-dashed border-slate-200 p-6 bg-slate-50/50">
        <p className="text-sm font-medium text-slate-700 mb-3">Choose block type</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {blockTypes.map(({ type, label, icon: Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setSelectedType(type);
                if (type === "sponsor") setSectionName("Featured Partners");
              }}
              className="flex flex-col items-center gap-2 p-4 rounded-lg border border-slate-200 hover:border-[#3BA5D9] hover:bg-white transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-[#1B365D]/10 flex items-center justify-center text-[#1B365D]">
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-4"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    );
  }

  const showUrl = selectedType === "link" || selectedType === "sponsor";
  const showContent = selectedType === "text";
  const showFile = selectedType === "file";

  return (
    <div className="rounded-lg border-2 border-[#3BA5D9]/30 p-6 bg-slate-50/50 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-700">
          Add {blockTypes.find((b) => b.type === selectedType)?.label}
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setSelectedType(null)}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label>
          {selectedType === "sponsor" ? "Sponsor Name" : "Title"}
        </Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={
            selectedType === "sponsor"
              ? "Acme Health"
              : "Presentation Slides"
          }
          className="border-[#e2e8f0]"
        />
      </div>

      {showUrl && (
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

      {(selectedType === "link" || selectedType === "sponsor") && (
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

      {selectedType === "sponsor" && (
        <div className="space-y-2">
          <Label>CTA Text</Label>
          <Input
            value={sponsorCta}
            onChange={(e) => setSponsorCta(e.target.value)}
            placeholder="Learn More"
            className="border-[#e2e8f0]"
          />
        </div>
      )}

      {(selectedType === "link" || selectedType === "sponsor") && (
        <div className="space-y-2">
          <Label>
            {selectedType === "sponsor" ? "Logo Image" : "Thumbnail Image"}{" "}
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

      {showContent && (
        <div className="space-y-2">
          <Label>Content</Label>
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Your text content..."
            rows={4}
            className="border-[#e2e8f0]"
          />
        </div>
      )}

      {showFile && (
        <div className="space-y-2">
          <Label>File</Label>
          <Input
            ref={fileInputRef}
            type="file"
            className="border-[#e2e8f0]"
          />
        </div>
      )}

      {(selectedType === "file" || selectedType === "link") && (
        <div className="space-y-2">
          <Label>Description (optional)</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. PDF • 4.2 MB"
            className="border-[#e2e8f0]"
          />
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
          onClick={handleAdd}
          disabled={submitting || uploading}
          className="bg-[#1B365D] hover:bg-[#152b4d]"
        >
          {(submitting || uploading) ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            "Add Block"
          )}
        </Button>
        <Button variant="outline" onClick={reset}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
