"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createFanflet } from "./actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

interface NewFanfletFormProps {
  speakerSlug: string | null;
}

export function NewFanfletForm({ speakerSlug }: NewFanfletFormProps) {
  const [title, setTitle] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!slugManuallyEdited && title) {
      const generated = slugify(title);
      if (generated) {
        queueMicrotask(() => setSlug(generated));
      }
    }
  }, [title, slugManuallyEdited]);

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setSlug(
      value
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "")
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Talk title is required.");
      return;
    }
    if (!eventName.trim()) {
      toast.error("Event name is required.");
      return;
    }
    if (!slug.trim()) {
      toast.error("URL slug is required.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("event_name", eventName.trim());
    formData.set("event_date", eventDate || "");
    formData.set("slug", slug.trim());

    const result = await createFanflet(formData);

    if (result?.error) {
      toast.error(result.error);
      setSubmitting(false);
      return;
    }
    toast.success("Fanflet created!");
  };

  return (
    <Card className="border-[#e2e8f0]">
      <CardHeader>
        <CardTitle className="text-[#1B365D]">Fanflet Details</CardTitle>
        <CardDescription>
          Enter the basic information for your Fanflet page.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-[#1B365D]">
              Talk Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="The Future of Patient-Centric Design"
              required
              className="border-[#e2e8f0] focus:border-[#3BA5D9] focus:ring-[#3BA5D9]/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_name" className="text-[#1B365D]">
              Event Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="event_name"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="HealthTech Summit 2026"
              required
              className="border-[#e2e8f0] focus:border-[#3BA5D9] focus:ring-[#3BA5D9]/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event_date" className="text-[#1B365D]">
              Event Date
            </Label>
            <Input
              id="event_date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="border-[#e2e8f0] focus:border-[#3BA5D9] focus:ring-[#3BA5D9]/30 max-w-[200px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug" className="text-[#1B365D]">
              URL Slug
            </Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap shrink-0">
                fanflet.com/
              </span>
              <span className="text-sm text-muted-foreground">
                {speakerSlug ? `${speakerSlug}/` : "[your-slug]/"}
              </span>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="future-of-patient-design"
                className="border-[#e2e8f0] focus:border-[#3BA5D9] focus:ring-[#3BA5D9]/30 font-mono flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Auto-generated from title. Lowercase, hyphens only.
            </p>
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="bg-[#1B365D] hover:bg-[#152b4d]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Fanflet"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
