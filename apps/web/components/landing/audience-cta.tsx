"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Check, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

type CTAState = "loading" | "signedOut" | "signedInNotSaved" | "signedInSaved";

interface AudienceCTAProps {
  fanfletId: string;
  speakerSlug: string;
  fanfletSlug: string;
  speakerName: string;
}

export function AudienceCTA({
  fanfletId,
  speakerSlug,
  fanfletSlug,
  speakerName,
}: AudienceCTAProps) {
  const [state, setState] = useState<CTAState>("loading");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setState("signedOut");
        return;
      }
      try {
        const { data } = await supabase
          .from("audience_saved_fanflets")
          .select("id")
          .eq("fanflet_id", fanfletId)
          .maybeSingle();
        setState(data ? "signedInSaved" : "signedInNotSaved");
      } catch {
        setState("signedInNotSaved");
      }
    })();
  }, [fanfletId]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/audience/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fanfletId }),
      });
      if (res.ok) {
        setState("signedInSaved");
      }
    } finally {
      setSaving(false);
    }
  }

  const currentPath = `/${speakerSlug}/${fanfletSlug}`;
  const signupUrl = `/signup?role=audience&ref=${encodeURIComponent(fanfletId)}&next=${encodeURIComponent(currentPath)}`;
  const loginUrl = `/login?next=${encodeURIComponent(currentPath)}`;

  if (state === "loading") {
    return (
      <Card className="border-slate-200/80 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
        <div className="p-6 text-center space-y-3">
          <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
          </div>
          <div>
            <div className="h-4 w-32 bg-slate-100 rounded mx-auto animate-pulse" />
            <div className="h-3 w-48 bg-slate-50 rounded mx-auto mt-2 animate-pulse" />
          </div>
        </div>
      </Card>
    );
  }

  if (state === "signedInSaved") {
    return (
      <Card className="border-slate-200/80 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
        <div className="p-6 text-center space-y-3">
          <div className="mx-auto w-10 h-10 rounded-full bg-[var(--theme-accent)]/10 flex items-center justify-center">
            <Check className="w-5 h-5 text-[var(--theme-accent)]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Saved to your portfolio
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              View all your saved fanflets in one place.
            </p>
          </div>
          <Link
            href="/my"
            className="inline-flex items-center justify-center w-full max-w-xs rounded-lg bg-[var(--theme-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
          >
            View your portfolio
          </Link>
        </div>
      </Card>
    );
  }

  if (state === "signedInNotSaved") {
    return (
      <Card className="border-slate-200/80 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
        <div className="p-6 text-center space-y-3">
          <div className="mx-auto w-10 h-10 rounded-full bg-[var(--theme-accent)]/10 flex items-center justify-center">
            <Bookmark className="w-5 h-5 text-[var(--theme-accent)]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Save this to your portfolio
            </h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Add {speakerName}&apos;s resources to your Fanflet portfolio.
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full max-w-xs rounded-lg bg-[var(--theme-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save to portfolio"
            )}
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200/80 bg-gradient-to-b from-slate-50 to-white overflow-hidden">
      <div className="p-6 text-center space-y-3">
        <div className="mx-auto w-10 h-10 rounded-full bg-[var(--theme-accent)]/10 flex items-center justify-center">
          <Bookmark className="w-5 h-5 text-[var(--theme-accent)]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Save this to your portfolio
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            Create a free Fanflet account to save {speakerName}&apos;s resources
            and discover future talks.
          </p>
        </div>
        <Link
          href={signupUrl}
          className="inline-flex items-center justify-center w-full max-w-xs rounded-lg bg-[var(--theme-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
        >
          Create your free account
        </Link>
        <p className="text-xs text-slate-400">
          Sign up with Google or email — takes 10 seconds
        </p>
        <p className="text-sm text-slate-500 pt-1">
          Already have an account?{" "}
          <Link
            href={loginUrl}
            className="font-medium text-[var(--theme-accent)] hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </Card>
  );
}
