"use client";

import { useEffect, useState } from "react";
import { GithubLogo, Star } from "@phosphor-icons/react";

export function GitHubStarButton() {
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

  return (
    <a
      href="https://github.com/daxaur/causalist"
      target="_blank"
      rel="noopener noreferrer"
      className="group hidden items-center overflow-hidden rounded-md border border-neutral-200 bg-white/80 text-xs text-neutral-600 backdrop-blur-sm transition-colors hover:border-neutral-300 hover:text-neutral-900 sm:inline-flex"
      aria-label="Star Causalist on GitHub"
    >
      <span className="flex items-center gap-1.5 border-r border-neutral-200 px-2.5 py-1.5">
        <GithubLogo size={12} weight="fill" />
        <span>Star</span>
      </span>
      <span className="flex items-center gap-1 px-2.5 py-1.5 font-mono">
        <Star
          size={11}
          weight="fill"
          className="text-amber-400 transition-transform group-hover:scale-110"
        />
        {stars === null ? "—" : formatCount(stars)}
      </span>
    </a>
  );
}

function formatCount(n: number): string {
  if (n < 1000) return `${n}`;
  return `${(n / 1000).toFixed(n < 10000 ? 1 : 0)}k`;
}
