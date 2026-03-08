import { UsersIcon, FileTextIcon, MailIcon, RocketIcon } from "lucide-react";
import { getGrowthMetrics, getActivationRate } from "../actions";
import { GrowthChart } from "../components/growth-chart";

export const metadata = { title: "Analytics — Growth" };

export default async function GrowthPage() {
  const [growth, activation] = await Promise.all([
    getGrowthMetrics(),
    getActivationRate(),
  ]);

  const totalNewSpeakers = growth.speakers.reduce((s, p) => s + p.count, 0);
  const totalNewFanflets = growth.fanflets.reduce((s, p) => s + p.count, 0);
  const totalNewSubscribers = growth.subscribers.reduce((s, p) => s + p.count, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-fg tracking-tight">
          Growth
        </h1>
        <p className="text-sm text-fg-secondary mt-0.5">
          Platform adoption trends — last 90 days
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[12px] font-medium uppercase tracking-wider text-fg-secondary">
              New Speakers
            </p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary-muted text-primary-soft">
              <UsersIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-fg tabular-nums">
            {totalNewSpeakers}
          </p>
          <p className="text-[12px] text-fg-muted mt-1">last 90 days</p>
        </div>

        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[12px] font-medium uppercase tracking-wider text-fg-secondary">
              New Fanflets
            </p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-info/10 text-info">
              <FileTextIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-fg tabular-nums">
            {totalNewFanflets}
          </p>
          <p className="text-[12px] text-fg-muted mt-1">last 90 days</p>
        </div>

        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[12px] font-medium uppercase tracking-wider text-fg-secondary">
              New Subscribers
            </p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-success/10 text-success">
              <MailIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-fg tabular-nums">
            {totalNewSubscribers}
          </p>
          <p className="text-[12px] text-fg-muted mt-1">last 90 days</p>
        </div>

        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <div className="flex items-start justify-between mb-2">
            <p className="text-[12px] font-medium uppercase tracking-wider text-fg-secondary">
              Activation Rate
            </p>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-warning/10 text-warning">
              <RocketIcon className="w-4 h-4" />
            </div>
          </div>
          <p className="text-3xl font-semibold text-fg tabular-nums">
            {activation.rate.toFixed(1)}%
          </p>
          <p className="text-[12px] text-fg-muted mt-1">
            {activation.activatedSpeakers} of {activation.totalSpeakers} speakers published (30d)
          </p>
        </div>
      </div>

      {/* Growth Charts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <h2 className="text-sm font-semibold text-fg mb-4">Speaker Signups</h2>
          <GrowthChart
            data={growth.speakers}
            color="var(--color-primary, #6d5fba)"
            label="Speakers"
          />
        </div>
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <h2 className="text-sm font-semibold text-fg mb-4">Fanflets Created</h2>
          <GrowthChart
            data={growth.fanflets}
            color="var(--color-info, #3BA5D9)"
            label="Fanflets"
          />
        </div>
        <div className="bg-surface rounded-lg border border-border-subtle p-5">
          <h2 className="text-sm font-semibold text-fg mb-4">Subscriber Growth</h2>
          <GrowthChart
            data={growth.subscribers}
            color="var(--color-success, #10b981)"
            label="Subscribers"
          />
        </div>
      </div>
    </div>
  );
}
