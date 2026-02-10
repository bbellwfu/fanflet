"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Clipboard, Copy, Download, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface QRDownloadProps {
  fanfletId: string;
  fanfletTitle: string;
  publicUrl: string | null;
}

export function QRDownload({
  fanfletId,
  fanfletTitle,
  publicUrl,
}: QRDownloadProps) {
  const [copied, setCopied] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);

  const handleCopyQR = async () => {
    try {
      const res = await fetch(`/api/qr/${fanfletId}?format=png&size=1200`);
      const blob = await res.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      setQrCopied(true);
      toast.success("QR code copied to clipboard");
      setTimeout(() => setQrCopied(false), 2000);
    } catch {
      toast.error("Failed to copy — your browser may not support image clipboard");
    }
  };

  const handleCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail
    }
  };

  if (!publicUrl) {
    return (
      <div className="space-y-8 max-w-lg mx-auto">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/dashboard/fanflets/${fanfletId}`}>
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold text-[#1B365D]">QR Code</h1>
        </div>
        <Card className="border-[#1B365D]/20">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              Publish your Fanflet to generate a QR code.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const qrPreviewUrl = `/api/qr/${fanfletId}?format=png&size=600`;
  const pngDownloadUrl = `/api/qr/${fanfletId}?format=png&size=1200`;
  const svgDownloadUrl = `/api/qr/${fanfletId}?format=svg&size=1200`;

  return (
    <div className="space-y-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/fanflets/${fanfletId}`}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-[#1B365D]">QR Code</h1>
      </div>

      <Card className="border-[#1B365D]/20 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-[#1B365D]">{fanfletTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Large QR preview */}
          <div className="flex justify-center">
            <img
              src={qrPreviewUrl}
              alt="QR code preview"
              width={400}
              height={400}
              className="rounded-lg border border-slate-200"
            />
          </div>

          {/* Download & copy buttons */}
          <div className="flex gap-2 justify-center">
            <Button size="sm" asChild className="bg-[#1B365D] hover:bg-[#152b4d] text-xs px-3">
              <a href={pngDownloadUrl} download={`fanflet-qr-${fanfletId}.png`}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                PNG
              </a>
            </Button>
            <Button
              size="sm"
              asChild
              variant="outline"
              className="border-[#3BA5D9] text-[#3BA5D9] hover:bg-[#3BA5D9]/10 text-xs px-3"
            >
              <a href={svgDownloadUrl} download={`fanflet-qr-${fanfletId}.svg`}>
                <Download className="w-3.5 h-3.5 mr-1.5" />
                SVG
              </a>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyQR}
              className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs px-3"
            >
              {qrCopied ? (
                <span className="text-emerald-600">Copied!</span>
              ) : (
                <>
                  <Clipboard className="w-3.5 h-3.5 mr-1.5" />
                  Copy Image
                </>
              )}
            </Button>
          </div>

          {/* URL with copy */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-600">Public URL</p>
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <span className="text-base font-mono text-[#1B365D] break-all flex-1">
                {publicUrl}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0 border-[#3BA5D9]/40 text-[#1B365D] hover:bg-[#3BA5D9]/10"
              >
                {copied ? (
                  <span className="text-xs text-emerald-600">Copied!</span>
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

        </CardContent>
      </Card>

      {/* Best Practices card */}
      <Card className="border-[#3BA5D9]/30 bg-[#3BA5D9]/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-[#1B365D]">
            <Lightbulb className="w-4 h-4 text-[#3BA5D9]" />
            Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-slate-600">
          <p>• Display this QR code for at least 60 seconds on your slides</p>
          <p>
            • Tell your audience: &quot;Scan this to get all resources from
            today&apos;s talk&quot;
          </p>
          <p>• Place it on your final slide or as a persistent footer</p>
        </CardContent>
      </Card>
    </div>
  );
}
