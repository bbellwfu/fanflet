"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

interface LockedFeatureCardProps {
  title: string;
  description: string;
  planRequired: "Pro" | "Enterprise";
  /** Optional teaser stat shown above the CTA */
  teaser?: string;
  /** Chart component rendered behind the blur overlay */
  children?: ReactNode;
}

export function LockedFeatureCard({
  title,
  description,
  planRequired,
  teaser,
  children,
}: LockedFeatureCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="relative min-h-[200px]">
        {children && (
          <div className="absolute inset-0 blur-[6px] opacity-50 pointer-events-none select-none" aria-hidden>
            {children}
          </div>
        )}
        <div className="relative z-10 flex flex-col items-center justify-center text-center py-8 px-4">
          {teaser && (
            <p className="text-sm font-medium text-slate-700 mb-3">{teaser}</p>
          )}
          <p className="text-sm text-muted-foreground max-w-xs mb-4">
            {description}
          </p>
          <Button asChild size="sm">
            <Link href="/dashboard/settings#subscription">
              Upgrade to {planRequired}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
