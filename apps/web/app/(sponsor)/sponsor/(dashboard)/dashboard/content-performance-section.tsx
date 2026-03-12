"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarChart3, Download, Lock, Users } from "lucide-react";
import Link from "next/link";
import type { SponsorEntitlements } from "@fanflet/db";

export interface ContentPerformanceRow {
  resource_block_id: string;
  resource_title: string;
  block_type: string;
  fanflet_id: string;
  fanflet_title: string;
  speaker_id: string;
  speaker_name: string;
  impressions: number;
  clicks: number;
  engagement_rate: number;
  leads: number;
}

export interface CrossSpeakerRow {
  speaker_id: string;
  speaker_name: string;
  fanflet_count: number;
  total_impressions: number;
  total_clicks: number;
  avg_engagement_rate: number;
  total_leads: number;
}

interface ContentPerformanceSectionProps {
  rows: ContentPerformanceRow[];
  crossSpeakerRows: CrossSpeakerRow[];
  placementCount: number;
  entitlements: SponsorEntitlements;
  speakerLabel?: string;
}

function humanizeBlockType(blockType: string): string {
  const map: Record<string, string> = {
    link: "Link",
    file: "File",
    text: "Text",
    sponsor: "Sponsor",
  };
  return map[blockType] ?? blockType ?? "Resource";
}

export function ContentPerformanceSection({
  rows,
  crossSpeakerRows,
  placementCount,
  entitlements,
  speakerLabel = "speaker",
}: ContentPerformanceSectionProps) {
  const [sortKey, setSortKey] = useState<keyof ContentPerformanceRow>("clicks");
  const [sortDesc, setSortDesc] = useState(true);
  const [activeTab, setActiveTab] = useState<"resources" | "kol">("resources");

  const hasResourceAnalytics = entitlements.features.has("sponsor_resource_analytics");
  const hasCrossSpeakerAnalytics = entitlements.features.has("sponsor_cross_speaker_analytics");
  const hasLeadAnalytics = entitlements.features.has("sponsor_lead_analytics");

  const sortedRows = useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDesc ? bVal - aVal : aVal - bVal;
      }
      const aStr = String(aVal ?? "");
      const bStr = String(bVal ?? "");
      return sortDesc
        ? bStr.localeCompare(aStr)
        : aStr.localeCompare(bStr);
    });
    return arr;
  }, [rows, sortKey, sortDesc]);

  function handleSort(key: keyof ContentPerformanceRow) {
    if (sortKey === key) setSortDesc((d) => !d);
    else {
      setSortKey(key);
      setSortDesc(true);
    }
  }

  function exportCsv() {
    const headers = ["Resource", speakerLabel[0].toUpperCase() + speakerLabel.slice(1), "Fanflet", "Impressions", "Clicks", "Engagement Rate (%)", "Leads"];
    const lines = [
      headers.join(","),
      ...sortedRows.map((r) =>
        [
          `"${(r.resource_title || humanizeBlockType(r.block_type)).replace(/"/g, '""')}"`,
          `"${(r.speaker_name || "").replace(/"/g, '""')}"`,
          `"${(r.fanflet_title || "").replace(/"/g, '""')}"`,
          r.impressions,
          r.clicks,
          r.impressions > 0 ? ((r.clicks / r.impressions) * 100).toFixed(2) : "0",
          hasLeadAnalytics ? r.leads : "",
        ].join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `content-performance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!hasResourceAnalytics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Content Performance
          </CardTitle>
          <CardDescription>
            {placementCount > 0
              ? `You have ${placementCount} resource${placementCount !== 1 ? "s" : ""} placed — upgrade to see which content and which ${speakerLabel}s drive the most engagement.`
              : `Upgrade to Pro to see per-resource performance — which content and which ${speakerLabel}s drive the most engagement.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <Lock className="h-8 w-8 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-900">Pro feature</p>
              <p className="text-xs text-amber-800 mt-0.5">
                Upgrade to see clicks, engagement rate, and leads per resource and per {speakerLabel}.
              </p>
              <Button asChild variant="outline" size="sm" className="mt-3 border-amber-300 text-amber-900 hover:bg-amber-100">
                <Link href="/sponsor/settings">View plans</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Content Performance
          </CardTitle>
          <CardDescription>
            Performance breakdown for each piece of content placed on {speakerLabel} fanflets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-muted-foreground">
            <BarChart3 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <p className="font-medium text-slate-700">No content linked yet</p>
            <p className="text-sm mt-1">
              When {speakerLabel}s add your resources to their fanflets, you&apos;ll see clicks, engagement rate, and leads here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Content Performance
          </CardTitle>
          <CardDescription>
            Performance by resource and by {speakerLabel}. Default sort: clicks descending.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={exportCsv} className="shrink-0">
          <Download className="h-4 w-4 mr-1.5" />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 border-b border-slate-200 mb-4">
          <button
            type="button"
            onClick={() => setActiveTab("resources")}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === "resources"
                ? "border-teal-500 text-teal-700"
                : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            By resource
          </button>
          {hasCrossSpeakerAnalytics && (
            <button
              type="button"
              onClick={() => setActiveTab("kol")}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${
                activeTab === "kol"
                  ? "border-teal-500 text-teal-700"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="h-4 w-4" />
              By {speakerLabel}
            </button>
          )}
        </div>

        {activeTab === "resources" && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button type="button" onClick={() => handleSort("resource_title")} className="font-medium hover:underline text-left">
                      Resource
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" onClick={() => handleSort("speaker_name")} className="font-medium hover:underline text-left">
                      {speakerLabel[0].toUpperCase() + speakerLabel.slice(1)}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button type="button" onClick={() => handleSort("fanflet_title")} className="font-medium hover:underline text-left">
                      Fanflet
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button type="button" onClick={() => handleSort("impressions")} className="font-medium hover:underline">
                      Impressions
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button type="button" onClick={() => handleSort("clicks")} className="font-medium hover:underline">
                      Clicks
                    </button>
                  </TableHead>
                  <TableHead className="text-right">
                    <button type="button" onClick={() => handleSort("engagement_rate")} className="font-medium hover:underline">
                      Engagement
                    </button>
                  </TableHead>
                  {hasLeadAnalytics && (
                    <TableHead className="text-right">
                      <button type="button" onClick={() => handleSort("leads")} className="font-medium hover:underline">
                        Leads
                      </button>
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedRows.map((r) => (
                  <TableRow key={r.resource_block_id}>
                    <TableCell className="font-medium">
                      {r.resource_title?.trim() || humanizeBlockType(r.block_type)}
                    </TableCell>
                    <TableCell>{r.speaker_name}</TableCell>
                    <TableCell className="max-w-[180px] truncate" title={r.fanflet_title}>
                      {r.fanflet_title}
                    </TableCell>
                    <TableCell className="text-right">{r.impressions.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{r.clicks.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {r.impressions > 0 ? `${(r.engagement_rate * 100).toFixed(1)}%` : "—"}
                    </TableCell>
                    {hasLeadAnalytics && (
                      <TableCell className="text-right">{r.leads}</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {activeTab === "kol" && hasCrossSpeakerAnalytics && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-medium">{speakerLabel[0].toUpperCase() + speakerLabel.slice(1)}</TableHead>
                  <TableHead className="text-right font-medium">Fanflets</TableHead>
                  <TableHead className="text-right font-medium">Impressions</TableHead>
                  <TableHead className="text-right font-medium">Clicks</TableHead>
                  <TableHead className="text-right font-medium">Avg. Engagement</TableHead>
                  <TableHead className="text-right font-medium">Leads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crossSpeakerRows.map((r) => (
                  <TableRow key={r.speaker_id}>
                    <TableCell className="font-medium">{r.speaker_name}</TableCell>
                    <TableCell className="text-right">{r.fanflet_count}</TableCell>
                    <TableCell className="text-right">{r.total_impressions.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{r.total_clicks.toLocaleString()}</TableCell>
                    <TableCell className="text-right">
                      {r.total_impressions > 0 ? `${(r.avg_engagement_rate * 100).toFixed(1)}%` : "—"}
                    </TableCell>
                    <TableCell className="text-right">{r.total_leads}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
