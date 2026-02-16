import { Card, CardContent, CardHeader } from "@fanflet/ui/card";
import { Skeleton } from "@fanflet/ui/skeleton";

export default function FeaturesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-80 mt-2" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-28" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-6 w-11 rounded-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
