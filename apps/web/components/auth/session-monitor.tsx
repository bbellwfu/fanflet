"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const WARNING_BEFORE_MS = 10 * 60 * 1000; // Show warning 10 minutes before timeout
const INACTIVITY_TIMEOUT_MS = 8 * 60 * 60 * 1000; // Must match Supabase config (8 hours)

export function SessionMonitor() {
  const [showWarning, setShowWarning] = useState(false);
  const [extending, setExtending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabaseRef = useRef(createClient());

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowWarning(false);

    timerRef.current = setTimeout(() => {
      setShowWarning(true);
    }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS);
  }, []);

  useEffect(() => {
    const supabase = supabaseRef.current;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "TOKEN_REFRESHED" || event === "SIGNED_IN") {
          resetTimer();
        }
        if (event === "SIGNED_OUT") {
          if (timerRef.current) clearTimeout(timerRef.current);
          setShowWarning(false);
        }
      }
    );

    resetTimer();

    return () => {
      subscription.unsubscribe();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [resetTimer]);

  async function handleExtend() {
    setExtending(true);
    try {
      const { data: { user } } = await supabaseRef.current.auth.getUser();
      if (user) {
        setShowWarning(false);
        resetTimer();
      } else {
        window.location.href = "/login?reason=session_expired";
      }
    } catch {
      window.location.href = "/login?reason=session_expired";
    } finally {
      setExtending(false);
    }
  }

  return (
    <Dialog open={showWarning} onOpenChange={setShowWarning}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Session expiring soon</DialogTitle>
          <DialogDescription>
            Your session will expire soon due to inactivity. Would you like to
            continue working?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowWarning(false)}>
            Dismiss
          </Button>
          <Button onClick={handleExtend} disabled={extending}>
            {extending ? "Extending..." : "Continue session"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
