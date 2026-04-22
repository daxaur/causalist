"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  GearSix,
  GithubLogo,
  Sparkle,
} from "@phosphor-icons/react";
import { ConstellationBackground } from "@/components/landing/constellation-bg";
import { FeaturesBento } from "@/components/landing/features-bento";
import { LanguageMarquee } from "@/components/landing/language-marquee";
import { Logo } from "@/components/brand/logo";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/lib/settings";

const GITHUB_URL = /github\.com\/([^/\s]+)\/([^/\s?#]+)/;

const PREVIEW_LINKS = [
  { slug: "causalist", label: "causalist" },
  { slug: "next-js", label: "next.js" },
  { slug: "flask", label: "flask" },
];

export default function Home() {
  const router = useRouter();
  const settings = useSettings();
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
    router.push(`/${owner}/${repo.replace(/\.git$/, "")}`);
  };

  return (
    <main className="relative min-h-screen overflow-hidden">
      <ConstellationBackground />

      <nav className="relative z-10 flex items-center justify-between px-8 py-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-neutral-900 transition-opacity hover:opacity-80"
        >
          <Logo size={20} />
          <span className="font-display text-[17px] font-medium tracking-tight">
            causalist
          </span>
        </Link>
        <div className="flex items-center gap-5">
          <Link
            href="/dashboard"
            className="text-sm text-neutral-500 transition-colors hover:text-neutral-900"
          >
            Projects
          </Link>
          <a
            href="https://github.com/daxaur/causalist"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
            aria-label="Causalist on GitHub"
          >
            <GithubLogo size={18} weight="fill" />
            <span>Source</span>
          </a>
          <Link
            href="/settings"
            aria-label="Keys and settings"
            className="relative flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white/80 text-neutral-500 backdrop-blur-sm transition-colors hover:border-neutral-300 hover:text-neutral-900"
          >
            <GearSix size={15} />
            {!settings.anthropicKey && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white"
              />
            )}
          </Link>
        </div>
      </nav>

      <section className="relative z-10 flex flex-col items-center justify-center px-8 pt-16 pb-24">
        <div className="mb-8 rounded-full border border-neutral-200 bg-white/80 px-4 py-1.5 backdrop-blur-sm">
          <AnimatedShinyText className="inline-flex items-center gap-2 text-xs">
            <Sparkle size={11} weight="duotone" />
            Built with Claude Opus 4.7
          </AnimatedShinyText>
        </div>

        <h1 className="mb-6 max-w-3xl text-center font-display text-5xl font-medium leading-[1] tracking-[-0.03em] sm:text-6xl lg:text-[5.25rem]">
          See what your code{" "}
          <em className="font-normal text-neutral-500">actually means</em>
        </h1>

        <p className="mb-12 max-w-xl text-center text-[15px] leading-relaxed text-neutral-500">
          Paste a GitHub URL. Claude agents map your entire codebase into an
          interactive 3D causal graph — a galaxy of files, connected by what
          actually imports, calls, and depends on what.
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
                <span className="animate-pulse">Loading…</span>
              ) : (
                <>
                  Map it
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

      {/* Features BentoGrid with AnimatedBeam */}
      <section className="relative z-10 px-8 pb-20">
        <div className="mx-auto mb-8 max-w-5xl">
          <p className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
            How it works
          </p>
          <h2 className="mt-2 font-display text-3xl font-medium tracking-[-0.02em] text-neutral-900">
            Ingest · Analyze · Visualize
          </h2>
        </div>
        <FeaturesBento />
      </section>

      {/* Language marquee */}
      <section className="relative z-10 border-t border-neutral-100 bg-white/60 py-10 backdrop-blur-sm">
        <p className="mb-6 text-center font-mono text-[11px] uppercase tracking-wider text-neutral-400">
          Causalist speaks every language in your repo
        </p>
        <LanguageMarquee />
      </section>

      {/* Claude credit */}
      <section className="relative z-10 border-t border-neutral-100 px-8 py-14">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-3">
            <div className="h-px w-12 bg-neutral-200" />
            <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
              Powered by
            </span>
            <div className="h-px w-12 bg-neutral-200" />
          </div>
          <Image
            src="/claude-wordmark.svg"
            alt="Claude"
            width={180}
            height={40}
            priority={false}
            className="opacity-90"
          />
          <p className="mt-1 max-w-md text-xs text-neutral-500">
            Four Claude Opus 4.7 agents run in parallel on every repo you map.
            They share their findings over context handoffs — Structure feeds
            Dependency, Dependency feeds Semantic, Semantic feeds Oracle.
          </p>
        </div>
      </section>

      <footer className="relative z-10 border-t border-neutral-100 px-8 py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 text-xs text-neutral-400 sm:flex-row">
          <span className="flex items-center gap-2">
            <Logo size={12} />
            causalist · built for the Opus 4.7 hackathon
          </span>
          <span className="font-mono">
            Claude and Anthropic are trademarks of Anthropic PBC
          </span>
        </div>
      </footer>
    </main>
  );
}
