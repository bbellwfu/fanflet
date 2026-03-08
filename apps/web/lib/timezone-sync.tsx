"use client";

import { useEffect, useRef } from "react";
import { getBrowserTimezone, isValidTimezone } from "@fanflet/db/timezone";
import { syncTimezone } from "@/app/dashboard/settings/actions";

interface TimezoneSyncProps {
  currentTimezone: string | null;
}

/**
 * Auto-detects the browser timezone and writes it to the user's profile
 * if they don't have one stored yet. Runs once on mount, silently.
 */
export function TimezoneSync({ currentTimezone }: TimezoneSyncProps) {
  const didSync = useRef(false);

  useEffect(() => {
    if (didSync.current || currentTimezone) return;
    didSync.current = true;

    const detected = getBrowserTimezone();
    if (detected && isValidTimezone(detected)) {
      syncTimezone(detected).catch(() => {
        /* silent — best-effort backfill */
      });
    }
  }, [currentTimezone]);

  return null;
}
