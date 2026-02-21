import { createServiceClient } from "@fanflet/db/service";
import Link from "next/link";
import { ArrowLeft, PlusIcon } from "lucide-react";
import { submitPlanCreateForm } from "../../actions";
import { LimitField } from "../../limit-field";

export default async function NewPlanPage() {
  const supabase = createServiceClient();

  const flagsResult = await supabase
    .from("feature_flags")
    .select("id, key, display_name")
    .order("display_name");

  const flags = flagsResult.data ?? [];

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <Link
          href="/features?tab=plans"
          className="inline-flex items-center gap-1 text-sm text-fg-secondary hover:text-fg transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Plans
        </Link>
        <h1 className="text-2xl font-semibold text-fg tracking-tight flex items-center gap-2">
          <PlusIcon className="w-6 h-6 text-primary-soft" />
          New plan
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Add a plan with display name, limits, and feature assignments
        </p>
      </div>

      <form
        action={submitPlanCreateForm}
        className="space-y-6 bg-surface rounded-lg border border-border-subtle p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label
              htmlFor="name"
              className="block text-[13px] font-medium text-fg mb-1"
            >
              Plan key
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. starter, pro_annual"
              className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 text-[14px] text-fg placeholder:text-fg-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="text-[11px] text-fg-muted mt-1">
              Unique identifier (lowercase, letters, numbers, underscores)
            </p>
          </div>
          <div className="sm:col-span-2">
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
              required
              placeholder="e.g. Starter, Pro Annual"
              className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 text-[14px] text-fg placeholder:text-fg-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="sm:col-span-2">
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
              placeholder="Optional"
              className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 text-[14px] text-fg placeholder:text-fg-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <LimitField
            name="max_fanflets"
            label="Max fanflets"
            description="Number of fanflets a speaker can create on this plan"
            defaultValue={5}
          />
          <LimitField
            name="max_resources_per_fanflet"
            label="Max resources per fanflet"
            description="Max links/files per fanflet on this plan"
            defaultValue={20}
          />
        </div>

        <div>
          <p className="text-[13px] font-medium text-fg mb-3">
            Features included in this plan
          </p>
          <div className="space-y-2 max-h-[320px] overflow-y-auto rounded-md border border-border-subtle p-3 bg-surface-elevated">
            {flags.map((flag) => (
              <label
                key={flag.id}
                className="flex items-center gap-2 cursor-pointer text-[13px]"
              >
                <input
                  type="checkbox"
                  name="feature_flag_id"
                  value={flag.id}
                  className="rounded border-border-subtle text-primary focus:ring-primary"
                />
                <span className="text-fg">{flag.display_name}</span>
                <span className="text-fg-muted text-[11px]">({flag.key})</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-[13px] font-medium text-primary-fg hover:bg-primary-hover transition-colors"
          >
            Create plan
          </button>
          <Link
            href="/features?tab=plans"
            className="rounded-md border border-border-subtle px-4 py-2 text-[13px] font-medium text-fg hover:bg-surface-elevated transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
