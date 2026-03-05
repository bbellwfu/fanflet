"use client";

import { useState } from "react";
import { Button } from "@fanflet/ui/button";
import { toggleSponsorVerification } from "./actions";
import { toast } from "sonner";
import { ShieldCheck, ShieldX } from "lucide-react";

interface VerifyButtonProps {
  sponsorId: string;
  isVerified: boolean;
}

export function VerifyButton({ sponsorId, isVerified }: VerifyButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const result = await toggleSponsorVerification(sponsorId, isVerified);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(
        isVerified
          ? "Verification revoked. Sponsor is no longer visible to speakers."
          : "Sponsor verified. They will now appear in the sponsor directory."
      );
    }
  }

  return (
    <Button
      variant={isVerified ? "destructive" : "default"}
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className={isVerified ? undefined : "bg-primary text-white hover:bg-primary/90"}
    >
      {loading ? (
        "Processing..."
      ) : isVerified ? (
        <>
          <ShieldX className="w-4 h-4 mr-1.5" />
          Revoke
        </>
      ) : (
        <>
          <ShieldCheck className="w-4 h-4 mr-1.5" />
          Verify
        </>
      )}
    </Button>
  );
}
