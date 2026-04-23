"use client";

import { cn } from "@/lib/utils";

/**
 * Ambient skeleton with a subtle shimmer, tuned for the tool's
 * monochrome-plus-magenta palette. Never layout-shifts.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-neutral-200/60",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer",
        "after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent",
        className,
      )}
    />
  );
}

/** Skeleton for a repo-list row in /dashboard. */
export function RepoRowSkeleton() {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-5 py-4">
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-2.5 w-64" />
      </div>
      <Skeleton className="h-3 w-10" />
    </div>
  );
}

/** Skeleton for a library card in /library. */
export function LibraryCardSkeleton() {
  return (
    <div className="flex h-[140px] flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5">
      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-2.5 w-24" />
      </div>
      <div className="flex items-end justify-between">
        <Skeleton className="h-2.5 w-20" />
        <Skeleton className="h-2 w-12" />
      </div>
    </div>
  );
}

/** Skeleton for the big viewer card while a graph loads. */
export function GraphCardSkeleton() {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-[#14091A]">
      <div className="flex items-start justify-between border-b border-white/5 px-4 py-3">
        <Skeleton className="h-5 w-32 bg-white/10" />
        <Skeleton className="h-5 w-24 bg-white/10" />
      </div>
      <div className="relative flex-1">
        {/* Abstract "nodes and edges" shimmer placeholders */}
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E838A4]/40" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full bg-white/10 animate-pulse"
            style={{
              left: `${20 + ((i * 67) % 70)}%`,
              top: `${20 + ((i * 31) % 60)}%`,
              animationDelay: `${i * 120}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

/** Activity-feed row skeleton for the AgentRail. */
export function AgentRowSkeleton() {
  return (
    <div className="border-b border-white/5 px-4 py-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-2.5 w-16 bg-white/10" />
        <Skeleton className="h-2.5 w-8 bg-white/10" />
      </div>
      <Skeleton className="mt-2 h-px w-full bg-white/5" />
      <Skeleton className="mt-2 h-3 w-3/4 bg-white/10" />
    </div>
  );
}
