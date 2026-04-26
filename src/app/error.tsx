"use client";

import { useEffect } from "react";

/**
 * Per-segment error boundary. Catches client-side errors raised inside
 * any /app/* route. The most common cause is a stale chunk hash after
 * a deploy (long-lived tab requests a JS chunk that no longer exists).
 * For that one we self-heal: force a full reload so the browser fetches
 * the new chunk graph. Anything else surfaces a clean retry UI.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isChunkError =
    error.name === "ChunkLoadError" ||
    /Loading chunk \d+ failed/.test(error.message) ||
    /ChunkLoadError/.test(error.message);

  useEffect(() => {
    if (isChunkError && typeof window !== "undefined") {
      // Self-heal: full reload picks up the new chunk hashes.
      window.location.reload();
    }
  }, [isChunkError]);

  if (isChunkError) {
    return (
      <div className="flex h-full items-center justify-center bg-[#FAFAF8]">
        <div className="text-center font-mono text-[12px] text-neutral-500">
          Refreshing to a newer build…
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center bg-[#FAFAF8] p-8">
      <div className="max-w-md text-center">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
          Something broke
        </div>
        <h2 className="font-display text-2xl font-medium tracking-[-0.02em] text-neutral-900">
          We hit a snag.
        </h2>
        <p className="mt-2 text-[13px] text-neutral-500">
          {error.message || "Unknown error."}
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-9 items-center rounded-md bg-accent-magenta px-4 text-[12px] font-medium text-white transition-colors hover:bg-accent-magenta/90"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex h-9 items-center rounded-md border border-neutral-200 bg-white px-4 text-[12px] text-neutral-700 transition-colors hover:border-neutral-300"
          >
            Reload page
          </button>
        </div>
      </div>
    </div>
  );
}
