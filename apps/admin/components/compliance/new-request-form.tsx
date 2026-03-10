"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@fanflet/ui/button";
import {
  createDeletionRequest,
  batchCreateDeletionRequests,
  lookupUserByEmail,
} from "@/app/(dashboard)/compliance/actions";

type Mode = "single" | "batch";

export function NewRequestForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("single");

  const [email, setEmail] = useState("");
  const [lookupResults, setLookupResults] = useState<
    { type: string; email: string; name: string | null; authUserId: string | null; id: string }[]
  >([]);
  const [selectedUser, setSelectedUser] = useState<typeof lookupResults[0] | null>(null);
  const [requestType, setRequestType] = useState("erasure");
  const [source, setSource] = useState("admin_initiated");
  const [regulation, setRegulation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [batchEmails, setBatchEmails] = useState("");
  const [batchResults, setBatchResults] = useState<
    { email: string; requestId?: string; error?: string }[] | null
  >(null);

  async function handleLookup() {
    if (!email.trim()) return;
    setError(null);
    const result = await lookupUserByEmail(email);
    if (result.error) {
      setError(result.error);
      return;
    }
    setLookupResults(result.data ?? []);
    if (result.data && result.data.length === 1) {
      setSelectedUser(result.data[0]);
    }
  }

  function handleSubmitSingle() {
    if (!selectedUser) {
      setError("Please look up and select a user first");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createDeletionRequest({
        subjectEmail: selectedUser.email,
        subjectType: selectedUser.type as "speaker" | "sponsor" | "audience",
        requestType: requestType as "erasure",
        source: source as "admin_initiated",
        sourceReference: notes || undefined,
        regulation: regulation ? (regulation as "gdpr") : undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data?.id) {
        router.push(`/compliance/${result.data.id}`);
      }
    });
  }

  function handleSubmitBatch() {
    const emails = batchEmails
      .split(/[\n,]/)
      .map((e) => e.trim())
      .filter(Boolean);

    if (emails.length === 0) {
      setError("Please enter at least one email address");
      return;
    }
    setError(null);

    startTransition(async () => {
      const result = await batchCreateDeletionRequests(emails);
      if (result.error) {
        setError(result.error);
        return;
      }
      setBatchResults(result.data ?? []);
    });
  }

  return (
    <div className="space-y-6">
      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors ${
            mode === "single"
              ? "bg-primary-muted text-primary-soft"
              : "bg-surface-elevated text-fg-secondary hover:text-fg"
          }`}
        >
          Single User
        </button>
        <button
          type="button"
          onClick={() => setMode("batch")}
          className={`px-4 py-2 rounded-md text-[13px] font-medium transition-colors ${
            mode === "batch"
              ? "bg-primary-muted text-primary-soft"
              : "bg-surface-elevated text-fg-secondary hover:text-fg"
          }`}
        >
          Batch (CSV)
        </button>
      </div>

      {error && (
        <div className="bg-error/10 border border-error/20 rounded-md px-4 py-3 text-[13px] text-error">
          {error}
        </div>
      )}

      {mode === "single" ? (
        <div className="space-y-6">
          {/* Email lookup */}
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-fg">
              Look up user by email
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSelectedUser(null);
                  setLookupResults([]);
                }}
                placeholder="user@example.com"
                className="flex-1 h-9 rounded-md border border-border-subtle bg-surface px-3 text-[13px] text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLookup}
                disabled={!email.trim()}
              >
                Look up
              </Button>
            </div>
          </div>

          {/* Lookup results */}
          {lookupResults.length > 0 && (
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-fg">
                Select account
              </label>
              <div className="space-y-1">
                {lookupResults.map((user) => (
                  <button
                    key={`${user.type}-${user.id}`}
                    type="button"
                    onClick={() => setSelectedUser(user)}
                    className={`w-full text-left px-4 py-3 rounded-md border text-[13px] transition-colors ${
                      selectedUser?.id === user.id
                        ? "border-primary bg-primary-muted"
                        : "border-border-subtle bg-surface hover:bg-surface-elevated"
                    }`}
                  >
                    <span className="font-medium text-fg">
                      {user.name ?? "Unknown"}
                    </span>
                    <span className="text-fg-muted ml-2">{user.email}</span>
                    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-fg-muted">
                      {user.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {lookupResults.length === 0 && email.trim() && (
            <p className="text-[13px] text-fg-muted">
              No results yet. Click &ldquo;Look up&rdquo; to search.
            </p>
          )}

          {/* Request details */}
          {selectedUser && (
            <div className="space-y-4 border-t border-border-subtle pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-fg">
                    Request type
                  </label>
                  <select
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                    className="w-full h-9 rounded-md border border-border-subtle bg-surface px-3 text-[13px] text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="erasure">Erasure (deletion)</option>
                    <option value="export">Data export</option>
                    <option value="access">Access request</option>
                    <option value="rectification">Rectification</option>
                    <option value="restriction">Restriction</option>
                    <option value="objection">Objection</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[13px] font-medium text-fg">
                    Source
                  </label>
                  <select
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full h-9 rounded-md border border-border-subtle bg-surface px-3 text-[13px] text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="admin_initiated">Admin initiated</option>
                    <option value="user_self_service">User self-service</option>
                    <option value="email_request">Email request</option>
                    <option value="legal_request">Legal request</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-fg">
                  Regulation (optional)
                </label>
                <select
                  value={regulation}
                  onChange={(e) => setRegulation(e.target.value)}
                  className="w-full h-9 rounded-md border border-border-subtle bg-surface px-3 text-[13px] text-fg focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">None</option>
                  <option value="gdpr">GDPR (30 days)</option>
                  <option value="ccpa">CCPA (45 days)</option>
                  <option value="lgpd">LGPD (15 days)</option>
                  <option value="pipeda">PIPEDA (30 days)</option>
                  <option value="other">Other (30 days)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[13px] font-medium text-fg">
                  Notes (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Reason for request, reference number, etc."
                  className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-[13px] text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              <Button
                onClick={handleSubmitSingle}
                disabled={isPending}
                className="w-full sm:w-auto"
              >
                {isPending ? "Creating..." : "Create Request"}
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[13px] font-medium text-fg">
              Email addresses (one per line or comma-separated)
            </label>
            <textarea
              value={batchEmails}
              onChange={(e) => setBatchEmails(e.target.value)}
              rows={8}
              placeholder={"test1@example.com\ntest2@example.com\ntest3@example.com"}
              className="w-full rounded-md border border-border-subtle bg-surface px-3 py-2 text-[13px] font-mono text-fg placeholder:text-fg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <p className="text-[12px] text-fg-muted">
              Each email will create an individual erasure request for the matching speaker account.
            </p>
          </div>
          <Button
            onClick={handleSubmitBatch}
            disabled={isPending || !batchEmails.trim()}
          >
            {isPending ? "Processing..." : "Create Batch Requests"}
          </Button>

          {batchResults && (
            <div className="space-y-2 border-t border-border-subtle pt-4">
              <p className="text-[13px] font-medium text-fg">
                Results: {batchResults.filter((r) => r.requestId).length} created,{" "}
                {batchResults.filter((r) => r.error).length} failed
              </p>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {batchResults.map((r, i) => (
                  <div
                    key={i}
                    className={`px-3 py-2 rounded text-[12px] ${
                      r.requestId
                        ? "bg-success/10 text-success"
                        : "bg-error/10 text-error"
                    }`}
                  >
                    {r.email}: {r.requestId ? "Created" : r.error}
                  </div>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/compliance")}
              >
                View All Requests
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
