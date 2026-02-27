"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Clipboard, Check } from "lucide-react";
import { toast } from "sonner";

interface CopyFanfletUrlButtonProps {
  url: string;
}

export function CopyFanfletUrlButton({ url }: CopyFanfletUrlButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("URL copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy URL");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="shrink-0 h-7 gap-1.5"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-emerald-600" />
      ) : (
        <Clipboard className="w-3.5 h-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}
