"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createSpeakerProfile } from "./actions";

interface BecomeSpeakerFormProps {
  userEmail: string;
}

export function BecomeSpeakerForm({ userEmail }: BecomeSpeakerFormProps) {
  const [state, formAction, pending] = useActionState(createSpeakerProfile, null);

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-md bg-slate-50 p-4 text-sm text-slate-700">
        <p>
          A speaker profile will be created for <strong>{userEmail}</strong>. You
          can customize your name, photo, and bio from the speaker dashboard.
        </p>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600">{state.error}</p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending} className="flex-1">
          {pending ? "Creating..." : "Create Speaker Profile"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
