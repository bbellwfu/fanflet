"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSponsorProfile } from "./actions";

export function SponsorOnboardingForm() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const formData = new FormData(e.currentTarget);
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
        <Label htmlFor="logo_url">Logo URL</Label>
        <Input
          id="logo_url"
          name="logo_url"
          type="url"
          placeholder="https://..."
          disabled={isLoading}
          className="border-[#e2e8f0] focus-visible:ring-[#3BA5D9]"
        />
        <p className="text-xs text-muted-foreground">Optional. Public URL to your company logo.</p>
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
