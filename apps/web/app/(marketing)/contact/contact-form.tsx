"use client";

import { useActionState } from "react";
import { submitContactForm, type ContactFormState } from "./actions";
import { Button } from "@fanflet/ui/button";
import { Input } from "@fanflet/ui/input";
import { Textarea } from "@fanflet/ui/textarea";
import { Label } from "@fanflet/ui/label";
import { CheckCircle2 } from "lucide-react";

const SUBJECT_OPTIONS = [
  "",
  "General Inquiry",
  "Speaker Questions",
  "Sponsor Questions",
  "Technical Support",
  "Partnership",
] as const;

const initialState: ContactFormState = { success: false };

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(submitContactForm, initialState);

  if (state.success) {
    return (
      <div className="text-center py-12 px-6 bg-emerald-50 rounded-2xl border border-emerald-100">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-900 mb-2">
          Thanks for reaching out!
        </h2>
        <p className="text-slate-600">
          We&apos;ll get back to you within one business day.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      {state.error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-lg text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          required
          placeholder="Your name"
          autoComplete="name"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          autoComplete="email"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject (optional)</Label>
        <select
          id="subject"
          name="subject"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {SUBJECT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt || "Select a subject..."}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Message</Label>
        <Textarea
          id="message"
          name="message"
          required
          placeholder="How can we help?"
          rows={5}
        />
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? "Sending..." : "Send Message"}
      </Button>
    </form>
  );
}
