import { Skeleton } from "@fanflet/ui/skeleton";

export default function AccountsLoading() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-7 w-32 bg-surface-elevated" />
        <Skeleton className="h-4 w-64 mt-2 bg-surface-elevated" />
      </div>

      <div className="bg-surface rounded-lg border border-border-subtle p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <Skeleton className="flex-1 h-9 bg-surface-elevated" />
          <Skeleton className="h-9 w-full sm:w-[180px] bg-surface-elevated" />
          <Skeleton className="h-9 w-20 bg-surface-elevated" />
        </div>
      </div>

      <div className="bg-surface rounded-lg border border-border-subtle overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2.5">
          <Skeleton className="h-7 w-7 rounded-lg bg-surface-elevated" />
          <Skeleton className="h-4 w-24 bg-surface-elevated" />
        </div>
        <div className="divide-y divide-border-subtle">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-4">
              <Skeleton className="h-4 w-28 bg-surface-elevated" />
              <Skeleton className="h-4 w-40 bg-surface-elevated" />
              <Skeleton className="h-4 w-16 bg-surface-elevated" />
              <Skeleton className="h-4 w-8 bg-surface-elevated" />
              <Skeleton className="h-4 w-8 bg-surface-elevated" />
              <Skeleton className="h-4 w-16 rounded-full bg-surface-elevated" />
              <Skeleton className="h-4 w-20 bg-surface-elevated" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
