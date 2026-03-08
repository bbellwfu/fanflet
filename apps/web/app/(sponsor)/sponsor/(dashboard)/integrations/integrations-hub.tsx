"use client";

import { useState, useTransition } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Zap,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type { IntegrationConnection } from "./actions";
import {
  addZapierWebhook,
  removeZapierWebhook,
  disconnectIntegration,
} from "./actions";

interface IntegrationsHubProps {
  connections: IntegrationConnection[];
  recentEvents: Array<{
    id: string;
    platform: string;
    eventType: string;
    status: string;
    attemptCount: number;
    errorMessage: string | null;
    createdAt: string;
    resolvedAt: string | null;
  }>;
}

const PLATFORM_META: Record<
  string,
  { name: string; icon: React.ReactNode; description: string; available: boolean }
> = {
  zapier: {
    name: "Zapier",
    icon: <Zap className="w-5 h-5 text-orange-500" />,
    description: "Connect to 7,000+ apps via webhook. Automatically sync leads, subscribers, and engagement events.",
    available: true,
  },
  hubspot: {
    name: "HubSpot",
    icon: <ExternalLink className="w-5 h-5 text-orange-400" />,
    description: "Sync leads and contacts directly to your HubSpot CRM.",
    available: false,
  },
  mailchimp: {
    name: "Mailchimp",
    icon: <ExternalLink className="w-5 h-5 text-yellow-600" />,
    description: "Add leads to Mailchimp audiences and trigger email campaigns.",
    available: false,
  },
  pipedrive: {
    name: "Pipedrive",
    icon: <ExternalLink className="w-5 h-5 text-green-600" />,
    description: "Create deals and contacts in Pipedrive from lead data.",
    available: false,
  },
  google_sheets: {
    name: "Google Sheets",
    icon: <ExternalLink className="w-5 h-5 text-green-500" />,
    description: "Append lead data to a Google Sheet in real time.",
    available: false,
  },
  airtable: {
    name: "Airtable",
    icon: <ExternalLink className="w-5 h-5 text-blue-500" />,
    description: "Push event data to Airtable bases.",
    available: false,
  },
};

const STATUS_BADGES: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  connected: {
    label: "Connected",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  degraded: {
    label: "Degraded",
    className: "bg-amber-50 text-amber-700 border-amber-200",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  disconnected: {
    label: "Disconnected",
    className: "bg-gray-50 text-gray-500 border-gray-200",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
  expired: {
    label: "Expired",
    className: "bg-red-50 text-red-700 border-red-200",
    icon: <XCircle className="w-3.5 h-3.5" />,
  },
};

const EVENT_STATUS_STYLES: Record<string, string> = {
  success: "text-emerald-600",
  failed: "text-red-600",
  pending: "text-amber-600",
  retrying: "text-amber-600",
};

export function IntegrationsHub({ connections, recentEvents }: IntegrationsHubProps) {
  const zapierConnection = connections.find((c) => c.platform === "zapier");

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ZapierCard connection={zapierConnection} />
        {Object.entries(PLATFORM_META)
          .filter(([key]) => key !== "zapier")
          .map(([key, meta]) => (
            <ComingSoonCard key={key} platform={key} meta={meta} />
          ))}
      </div>

      {recentEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
            <CardDescription>Last 20 integration events.</CardDescription>
          </CardHeader>
          <CardContent>
            <EventLog events={recentEvents} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ZapierCard({ connection }: { connection?: IntegrationConnection }) {
  const [showForm, setShowForm] = useState(!connection);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const meta = PLATFORM_META.zapier;
  const status = connection ? STATUS_BADGES[connection.status] ?? STATUS_BADGES.disconnected : null;

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const result = await addZapierWebhook(webhookUrl.trim());
      if (result.error) {
        setError(result.error);
      } else {
        setWebhookUrl("");
        setShowForm(false);
      }
    });
  }

  function handleRemove(url: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeZapierWebhook(url);
      if (result.error) setError(result.error);
    });
  }

  function handleDisconnect() {
    if (!connection) return;
    setError(null);
    startTransition(async () => {
      const result = await disconnectIntegration(connection.id);
      if (result.error) setError(result.error);
    });
  }

  return (
    <Card className="md:col-span-2 lg:col-span-3">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {meta.icon}
            <div>
              <CardTitle className="text-base">{meta.name}</CardTitle>
              <CardDescription className="text-sm">
                {meta.description}
              </CardDescription>
            </div>
          </div>
          {status && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${status.className}`}
            >
              {status.icon}
              {status.label}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {connection && connection.webhookUrls.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Webhook URLs</p>
            {connection.webhookUrls.map((url) => (
              <div
                key={url}
                className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-md border"
              >
                <code className="flex-1 text-xs text-slate-600 truncate">
                  {url}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                  onClick={() => handleRemove(url)}
                  disabled={isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {(showForm || connection) && (
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-1">
              <Input
                type="url"
                placeholder="https://hooks.zapier.com/hooks/catch/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                disabled={isPending}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && webhookUrl.trim()) handleAdd();
                }}
              />
              {error && (
                <p className="text-xs text-red-600">{error}</p>
              )}
            </div>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={isPending || !webhookUrl.trim()}
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              {connection ? "Add URL" : "Connect"}
            </Button>
          </div>
        )}

        {!showForm && !connection && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Zap className="w-4 h-4 mr-1.5" />
            Set up Zapier
          </Button>
        )}

        {connection && (
          <div className="flex items-center justify-between pt-2 border-t">
            <p className="text-xs text-muted-foreground">
              Connected {new Date(connection.createdAt).toLocaleDateString()}
              {connection.lastSyncAt && (
                <> &middot; Last sync {new Date(connection.lastSyncAt).toLocaleDateString()}</>
              )}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleDisconnect}
              disabled={isPending}
            >
              Disconnect
            </Button>
          </div>
        )}

        {connection?.errorMessage && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-700">{connection.errorMessage}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ComingSoonCard({
  platform: _platform,
  meta,
}: {
  platform: string;
  meta: { name: string; icon: React.ReactNode; description: string };
}) {
  return (
    <Card className="opacity-60">
      <CardHeader>
        <div className="flex items-center gap-3">
          {meta.icon}
          <div>
            <CardTitle className="text-base">{meta.name}</CardTitle>
            <CardDescription className="text-sm">
              {meta.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border bg-slate-50 text-slate-500 border-slate-200">
          <Clock className="w-3.5 h-3.5" />
          Coming soon
        </span>
      </CardContent>
    </Card>
  );
}

function EventLog({
  events,
}: {
  events: IntegrationsHubProps["recentEvents"];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 font-medium">Platform</th>
            <th className="pb-2 font-medium">Event</th>
            <th className="pb-2 font-medium">Status</th>
            <th className="pb-2 font-medium">Attempts</th>
            <th className="pb-2 font-medium">Time</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => {
            const statusStyle = EVENT_STATUS_STYLES[event.status] ?? "text-slate-600";
            return (
              <tr key={event.id} className="border-b last:border-0">
                <td className="py-2.5 capitalize">
                  {PLATFORM_META[event.platform]?.name ?? event.platform}
                </td>
                <td className="py-2.5">
                  <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">
                    {event.eventType}
                  </code>
                </td>
                <td className={`py-2.5 font-medium capitalize ${statusStyle}`}>
                  {event.status}
                </td>
                <td className="py-2.5">{event.attemptCount}</td>
                <td className="py-2.5 text-muted-foreground text-xs">
                  {new Date(event.createdAt).toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
