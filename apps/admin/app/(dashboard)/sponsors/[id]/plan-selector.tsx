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
import { updateSponsorPlan } from "./actions";
import { toast } from "sonner";

export interface SponsorPlanOption {
  id: string;
  name: string;
  display_name: string | null;
}

interface SponsorPlanSelectorProps {
  sponsorId: string;
  currentPlanId: string | null;
  currentPlanName: string;
  plans: SponsorPlanOption[];
}

export function SponsorPlanSelector({
  sponsorId,
  currentPlanId,
  currentPlanName,
  plans,
}: SponsorPlanSelectorProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const value = currentPlanId ?? plans[0]?.id ?? "";

  useEffect(() => setMounted(true), []);

  async function handleChange(newValue: string) {
    if (!newValue || newValue === currentPlanId) return;
    setLoading(true);
    const result = await updateSponsorPlan(sponsorId, newValue);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      router.refresh();
      const displayName =
        plans.find((p) => p.id === newValue)?.display_name ??
        plans.find((p) => p.id === newValue)?.name ??
        "Plan";
      toast.success(`Plan set to ${displayName}`);
    }
  }

  if (!mounted) {
    return (
      <p className="text-base font-medium text-fg">
        {currentPlanName}
      </p>
    );
  }

  if (plans.length === 0) {
    return (
      <p className="text-base font-medium text-fg">
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
        className="h-auto w-full border-0 bg-transparent shadow-none px-0 py-0 text-base font-medium text-fg focus-visible:ring-0 gap-1"
      >
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent position="popper" align="start" sideOffset={4}>
        {plans.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.display_name ?? p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
