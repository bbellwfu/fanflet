"use client";

import { useState } from "react";
import { toast } from "sonner";
import { updateNotificationPreferences } from "./actions";

interface NotificationPreferences {
  speaker_signup: boolean;
  sponsor_signup: boolean;
  fanflet_created: boolean;
  onboarding_completed: boolean;
}

const LABELS: Record<keyof NotificationPreferences, string> = {
  speaker_signup: "New speaker signup",
  sponsor_signup: "New sponsor signup",
  fanflet_created: "Speaker creates a Fanflet",
  onboarding_completed: "Speaker completes onboarding checklist",
};

interface SettingsNotificationFormProps {
  initial: NotificationPreferences;
}

/** Same toggle control as Features & Plans (feature-toggle.tsx): h-6 w-11, bg-primary | bg-surface-hover, thumb h-4 w-4. */
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
  const [prefs, setPrefs] = useState<NotificationPreferences>(initial);
  const [saving, setSaving] = useState(false);

  const handleToggle = async (key: keyof NotificationPreferences, value: boolean) => {
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

  return (
    <div className="rounded-lg border border-border-subtle bg-surface overflow-hidden max-w-xl">
      <div className="px-5 py-4 border-b border-border-subtle">
        <h2 className="text-sm font-semibold text-fg">Notification preferences</h2>
        <p className="text-[12px] text-fg-muted mt-1">
          Choose which platform events trigger an email to you. Email is sent via Resend when configured.
        </p>
      </div>
      <div className="divide-y divide-border-subtle">
        {(Object.keys(LABELS) as (keyof NotificationPreferences)[]).map((key) => (
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
        <p className="px-5 pb-4 text-xs text-fg-muted">Saving…</p>
      )}
    </div>
  );
}
