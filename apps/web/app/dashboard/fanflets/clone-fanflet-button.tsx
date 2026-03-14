"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Copy, Loader2 } from "lucide-react";
import { cloneFanflet } from "./actions";
import { toast } from "sonner";
import { useImpParam, withImp } from "@/lib/use-imp-param";

interface CloneFanfletButtonProps {
  fanfletId: string;
}

export function CloneFanfletButton({ fanfletId }: CloneFanfletButtonProps) {
  const router = useRouter();
  const imp = useImpParam();
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
        router.push(withImp(`/dashboard/fanflets/${result.newFanfletId}`, imp));
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
