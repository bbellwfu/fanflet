"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2Icon, XCircleIcon } from "lucide-react";
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
import { createDemoEnvironment } from "../actions";

interface SpecialtyPreset {
  label: string;
  specialty: string;
  credentials: string;
  sponsors: string;
}

const SPECIALTY_PRESETS: SpecialtyPreset[] = [
  {
    label: "General Dentistry",
    specialty: "General Dentistry",
    credentials: "DDS",
    sponsors: "Dentsply Sirona, Henry Schein, Patterson Dental",
  },
  {
    label: "Endodontics",
    specialty: "Endodontics",
    credentials: "DDS, MS",
    sponsors: "VOCO, Brasseler USA, Dentsply Sirona",
  },
  {
    label: "Orthodontics",
    specialty: "Orthodontics",
    credentials: "DMD, MS",
    sponsors: "3M Oral Care, Align Technology, American Orthodontics",
  },
  {
    label: "Periodontics",
    specialty: "Periodontics",
    credentials: "DDS, MS",
    sponsors: "Straumann, Geistlich, BioHorizons",
  },
  {
    label: "Prosthodontics",
    specialty: "Prosthodontics",
    credentials: "DDS, MS",
    sponsors: "Ivoclar, Zirkonzahn, Vita Zahnfabrik",
  },
  {
    label: "Oral Surgery",
    specialty: "Oral & Maxillofacial Surgery",
    credentials: "DDS, MD",
    sponsors: "KLS Martin, Stryker, Zimmer Biomet",
  },
  {
    label: "Pediatric Dentistry",
    specialty: "Pediatric Dentistry",
    credentials: "DDS, MS",
    sponsors: "3M, Hu-Friedy, Sprig Oral Health",
  },
  {
    label: "Dental Hygiene",
    specialty: "Dental Hygiene",
    credentials: "RDH",
    sponsors: "Colgate, Philips Sonicare, TePe",
  },
];

type FormState =
  | { phase: "idle" }
  | { phase: "submitting" }
  | { phase: "failed"; id: string; error: string };

export default function NewDemoPage() {
  const router = useRouter();
  const [state, setState] = useState<FormState>({ phase: "idle" });
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setFormError(null);
    setState({ phase: "submitting" });

    const result = await createDemoEnvironment(formData);

    if (result.error) {
      setFormError(result.error);
      if (result.id) {
        setState({ phase: "failed", id: result.id, error: result.error });
      } else {
        setState({ phase: "idle" });
      }
      return;
    }

    if (result.id) {
      router.push(`/demos/${result.id}`);
    }
  };

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

  const isWorking = state.phase === "submitting";

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

      {isWorking && (
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

      <DemoForm isWorking={isWorking} handleSubmit={handleSubmit} />
    </div>
  );
}

interface DemoFormProps {
  isWorking: boolean;
  handleSubmit: (formData: FormData) => Promise<void>;
}

function DemoForm({ isWorking, handleSubmit }: DemoFormProps) {
  const specialtyRef = useRef<HTMLInputElement>(null);
  const credentialsRef = useRef<HTMLInputElement>(null);
  const sponsorsRef = useRef<HTMLInputElement>(null);

  function applyPreset(index: string) {
    if (index === "") return;
    const preset = SPECIALTY_PRESETS[Number(index)];
    if (!preset) return;
    if (specialtyRef.current) specialtyRef.current.value = preset.specialty;
    if (credentialsRef.current) credentialsRef.current.value = preset.credentials;
    if (sponsorsRef.current) sponsorsRef.current.value = preset.sponsors;
  }

  return (
    <form action={handleSubmit}>
      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <h2 className="text-sm font-semibold text-fg">
            Prospect Information
          </h2>
          <div className="flex items-center gap-2">
            <Label htmlFor="preset" className="text-xs text-fg-muted whitespace-nowrap">
              Quick fill:
            </Label>
            <Select
              defaultValue=""
              disabled={isWorking}
              onValueChange={applyPreset}
            >
              <SelectTrigger id="preset" className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Choose a specialty..." />
              </SelectTrigger>
              <SelectContent>
                {SPECIALTY_PRESETS.map((p, i) => (
                  <SelectItem key={p.label} value={String(i)}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
                required
                disabled={isWorking}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="specialty">
                Specialty <span className="text-error">*</span>
              </Label>
              <Input
                ref={specialtyRef}
                id="specialty"
                name="specialty"
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
                disabled={isWorking}
              />
              <p className="text-[12px] text-fg-muted">
                Their real email, for conversion matching later
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="credentials">Credentials</Label>
              <Input
                ref={credentialsRef}
                id="credentials"
                name="credentials"
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
                disabled={isWorking}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="linkedin_url">LinkedIn</Label>
              <Input
                id="linkedin_url"
                name="linkedin_url"
                type="url"
                disabled={isWorking}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sponsors">Known Sponsors</Label>
            <Input
              ref={sponsorsRef}
              id="sponsors"
              name="sponsors"
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
                Generating...
              </>
            ) : (
              "Create Demo"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
