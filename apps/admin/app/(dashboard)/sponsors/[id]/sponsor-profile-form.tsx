"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@fanflet/ui/button";
import { Input } from "@fanflet/ui/input";
import { Label } from "@fanflet/ui/label";
import { Textarea } from "@fanflet/ui/textarea";
import { updateSponsorProfile } from "./actions";
import { toast } from "sonner";
import { Pencil, Loader2, MailIcon, GlobeIcon } from "lucide-react";

interface SponsorProfileData {
  company_name: string;
  slug: string;
  contact_email: string;
  industry: string | null;
  website_url: string | null;
  description: string | null;
  logo_url: string | null;
  speaker_label: string;
}

interface SponsorProfileFormProps {
  sponsorId: string;
  initialData: SponsorProfileData;
  joinedDate: string;
}

export function SponsorProfileForm({
  sponsorId,
  initialData,
  joinedDate,
}: SponsorProfileFormProps) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [companyName, setCompanyName] = useState(initialData.company_name);
  const [slug, setSlug] = useState(initialData.slug);
  const [contactEmail, setContactEmail] = useState(initialData.contact_email);
  const [industry, setIndustry] = useState(initialData.industry ?? "");
  const [websiteUrl, setWebsiteUrl] = useState(initialData.website_url ?? "");
  const [description, setDescription] = useState(initialData.description ?? "");
  const [logoUrl, setLogoUrl] = useState(initialData.logo_url ?? "");
  const [speakerLabel, setSpeakerLabel] = useState(initialData.speaker_label);

  function handleCancel() {
    setCompanyName(initialData.company_name);
    setSlug(initialData.slug);
    setContactEmail(initialData.contact_email);
    setIndustry(initialData.industry ?? "");
    setWebsiteUrl(initialData.website_url ?? "");
    setDescription(initialData.description ?? "");
    setLogoUrl(initialData.logo_url ?? "");
    setSpeakerLabel(initialData.speaker_label);
    setEditing(false);
  }

  async function handleSave() {
    if (!companyName.trim()) {
      toast.error("Company name is required.");
      return;
    }
    if (!slug.trim() || !/^[a-z0-9-]+$/.test(slug)) {
      toast.error("Slug must be lowercase letters, numbers, and hyphens only.");
      return;
    }
    if (!contactEmail.trim()) {
      toast.error("Contact email is required.");
      return;
    }

    setSaving(true);
    const result = await updateSponsorProfile(sponsorId, {
      company_name: companyName.trim(),
      slug: slug.trim(),
      contact_email: contactEmail.trim(),
      industry: industry.trim() || null,
      website_url: websiteUrl.trim() || null,
      description: description.trim() || null,
      logo_url: logoUrl.trim() || null,
      speaker_label: speakerLabel.trim() || "speaker",
    });
    setSaving(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success("Profile updated.");
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
          >
            <Pencil className="w-3.5 h-3.5 mr-1.5" />
            Edit
          </Button>
        </div>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[13px]">
          <div>
            <dt className="text-fg-muted mb-0.5">Company Name</dt>
            <dd className="font-medium text-fg">{initialData.company_name}</dd>
          </div>
          <div>
            <dt className="text-fg-muted mb-0.5">Contact Email</dt>
            <dd className="font-medium text-fg flex items-center gap-1.5">
              <MailIcon className="w-3.5 h-3.5 text-fg-muted" />
              {initialData.contact_email}
            </dd>
          </div>
          <div>
            <dt className="text-fg-muted mb-0.5">Slug</dt>
            <dd className="font-mono text-fg">{initialData.slug}</dd>
          </div>
          <div>
            <dt className="text-fg-muted mb-0.5">Industry</dt>
            <dd className="text-fg">{initialData.industry ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-fg-muted mb-0.5">Speaker Label</dt>
            <dd className="text-fg capitalize">{initialData.speaker_label}</dd>
          </div>
          <div>
            <dt className="text-fg-muted mb-0.5">Website</dt>
            <dd className="text-fg">
              {initialData.website_url ? (
                <a
                  href={initialData.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-soft hover:text-primary flex items-center gap-1"
                >
                  <GlobeIcon className="w-3.5 h-3.5" />
                  {initialData.website_url}
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt className="text-fg-muted mb-0.5">Joined</dt>
            <dd className="text-fg">{joinedDate}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-fg-muted mb-0.5">Description</dt>
            <dd className="text-fg">{initialData.description ?? "—"}</dd>
          </div>
        </dl>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit-company-name" className="text-[12px] font-medium text-fg-muted">
            Company Name
          </Label>
          <Input
            id="edit-company-name"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-contact-email" className="text-[12px] font-medium text-fg-muted">
            Contact Email
          </Label>
          <Input
            id="edit-contact-email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-slug" className="text-[12px] font-medium text-fg-muted">
            Slug
          </Label>
          <Input
            id="edit-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            disabled={saving}
            className="font-mono"
          />
          <p className="text-[11px] text-fg-muted">Lowercase letters, numbers, and hyphens only.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-industry" className="text-[12px] font-medium text-fg-muted">
            Industry
          </Label>
          <Input
            id="edit-industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-speaker-label" className="text-[12px] font-medium text-fg-muted">
            Speaker Label
          </Label>
          <Input
            id="edit-speaker-label"
            value={speakerLabel}
            onChange={(e) => setSpeakerLabel(e.target.value)}
            disabled={saving}
            placeholder="speaker"
          />
          <p className="text-[11px] text-fg-muted">How this sponsor refers to speakers (e.g. &quot;speaker&quot;, &quot;KOL&quot;, &quot;presenter&quot;).</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-website" className="text-[12px] font-medium text-fg-muted">
            Website
          </Label>
          <Input
            id="edit-website"
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            placeholder="https://..."
            disabled={saving}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="edit-logo" className="text-[12px] font-medium text-fg-muted">
            Logo URL
          </Label>
          <Input
            id="edit-logo"
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
            disabled={saving}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="edit-description" className="text-[12px] font-medium text-fg-muted">
          Description
        </Label>
        <Textarea
          id="edit-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          disabled={saving}
        />
      </div>
      <div className="text-[13px] text-fg-muted">
        Joined: {joinedDate}
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save changes"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
