"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { requestSponsorConnection } from "./actions";
import { toast } from "sonner";
import { Building, Loader2, Search, X } from "lucide-react";

interface AvailableSponsor {
  id: string;
  company_name: string;
  slug: string;
  logo_url: string | null;
  industry: string | null;
  description: string | null;
}

interface SpeakerProfile {
  name: string;
  bio: string | null;
  photoUrl: string | null;
}

interface ConnectDialogProps {
  sponsor: AvailableSponsor | null;
  speakerProfile: SpeakerProfile;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function defaultMessage(companyName: string): string {
  return `Hi ${companyName}, I'd love to feature your resources in my fanflets and would welcome a partnership.`;
}

function ConnectDialog({
  sponsor,
  speakerProfile,
  open,
  onOpenChange,
  onSuccess,
}: ConnectDialogProps) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && sponsor) {
      setMessage(defaultMessage(sponsor.company_name));
    }
  }, [open, sponsor]);

  if (!sponsor) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sponsor) return;
    setLoading(true);
    const result = await requestSponsorConnection(
      sponsor.id,
      message.trim() || null,
      "id"
    );
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Connection request sent!");
      onOpenChange(false);
      onSuccess();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request connection</DialogTitle>
          <DialogDescription>
            Introduce yourself to {sponsor.company_name}. They’ll see your profile and message.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex shrink-0 items-center justify-center overflow-hidden">
              {sponsor.logo_url ? (
                <img
                  src={sponsor.logo_url}
                  alt=""
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building className="w-5 h-5 text-slate-400" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-slate-900">
                Connecting with {sponsor.company_name}
              </p>
              {sponsor.industry && (
                <p className="text-xs text-slate-500">{sponsor.industry}</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">
              What the sponsor will see
            </p>
            <div className="rounded-lg border border-slate-200 bg-white p-3 flex gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 flex shrink-0 items-center justify-center overflow-hidden">
                {speakerProfile.photoUrl ? (
                  <img
                    src={speakerProfile.photoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold text-slate-500">
                    {(speakerProfile.name || "?").charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm text-slate-900">
                  {speakerProfile.name || "Speaker"}
                </p>
                {speakerProfile.bio && (
                  <p className="text-xs text-slate-600 mt-0.5 line-clamp-3">
                    {speakerProfile.bio}
                  </p>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">
            <label htmlFor="connect-message" className="text-xs font-medium text-slate-600">
              Add a message (optional but recommended)
            </label>
            <Textarea
              id="connect-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={defaultMessage(sponsor.company_name)}
              rows={4}
              disabled={loading}
              className="resize-none"
            />
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Send request
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SponsorDirectoryProps {
  sponsors: AvailableSponsor[];
  speakerProfile: SpeakerProfile;
}

export function SponsorDirectory({ sponsors, speakerProfile }: SponsorDirectoryProps) {
  const [search, setSearch] = useState("");
  const [connectSponsor, setConnectSponsor] = useState<AvailableSponsor | null>(null);
  const [showSlugFallback, setShowSlugFallback] = useState(false);
  const [slug, setSlug] = useState("");
  const [slugMessage, setSlugMessage] = useState("");
  const [slugLoading, setSlugLoading] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return sponsors;
    const q = search.toLowerCase();
    return sponsors.filter(
      (s) =>
        s.company_name.toLowerCase().includes(q) ||
        (s.industry?.toLowerCase().includes(q) ?? false) ||
        s.slug.toLowerCase().includes(q)
    );
  }, [sponsors, search]);

  function handleConnectClick(sponsor: AvailableSponsor) {
    setConnectSponsor(sponsor);
  }

  function handleConnectSuccess() {
    setConnectSponsor(null);
    window.location.reload();
  }

  async function handleSlugSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug.trim()) return;
    setSlugLoading(true);
    const result = await requestSponsorConnection(
      slug.trim(),
      slugMessage.trim() || null,
      "slug"
    );
    setSlugLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Connection request sent!");
      setSlug("");
      setSlugMessage("");
      window.location.reload();
    }
  }

  return (
    <div className="space-y-4">
      <ConnectDialog
        sponsor={connectSponsor}
        speakerProfile={speakerProfile}
        open={connectSponsor !== null}
        onOpenChange={(open) => !open && setConnectSponsor(null)}
        onSuccess={handleConnectSuccess}
      />

      {sponsors.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search sponsors by name, industry, or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {filtered.length > 0 ? (
        <div className="grid gap-3">
          {filtered.map((sponsor) => (
            <div
              key={sponsor.id}
              className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex shrink-0 items-center justify-center overflow-hidden">
                {sponsor.logo_url ? (
                  <img
                    src={sponsor.logo_url}
                    alt=""
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Building className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-900">
                  {sponsor.company_name}
                </p>
                {sponsor.industry && (
                  <p className="text-xs text-muted-foreground">{sponsor.industry}</p>
                )}
                {sponsor.description && (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {sponsor.description}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleConnectClick(sponsor)}
                className="shrink-0"
              >
                Connect
              </Button>
            </div>
          ))}
        </div>
      ) : sponsors.length > 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No sponsors match &ldquo;{search}&rdquo;.
        </p>
      ) : (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No verified sponsors are available to connect with yet.
        </p>
      )}

      <div className="border-t border-slate-200 pt-4 mt-4">
        {!showSlugFallback ? (
          <button
            onClick={() => setShowSlugFallback(true)}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Have a sponsor slug? Connect manually
          </button>
        ) : (
          <form onSubmit={handleSlugSubmit} className="space-y-3">
            <p className="text-sm font-medium text-slate-700">Connect by slug</p>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. acme-dental"
              disabled={slugLoading}
              className="font-mono"
            />
            <Textarea
              value={slugMessage}
              onChange={(e) => setSlugMessage(e.target.value)}
              placeholder="Optional message to the sponsor..."
              rows={2}
              disabled={slugLoading}
            />
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={slugLoading || !slug.trim()}>
                {slugLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Send request
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowSlugFallback(false);
                  setSlug("");
                  setSlugMessage("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
