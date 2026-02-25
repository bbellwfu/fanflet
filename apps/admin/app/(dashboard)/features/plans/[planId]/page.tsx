import { createServiceClient } from "@fanflet/db/service";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PackageIcon } from "lucide-react";
import { submitPlanEditForm, refreshPlanEntitlements } from "../../actions";
import { LimitField } from "../../limit-field";
import { RefreshEntitlementsButton } from "../../refresh-entitlements-button";

interface PlanEditPageProps {
  params: Promise<{ planId: string }>;
}

export default async function PlanEditPage({ params }: PlanEditPageProps) {
  const { planId } = await params;
  const supabase = createServiceClient();

  const [planResult, flagsResult, planFeaturesResult, subscriberCountResult] =
    await Promise.all([
      supabase.from("plans").select("*").eq("id", planId).single(),
      supabase
        .from("feature_flags")
        .select("id, key, display_name")
        .order("display_name"),
      supabase
        .from("plan_features")
        .select("feature_flag_id")
        .eq("plan_id", planId),
      supabase
        .from("speaker_subscriptions")
        .select("id", { count: "exact", head: true })
        .eq("plan_id", planId)
        .eq("status", "active"),
    ]);

  const plan = planResult.data;
  const flags = flagsResult.data ?? [];
  const planFeatures = planFeaturesResult.data ?? [];
  const subscriberCount = subscriberCountResult.count ?? 0;

  if (!plan || planResult.error) {
    notFound();
  }

  const limits = (plan.limits ?? {}) as Record<string, number>;
  const planFlagIds = new Set(planFeatures.map((pf) => pf.feature_flag_id));

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
          <PackageIcon className="w-6 h-6 text-primary-soft" />
          Edit plan: {plan.display_name}
        </h1>
        <p className="text-sm text-fg-secondary mt-1">
          Update display name, description, limits, and feature assignments
        </p>
      </div>

      <form
        action={submitPlanEditForm.bind(null, planId)}
        className="space-y-6 bg-surface rounded-lg border border-border-subtle p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
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
              defaultValue={plan.display_name}
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
              defaultValue={plan.description ?? ""}
              className="w-full rounded-md border border-border-subtle bg-surface-elevated px-3 py-2 text-[14px] text-fg placeholder:text-fg-muted focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="sm:col-span-2 grid gap-4 sm:grid-cols-2">
            <label className="flex items-start gap-3 rounded-lg border border-border-subtle p-4 cursor-pointer hover:bg-surface-elevated transition-colors">
              <input
                type="checkbox"
                name="is_public"
                value="true"
                defaultChecked={plan.is_public}
                className="mt-0.5 rounded border-border-subtle text-primary focus:ring-primary"
              />
              <div>
                <span className="block text-[13px] font-medium text-fg">
                  Public
                </span>
                <span className="block text-[11px] text-fg-muted mt-0.5">
                  Show on the public pricing page
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 rounded-lg border border-border-subtle p-4 cursor-pointer hover:bg-surface-elevated transition-colors">
              <input
                type="checkbox"
                name="is_active"
                value="true"
                defaultChecked={plan.is_active}
                className="mt-0.5 rounded border-border-subtle text-primary focus:ring-primary"
              />
              <div>
                <span className="block text-[13px] font-medium text-fg">
                  Active
                </span>
                <span className="block text-[11px] text-fg-muted mt-0.5">
                  Accept new subscriptions. Existing subscribers are unaffected.
                </span>
              </div>
            </label>
          </div>

          <LimitField
            name="max_fanflets"
            label="Max fanflets"
            description="Number of fanflets a speaker can create on this plan"
            defaultValue={limits.max_fanflets}
          />
          <LimitField
            name="max_resources_per_fanflet"
            label="Max resources per fanflet"
            description="Max links/files per fanflet on this plan"
            defaultValue={limits.max_resources_per_fanflet}
          />
          <LimitField
            name="storage_mb"
            label="Storage (MB)"
            description="Total file storage per speaker (MB) for content library"
            defaultValue={limits.storage_mb}
          />
          <LimitField
            name="max_file_mb"
            label="Max file size (MB)"
            description="Maximum size per uploaded file (MB)"
            defaultValue={limits.max_file_mb}
          />
          <LimitField
            name="signed_url_minutes"
            label="Signed URL duration (minutes)"
            description="Download link validity in minutes"
            defaultValue={limits.signed_url_minutes}
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
                  defaultChecked={planFlagIds.has(flag.id)}
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
            Save changes
          </button>
          <Link
            href="/features?tab=plans"
            className="rounded-md border border-border-subtle px-4 py-2 text-[13px] font-medium text-fg hover:bg-surface-elevated transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>

      {subscriberCount > 0 && (
        <div className="bg-surface rounded-lg border border-border-subtle p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[13px] font-medium text-fg">
                {subscriberCount} active subscriber{subscriberCount !== 1 ? "s" : ""}
              </p>
              <p className="text-[11px] text-fg-muted mt-0.5">
                Re-snapshot entitlements so existing subscribers get the current plan features and limits.
              </p>
            </div>
            <RefreshEntitlementsButton
              planId={planId}
              action={refreshPlanEntitlements.bind(null, planId)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
