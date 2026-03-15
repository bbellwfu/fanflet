import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { loadSponsorEntitlements } from "@fanflet/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, AlertTriangle, CreditCard } from "lucide-react";
import Link from "next/link";

interface PlanFeature {
  label: string;
  connect: boolean | string;
  studio: boolean | string;
}

const PLAN_FEATURES: PlanFeature[] = [
  { label: "Speaker connections", connect: "Up to 5", studio: "Unlimited" },
  { label: "Resource library", connect: true, studio: true },
  { label: "Campaigns", connect: "Up to 3", studio: "Unlimited" },
  { label: "Lead analytics", connect: true, studio: true },
  { label: "Resource analytics", connect: true, studio: true },
  { label: "Analytics retention", connect: "90 days", studio: "Unlimited" },
  { label: "Storage", connect: "500 MB", studio: "5 GB" },
  { label: "Team members", connect: "1 user", studio: "Unlimited" },
  { label: "Bulk operations", connect: false, studio: true },
  { label: "Engagement reports", connect: false, studio: true },
  { label: "Cross-speaker analytics", connect: false, studio: true },
  { label: "Branded landing page", connect: false, studio: true },
  { label: "SSO (SAML)", connect: false, studio: true },
  { label: "Audit log", connect: false, studio: true },
  { label: "Scheduled reports", connect: false, studio: true },
  { label: "Speaker seat licensing", connect: false, studio: true },
];

function FeatureCell({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="h-4 w-4 text-emerald-600 mx-auto" />;
  if (value === false) return <X className="h-4 w-4 text-slate-300 mx-auto" />;
  return <span className="text-sm text-slate-700">{value}</span>;
}

export default async function SponsorBillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/sponsor/billing");

  const { data: sponsor } = await supabase
    .from("sponsor_accounts")
    .select("id, speaker_label")
    .eq("auth_user_id", user.id)
    .single();

  if (!sponsor) redirect("/sponsor/onboarding");

  const speakerLabel = (sponsor as { speaker_label?: string }).speaker_label ?? "speaker";

  const [entitlements, subscriptionResult] = await Promise.all([
    loadSponsorEntitlements(supabase, sponsor.id),
    supabase
      .from("sponsor_subscriptions")
      .select("id, status, is_pilot, trial_ends_at, sponsor_plans(name, display_name, price_monthly_cents)")
      .eq("sponsor_id", sponsor.id)
      .eq("status", "active")
      .maybeSingle(),
  ]);

  const sub = subscriptionResult.data;
  const plan = sub?.sponsor_plans as unknown as {
    name: string;
    display_name: string;
    price_monthly_cents: number;
  } | null;

  const planName = plan?.name ?? "sponsor_connect";
  const planDisplayName = plan?.display_name ?? "Sponsor Connect";
  const isPilot = sub?.is_pilot ?? false;
  const trialEndsAt = sub?.trial_ends_at ? new Date(sub.trial_ends_at as string) : null;
  const isStudio = planName === "sponsor_studio";

  // Usage stats
  const [{ count: connectionsCount }, { count: campaignsCount }] = await Promise.all([
    supabase
      .from("sponsor_connections")
      .select("id", { count: "exact", head: true })
      .eq("sponsor_id", sponsor.id)
      .eq("status", "active")
      .is("ended_at", null),
    supabase
      .from("sponsor_campaigns")
      .select("id", { count: "exact", head: true })
      .eq("sponsor_id", sponsor.id),
  ]);

  const maxConnections = entitlements.limits.max_connections;
  const maxCampaigns = entitlements.limits.max_campaigns;

  // Pilot days remaining
  let pilotDaysRemaining: number | null = null;
  if (isPilot && trialEndsAt) {
    pilotDaysRemaining = Math.max(0, Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Billing</h1>
        <p className="text-muted-foreground mt-1">
          Manage your plan and view usage.
        </p>
      </div>

      {/* Pilot banner */}
      {isPilot && pilotDaysRemaining !== null && (
        <div className={`rounded-lg border px-4 py-3 flex items-center gap-3 ${
          pilotDaysRemaining <= 14
            ? "border-amber-300 bg-amber-50"
            : "border-blue-200 bg-blue-50"
        }`}>
          <AlertTriangle className={`h-5 w-5 shrink-0 ${
            pilotDaysRemaining <= 14 ? "text-amber-600" : "text-blue-600"
          }`} />
          <div className="flex-1">
            <p className={`text-sm font-medium ${
              pilotDaysRemaining <= 14 ? "text-amber-900" : "text-blue-900"
            }`}>
              {pilotDaysRemaining === 0
                ? "Your Pilot has expired. Contact us to continue with Sponsor Studio."
                : `Your Pilot expires in ${pilotDaysRemaining} day${pilotDaysRemaining !== 1 ? "s" : ""}. Contact us to continue with Sponsor Studio.`}
            </p>
            <p className={`text-xs mt-0.5 ${
              pilotDaysRemaining <= 14 ? "text-amber-700" : "text-blue-700"
            }`}>
              Pilot includes full Sponsor Studio access at no cost for a limited time.
            </p>
          </div>
          <a
            href="mailto:sponsors@fanflet.com?subject=Sponsor%20Studio%20Upgrade"
            className={`shrink-0 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium text-white ${
              pilotDaysRemaining <= 14
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            Contact us
          </a>
        </div>
      )}

      {/* Current plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Plan
          </CardTitle>
          <CardDescription>
            {isPilot
              ? "You are on a Pilot — full Studio access for a limited time."
              : `You are on ${planDisplayName}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900">{planDisplayName}</span>
            {isPilot && (
              <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Pilot</span>
            )}
          </div>

          {/* Usage meters */}
          {(typeof maxConnections === "number" && maxConnections !== -1) || (typeof maxCampaigns === "number" && maxCampaigns !== -1) ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {typeof maxConnections === "number" && maxConnections !== -1 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">{speakerLabel[0].toUpperCase() + speakerLabel.slice(1)} connections</span>
                    <span className="font-medium">{connectionsCount ?? 0} / {maxConnections}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (connectionsCount ?? 0) >= maxConnections ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, ((connectionsCount ?? 0) / maxConnections) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {typeof maxCampaigns === "number" && maxCampaigns !== -1 && (
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Campaigns</span>
                    <span className="font-medium">{campaignsCount ?? 0} / {maxCampaigns}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (campaignsCount ?? 0) >= maxCampaigns ? "bg-amber-500" : "bg-emerald-500"
                      }`}
                      style={{ width: `${Math.min(100, ((campaignsCount ?? 0) / maxCampaigns) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Unlimited connections and campaigns on your plan.</p>
          )}
        </CardContent>
      </Card>

      {/* Plan comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Plan Comparison</CardTitle>
          <CardDescription>
            Compare Sponsor Connect and Sponsor Studio features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="py-3 px-3 text-left font-medium text-muted-foreground w-1/2">Feature</th>
                  <th className="py-3 px-3 text-center font-medium text-muted-foreground">
                    <div>Connect</div>
                    <div className="text-xs font-normal">$149/mo</div>
                  </th>
                  <th className="py-3 px-3 text-center font-medium text-muted-foreground">
                    <div>Studio</div>
                    <div className="text-xs font-normal">$790/mo</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {PLAN_FEATURES.map((f) => (
                  <tr key={f.label} className="border-b last:border-0">
                    <td className="py-2.5 px-3 text-slate-700">{f.label}</td>
                    <td className="py-2.5 px-3 text-center"><FeatureCell value={f.connect} /></td>
                    <td className="py-2.5 px-3 text-center"><FeatureCell value={f.studio} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!isStudio && (
            <div className="mt-6 text-center">
              <a
                href="mailto:sponsors@fanflet.com?subject=Upgrade%20to%20Sponsor%20Studio"
                className="inline-flex items-center rounded-md bg-[#1B365D] px-6 py-2.5 text-sm font-medium text-white hover:bg-[#152b4d]"
              >
                Contact Sales to Upgrade
              </a>
              <p className="text-xs text-muted-foreground mt-2">
                Or email sponsors@fanflet.com for custom pricing and enterprise options.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
