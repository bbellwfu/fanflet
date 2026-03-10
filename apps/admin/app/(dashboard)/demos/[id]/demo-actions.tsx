"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@fanflet/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@fanflet/ui/dialog";
import { Input } from "@fanflet/ui/input";
import { Label } from "@fanflet/ui/label";
import {
  Trash2Icon,
  ArrowRightLeftIcon,
  ClockIcon,
  AlertTriangleIcon,
  RefreshCwIcon,
} from "lucide-react";
import { toast } from "sonner";
import { deleteDemoEnvironment, convertDemo, extendDemoTTL, retryDemoEnvironment } from "../actions";

interface DemoActionsProps {
  demoId: string;
  status: string;
}

export function DemoActions({ demoId, status }: DemoActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);
  const [extendOpen, setExtendOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [authUserId, setAuthUserId] = useState("");

  const handleRetry = async () => {
    setLoading(true);
    const result = await retryDemoEnvironment(demoId);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Retrying demo provisioning...");
      router.refresh();
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    const result = await deleteDemoEnvironment(demoId);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Demo environment deleted");
      setDeleteOpen(false);
      router.push("/demos");
    }
  };

  const handleConvert = async () => {
    if (!authUserId.trim()) {
      toast.error("Enter the real user's auth ID");
      return;
    }
    setLoading(true);
    const result = await convertDemo(demoId, authUserId.trim());
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Demo converted to real account");
      setConvertOpen(false);
      router.refresh();
    }
  };

  const handleExtend = async (days: number) => {
    setLoading(true);
    const result = await extendDemoTTL(demoId, days);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(`Extended by ${days} days`);
      setExtendOpen(false);
      router.refresh();
    }
  };

  const isActive = status === "active";

  return (
    <>
      {isActive && (
        <>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExtendOpen(true)}
            className="gap-1.5"
          >
            <ClockIcon className="w-3.5 h-3.5" />
            Extend
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConvertOpen(true)}
            className="gap-1.5"
          >
            <ArrowRightLeftIcon className="w-3.5 h-3.5" />
            Convert
          </Button>
        </>
      )}

      {status === "failed" && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          disabled={loading}
          className="gap-1.5"
        >
          <RefreshCwIcon className="w-3.5 h-3.5" />
          {loading ? "Retrying..." : "Retry"}
        </Button>
      )}

      {(isActive || status === "failed" || status === "expired") && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDeleteOpen(true)}
          className="gap-1.5 text-error hover:text-error hover:bg-error/10 hover:border-error/30"
        >
          <Trash2Icon className="w-3.5 h-3.5" />
          Delete
        </Button>
      )}

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangleIcon className="w-5 h-5 text-error" />
              Delete Demo Environment
            </DialogTitle>
            <DialogDescription>
              This will permanently delete the demo account, all fanflets,
              resources, sponsor connections, and associated auth users. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDelete}
              disabled={loading}
              className="bg-error text-white hover:bg-error/90"
            >
              {loading ? "Deleting..." : "Delete Demo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert Dialog */}
      <Dialog open={convertOpen} onOpenChange={setConvertOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeftIcon className="w-5 h-5 text-primary" />
              Convert to Real Account
            </DialogTitle>
            <DialogDescription>
              Transfer all demo data (fanflets, resources, sponsors) to the
              prospect&apos;s real account. Enter the auth user ID of the user
              who signed up.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="auth-user-id" className="text-[13px]">
              Real Auth User ID
            </Label>
            <Input
              id="auth-user-id"
              value={authUserId}
              onChange={(e) => setAuthUserId(e.target.value)}
              placeholder="UUID of the signed-up user"
              className="mt-1.5"
              autoFocus
            />
            <p className="text-[12px] text-fg-muted mt-1.5">
              Find this in Accounts page after the prospect signs up.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConvertOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConvert}
              disabled={loading || !authUserId.trim()}
            >
              {loading ? "Converting..." : "Convert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Dialog */}
      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-primary" />
              Extend Demo TTL
            </DialogTitle>
            <DialogDescription>
              Extend the expiration date for this demo environment.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 py-2">
            {[7, 14, 30].map((days) => (
              <Button
                key={days}
                variant="outline"
                size="sm"
                onClick={() => handleExtend(days)}
                disabled={loading}
                className="flex-1"
              >
                +{days} days
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExtendOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
