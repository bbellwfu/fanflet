"use client";

import { useSearchParams } from "next/navigation";

export function useImpParam(): string | null {
  return useSearchParams().get("__imp");
}

export function withImp(url: string, imp: string | null): string {
  if (!imp) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}__imp=${encodeURIComponent(imp)}`;
}
