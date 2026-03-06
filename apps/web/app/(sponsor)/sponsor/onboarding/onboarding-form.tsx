"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Building2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { createSponsorProfile } from "./actions";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml"];
const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2 MB

interface SponsorOnboardingFormProps {
  authUserId: string;
}

export function SponsorOnboardingForm({ authUserId }: SponsorOnboardingFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("Please select a JPEG, PNG, WebP, GIF, or SVG image.");
      return;
    }
    if (file.size > MAX_LOGO_SIZE) {
      setError("Logo must be under 2 MB.");
      return;
    }

    setError(null);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function handleRemoveLogo() {
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);

      if (logoFile) {
        const supabase = createClient();
        const ext = logoFile.name.split(".").pop() || "png";
        const path = `${authUserId}/sponsor-logo-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, logoFile, { upsert: true });

        if (uploadError) {
          setError(uploadError.message || "Logo upload failed.");
          setIsLoading(false);
          return;
        }

        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        formData.set("logo_url", data.publicUrl);
      }

      const result = await createSponsorProfile(formData);
      if (result?.error) setError(result.error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div
          className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {error}
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="company_name">Company name</Label>
        <Input
          id="company_name"
          name="company_name"
          type="text"
          placeholder="Acme Inc."
          required
          disabled={isLoading}
          className="border-[#e2e8f0] focus-visible:ring-[#3BA5D9]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="slug">URL slug</Label>
        <Input
          id="slug"
          name="slug"
          type="text"
          placeholder="acme-inc"
          disabled={isLoading}
          className="border-[#e2e8f0] focus-visible:ring-[#3BA5D9] font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Optional. Leave blank to auto-generate from company name. Used for shareable links.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="contact_email">Contact email</Label>
        <Input
          id="contact_email"
          name="contact_email"
          type="email"
          placeholder="partnerships@company.com"
          required
          disabled={isLoading}
          className="border-[#e2e8f0] focus-visible:ring-[#3BA5D9]"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="industry">Industry</Label>
        <Input
          id="industry"
          name="industry"
          type="text"
          placeholder="e.g. Dental supplies"
          disabled={isLoading}
          className="border-[#e2e8f0] focus-visible:ring-[#3BA5D9]"
        />
      </div>
      <div className="space-y-2">
        <Label>Company logo</Label>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg border border-[#e2e8f0] bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
            {logoPreview ? (
              <Image
                src={logoPreview}
                alt="Logo preview"
                width={64}
                height={64}
                className="w-full h-full object-contain"
              />
            ) : (
              <Building2 className="w-6 h-6 text-slate-300" />
            )}
          </div>
          <div className="flex-1 space-y-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
              className="hidden"
              onChange={handleLogoSelect}
              disabled={isLoading}
            />
            {logoFile ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-700 truncate max-w-[160px]">
                  {logoFile.name}
                </span>
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="text-slate-400 hover:text-destructive transition-colors"
                  aria-label="Remove logo"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="border-[#e2e8f0]"
              >
                <Upload className="w-4 h-4 mr-1.5" />
                Upload logo
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Optional. JPEG, PNG, WebP, GIF, or SVG up to 2 MB.
            </p>
          </div>
        </div>
      </div>
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-[#1B365D] hover:bg-[#1B365D]/90"
      >
        {isLoading ? "Saving..." : "Continue to dashboard"}
      </Button>
    </form>
  );
}
