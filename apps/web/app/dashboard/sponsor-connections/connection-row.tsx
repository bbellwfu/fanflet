"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { rescindSponsorConnection, endSponsorConnection, hideSponsorConnectionFromView } from "./actions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

function displayStatus(status: string, endedAt: string | null): string {
  if (status === "revoked") return "Canceled by Speaker";
  if (status === "active" && endedAt) return "Ended";
  return status;
}

interface ConnectionRowProps {
  id: string;
  companyName: string;
  status: string;
  initiatedBy: string;
  createdAt: string;
  endedAt: string | null;
}

export function ConnectionRow({
  id,
  companyName,
  status,
  initiatedBy,
  createdAt,
  endedAt,
}: ConnectionRowProps) {
  const [loading, setLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [endConfirmOpen, setEndConfirmOpen] = useState(false);
  const [hideConfirmOpen, setHideConfirmOpen] = useState(false);

  const canRescind =
    status === "pending" && initiatedBy === "speaker";

  const canEndConnection =
    status === "active" && !endedAt;

  const canHideFromView =
    status === "revoked" || status === "declined" || (status === "active" && !!endedAt);

  async function handleHideFromView() {
    setLoading(true);
    const result = await hideSponsorConnectionFromView(id);
    setLoading(false);
    setHideConfirmOpen(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Connection hidden from your list. Data is retained for reporting.");
    }
  }

  async function handleRescind() {
    setLoading(true);
    const result = await rescindSponsorConnection(id);
    setLoading(false);
    setConfirmOpen(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Connection request cancelled.");
    }
  }

  async function handleEndConnection() {
    setLoading(true);
    const result = await endSponsorConnection(id);
    setLoading(false);
    setEndConfirmOpen(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Connection ended. You will no longer send new lead data to this sponsor; historical data remains visible to both of you.");
    }
  }

  const statusLabel = displayStatus(status, endedAt);
  const subtitle = endedAt
    ? `${statusLabel} · Ended ${new Date(endedAt).toLocaleDateString()}`
    : `${statusLabel} · ${new Date(createdAt).toLocaleDateString()}`;

  return (
    <>
      <li className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <p className="font-medium truncate">{companyName}</p>
          <p className="text-xs text-muted-foreground">
            {subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canRescind && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
              disabled={loading}
            >
              Cancel request
            </Button>
          )}
          {canEndConnection && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setEndConfirmOpen(true)}
              disabled={loading}
            >
              End connection
            </Button>
          )}
          {canHideFromView && (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setHideConfirmOpen(true)}
              disabled={loading}
            >
              Hide from list
            </Button>
          )}
          <span
            className={`text-xs font-medium px-2 py-1 rounded ${
              status === "active" && endedAt
                ? "bg-slate-100 text-slate-600"
                : status === "active"
                  ? "bg-emerald-100 text-emerald-800"
                  : status === "pending"
                    ? "bg-amber-100 text-amber-800"
                    : status === "revoked"
                      ? "bg-slate-100 text-slate-500"
                      : "bg-slate-100 text-slate-600"
            }`}
          >
            {statusLabel}
          </span>
        </div>
      </li>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel connection request?</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your request to {companyName}? They will no longer see this request, and you can send a new one later if you change your mind.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={loading}
            >
              Keep request
            </Button>
            <Button
              variant="destructive"
              onClick={handleRescind}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Yes, cancel request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={endConfirmOpen} onOpenChange={setEndConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>End connection with {companyName}?</DialogTitle>
            <DialogDescription>
              You will stop sending new lead and click data to this sponsor as of now. Historical data will remain visible to both of you for reporting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEndConfirmOpen(false)}
              disabled={loading}
            >
              Keep connection
            </Button>
            <Button
              variant="default"
              onClick={handleEndConnection}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "End connection"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={hideConfirmOpen} onOpenChange={setHideConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Hide this connection from your list?</DialogTitle>
            <DialogDescription>
              This connection will be removed from your connections list. Your data is retained for reporting and anonymized use; you can contact support if you need to see it again.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setHideConfirmOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="default"
              onClick={handleHideFromView}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hide from list"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
