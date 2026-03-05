"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@fanflet/ui/select";
import { FREE_PLAN_NAME } from "@fanflet/db/constants";
import { changeSpeakerPlan } from "./actions";
import { toast } from "sonner";

/** Only used when the free plan is not in the active plans list (e.g. deactivated). Radix Select disallows empty string. */
const NO_SUBSCRIPTION_VALUE = "__no_sub__";

export interface PlanOption {
  id: string;
  name: string;
  display_name: string;
}

interface PlanSelectorProps {
  speakerId: string;
  currentPlanId: string | null;
  currentPlanName: string;
  plans: PlanOption[];
}

export function PlanSelector({
  speakerId,
  currentPlanId,
  currentPlanName,
  plans,
}: PlanSelectorProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const freePlan = plans.find((p) => p.name === FREE_PLAN_NAME);
  const value = currentPlanId ?? freePlan?.id ?? NO_SUBSCRIPTION_VALUE;

  useEffect(() => setMounted(true), []);

  async function handleChange(newValue: string) {
    const planId = newValue === NO_SUBSCRIPTION_VALUE ? null : newValue;
    if (planId === currentPlanId) return;
    setLoading(true);
    const result = await changeSpeakerPlan(speakerId, planId);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      router.refresh();
      const displayName =
        planId === null
          ? (freePlan?.display_name ?? "No subscription")
          : (plans.find((p) => p.id === planId)?.display_name ?? "selected plan");
      toast.success(`Plan set to ${displayName}`);
    }
  }

  if (!mounted) {
    return (
      <p className="text-2xl font-semibold text-fg tracking-tight">
        {currentPlanName}
      </p>
    );
  }

  return (
    <Select
      value={value}
      onValueChange={handleChange}
      disabled={loading}
    >
      <SelectTrigger
        size="default"
        className="h-auto w-full border-0 bg-transparent shadow-none px-0 py-0 text-2xl font-semibold tracking-tight text-fg focus-visible:ring-0 gap-1"
      >
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent position="popper" align="start" sideOffset={4}>
        {!freePlan && (
          <SelectItem value={NO_SUBSCRIPTION_VALUE}>
            No subscription
          </SelectItem>
        )}
        {plans.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.display_name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
