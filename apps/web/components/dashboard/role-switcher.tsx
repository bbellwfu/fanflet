"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRightLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const ROLE_LABELS: Record<string, string> = {
  speaker: "Speaker Portal",
  sponsor: "Sponsor Portal",
};

interface RoleSwitcherProps {
  roles: string[];
  activeRole: string;
}

export function RoleSwitcher({ roles, activeRole }: RoleSwitcherProps) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  if (roles.length <= 1) return null;

  const otherRole = roles.find((r) => r !== activeRole);
  if (!otherRole) return null;

  async function handleSwitch() {
    setSwitching(true);
    try {
      const res = await fetch("/api/switch-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: otherRole }),
      });
      const data = await res.json();
      if (data.redirect) {
        router.push(data.redirect);
      }
    } finally {
      setSwitching(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleSwitch}
      disabled={switching}
      className="w-full justify-start text-slate-400 hover:text-white hover:bg-white/5"
    >
      <ArrowRightLeft className="w-4 h-4 mr-2" />
      {switching ? "Switching..." : `Switch to ${ROLE_LABELS[otherRole] ?? otherRole}`}
    </Button>
  );
}
