"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Link2,
  FileDown,
  Building2,
  Type,
  ExternalLink,
} from "lucide-react";

export type ResourceClickStat = {
  fanflet_id: string;
  fanflet_title: string;
  resource_block_id: string;
  resource_title: string;
  resource_type: string;
  clicks: number;
};

type FanfletOption = {
  id: string;
  title: string;
};

interface ResourceClickBreakdownProps {
  stats: ResourceClickStat[];
  fanflets: FanfletOption[];
}

const typeIcons: Record<string, typeof Link2> = {
  sponsor: Building2,
  file: FileDown,
  text: Type,
  embed: ExternalLink,
  link: Link2,
};

export function ResourceClickBreakdown({
  stats,
  fanflets,
}: ResourceClickBreakdownProps) {
  const [selectedFanflet, setSelectedFanflet] = useState("all");

  const filtered =
    selectedFanflet === "all"
      ? stats
      : stats.filter((s) => s.fanflet_id === selectedFanflet);

  const totalFiltered = filtered.reduce((sum, s) => sum + s.clicks, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle>Resource Click Breakdown</CardTitle>
            <CardDescription>
              Click counts per individual resource.
            </CardDescription>
          </div>
          <Select value={selectedFanflet} onValueChange={setSelectedFanflet}>
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Filter by Fanflet" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fanflets</SelectItem>
              {fanflets.map((f) => (
                <SelectItem key={f.id} value={f.id}>
                  {f.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {stats.length === 0
              ? "No resource clicks recorded yet. Clicks will appear here as your audience interacts with your resources."
              : "No clicks recorded for this Fanflet yet."}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Header row */}
            <div className="flex items-center gap-4 px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <div className="w-8" />
              <div className="flex-1">Resource</div>
              {selectedFanflet === "all" && (
                <div className="w-32 text-right hidden sm:block">Fanflet</div>
              )}
              <div className="w-16 text-right">Clicks</div>
            </div>
            {filtered.map((rs) => {
              const TypeIcon = typeIcons[rs.resource_type] ?? Link2;

              return (
                <div
                  key={rs.resource_block_id}
                  className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg border"
                >
                  <div className="w-8 h-8 rounded-md bg-[#1B365D]/10 flex items-center justify-center shrink-0 text-[#1B365D]">
                    <TypeIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {rs.resource_title}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {rs.resource_type}
                    </p>
                  </div>
                  {selectedFanflet === "all" && (
                    <div className="w-32 text-right hidden sm:block">
                      <p className="text-xs text-muted-foreground truncate">
                        {rs.fanflet_title}
                      </p>
                    </div>
                  )}
                  <div className="w-16 text-right">
                    <p className="font-bold text-slate-900 text-lg">
                      {rs.clicks}
                    </p>
                  </div>
                </div>
              );
            })}
            {/* Total row */}
            <div className="flex items-center gap-4 px-4 pt-3 border-t border-slate-200 mt-3">
              <div className="w-8" />
              <div className="flex-1 text-sm font-semibold text-slate-600">
                Total
              </div>
              {selectedFanflet === "all" && (
                <div className="w-32 hidden sm:block" />
              )}
              <div className="w-16 text-right">
                <p className="font-bold text-slate-900 text-lg">
                  {totalFiltered}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
