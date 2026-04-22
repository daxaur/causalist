"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  GearSix,
  GithubLogo,
} from "@phosphor-icons/react";
import { ConstellationBackground } from "@/components/landing/constellation-bg";
import { FeaturesBento } from "@/components/landing/features-bento";
import { GitHubStarButton } from "@/components/landing/github-star-button";
import { Hero } from "@/components/landing/hero";
import { LanguageMarquee } from "@/components/landing/language-marquee";
import { Logo } from "@/components/brand/logo";
import { useSettings } from "@/lib/settings";

export default function Home() {
  const settings = useSettings();

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
        <div className="flex items-center gap-3">
          <Link
            href="/library"
            className="hidden text-sm text-neutral-500 transition-colors hover:text-neutral-900 sm:inline"
          >
            Library
          </Link>
          <GitHubStarButton />
          <Link
            href="/settings"
            aria-label="Keys and settings"
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-neutral-200 bg-white/80 text-neutral-500 backdrop-blur-sm transition-colors hover:border-neutral-300 hover:text-neutral-900"
          >
            <GearSix size={15} />
            {!settings.anthropicKey && (
              <span
                aria-hidden="true"
                className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-white"
              />
            )}
          </Link>
          {settings.githubToken ? (
            <Link
              href="/dashboard"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-neutral-900 px-4 text-sm text-white transition-colors hover:bg-neutral-800"
            >
              <GithubLogo size={15} weight="fill" />
              Your repos
              <ArrowRight size={13} />
            </Link>
          ) : (
            <Link
              href="/settings"
              className="inline-flex h-9 items-center gap-2 rounded-md bg-neutral-900 px-4 text-sm text-white transition-colors hover:bg-neutral-800"
            >
              <GithubLogo size={15} weight="fill" />
              Connect GitHub
            </Link>
          )}
        </div>
      </nav>

      <Hero anthropicKeyPresent={Boolean(settings.anthropicKey)} />

      {/* Features BentoGrid with AnimatedBeam */}
      <section className="relative z-10 px-8 pb-20">
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
