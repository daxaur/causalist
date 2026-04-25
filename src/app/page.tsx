"use client";

import Link from "next/link";
import Image from "next/image";
import { GithubLogo } from "@phosphor-icons/react";
import { ConstellationBackground } from "@/components/landing/constellation-bg";
import { GitHubStarButton } from "@/components/landing/github-star-button";
import { Hero } from "@/components/landing/hero";
import { LanguageMarquee } from "@/components/landing/language-marquee";
import { Logo } from "@/components/brand/logo";
import { useSettings } from "@/lib/settings";

export default function Home() {
  const settings = useSettings();

  return (
    <main className="relative h-full overflow-y-auto bg-[#FAFAF8]">
      <ConstellationBackground />

      {/* Floating star button, top-right */}
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <GitHubStarButton />
      </div>

      <Hero anthropicKeyPresent={Boolean(settings.anthropicKey)} />

      {/* Language marquee — kept as a quiet ribbon under the hero. */}
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
            Maps any GitHub repo into a typed causal graph. Claude Code reads
            it through eleven typed tools instead of grepping every file —
            cheaper context, sharper answers.
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
              { label: "Live demo", href: "/app/preview/causalist" },
              { label: "Reference graphs", href: "/app/reference" },
              { label: "Settings", href: "/app/settings" },
            ]}
          />
          <FooterColumn
            title="Developers"
            links={[
              { label: "Pair your terminal", href: "/pair" },
              { label: "Docs", href: "/docs/foundations" },
              { label: "MCP server", href: "https://www.npmjs.com/package/causalist-mcp", external: true },
              { label: "GitHub", href: "https://github.com/daxaur/causalist", external: true },
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
          causalist · open source · MIT
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
