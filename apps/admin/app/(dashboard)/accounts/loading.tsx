import { Card, CardContent, CardHeader } from "@fanflet/ui/card";
import { Skeleton } from "@fanflet/ui/skeleton";

export default function AccountsLoading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-72 mt-2" />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Skeleton className="flex-1 h-9" />
            <Skeleton className="h-9 w-full sm:w-[180px]" />
            <Skeleton className="h-9 w-20" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex gap-4 border-b pb-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <Skeleton key={i} className="h-4 flex-1 min-w-0" />
              ))}
            </div>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-3 border-b last:border-0">
                {Array.from({ length: 7 }).map((_, j) => (
                  <Skeleton key={j} className="h-4 flex-1 min-w-0" />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
