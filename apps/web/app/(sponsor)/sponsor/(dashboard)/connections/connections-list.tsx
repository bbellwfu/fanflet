"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { respondToConnection, endSponsorConnection, hideSpeakerConnectionFromView } from "./actions";
import { toast } from "sonner";
import { Loader2, Check, X } from "lucide-react";
import { formatDate } from "@fanflet/db/timezone";
import { useTimezone } from "@/lib/timezone-context";

type Connection = {
  id: string;
  status: string;
  initiatedBy: string;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  endedAt: string | null;
  speakerName: string;
  speakerSlug: string | null;
};

function displayStatus(status: string, endedAt: string | null, label: string): string {
  if (status === "revoked") return `Canceled by ${label[0].toUpperCase() + label.slice(1)}`;
  if (status === "active" && endedAt) return "Ended";
  return status;
}

interface ConnectionsListProps {
  connections: Connection[];
  speakerLabel?: string;
}

export function ConnectionsList({ connections, speakerLabel = "speaker" }: ConnectionsListProps) {
  const router = useRouter();
  const timezone = useTimezone();
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [endingId, setEndingId] = useState<string | null>(null);
  const [hideId, setHideId] = useState<string | null>(null);
  const [endConfirmConn, setEndConfirmConn] = useState<Connection | null>(null);
  const [hideConfirmConn, setHideConfirmConn] = useState<Connection | null>(null);

  async function handleRespond(id: string, accept: boolean) {
    setRespondingId(id);
    try {
      const result = await respondToConnection(id, accept);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(accept ? "Connection accepted." : "Connection declined.");
        router.refresh();
      }
    } finally {
      setRespondingId(null);
    }
  }

  async function handleEndConnection() {
    if (!endConfirmConn) return;
    const id = endConfirmConn.id;
    setEndingId(id);
    setEndConfirmConn(null);
    try {
      const result = await endSponsorConnection(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Connection ended. You will no longer receive new lead data from this ${speakerLabel}; historical data remains visible.`);
        router.refresh();
      }
    } finally {
      setEndingId(null);
    }
  }

  async function handleHideFromView() {
    if (!hideConfirmConn) return;
    const id = hideConfirmConn.id;
    setHideId(id);
    setHideConfirmConn(null);
    try {
      const result = await hideSpeakerConnectionFromView(id);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success("Connection hidden from your list. Data is retained for reporting.");
        router.refresh();
      }
    } finally {
      setHideId(null);
    }
  }

  if (connections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        No connection requests yet. When {speakerLabel}s send you a request, it will appear here.
      </p>
    );
  }

  return (
    <>
    <ul className="divide-y divide-slate-100 space-y-0">
      {connections.map((conn) => {
        const statusLabel = displayStatus(conn.status, conn.endedAt, speakerLabel);
        const subtitle = conn.endedAt
          ? `${statusLabel} · Ended ${formatDate(conn.endedAt, timezone)}`
          : `Requested ${conn.initiatedBy === "speaker" ? `by ${speakerLabel}` : "by you"} · ${formatDate(conn.createdAt, timezone)}`;
        const canEndConnection = conn.status === "active" && !conn.endedAt;
        const canHideFromView =
          conn.status === "revoked" ||
          conn.status === "declined" ||
          (conn.status === "active" && !!conn.endedAt);

        return (
          <li key={conn.id} className="py-4 first:pt-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{conn.speakerName}</p>
                <p className="text-xs text-muted-foreground">
                  {subtitle}
                </p>
                {conn.message && (
                  <p className="text-sm text-slate-600 mt-1">&ldquo;{conn.message}&rdquo;</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-medium px-2 py-1 rounded ${
                    conn.status === "active" && conn.endedAt
                      ? "bg-slate-100 text-slate-600"
                      : conn.status === "active"
                        ? "bg-emerald-100 text-emerald-800"
                        : conn.status === "declined"
                          ? "bg-slate-100 text-slate-600"
                          : conn.status === "revoked"
                            ? "bg-slate-100 text-slate-500"
                            : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {statusLabel}
                </span>
                {conn.status === "pending" && (
                  <>
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => handleRespond(conn.id, true)}
                      disabled={respondingId === conn.id}
                    >
                      {respondingId === conn.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRespond(conn.id, false)}
                      disabled={respondingId === conn.id}
                    >
                      <X className="w-4 h-4" />
                      Decline
                    </Button>
                  </>
                )}
                {canEndConnection && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => setEndConfirmConn(conn)}
                    disabled={endingId === conn.id}
                  >
                    {endingId === conn.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "End connection"
                    )}
                  </Button>
                )}
                {canHideFromView && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-muted-foreground"
                    onClick={() => setHideConfirmConn(conn)}
                    disabled={hideId === conn.id}
                  >
                    {hideId === conn.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Hide from list"
                    )}
                  </Button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>

    <Dialog open={!!endConfirmConn} onOpenChange={(open) => !open && setEndConfirmConn(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            End connection with {endConfirmConn?.speakerName}?
          </DialogTitle>
          <DialogDescription>
            You will no longer receive new lead data from this {speakerLabel} as of now. Historical data will remain visible to both of you for reporting.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setEndConfirmConn(null)}
            disabled={!!endingId}
          >
            Keep connection
          </Button>
          <Button
            variant="default"
            onClick={handleEndConnection}
            disabled={!!endingId}
          >
            {endingId ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "End connection"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <Dialog open={!!hideConfirmConn} onOpenChange={(open) => !open && setHideConfirmConn(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            Hide {hideConfirmConn?.speakerName} from your list?
          </DialogTitle>
          <DialogDescription>
            This connection will be removed from your list. Data is retained for reporting and anonymized use.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setHideConfirmConn(null)}
            disabled={!!hideId}
          >
            Cancel
          </Button>
          <Button
            variant="default"
            onClick={handleHideFromView}
            disabled={!!hideId}
          >
            {hideId ? <Loader2 className="w-4 h-4 animate-spin" /> : "Hide from list"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  );
}
