"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateNotificationPreferences, updateAdminTimezone, sendTestNotification } from "./actions";
import { TimezonePicker } from "@fanflet/ui/timezone-picker";
import { TIMEZONE_OPTIONS, getBrowserTimezone } from "@fanflet/db/timezone";

interface NotificationToggles {
  speaker_signup: boolean;
  sponsor_signup: boolean;
  fanflet_created: boolean;
  onboarding_completed: boolean;
  sponsor_inquiry: boolean;
}

interface AdminPreferences extends NotificationToggles {
  timezone: string | null;
}

const LABELS: Record<keyof NotificationToggles, string> = {
  speaker_signup: "New speaker signup",
  sponsor_signup: "New sponsor signup",
  fanflet_created: "Speaker creates a Fanflet",
  onboarding_completed: "Speaker completes onboarding checklist",
  sponsor_inquiry: "Sponsor inquiry from pricing page",
};

interface SettingsNotificationFormProps {
  initial: AdminPreferences;
}

function NotificationToggle({
  checked,
  disabled,
  onChange,
  id,
  ariaLabel,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
  id: string;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full shrink-0
        transition-colors duration-200 ease-in-out
        focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-page
        disabled:cursor-not-allowed disabled:opacity-50
        ${checked ? "bg-primary" : "bg-surface-hover"}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 rounded-full bg-white shadow-sm
          transition-transform duration-200 ease-in-out
          ${checked ? "translate-x-6" : "translate-x-1"}
        `}
      />
    </button>
  );
}

export function SettingsNotificationForm({ initial }: SettingsNotificationFormProps) {
  const [prefs, setPrefs] = useState<NotificationToggles>({
    speaker_signup: initial.speaker_signup,
    sponsor_signup: initial.sponsor_signup,
    fanflet_created: initial.fanflet_created,
    onboarding_completed: initial.onboarding_completed,
    sponsor_inquiry: initial.sponsor_inquiry ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [timezone, setTimezone] = useState(initial.timezone ?? getBrowserTimezone());
  const [savingTimezone, setSavingTimezone] = useState(false);

  const handleToggle = async (key: keyof NotificationToggles, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    const result = await updateNotificationPreferences(next);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      setPrefs(prefs);
    } else {
      toast.success("Preferences saved");
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    const result = await sendTestNotification();
    setSendingTest(false);
    if (result.error) {
      toast.error(result.error);
    } else if (result.success) {
      toast.success(result.success);
    }
  };

  const handleTimezoneChange = async (value: string) => {
    setTimezone(value);
    setSavingTimezone(true);
    const result = await updateAdminTimezone(value);
    setSavingTimezone(false);
    if (result.error) {
      toast.error(result.error);
      setTimezone(timezone);
    } else {
      toast.success("Timezone saved");
    }
  };

  return (
    <div className="space-y-6 max-w-xl">
      <div className="rounded-lg border border-border-subtle bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-fg">Timezone</h2>
          <p className="text-[12px] text-fg-muted mt-1">
            Dates and times across the admin dashboard are displayed in this timezone.
          </p>
        </div>
        <div className="px-5 py-4">
          <TimezonePicker
            value={timezone}
            onValueChange={handleTimezoneChange}
            options={TIMEZONE_OPTIONS}
            disabled={savingTimezone}
            className="w-full max-w-sm"
          />
          {savingTimezone && (
            <p className="text-xs text-fg-muted mt-2">Saving...</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-fg">Notification preferences</h2>
          <p className="text-[12px] text-fg-muted mt-1">
            Choose which platform events trigger an email to you. Email is sent via Resend when configured.
          </p>
        </div>
        <div className="divide-y divide-border-subtle">
          {(Object.keys(LABELS) as (keyof NotificationToggles)[]).map((key) => (
            <div
              key={key}
              className="px-5 py-4 flex items-center justify-between"
            >
              <label
                htmlFor={key}
                className="min-w-0 flex-1 mr-6 text-[13px] font-semibold text-fg cursor-pointer"
              >
                {LABELS[key]}
              </label>
              <NotificationToggle
                id={key}
                checked={prefs[key]}
                disabled={saving}
                onChange={() => handleToggle(key, !prefs[key])}
                ariaLabel={`${LABELS[key]}: ${prefs[key] ? "on" : "off"}`}
              />
            </div>
          ))}
        </div>
        {saving && (
          <p className="px-5 pb-4 text-xs text-fg-muted">Saving...</p>
        )}
      </div>

      <div className="rounded-lg border border-border-subtle bg-surface overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h2 className="text-sm font-semibold text-fg">Test delivery</h2>
          <p className="text-[12px] text-fg-muted mt-1">
            Send a test email to verify notifications are working end-to-end.
          </p>
        </div>
        <div className="px-5 py-4">
          <button
            type="button"
            onClick={handleSendTest}
            disabled={sendingTest}
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg bg-primary text-primary-fg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendingTest ? "Sending..." : "Send test email"}
          </button>
        </div>
      </div>
    </div>
  );
}
