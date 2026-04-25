"use client";

import { useEffect, useState } from "react";
import { GithubLogo, Star } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function GitHubStarButton({
  variant = "default",
}: {
  /** "default" — landing nav; "sidebar" — full-width inside the left sidebar. */
  variant?: "default" | "sidebar";
}) {
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/github-stars")
      .then((r) => r.json())
      .then((d: { stars: number | null }) => {
        if (!cancelled && typeof d.stars === "number") setStars(d.stars);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const isSidebar = variant === "sidebar";

  return (
    <a
      href="https://github.com/daxaur/causalist"
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "group inline-flex items-center overflow-hidden rounded-md border border-neutral-200 bg-white text-neutral-600 transition-colors hover:border-accent-magenta/60 hover:text-neutral-900",
        isSidebar
          ? "h-7 text-[11px]"
          : "h-9 text-[12px] shadow-sm hover:shadow",
      )}
      aria-label={
        typeof stars === "number"
          ? `Star Causalist on GitHub — ${stars} stars`
          : "Star Causalist on GitHub"
      }
    >
      <span
        className={cn(
          "flex items-center gap-1.5",
          isSidebar ? "px-2" : "px-2.5",
        )}
      >
        <GithubLogo size={isSidebar ? 11 : 13} weight="fill" />
        <span className="font-medium">Star</span>
      </span>
      <span
        className={cn(
          "ml-auto flex items-center gap-1 border-l border-neutral-200 font-mono",
          isSidebar ? "px-2" : "px-2.5",
        )}
      >
        <Star
          size={isSidebar ? 10 : 12}
          weight="fill"
          className="text-amber-400 transition-transform group-hover:scale-110"
        />
        <span className="tabular-nums">
          {typeof stars === "number" ? formatCount(stars) : "—"}
        </span>
      </span>
    </a>
  );
}

function formatCount(n: number): string {
  if (n < 1000) return `${n}`;
  return `${(n / 1000).toFixed(n < 10000 ? 1 : 0)}k`;
}
