"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Users, Globe2, Link2, Filter, Loader2, Download, Eye, MousePointer2, HelpCircle, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useImpParam } from "@/lib/use-imp-param";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeviceChart } from "@/components/analytics/device-chart";
import { ReferrerChart } from "@/components/analytics/referrer-chart";
import { ResourceClickBreakdown } from "@/components/analytics/resource-click-breakdown";
import { DateRangeSelector } from "@/components/analytics/date-range-selector";
import type { DeviceBreakdown, ReferrerBreakdown, SponsorKPIs, SponsorFanfletPerformance } from "@fanflet/core";
import { downloadSponsorAnalyticsAction } from "./actions";
import type { ResourceClickStat } from "@/components/analytics/resource-click-breakdown";

interface SponsorAnalyticsClientProps {
  speakerLabel: string;
  availableSpeakers: { id: string; name: string }[];
  availableCampaigns: { id: string; name: string }[];
  deviceData: DeviceBreakdown[];
  referrerData: ReferrerBreakdown[];
  resourceClicks: ResourceClickStat[];
  kpiData: SponsorKPIs;
  fanfletStats: SponsorFanfletPerformance[];
  resourceTypeStats: { type: string; totalClicks: number; avgClicksPerBlock: number; blockCount: number }[];
  hasData: boolean;
  fanfletIds: string[];
  blockIds: string[];
}

export function SponsorAnalyticsClient({
  speakerLabel,
  availableSpeakers,
  availableCampaigns,
  deviceData,
  referrerData,
  resourceClicks,
  kpiData,
  fanfletStats,
  resourceTypeStats,
  hasData,
  fanfletIds,
  blockIds
}: SponsorAnalyticsClientProps) {

  const router = useRouter();
  const searchParams = useSearchParams();
  const imp = useImpParam();
  const [isPending, startTransition] = useTransition();

  const currentSpeakerId = searchParams.get("speakerId") || "all";
  const currentCampaignId = searchParams.get("campaignId") || "all";
  const currentRange = searchParams.get("range") || "30";
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    if (imp) params.set("__imp", imp);
    startTransition(() => {
      router.push(`/sponsor/analytics?${params.toString()}`);
    });
  };

  const handleExport = async (exportType: "aggregated" | "raw") => {
    try {
      const csvContent = await downloadSponsorAnalyticsAction(
        fanfletIds,
        blockIds,
        currentRange,
        from,
        to,
        exportType
      );

      const blob = new Blob([csvContent as BlobPart], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `fanflet_sponsor_analytics_${exportType}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to export analytics:", err);
      alert("Failed to export analytics. Please try again.");
    }
  };

  // Derive unique fanflets from the resource clicks to seed the ResourceClickBreakdown's internal dropdown
  const fanfletsOptions = Array.from(new Set(resourceClicks.map(rc => JSON.stringify({id: rc.fanflet_id, title: rc.fanflet_title}))))
    .map(str => JSON.parse(str) as { id: string; title: string });

  const kpiDisplay = [
    { 
      label: "Unique Views", 
      value: kpiData.uniqueVisitors.toLocaleString(), 
      icon: Eye,
      tooltip: "Estimated number of unique viewers who visited the fanflets containing your resources.",
      href: "#fanflet-performance"
    },
    { 
      label: "Resource Clicks", 
      value: kpiData.totalResourceClicks.toLocaleString(), 
      icon: MousePointer2,
      tooltip: "Total clicks on all your resource blocks across all active fanflets.",
      href: "#resource-click-breakdown"
    },
    { 
      label: "Conversion Rate", 
      value: `${kpiData.conversionRate.toFixed(1)}%`, 
      icon: TrendingUp,
      tooltip: "The percentage of unique viewers who shared their contact info (became a lead) through your resources."
    },
    { 
      label: "New Leads", 
      value: kpiData.totalLeads.toLocaleString(), 
      icon: Users,
      tooltip: "Total number of attendees who became leads via your resource blocks during this period.",
      href: "/sponsor/leads"
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      {/* Header Row: Title + Date Selector */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            Analytics
            {isPending && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
          </h1>
          <p className="text-muted-foreground mt-1">Detailed insights into your content performance and audience.</p>
        </div>
        <DateRangeSelector />
      </div>

      <div className="rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2 flex items-center gap-2 text-xs text-emerald-800">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
        Showing only your engagement data. Other sponsors cannot see this information.
      </div>

      {/* Filter Row: Campaign + KOL + Export */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <Select disabled={isPending} value={currentCampaignId} onValueChange={(val) => updateFilters("campaignId", val)}>
              <SelectTrigger className="w-[180px] bg-white">
                <SelectValue placeholder="All Campaigns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Campaigns</SelectItem>
                {availableCampaigns.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <Select disabled={isPending} value={currentSpeakerId} onValueChange={(val) => updateFilters("speakerId", val)}>
              <SelectTrigger className="w-[180px] bg-white text-sm">
                <SelectValue placeholder={`All ${speakerLabel}s`} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {speakerLabel}s</SelectItem>
                {availableSpeakers.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="bg-white gap-2">
              <Download className="w-4 h-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem onClick={() => handleExport("aggregated")}>
              Summary Report (CSV)
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("raw")}>
              Raw Event Log (CSV)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!hasData ? (
        <Card>
          <CardContent className="py-16 text-center">
            <BarChart3 className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-lg font-medium text-slate-900">No data available</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              {currentCampaignId !== "all" || currentSpeakerId !== "all" 
                ? "Try clearing your filters to see data across all campaigns and KOLs."
                : `Your analytics dashboard will populate here once ${speakerLabel}s start driving traffic to your linked resources.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {kpiDisplay.map((kpi, idx) => {
              const Icon = kpi.icon;
              const isExternal = kpi.href?.startsWith("/");
              const isAnchor = kpi.href?.startsWith("#");

              const CardContentWrapper = ({ children }: { children: React.ReactNode }) => {
                if (!kpi.href) return <Card key={idx}>{children}</Card>;
                
                if (isAnchor) {
                  return (
                    <Card 
                      key={idx} 
                      className="transition-all duration-200 hover:border-[#3BA5D9]/50 hover:shadow-sm cursor-pointer group"
                      onClick={() => {
                        const el = document.getElementById(kpi.href!.substring(1));
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                    >
                      {children}
                    </Card>
                  );
                }

                return (
                  <Link href={kpi.href} key={idx} className="block group">
                    <Card className="transition-all duration-200 group-hover:border-[#3BA5D9]/50 group-hover:shadow-sm">
                      {children}
                    </Card>
                  </Link>
                );
              };

              return (
                <CardContentWrapper key={idx}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                      {kpi.label}
                      <span 
                        title={kpi.tooltip} 
                        className="cursor-help text-slate-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <HelpCircle className="h-3.5 w-3.5" />
                      </span>
                    </CardTitle>
                    <Icon className={`h-4 w-4 text-muted-foreground transition-colors ${kpi.href ? "group-hover:text-[#3BA5D9]" : ""}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpi.value}</div>
                  </CardContent>
                </CardContentWrapper>
              );
            })}
          </div>

          <div id="resource-click-breakdown">
            <ResourceClickBreakdown
               stats={resourceClicks}
               fanflets={fanfletsOptions}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
             {/* Fanflet Performance */}
             <Card id="fanflet-performance">
               <CardHeader>
                 <CardTitle className="text-base flex items-center gap-2">
                   <Users className="w-5 h-5 text-slate-400" />
                   Fanflet Performance
                 </CardTitle>
                 <CardDescription>Views and engagement per Fanflet/Event.</CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="relative w-full overflow-auto">
                   <table className="w-full caption-bottom text-sm">
                     <thead className="[&_tr]:border-b">
                       <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                         <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Fanflet</th>
                         <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground whitespace-nowrap">Views</th>
                         <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground whitespace-nowrap">Clicks</th>
                         <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground whitespace-nowrap">Leads</th>
                       </tr>
                     </thead>
                     <tbody className="[&_tr:last-child]:border-0">
                       {fanfletStats.map((f) => (
                         <tr key={f.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                           <td className="p-2 align-middle">
                             <div className="font-medium">{f.title}</div>
                             {f.event_name && <div className="text-xs text-muted-foreground">{f.event_name}</div>}
                           </td>
                           <td className="p-2 align-middle text-right">{f.views.toLocaleString()}</td>
                           <td className="p-2 align-middle text-right">{f.clicks.toLocaleString()}</td>
                           <td className="p-2 align-middle text-right">{f.leads.toLocaleString()}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </CardContent>
             </Card>

             {/* Resource Type breakdown */}
             <Card>
               <CardHeader>
                 <CardTitle className="text-base flex items-center gap-2">
                   <BarChart3 className="w-5 h-5 text-slate-400" />
                   Resource Engagement
                 </CardTitle>
                 <CardDescription>Performance by content type.</CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="relative w-full overflow-auto">
                   <table className="w-full caption-bottom text-sm">
                     <thead className="[&_tr]:border-b">
                       <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                         <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground whitespace-nowrap">Type</th>
                         <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground whitespace-nowrap">Total Clicks</th>
                         <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground whitespace-nowrap">Avg Clicks</th>
                       </tr>
                     </thead>
                     <tbody className="[&_tr:last-child]:border-0">
                       {resourceTypeStats.map((r) => (
                         <tr key={r.type} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                           <td className="p-2 align-middle capitalize">{r.type}</td>
                           <td className="p-2 align-middle text-right">{r.totalClicks.toLocaleString()}</td>
                           <td className="p-2 align-middle text-right">{r.avgClicksPerBlock.toFixed(1)}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               </CardContent>
             </Card>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-slate-400" />
                  Traffic Sources
                </CardTitle>
                <CardDescription>Where your audience is originating from.</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ReferrerChart data={referrerData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe2 className="w-5 h-5 text-slate-400" />
                  Devices
                </CardTitle>
                <CardDescription>Platform breakdown (Desktop vs Mobile).</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <DeviceChart data={deviceData} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
