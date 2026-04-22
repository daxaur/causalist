"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  GithubLogo,
  Graph,
  Sparkle,
  Star,
} from "@phosphor-icons/react";
import { ConstellationBackground } from "@/components/landing/constellation-bg";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const GITHUB_URL = /github\.com\/([^/\s]+)\/([^/\s?#]+)/;

const PREVIEW_LINKS = [
  { slug: "causalist", label: "causalist" },
  { slug: "next-js", label: "next.js" },
];

export default function Home() {
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExplore = () => {
    const trimmed = repoUrl.trim();
    if (!trimmed) return;
    const match = trimmed.match(GITHUB_URL);
    if (!match) {
      setError("Enter a valid GitHub URL — github.com/owner/repo");
      return;
    }
    const [, owner, repo] = match;
    setError(null);
    setIsLoading(true);
    router.push(`/graph/${owner}/${repo.replace(/\.git$/, "")}`);
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <ConstellationBackground />

      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-2">
          <Graph size={22} weight="duotone" className="text-neutral-900" />
          <span className="text-lg font-semibold tracking-tight">
            causalist
          </span>
        </div>
        <div className="flex items-center gap-5">
          <a
            href="https://github.com/daxaur/causalist"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
            aria-label="Star causalist on GitHub"
          >
            <GithubLogo size={18} weight="fill" />
            <span>Star</span>
            <Star
              size={12}
              weight="fill"
              className="text-amber-400 transition-transform group-hover:scale-110"
            />
          </a>
          <Button variant="outline" size="sm" className="h-8">
            Sign in
          </Button>
        </div>
      </nav>

      <section className="relative z-10 flex flex-col items-center justify-center px-8 pt-20 pb-32">
        <div className="mb-8 flex items-center gap-2 rounded-full border border-neutral-200 bg-white/80 px-4 py-1.5 text-xs text-neutral-500 backdrop-blur-sm">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
          Built for the Claude Opus 4.7 Hackathon
        </div>

        <h1 className="mb-6 max-w-3xl text-center font-display text-5xl font-medium leading-[1.02] tracking-[-0.02em] sm:text-6xl lg:text-7xl">
          See what your code{" "}
          <span className="italic text-neutral-500">actually means</span>
        </h1>

        <p className="mb-12 max-w-xl text-center text-lg leading-relaxed text-neutral-500">
          Paste a GitHub URL. Claude agents map your entire codebase into a 3D
          causal graph. Explore the architecture, understand connections, review
          PRs visually.
        </p>

        <div className="flex w-full max-w-lg flex-col gap-2">
          <div className="flex gap-3">
            <Input
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://github.com/owner/repo"
              value={repoUrl}
              onChange={(e) => {
                setRepoUrl(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => e.key === "Enter" && handleExplore()}
              className="h-12 border-neutral-200 bg-white/80 font-mono text-sm text-neutral-900 placeholder:text-neutral-400 backdrop-blur-sm"
              aria-invalid={error ? "true" : "false"}
              aria-describedby={error ? "repo-error" : undefined}
            />
            <Button
              onClick={handleExplore}
              disabled={isLoading || !repoUrl.trim()}
              className="h-12 bg-neutral-900 px-6 text-white hover:bg-neutral-800"
            >
              {isLoading ? (
                <span className="animate-pulse">Mapping…</span>
              ) : (
                <>
                  Explore
                  <ArrowRight size={18} className="ml-2" />
                </>
              )}
            </Button>
          </div>
          {error && (
            <p
              id="repo-error"
              role="alert"
              className="px-1 text-xs text-red-500"
            >
              {error}
            </p>
          )}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-2 text-sm">
          <span className="mr-1 flex items-center gap-1.5 text-neutral-400">
            <Sparkle size={13} weight="duotone" />
            Instant preview
          </span>
          {PREVIEW_LINKS.map((p) => (
            <Link
              key={p.slug}
              href={`/preview/${p.slug}`}
              className="rounded-full border border-neutral-200 bg-white/80 px-3 py-1 font-mono text-xs text-neutral-700 backdrop-blur-sm transition-all hover:border-neutral-400 hover:shadow-sm"
            >
              {p.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="relative z-10 px-8 pb-24">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          <FeatureCard
            title="3D causal graph"
            description="Navigate your codebase like Google Earth. Zoom from architecture overview down to individual functions."
          />
          <FeatureCard
            title="PR blast radius"
            description="See what a pull request actually affects — not just the diff, but the full cascade through your system."
          />
          <FeatureCard
            title="Ask anything"
            description='Click any node. Ask "what does this do?" or "what breaks if I change this?" Claude answers with graph context.'
          />
        </div>
      </section>

      <footer className="relative z-10 border-t border-neutral-100 px-8 py-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between text-sm text-neutral-400">
          <span>causalist — built for the Opus 4.7 hackathon</span>
          <span>Built with Claude Code</span>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border border-neutral-200 bg-white/60 p-6 backdrop-blur-sm transition-all hover:border-neutral-300 hover:shadow-sm">
      <h3 className="mb-2 text-base font-semibold transition-colors group-hover:text-neutral-900">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-neutral-500">{description}</p>
    </div>
  );
}
