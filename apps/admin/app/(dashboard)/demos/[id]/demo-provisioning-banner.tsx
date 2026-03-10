"use client";

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { pollDemoStatus } from "../actions";

interface DemoProvisioningBannerProps {
  demoId: string;
  initialStatus: string;
}

export function DemoProvisioningBanner({
  demoId,
  initialStatus,
}: DemoProvisioningBannerProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);

  const poll = useCallback(async () => {
    const result = await pollDemoStatus(demoId);
    return result.status;
  }, [demoId]);

  useEffect(() => {
    if (status !== "provisioning") return;

    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 30;

    const tick = async () => {
      if (cancelled) return;
      attempt++;

      if (attempt > maxAttempts) {
        setStatus("timed_out");
        return;
      }

      const currentStatus = await poll();

      if (cancelled) return;

      if (currentStatus !== "provisioning") {
        setStatus(currentStatus);
        router.refresh();
        return;
      }

      const delay = Math.min(3000 * Math.pow(1.3, attempt - 1), 10000);
      setTimeout(tick, delay);
    };

    const timer = setTimeout(tick, 3000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [status, poll, router]);

  if (status !== "provisioning") return null;

  return (
    <div className="bg-primary/5 rounded-lg border border-primary/20 p-5 flex items-center gap-4">
      <Loader2Icon className="w-6 h-6 text-primary animate-spin shrink-0" />
      <div>
        <p className="text-sm font-medium text-fg">
          Generating personalized demo...
        </p>
        <p className="text-[13px] text-fg-secondary mt-0.5">
          AI is creating talks, resources, and sponsor content. This usually
          takes 15-30 seconds. The page will update automatically.
        </p>
      </div>
    </div>
  );
}
