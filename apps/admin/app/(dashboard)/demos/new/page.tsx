"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2Icon, CheckCircle2Icon, XCircleIcon } from "lucide-react";
import { Button } from "@fanflet/ui/button";
import { Input } from "@fanflet/ui/input";
import { Label } from "@fanflet/ui/label";
import { Textarea } from "@fanflet/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@fanflet/ui/select";
import { createDemoEnvironment, pollDemoStatus } from "../actions";

type ProvisioningState =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { phase: "provisioning"; id: string }
  | { phase: "active"; id: string; speakerSlug: string; fanflets: Array<{ slug: string; title: string }> }
  | { phase: "failed"; id: string; error: string };

export default function NewDemoPage() {
  const router = useRouter();
  const [state, setState] = useState<ProvisioningState>({ phase: "idle" });
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setFormError(null);
    setState({ phase: "submitting" });

    const result = await createDemoEnvironment(formData);

    if (result.error) {
      setFormError(result.error);
      setState({ phase: "idle" });
      return;
    }

    if (result.id) {
      setState({ phase: "provisioning", id: result.id });
    }
  };

  const poll = useCallback(async (id: string) => {
    const result = await pollDemoStatus(id);

    if (result.status === "active" && result.speaker_slug) {
      const manifest = result.seed_manifest as {
        fanflets?: Array<{ slug: string; title: string }>;
      } | undefined;
      setState({
        phase: "active",
        id,
        speakerSlug: result.speaker_slug,
        fanflets: manifest?.fanflets ?? [],
      });
      return true;
    }

    if (result.status === "failed") {
      setState({
        phase: "failed",
        id,
        error: result.error_message ?? "Provisioning failed",
      });
      return true;
    }

    return false;
  }, []);

  useEffect(() => {
    if (state.phase !== "provisioning") return;

    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 30; // ~5 min with backoff, then stop

    const tick = async () => {
      if (cancelled) return;
      attempt++;

      if (attempt > maxAttempts) {
        setState({
          phase: "failed",
          id: state.id,
          error: "Polling timed out. Check the demo detail page for status.",
        });
        return;
      }

      const done = await poll(state.id);
      if (!done && !cancelled) {
        const delay = Math.min(3000 * Math.pow(1.3, attempt - 1), 10000);
        setTimeout(tick, delay);
      }
    };

    const timer = setTimeout(tick, 3000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [state, poll]);

  const siteUrl =
    typeof window !== "undefined"
      ? (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000")
      : "http://localhost:3000";

  if (state.phase === "active") {
    return (
      <div className="space-y-8">
        <div>
          <Link
            href="/demos"
            className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Demos
          </Link>
        </div>

        <div className="bg-success/5 rounded-lg border border-success/20 p-8 text-center space-y-4">
          <CheckCircle2Icon className="w-12 h-12 text-success mx-auto" />
          <h2 className="text-xl font-semibold text-fg">
            Demo Environment Ready
          </h2>
          <p className="text-sm text-fg-secondary max-w-md mx-auto">
            The personalized demo has been created with AI-generated content.
            You can now impersonate the account or share the public fanflet
            URLs.
          </p>

          {state.fanflets.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted">
                Public Fanflet URLs
              </p>
              {state.fanflets.map((f) => {
                const url = `${siteUrl}/${state.speakerSlug}/${f.slug}`;
                return (
                  <div key={f.slug} className="text-sm">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {f.title}
                    </a>
                    <p className="text-[12px] text-fg-muted">{url}</p>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex gap-3 justify-center mt-6">
            <Link href={`/demos/${state.id}`}>
              <Button>View Demo Details</Button>
            </Link>
            <Button
              variant="outline"
              onClick={() => router.push("/demos")}
            >
              Back to List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === "failed") {
    return (
      <div className="space-y-8">
        <div>
          <Link
            href="/demos"
            className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Demos
          </Link>
        </div>

        <div className="bg-error/5 rounded-lg border border-error/20 p-8 text-center space-y-4">
          <XCircleIcon className="w-12 h-12 text-error mx-auto" />
          <h2 className="text-xl font-semibold text-fg">
            Provisioning Failed
          </h2>
          <p className="text-sm text-fg-secondary max-w-md mx-auto">
            {state.error}
          </p>
          <div className="flex gap-3 justify-center mt-6">
            <Button onClick={() => setState({ phase: "idle" })}>
              Try Again
            </Button>
            <Link href={`/demos/${state.id}`}>
              <Button variant="outline">View Details</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isWorking =
    state.phase === "submitting" || state.phase === "provisioning";

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/demos"
          className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Demos
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Create Demo Environment
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Enter minimal info about a prospect. AI will generate personalized
          content for their specialty — talks, resources, sponsors, and more.
        </p>
      </div>

      {state.phase === "provisioning" && (
        <div className="bg-primary/5 rounded-lg border border-primary/20 p-6 flex items-center gap-4">
          <Loader2Icon className="w-6 h-6 text-primary animate-spin" />
          <div>
            <p className="text-sm font-medium text-fg">
              Generating personalized demo...
            </p>
            <p className="text-[13px] text-fg-secondary mt-0.5">
              AI is creating talks, resources, and sponsor content tailored
              to their specialty. This usually takes 15-30 seconds.
            </p>
          </div>
        </div>
      )}

      {formError && (
        <div className="bg-error/10 text-error rounded-lg p-4 text-sm">
          {formError}
        </div>
      )}

      <form action={handleSubmit}>
        <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
          <div className="px-5 py-4 border-b border-border-subtle">
            <h2 className="text-sm font-semibold text-fg">
              Prospect Information
            </h2>
          </div>

          <div className="px-5 py-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="full_name">
                  Full Name <span className="text-error">*</span>
                </Label>
                <Input
                  id="full_name"
                  name="full_name"
                  placeholder="Ryan Walsh, DDS"
                  required
                  disabled={isWorking}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="specialty">
                  Specialty <span className="text-error">*</span>
                </Label>
                <Input
                  id="specialty"
                  name="specialty"
                  placeholder="Endodontics"
                  required
                  disabled={isWorking}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="ryan@example.com"
                  disabled={isWorking}
                />
                <p className="text-[12px] text-fg-muted">
                  Their real email, for conversion matching later
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="credentials">Credentials</Label>
                <Input
                  id="credentials"
                  name="credentials"
                  placeholder="DDS, MS"
                  disabled={isWorking}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="website_url">Website</Label>
                <Input
                  id="website_url"
                  name="website_url"
                  type="url"
                  placeholder="https://..."
                  disabled={isWorking}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="linkedin_url">LinkedIn</Label>
                <Input
                  id="linkedin_url"
                  name="linkedin_url"
                  type="url"
                  placeholder="https://linkedin.com/in/..."
                  disabled={isWorking}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sponsors">Known Sponsors</Label>
              <Input
                id="sponsors"
                name="sponsors"
                placeholder="VOCO, Vista Apex, Brasseler"
                disabled={isWorking}
              />
              <p className="text-[12px] text-fg-muted">
                Comma-separated company names. AI will fill in details and
                add more relevant ones.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes / Context</Label>
              <Textarea
                id="notes"
                name="notes"
                rows={3}
                placeholder="Any context from your conversation — upcoming talks, interests, pain points..."
                disabled={isWorking}
              />
              <p className="text-[12px] text-fg-muted">
                Optional. Helps AI generate more relevant content.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="photo_url">Photo URL</Label>
                <Input
                  id="photo_url"
                  name="photo_url"
                  type="url"
                  placeholder="https://..."
                  disabled={isWorking}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="theme">Theme</Label>
                <Select name="theme" defaultValue="" disabled={isWorking}>
                  <SelectTrigger>
                    <SelectValue placeholder="AI chooses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">AI chooses</SelectItem>
                    <SelectItem value="navy">Navy</SelectItem>
                    <SelectItem value="crimson">Crimson</SelectItem>
                    <SelectItem value="forest">Forest</SelectItem>
                    <SelectItem value="sunset">Sunset</SelectItem>
                    <SelectItem value="royal">Royal</SelectItem>
                    <SelectItem value="slate">Slate</SelectItem>
                    <SelectItem value="midnight">Midnight</SelectItem>
                    <SelectItem value="terracotta">Terracotta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-border-subtle flex justify-end gap-3">
            <Link href="/demos">
              <Button variant="outline" type="button" disabled={isWorking}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={isWorking}>
              {isWorking ? (
                <>
                  <Loader2Icon className="w-4 h-4 animate-spin mr-1.5" />
                  {state.phase === "provisioning"
                    ? "Generating..."
                    : "Creating..."}
                </>
              ) : (
                "Create Demo"
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
