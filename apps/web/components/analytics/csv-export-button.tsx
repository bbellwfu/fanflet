"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CSVExportButtonProps {
  speakerId: string;
  rangeDays: number | null;
}

export function CSVExportButton({ speakerId, rangeDays }: CSVExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ speakerId });
      if (rangeDays !== null) params.set("days", String(rangeDays));
      const res = await fetch(`/api/analytics/export?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "Export failed");
        return;
      }
      const csv = await res.text();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fanflet-analytics-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={loading}>
      {loading ? (
        <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
      ) : (
        <Download className="w-4 h-4 mr-1.5" />
      )}
      Export CSV
    </Button>
  );
}
