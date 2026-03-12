"use client";

import { useEffect } from "react";

export default function FanfletError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[fanflet] Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-8 text-center">
      <h2 className="text-xl font-semibold text-gray-900">
        Unable to load this page
      </h2>
      <p className="max-w-md text-sm text-gray-600">
        Something went wrong loading this Fanflet. Please try refreshing.
      </p>
      <button
        onClick={reset}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
