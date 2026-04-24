"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Sparkle } from "@phosphor-icons/react";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PREVIEWS } from "@/lib/graph/previews";
import { PreviewDialog } from "./preview-dialog";

const GITHUB_URL = /github\.com\/([^/\s]+)\/([^/\s?#]+)/;

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const word = {
  hidden: { opacity: 0, y: 14, filter: "blur(8px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

export function Hero({
  anthropicKeyPresent,
}: {
  anthropicKeyPresent: boolean;
}) {
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
    router.push(`/app/${owner}/${repo.replace(/\.git$/, "")}`);
  };

  // Split headline into words for per-word animation
  const firstPart = "See what your code".split(" ");
  const lastPart = "actually means".split(" ");

  return (
    <motion.section
      initial="hidden"
      animate="show"
      variants={container}
      className="relative z-10 flex flex-col items-center justify-center px-8 pt-16 pb-24"
    >
      <motion.div
        variants={item}
        className="mb-8 rounded-full border border-neutral-200 bg-white/80 px-4 py-1.5 backdrop-blur-sm"
      >
        <AnimatedShinyText className="inline-flex items-center gap-2 text-xs">
          <Sparkle size={11} weight="duotone" />
          Built with Claude Opus 4.7
        </AnimatedShinyText>
      </motion.div>

      <h1 className="mb-6 flex max-w-3xl flex-wrap justify-center gap-x-3 text-center font-display text-5xl font-medium leading-[1] tracking-[-0.03em] sm:text-6xl lg:text-[5.25rem]">
        {firstPart.map((w, i) => (
          <motion.span
            key={`a-${i}`}
            variants={word}
            className="inline-block"
          >
            {w}
          </motion.span>
        ))}
        {lastPart.map((w, i) => (
          <motion.em
            key={`b-${i}`}
            variants={word}
            className="inline-block font-normal not-italic text-neutral-500"
          >
            <em>{w}</em>
          </motion.em>
        ))}
      </h1>

      <motion.p
        variants={item}
        className="mb-12 max-w-xl text-center text-[15px] leading-relaxed text-neutral-500"
      >
        Paste a GitHub URL. Claude agents map your entire codebase into an
        interactive 3D causal graph — a galaxy of files, connected by what
        actually imports, calls, and depends on what.
      </motion.p>

      <motion.div variants={item} className="flex w-full max-w-lg flex-col gap-2">
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
        {!anthropicKeyPresent && (
          <p className="px-1 text-xs text-neutral-400">
            Add your Anthropic API key in{" "}
            <Link
              href="/app/settings"
              className="underline underline-offset-2 hover:text-neutral-700"
            >
              settings
            </Link>{" "}
            to analyze a new repo.
          </p>
        )}
      </motion.div>

      <motion.div
        variants={item}
        className="mt-6 flex items-center justify-center gap-3"
      >
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-400">
          No key yet?
        </span>
        <Link
          href="/app/preview/causalist"
          className="group inline-flex h-9 items-center gap-2 rounded-md border border-neutral-900 bg-white px-3 text-[13px] font-medium text-neutral-900 transition-all hover:bg-neutral-900 hover:text-white"
        >
          <Sparkle size={12} weight="fill" className="text-accent-magenta" />
          Open the live demo
          <ArrowRight
            size={12}
            className="transition-transform group-hover:translate-x-0.5"
          />
        </Link>
      </motion.div>

      <motion.div
        variants={item}
        className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm"
      >
        <span className="mr-1 flex items-center gap-1.5 text-neutral-400">
          <Sparkle size={13} weight="duotone" />
          or peek at another:
        </span>
        {PREVIEWS.filter((p) => p.slug !== "causalist").map((p, i) => (
          <motion.span
            key={p.slug}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.85 + i * 0.08,
              duration: 0.5,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            <PreviewDialog preview={p}>
              <button
                type="button"
                className="rounded-full border border-neutral-200 bg-white/80 px-3 py-1 font-mono text-xs text-neutral-700 backdrop-blur-sm transition-all hover:border-accent-magenta hover:text-neutral-900 hover:shadow-sm"
              >
                {p.title}
              </button>
            </PreviewDialog>
          </motion.span>
        ))}
      </motion.div>
    </motion.section>
  );
}
