"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";
import { cloneFanflet } from "./actions";
import { toast } from "sonner";

interface CloneFanfletButtonProps {
  fanfletId: string;
}

export function CloneFanfletButton({ fanfletId }: CloneFanfletButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleClone = async () => {
    setPending(true);
    try {
      const result = await cloneFanflet(fanfletId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.newFanfletId) {
        toast.success("Fanflet cloned");
        router.push(`/dashboard/fanflets/${result.newFanfletId}`);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClone}
      disabled={pending}
    >
      {pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
      Clone
    </Button>
  );
}
