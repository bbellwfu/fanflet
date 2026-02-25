"use client";

import { PackageIcon } from "lucide-react";
import { submitPlanEditForm } from "./actions";

type Plan = {
  id: string;
  display_name: string;
  description: string | null;
  limits: Record<string, number> | null;
};

type FeatureFlag = {
  id: string;
  key: string;
  display_name: string;
};

interface PlanEditSlideOverProps {
  plan: Plan;
  flags: FeatureFlag[];
  planFlagIds: string[];
  onClose: () => void;
}

export function PlanEditSlideOver({
  plan,
  flags,
  planFlagIds,
  onClose,
}: PlanEditSlideOverProps) {
  const limits = (plan.limits ?? {}) as Record<string, number>;
  const planFlagIdsSet = new Set(planFlagIds);

  return (
    <>
      <div className="px-4 pt-2 pb-4 border-b border-border-subtle">
        <h2 className="text-lg font-semibold text-fg flex items-center gap-2">
          <PackageIcon className="w-5 h-5 text-primary-soft" />
          Edit plan: {plan.display_name}
        </h2>
        <p className="text-sm text-fg-secondary mt-1">
          Update display name, description, limits, and feature assignments
        </p>
      </div>
      <form
        action={submitPlanEditForm.bind(null, plan.id)}
        className="flex flex-col flex-1 min-h-0"
      >
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <label
              htmlFor="display_name"
              className="block text-[13px] font-medium text-fg mb-1"
            >
              Display name
            </label>
            <input
              id="display_name"
              name="display_name"
              type="text"
              defaultValue={plan.display_name}
              className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 text-[14px] text-fg placeholder:text-fg-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div>
            <label
              htmlFor="description"
              className="block text-[13px] font-medium text-fg mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              rows={3}
              defaultValue={plan.description ?? ""}
              className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 text-[14px] text-fg placeholder:text-fg-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="max_fanflets"
                className="block text-[13px] font-medium text-fg mb-1"
              >
                Max fanflets
              </label>
              <p className="text-[11px] text-fg-muted mb-1">
                Number of fanflets a speaker can create on this plan
              </p>
              <input
                id="max_fanflets"
                name="max_fanflets"
                type="number"
                min={-1}
                defaultValue={
                  limits.max_fanflets !== undefined ? limits.max_fanflets : ""
                }
                placeholder="-1 = unlimited"
                className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 text-[14px] text-fg placeholder:text-fg-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label
                htmlFor="max_resources_per_fanflet"
                className="block text-[13px] font-medium text-fg mb-1"
              >
                Max resources per fanflet
              </label>
              <p className="text-[11px] text-fg-muted mb-1">
                Max links/files per fanflet on this plan
              </p>
              <input
                id="max_resources_per_fanflet"
                name="max_resources_per_fanflet"
                type="number"
                min={-1}
                defaultValue={
                  limits.max_resources_per_fanflet !== undefined
                    ? limits.max_resources_per_fanflet
                    : ""
                }
                placeholder="-1 = unlimited"
                className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 text-[14px] text-fg placeholder:text-fg-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <p className="text-[13px] font-medium text-fg mb-3">
              Features included in this plan
            </p>
            <div className="space-y-2 max-h-[280px] overflow-y-auto rounded-md border border-border-subtle p-3 bg-surface-elevated">
              {flags.map((flag) => (
                <label
                  key={flag.id}
                  className="flex items-center gap-2 cursor-pointer text-[13px]"
                >
                  <input
                    type="checkbox"
                    name="feature_flag_id"
                    value={flag.id}
                    defaultChecked={planFlagIdsSet.has(flag.id)}
                    className="rounded border-border-subtle text-primary focus:ring-primary"
                  />
                  <span className="text-fg">{flag.display_name}</span>
                  <span className="text-fg-muted text-[11px]">({flag.key})</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <div className="flex gap-3 p-4 border-t border-border-subtle mt-auto">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-fg hover:bg-primary-hover transition-colors"
          >
            Save changes
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border-subtle px-4 py-2 text-[13px] font-medium text-fg hover:bg-surface-elevated transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </>
  );
}
