"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestSponsorConnection } from "./actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export function SponsorConnectionsRequest() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug.trim()) return;
    setLoading(true);
    try {
      const result = await requestSponsorConnection(slug.trim(), message.trim() || null);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Connection request sent.");
        setSlug("");
        setMessage("");
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="sponsor-slug">Sponsor slug</Label>
        <Input
          id="sponsor-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="e.g. acme-dental"
          disabled={loading}
          className="font-mono"
        />
        <p className="text-xs text-muted-foreground">
          The sponsor can find this in their Fanflet sponsor profile (URL slug).
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="message">Message (optional)</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="e.g. I'd like to feature your resources on my conference fanflet."
          rows={2}
          disabled={loading}
        />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Send request
      </Button>
    </form>
  );
}
