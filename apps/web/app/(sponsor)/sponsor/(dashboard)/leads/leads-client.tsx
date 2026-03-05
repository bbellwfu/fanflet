"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Loader2 } from "lucide-react";
import { exportSponsorLeadsCsv } from "./actions";
import { toast } from "sonner";

type Lead = {
  id: string;
  email: string;
  name: string | null;
  fanfletTitle: string;
  speakerName: string;
  resourceTitle: string | null;
  engagementType: string;
  createdAt: string;
};

interface SponsorLeadsClientProps {
  leads: Lead[];
}

export function SponsorLeadsClient({ leads }: SponsorLeadsClientProps) {
  const [exporting, setExporting] = useState(false);
  const [filter, setFilter] = useState("");

  const filtered =
    filter.trim() === ""
      ? leads
      : leads.filter(
          (l) =>
            l.email.toLowerCase().includes(filter.toLowerCase()) ||
            (l.name ?? "").toLowerCase().includes(filter.toLowerCase()) ||
            l.fanfletTitle.toLowerCase().includes(filter.toLowerCase()) ||
            l.speakerName.toLowerCase().includes(filter.toLowerCase())
        );

  async function handleExport() {
    setExporting(true);
    try {
      const result = await exportSponsorLeadsCsv();
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.csv) {
        const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "sponsor-leads.csv";
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV downloaded.");
      }
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Filter by email, name, fanflet, speaker..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </Button>
      </div>
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b">
              <th className="text-left p-3 font-medium">Email</th>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Fanflet</th>
              <th className="text-left p-3 font-medium">Speaker</th>
              <th className="text-left p-3 font-medium">Resource</th>
              <th className="text-left p-3 font-medium">Engagement</th>
              <th className="text-left p-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-muted-foreground">
                  {leads.length === 0 ? "No leads yet." : "No matches for your filter."}
                </td>
              </tr>
            ) : (
              filtered.map((lead) => (
                <tr key={lead.id} className="border-b border-slate-100">
                  <td className="p-3">{lead.email}</td>
                  <td className="p-3">{lead.name ?? "—"}</td>
                  <td className="p-3">{lead.fanfletTitle}</td>
                  <td className="p-3">{lead.speakerName}</td>
                  <td className="p-3">{lead.resourceTitle ?? "—"}</td>
                  <td className="p-3">{lead.engagementType}</td>
                  <td className="p-3 text-muted-foreground">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
