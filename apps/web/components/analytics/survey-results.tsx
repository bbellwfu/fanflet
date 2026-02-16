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
import { Star, MessageSquare } from "lucide-react";

export type SurveyResultData = {
  fanflet_id: string;
  fanflet_title: string;
  question_id: string;
  question_text: string;
  question_type: string;
  responses: string[];
};

type FanfletOption = {
  id: string;
  title: string;
};

interface SurveyResultsProps {
  results: SurveyResultData[];
  fanflets: FanfletOption[];
}

export function SurveyResults({ results, fanflets }: SurveyResultsProps) {
  const [selectedFanflet, setSelectedFanflet] = useState("all");

  const filtered =
    selectedFanflet === "all"
      ? results
      : results.filter((r) => r.fanflet_id === selectedFanflet);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Feedback Results
            </CardTitle>
            <CardDescription>
              Survey responses collected from your Fanflets.
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
            {results.length === 0
              ? "No survey responses yet. Attach a feedback question to a Fanflet to start collecting data."
              : "No survey responses for this Fanflet yet."}
          </div>
        ) : (
          <div className="space-y-6">
            {filtered.map((r) => (
              <div
                key={`${r.fanflet_id}-${r.question_id}`}
                className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3"
              >
                <div>
                  <p className="font-medium text-sm text-slate-900">
                    {r.question_text}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.fanflet_title} &middot; {r.responses.length}{" "}
                    {r.responses.length === 1 ? "response" : "responses"}
                  </p>
                </div>

                {r.question_type === "nps" && (
                  <NpsVisualization responses={r.responses} />
                )}
                {r.question_type === "yes_no" && (
                  <YesNoVisualization responses={r.responses} />
                )}
                {r.question_type === "rating" && (
                  <RatingVisualization responses={r.responses} />
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NpsVisualization({ responses }: { responses: string[] }) {
  const values = responses.map(Number).filter((n) => !isNaN(n));
  if (values.length === 0) return null;

  const detractors = values.filter((v) => v <= 6).length;
  const passives = values.filter((v) => v === 7 || v === 8).length;
  const promoters = values.filter((v) => v >= 9).length;

  const total = values.length;
  const npsScore = Math.round(
    ((promoters - detractors) / total) * 100
  );

  const detractorPct = Math.round((detractors / total) * 100);
  const passivePct = Math.round((passives / total) * 100);
  const promoterPct = 100 - detractorPct - passivePct;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold text-slate-900">{npsScore}</span>
        <span className="text-sm text-muted-foreground">NPS Score</span>
      </div>
      {/* Stacked bar */}
      <div className="flex h-5 rounded-full overflow-hidden">
        {detractorPct > 0 && (
          <div
            className="bg-red-400 flex items-center justify-center"
            style={{ width: `${detractorPct}%` }}
          >
            {detractorPct >= 15 && (
              <span className="text-[10px] font-semibold text-white">
                {detractorPct}%
              </span>
            )}
          </div>
        )}
        {passivePct > 0 && (
          <div
            className="bg-amber-300 flex items-center justify-center"
            style={{ width: `${passivePct}%` }}
          >
            {passivePct >= 15 && (
              <span className="text-[10px] font-semibold text-amber-800">
                {passivePct}%
              </span>
            )}
          </div>
        )}
        {promoterPct > 0 && (
          <div
            className="bg-emerald-400 flex items-center justify-center"
            style={{ width: `${promoterPct}%` }}
          >
            {promoterPct >= 15 && (
              <span className="text-[10px] font-semibold text-white">
                {promoterPct}%
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>Detractors (0-6): {detractors}</span>
        <span>Passives (7-8): {passives}</span>
        <span>Promoters (9-10): {promoters}</span>
      </div>
    </div>
  );
}

function YesNoVisualization({ responses }: { responses: string[] }) {
  const total = responses.length;
  if (total === 0) return null;

  const yesCount = responses.filter(
    (r) => r.toLowerCase() === "yes"
  ).length;
  const noCount = total - yesCount;
  const yesPct = Math.round((yesCount / total) * 100);
  const noPct = 100 - yesPct;

  return (
    <div className="space-y-2">
      {/* Stacked bar */}
      <div className="flex h-8 rounded-full overflow-hidden">
        {yesPct > 0 && (
          <div
            className="bg-emerald-400 flex items-center justify-center"
            style={{ width: `${yesPct}%` }}
          >
            <span className="text-xs font-semibold text-white">
              Yes {yesPct}%
            </span>
          </div>
        )}
        {noPct > 0 && (
          <div
            className="bg-slate-300 flex items-center justify-center"
            style={{ width: `${noPct}%` }}
          >
            <span className="text-xs font-semibold text-slate-600">
              No {noPct}%
            </span>
          </div>
        )}
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Yes: {yesCount}</span>
        <span>No: {noCount}</span>
      </div>
    </div>
  );
}

function RatingVisualization({ responses }: { responses: string[] }) {
  const values = responses.map(Number).filter((n) => n >= 1 && n <= 5);
  if (values.length === 0) return null;

  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const distribution = [1, 2, 3, 4, 5].map(
    (star) => values.filter((v) => v === star).length
  );
  const maxCount = Math.max(...distribution, 1);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-3xl font-bold text-slate-900">
          {avg.toFixed(1)}
        </span>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`w-4 h-4 ${
                star <= Math.round(avg)
                  ? "fill-amber-400 text-amber-400"
                  : "fill-slate-200 text-slate-200"
              }`}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground ml-1">
          ({values.length})
        </span>
      </div>
      {/* Distribution bars */}
      <div className="space-y-1">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[star - 1];
          const pct = Math.round((count / maxCount) * 100);
          return (
            <div key={star} className="flex items-center gap-2 text-xs">
              <span className="w-3 text-right text-muted-foreground">
                {star}
              </span>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="w-6 text-right text-muted-foreground">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
