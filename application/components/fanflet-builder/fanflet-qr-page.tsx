"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import QRCode from "qrcode";

interface FanfletQRPageProps {
  fanfletId: string;
  fanfletTitle: string;
  publicUrl: string | null;
}

export function FanfletQRPage({ fanfletId, fanfletTitle, publicUrl }: FanfletQRPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !publicUrl) return;
    QRCode.toCanvas(canvasRef.current, publicUrl, {
      width: 280,
      margin: 2,
      color: { dark: "#1B365D", light: "#ffffff" },
    });
  }, [publicUrl]);

  return (
    <div className="space-y-8 max-w-md mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/dashboard/fanflets/${fanfletId}`}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-bold text-[#1B365D]">QR Code</h1>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-8 flex flex-col items-center">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">
          {fanfletTitle}
        </h2>
        {publicUrl ? (
          <>
            <canvas ref={canvasRef} className="rounded-lg" />
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Scan to open your Fanflet
            </p>
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#3BA5D9] hover:underline mt-2"
            >
              {publicUrl}
            </a>
          </>
        ) : (
          <p className="text-muted-foreground text-center py-8">
            Publish your Fanflet to generate a QR code.
          </p>
        )}
      </div>
    </div>
  );
}
