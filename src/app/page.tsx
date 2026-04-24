"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  GithubLogo,
  Sparkle,
} from "@phosphor-icons/react";
import { ConstellationBackground } from "@/components/landing/constellation-bg";
import { FeaturesBento } from "@/components/landing/features-bento";
import { GitHubStarButton } from "@/components/landing/github-star-button";
import { Hero } from "@/components/landing/hero";
import { LanguageMarquee } from "@/components/landing/language-marquee";
import { Logo } from "@/components/brand/logo";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { useSettings } from "@/lib/settings";

export default function Home() {
  const settings = useSettings();
  const auth = useGithubAuth();
  const isConnected = auth.authenticated || Boolean(settings.githubToken);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FAFAF8]">
      <ConstellationBackground />

      <nav className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-8 sm:py-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-neutral-900 transition-opacity hover:opacity-80"
        >
          <Logo size={22} />
          <span className="font-display text-[17px] font-medium tracking-tight">
            causalist
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <GitHubStarButton />
          <Link
            href="/app"
            className="group relative inline-flex h-9 items-center gap-2 overflow-hidden rounded-md bg-neutral-900 pl-4 pr-3 text-sm font-medium text-white shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_6px_20px_-8px_rgba(232,56,164,0.35)] transition-all hover:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_10px_24px_-8px_rgba(232,56,164,0.55)]"
          >
            <span
              aria-hidden
              className="absolute -inset-px rounded-md bg-gradient-to-r from-accent-magenta/0 via-accent-magenta/40 to-accent-magenta/0 opacity-0 transition-opacity group-hover:opacity-100"
            />
            <Sparkle
              size={13}
              weight="fill"
              className="relative text-accent-magenta"
            />
            <span className="relative">
              {isConnected ? "Open the app" : "Launch app"}
            </span>
            <ArrowRight
              size={13}
              className="relative text-white/70 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </div>
      </nav>

      <Hero anthropicKeyPresent={Boolean(settings.anthropicKey)} />

      {/* Features BentoGrid with AnimatedBeam */}
      <section className="relative z-10 px-6 pb-20 sm:px-8">
        <div className="mx-auto mb-10 max-w-5xl">
          <p className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
            In ninety seconds
          </p>
          <h2 className="mt-2 max-w-2xl font-display text-3xl font-medium leading-tight tracking-[-0.02em] text-neutral-900 sm:text-4xl">
            From a URL to a graph you can actually{" "}
            <em className="font-normal text-neutral-500">read</em>.
          </h2>
        </div>
        <FeaturesBento />
      </section>

      {/* Language marquee */}
      <section className="relative z-10 border-t border-neutral-200/70 bg-white/60 py-10 backdrop-blur-sm">
        <p className="mb-6 text-center font-mono text-[11px] uppercase tracking-wider text-neutral-400">
          Causalist speaks every language in your repo
        </p>
        <LanguageMarquee />
      </section>

      {/* Claude credit */}
      <section className="relative z-10 border-t border-neutral-200/70 px-6 py-14 sm:px-8">
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

      <Footer />
    </main>
  );
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-neutral-200/70 bg-white/70 px-6 py-14 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 lg:flex-row lg:justify-between">
        <div className="max-w-sm">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-neutral-900 transition-opacity hover:opacity-80"
          >
            <Logo size={20} />
            <span className="font-display text-[16px] font-medium tracking-tight">
              causalist
            </span>
          </Link>
          <p className="mt-3 text-[13px] leading-relaxed text-neutral-500">
            Maps any GitHub repo into an interactive causal graph. Built for
            Claude Code and any agent that wants to read code before touching
            it.
          </p>
          <div className="mt-5 flex items-center gap-2">
            <a
              href="https://github.com/daxaur/causalist"
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 bg-white text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900"
              aria-label="GitHub"
            >
              <GithubLogo size={14} weight="fill" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
          <FooterColumn
            title="Product"
            links={[
              { label: "Open the app", href: "/app" },
              { label: "Live demos", href: "/app?tab=previews" },
              { label: "Reference graphs", href: "/app?tab=reference" },
              { label: "Saved library", href: "/app?tab=library" },
            ]}
          />
          <FooterColumn
            title="Developers"
            links={[
              { label: "Agent API", href: "/agents" },
              { label: "Pair your terminal", href: "/pair" },
              { label: "Docs", href: "/docs/foundations" },
              { label: "MCP server", href: "https://www.npmjs.com/package/causalist-mcp", external: true },
            ]}
          />
          <FooterColumn
            title="Resources"
            links={[
              { label: "Foundations", href: "/docs/foundations" },
              { label: "Graph schema", href: "/docs/graph-schema" },
              { label: "Retrieval model", href: "/docs/retrieval" },
              { label: "Settings", href: "/app/settings" },
            ]}
          />
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-start justify-between gap-3 border-t border-neutral-200 pt-6 text-[11px] text-neutral-400 sm:flex-row sm:items-center">
        <span className="flex items-center gap-2">
          causalist · built for the Opus 4.7 hackathon
        </span>
        <span className="font-mono">
          Claude and Anthropic are trademarks of Anthropic PBC
        </span>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div>
      <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
        {title}
      </div>
      <ul className="space-y-2">
        {links.map((l) => (
          <li key={l.href}>
            {l.external ? (
              <a
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[13px] text-neutral-600 transition-colors hover:text-accent-magenta"
              >
                {l.label}
              </a>
            ) : (
              <Link
                href={l.href}
                className="text-[13px] text-neutral-600 transition-colors hover:text-accent-magenta"
              >
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
