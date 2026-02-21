import { Skeleton } from "@fanflet/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-7 w-48 bg-surface-elevated" />
        <Skeleton className="h-4 w-72 mt-2 bg-surface-elevated" />
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface rounded-lg border border-border-subtle border-t-2 border-t-border-subtle p-5"
          >
            <div className="flex items-start justify-between mb-4">
              <Skeleton className="h-3 w-24 bg-surface-elevated" />
              <Skeleton className="h-8 w-8 rounded-lg bg-surface-elevated" />
            </div>
            <Skeleton className="h-8 w-16 bg-surface-elevated" />
          </div>
        ))}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface rounded-lg border border-border-subtle overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
              <Skeleton className="h-4 w-28 bg-surface-elevated" />
              <Skeleton className="h-3 w-16 bg-surface-elevated" />
            </div>
            <div className="divide-y divide-border-subtle">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="px-5 py-3.5 flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full bg-surface-elevated shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Skeleton className="h-3.5 w-24 bg-surface-elevated" />
                    <Skeleton className="h-3 w-36 bg-surface-elevated" />
                  </div>
                  <Skeleton className="h-3 w-16 bg-surface-elevated" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
