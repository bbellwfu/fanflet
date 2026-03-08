"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search,
  Download,
  Trash2,
  Mail,
  Users,
  Calendar,
  FileText,
  X,
  CheckSquare,
  Square,
  AlertTriangle,
} from "lucide-react";
import { deleteSubscriber, deleteSubscribers } from "@/app/dashboard/subscribers/actions";
import type { SubscriberRow } from "@/app/dashboard/subscribers/actions";
import { formatDate, formatDateShort } from "@fanflet/db/timezone";
import { useTimezone } from "@/lib/timezone-context";

interface SubscribersDashboardProps {
  subscribers: SubscriberRow[];
  speakerName: string;
  speakerEmail: string;
  initialSourceFilter?: string;
}

type SortField = "created_at" | "email" | "source";
type SortDirection = "asc" | "desc";

export function SubscribersDashboard({
  subscribers: initialSubscribers,
  speakerName,
  speakerEmail,
  initialSourceFilter,
}: SubscribersDashboardProps) {
  const timezone = useTimezone();
  const [subscribers, setSubscribers] = useState(initialSubscribers);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>(initialSourceFilter ?? "all");
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showEmailCompose, setShowEmailCompose] = useState(false);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");

  // Unique source fanflets for filter dropdown
  const sourceFanflets = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of subscribers) {
      if (s.source_fanflet_id && s.source_fanflet_title) {
        map.set(s.source_fanflet_id, s.source_fanflet_title);
      }
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [subscribers]);

  // Filter and sort
  const filteredSubscribers = useMemo(() => {
    let result = subscribers;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.email.toLowerCase().includes(q) ||
          (s.name && s.name.toLowerCase().includes(q))
      );
    }

    if (sourceFilter !== "all") {
      result = result.filter((s) => s.source_fanflet_id === sourceFilter);
    }

    result = [...result].sort((a, b) => {
      const dir = sortDirection === "asc" ? 1 : -1;
      if (sortField === "email") return a.email.localeCompare(b.email) * dir;
      if (sortField === "source") {
        return (a.source_fanflet_title ?? "").localeCompare(b.source_fanflet_title ?? "") * dir;
      }
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
    });

    return result;
  }, [subscribers, searchQuery, sourceFilter, sortField, sortDirection]);

  // Selection helpers
  const allSelected =
    filteredSubscribers.length > 0 &&
    filteredSubscribers.every((s) => selectedIds.has(s.id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSubscribers.map((s) => s.id)));
    }
  }, [allSelected, filteredSubscribers]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // CSV export
  const exportCsv = useCallback(() => {
    const target = selectedIds.size > 0
      ? filteredSubscribers.filter((s) => selectedIds.has(s.id))
      : filteredSubscribers;

    const headers = ["Email", "Name", "Subscribed Date", "Source Fanflet"];
    const rows = target.map((s) => [
      s.email,
      s.name ?? "",
      formatDate(s.created_at, timezone),
      s.source_fanflet_title ?? "Direct",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `subscribers-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredSubscribers, selectedIds, timezone]);

  // Delete
  const handleDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setDeleting(true);

    if (selectedIds.size === 1) {
      const id = Array.from(selectedIds)[0];
      const result = await deleteSubscriber(id);
      if (result.success) {
        setSubscribers((prev) => prev.filter((s) => s.id !== id));
      }
    } else {
      const ids = Array.from(selectedIds);
      const result = await deleteSubscribers(ids);
      if (result.success) {
        setSubscribers((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      }
    }

    setSelectedIds(new Set());
    setDeleting(false);
    setShowDeleteConfirm(false);
  }, [selectedIds]);

  // Email compose — mailto for now, can be upgraded to real sending later
  const handleSendEmail = useCallback(() => {
    const target = selectedIds.size > 0
      ? filteredSubscribers.filter((s) => selectedIds.has(s.id))
      : filteredSubscribers;

    const emails = target.map((s) => s.email);
    const mailto = `mailto:${speakerEmail}?bcc=${emails.join(",")}&subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(mailto, "_blank");
    setShowEmailCompose(false);
    setEmailSubject("");
    setEmailBody("");
  }, [filteredSubscribers, selectedIds, emailSubject, emailBody, speakerEmail]);

  const [now] = useState(() => Date.now());
  const thisWeek = subscribers.filter(
    (s) => new Date(s.created_at) > new Date(now - 7 * 24 * 60 * 60 * 1000)
  ).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#1B365D]">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {subscribers.length}
                </p>
                <p className="text-sm text-muted-foreground">Total subscribers</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{thisWeek}</p>
                <p className="text-sm text-muted-foreground">This week</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {sourceFanflets.length}
                </p>
                <p className="text-sm text-muted-foreground">Source Fanflets</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Source filter */}
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All sources" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {sourceFanflets.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select
              value={`${sortField}:${sortDirection}`}
              onValueChange={(v) => {
                const [field, dir] = v.split(":") as [SortField, SortDirection];
                setSortField(field);
                setSortDirection(dir);
              }}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at:desc">Newest first</SelectItem>
                <SelectItem value="created_at:asc">Oldest first</SelectItem>
                <SelectItem value="email:asc">Email A-Z</SelectItem>
                <SelectItem value="email:desc">Email Z-A</SelectItem>
                <SelectItem value="source:asc">Source A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bulk actions bar */}
          {selectedIds.size > 0 && (
            <div className="mt-4 flex items-center gap-3 bg-slate-50 rounded-lg px-4 py-3 border border-slate-200">
              <span className="text-sm font-medium text-slate-700">
                {selectedIds.size} selected
              </span>
              <div className="flex-1" />
              <Button
                variant="outline"
                size="sm"
                onClick={exportCsv}
                className="gap-1.5"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEmailCompose(true)}
                className="gap-1.5"
              >
                <Mail className="h-3.5 w-3.5" />
                Email
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions row (when nothing selected) */}
      {selectedIds.size === 0 && subscribers.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredSubscribers.length === subscribers.length
              ? `${subscribers.length} subscriber${subscribers.length === 1 ? "" : "s"}`
              : `${filteredSubscribers.length} of ${subscribers.length} subscribers`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEmailCompose(true)}
              className="gap-1.5"
            >
              <Mail className="h-3.5 w-3.5" />
              Email All
            </Button>
          </div>
        </div>
      )}

      {/* Subscriber Table */}
      {subscribers.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              No subscribers yet
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              When people subscribe through your published Fanflets, they&apos;ll appear here. Share your Fanflet QR code to start growing your audience.
            </p>
          </CardContent>
        </Card>
      ) : filteredSubscribers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              No subscribers match your search.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/80">
                  <th className="text-left py-3 px-4 w-10">
                    <button onClick={toggleAll} className="text-slate-400 hover:text-slate-600">
                      {allSelected ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500">
                    Email
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 hidden sm:table-cell">
                    Source Fanflet
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-slate-500 hidden md:table-cell">
                    Subscribed
                  </th>
                  <th className="text-right py-3 px-4 font-medium text-slate-500 w-20">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscribers.map((subscriber) => (
                  <tr
                    key={subscriber.id}
                    className={`border-b last:border-0 transition-colors ${
                      selectedIds.has(subscriber.id) ? "bg-blue-50/50" : "hover:bg-slate-50/50"
                    }`}
                  >
                    <td className="py-3 px-4">
                      <button
                        onClick={() => toggleOne(subscriber.id)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {selectedIds.has(subscriber.id) ? (
                          <CheckSquare className="h-4 w-4 text-[#1B365D]" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-slate-900">
                          {subscriber.email}
                        </p>
                        {subscriber.name && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {subscriber.name}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5 sm:hidden">
                          {subscriber.source_fanflet_title ?? "Direct"} &middot;{" "}
                          {formatDateShort(subscriber.created_at, timezone)}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 hidden sm:table-cell">
                      {subscriber.source_fanflet_title ? (
                        <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
                          <FileText className="h-3 w-3" />
                          {subscriber.source_fanflet_title}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Direct</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 hidden md:table-cell">
                      {formatDate(subscriber.created_at, timezone)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedIds(new Set([subscriber.id]));
                          setShowDeleteConfirm(true);
                        }}
                        className="p-1.5 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete subscriber"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-sm w-[90%] animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">
                  Delete {selectedIds.size === 1 ? "subscriber" : `${selectedIds.size} subscribers`}?
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This action cannot be undone. The subscriber{selectedIds.size > 1 ? "s" : ""} will
                  be permanently removed.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Email Compose Modal */}
      {showEmailCompose && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowEmailCompose(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-lg w-[95%] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Mail className="h-5 w-5 text-[#1B365D]" />
                Compose Email
              </h3>
              <button
                onClick={() => setShowEmailCompose(false)}
                className="p-1.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">
                  To
                </label>
                <p className="text-sm text-muted-foreground bg-slate-50 rounded-md px-3 py-2 border border-slate-200">
                  {selectedIds.size > 0
                    ? `${selectedIds.size} selected subscriber${selectedIds.size > 1 ? "s" : ""} (BCC)`
                    : `All ${filteredSubscribers.length} subscribers (BCC)`}
                </p>
              </div>

              <div>
                <label
                  htmlFor="email-subject"
                  className="text-sm font-medium text-slate-700 mb-1 block"
                >
                  Subject
                </label>
                <Input
                  id="email-subject"
                  placeholder="Follow-up from my presentation..."
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="email-body"
                  className="text-sm font-medium text-slate-700 mb-1 block"
                >
                  Message
                </label>
                <textarea
                  id="email-body"
                  placeholder="Hi everyone,&#10;&#10;Thank you for attending my session..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={6}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                />
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <p className="text-xs text-amber-800">
                  This will open your default email client with subscribers in BCC.
                  Your email address ({speakerEmail}) will be the sender.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEmailCompose(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSendEmail}
                  disabled={!emailSubject.trim()}
                  className="bg-[#1B365D] hover:bg-[#0f2440] text-white gap-1.5"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Open in Email Client
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
