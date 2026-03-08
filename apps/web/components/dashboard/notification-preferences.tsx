"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { updatePlatformNotificationPreference } from "@/app/dashboard/settings/notification-actions";
import { toast } from "sonner";

interface NotificationPreferencesProps {
  initialOptedIn: boolean;
}

export function NotificationPreferences({
  initialOptedIn,
}: NotificationPreferencesProps) {
  const [optedIn, setOptedIn] = useState(initialOptedIn);
  const [isPending, startTransition] = useTransition();

  function handleToggle(checked: boolean) {
    const prev = optedIn;
    setOptedIn(checked);
    startTransition(async () => {
      const result = await updatePlatformNotificationPreference(checked);
      if (result.error) {
        toast.error(result.error);
        setOptedIn(prev);
      } else {
        toast.success(
          checked
            ? "You'll receive platform announcements"
            : "Platform announcements turned off"
        );
      }
    });
  }

  return (
    <Card id="notifications" className="border-[#e2e8f0]">
      <CardHeader>
        <CardTitle className="text-[#1B365D]">
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose which platform emails you receive.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={optedIn}
            onChange={(e) => handleToggle(e.target.checked)}
            disabled={isPending}
            className="h-4 w-4 rounded border-slate-300 text-[#1B365D] focus:ring-[#3BA5D9]"
          />
          <div>
            <span className="text-sm text-[#1B365D] font-medium">
              Platform announcements
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Receive release notes, product updates, and feature highlights
              from Fanflet.
            </p>
          </div>
        </label>
      </CardContent>
    </Card>
  );
}
