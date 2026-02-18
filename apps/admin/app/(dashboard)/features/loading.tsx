import { Skeleton } from "@fanflet/ui/skeleton";

export default function FeaturesLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <Skeleton className="h-7 w-48 bg-surface-elevated" />
          <Skeleton className="h-4 w-80 mt-2 bg-surface-elevated" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg bg-surface-elevated" />
      </div>

      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2.5">
          <Skeleton className="h-7 w-7 rounded-lg bg-surface-elevated" />
          <Skeleton className="h-4 w-28 bg-surface-elevated" />
          <Skeleton className="h-3 w-16 bg-surface-elevated" />
        </div>
        <div className="divide-y divide-border-subtle">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="px-5 py-4 flex items-center justify-between"
            >
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-4 w-32 bg-surface-elevated" />
                  <Skeleton className="h-4 w-24 bg-surface-elevated" />
                </div>
                <Skeleton className="h-3 w-56 bg-surface-elevated" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-4 w-12 rounded-full bg-surface-elevated" />
                  <Skeleton className="h-4 w-16 rounded-full bg-surface-elevated" />
                </div>
              </div>
              <Skeleton className="h-6 w-11 rounded-full bg-surface-elevated" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
