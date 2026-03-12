"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@fanflet/ui/button";
import { updateSponsorPlan } from "./actions";
import { toast } from "sonner";
import { CreditCard, Loader2 } from "lucide-react";

interface SponsorPlanFormProps {
  sponsorId: string;
  currentPlanId: string | null;
  currentPlanDisplayName: string;
  plans: { id: string; name: string }[];
}

export function SponsorPlanForm({
  sponsorId,
  currentPlanId,
  currentPlanDisplayName,
  plans,
}: SponsorPlanFormProps) {
  const router = useRouter();
  const [selectedPlanId, setSelectedPlanId] = useState<string>(currentPlanId ?? plans[0]?.id ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!selectedPlanId || selectedPlanId === currentPlanId) return;
    setSaving(true);
    const result = await updateSponsorPlan(sponsorId, selectedPlanId);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Plan updated.");
    router.refresh();
  }

  const hasChanges = selectedPlanId && selectedPlanId !== currentPlanId;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[12px] font-medium uppercase tracking-wider text-fg-muted mb-1">
          Current plan
        </p>
        <p className="text-sm font-medium text-fg flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-fg-muted" />
          {currentPlanDisplayName}
        </p>
      </div>
      {plans.length > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="plan-select" className="block text-[12px] font-medium text-fg-muted mb-1">
              Change plan
            </label>
            <select
              id="plan-select"
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              className="rounded-md border border-border-subtle bg-surface px-3 py-2 text-sm text-fg min-w-[180px]"
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="shrink-0"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save plan"}
          </Button>
        </div>
      )}
      {plans.length === 0 && (
        <p className="text-sm text-fg-muted">No active plans configured.</p>
      )}
    </div>
  );
}
