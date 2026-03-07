"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, MousePointerClick, Users, Download, Loader2, ChevronDown, ChevronUp, Link2 } from "lucide-react";
import { exportSponsorReportCsv, createSponsorReportToken } from "./actions";
import { toast } from "sonner";

type Lead = {
  id: string;
  email: string;
  name: string | null;
  resource_title: string | null;
  engagement_type: string;
  created_at: string;
};

type SponsorRow = {
  id: string;
  company_name: string;
  logo_url: string | null;
  impressions: number;
  clicks: number;
  leadCount: number;
  leads: Lead[];
};

interface SponsorReportClientProps {
  fanfletId: string;
  fanfletTitle: string;
  sponsors: SponsorRow[];
}

export function SponsorReportClient({
  fanfletId,
  fanfletTitle,
  sponsors,
}: SponsorReportClientProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [exportingAll, setExportingAll] = useState(false);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [linkLoadingId, setLinkLoadingId] = useState<string | null>(null);

  async function handleExportCsv(sponsorId: string | null) {
    if (sponsorId) {
      setExportingId(sponsorId);
    } else {
      setExportingAll(true);
    }
    try {
      const result = await exportSponsorReportCsv(fanfletId, sponsorId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.csv) {
        const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = sponsorId
          ? `sponsor-report-${fanfletTitle.replace(/[^a-z0-9]/gi, "-")}-${sponsorId.slice(0, 8)}.csv`
          : `sponsor-report-${fanfletTitle.replace(/[^a-z0-9]/gi, "-")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("CSV downloaded.");
      }
    } finally {
      setExportingId(null);
      setExportingAll(false);
    }
  }

  async function handleCopyReportLink(sponsorId: string) {
    setLinkLoadingId(sponsorId);
    try {
      const result = await createSponsorReportToken(fanfletId, sponsorId);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      if (result.url) {
        await navigator.clipboard.writeText(result.url);
        toast.success("Report link copied. Valid for 7 days.");
      }
    } finally {
      setLinkLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleExportCsv(null)}
          disabled={exportingAll}
        >
          {exportingAll ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          Export all CSV
        </Button>
      </div>

      {sponsors.map((sponsor) => (
        <Card key={sponsor.id}>
          <CardHeader className="pb-2">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {sponsor.logo_url ? (
                  <img
                    src={sponsor.logo_url}
                    alt=""
                    className="h-10 w-10 rounded object-contain bg-slate-50 shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-slate-200 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-slate-500" />
                  </div>
                )}
                <div className="min-w-0">
                  <CardTitle className="text-lg truncate">{sponsor.company_name}</CardTitle>
                  <CardDescription>Sponsor engagement and leads</CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCopyReportLink(sponsor.id)}
                  disabled={linkLoadingId === sponsor.id}
                  title="Copy shareable report link (7 days)"
                >
                  {linkLoadingId === sponsor.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Link2 className="w-4 h-4" />
                  )}
                  Copy link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCsv(sponsor.id)}
                  disabled={exportingId === sponsor.id}
                >
                  {exportingId === sponsor.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{sponsor.impressions.toLocaleString()}</span>
                <span className="text-muted-foreground">impressions</span>
              </div>
              <div className="flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{sponsor.clicks.toLocaleString()}</span>
                <span className="text-muted-foreground">clicks</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">{sponsor.leadCount.toLocaleString()}</span>
                <span className="text-muted-foreground">leads</span>
              </div>
            </div>

            {sponsor.leadCount > 0 && (
              <div className="border rounded-lg">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-slate-50"
                  onClick={() =>
                    setExpandedId((id) => (id === sponsor.id ? null : sponsor.id))
                  }
                >
                  Lead list ({sponsor.leadCount})
                  {expandedId === sponsor.id ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
                {expandedId === sponsor.id && (
                  <div className="border-t overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50">
                          <th className="text-left p-3 font-medium">Email</th>
                          <th className="hidden sm:table-cell text-left p-3 font-medium">Name</th>
                          <th className="hidden md:table-cell text-left p-3 font-medium">Resource</th>
                          <th className="hidden md:table-cell text-left p-3 font-medium">Engagement</th>
                          <th className="text-left p-3 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sponsor.leads.map((lead) => (
                          <tr key={lead.id} className="border-t border-slate-100">
                            <td className="p-3">{lead.email}</td>
                            <td className="hidden sm:table-cell p-3">{lead.name ?? "—"}</td>
                            <td className="hidden md:table-cell p-3">{lead.resource_title ?? "—"}</td>
                            <td className="hidden md:table-cell p-3">{lead.engagement_type}</td>
                            <td className="p-3 text-muted-foreground">
                              {new Date(lead.created_at).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
