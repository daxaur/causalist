"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  GitBranch,
  GithubLogo,
  Sparkle,
} from "@phosphor-icons/react";
import { AskView } from "@/components/graph/ask-view";
import { useHeaderActionsSetter } from "@/components/nav/site-header";
import { CausalGraphViewer } from "@/components/graph/causal-graph-viewer";
import { ChangesView } from "@/components/graph/changes-view";
import { ErrorsView } from "@/components/graph/errors-view";
import { ExplainerView } from "@/components/graph/explainer";
import {
  ModeSwitcher,
  type PreviewMode,
} from "@/components/graph/mode-switcher";
import { PREVIEWS, type PreviewMeta } from "@/lib/graph/previews";
import { commitsFor } from "@/lib/graph/previews/commits";

export function PreviewClient({ preview }: { preview: PreviewMeta }) {
  const [mode, setMode] = useState<PreviewMode>("graph");
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const commits = commitsFor(preview.slug);
  const setHeaderActions = useHeaderActionsSetter();

  useEffect(() => {
    setHeaderActions(
      <a
        href={`https://github.com/${preview.graph.repo}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-2.5 text-[11px] text-neutral-600 transition-colors hover:border-neutral-300 hover:text-neutral-900"
      >
        <GithubLogo size={12} weight="fill" />
        source
      </a>,
    );
    return () => setHeaderActions(null);
  }, [preview.graph.repo, setHeaderActions]);

  return (
    <main className="relative flex min-h-[calc(100vh-57px)] flex-col bg-white">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-0 bg-gradient-to-b from-white via-white to-neutral-50"
      />

      <motion.header
        className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-8 pb-4 sm:px-6 lg:px-8"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="font-display text-3xl font-medium tracking-[-0.02em] text-neutral-900 sm:text-4xl">
              {preview.title}
            </h1>
            <p className="mt-1.5 flex items-center gap-2 text-sm text-neutral-500">
              <Sparkle
                size={11}
                weight="duotone"
                className="text-accent-magenta"
              />
              {preview.tagline}
            </p>
          </div>
          <div className="hidden items-center gap-4 font-mono text-[11px] text-neutral-500 sm:flex">
            <Stat label="nodes" value={preview.graph.nodes.length} />
            <Stat label="edges" value={preview.graph.edges.length} />
            <div className="flex items-center gap-1.5">
              <GitBranch size={11} />
              <span>{preview.graph.commit ?? "main"}</span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Other-preview pills */}
      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-2 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {PREVIEWS.map((p) => (
            <Link
              key={p.slug}
              href={`/preview/${p.slug}`}
              aria-current={p.slug === preview.slug ? "page" : undefined}
              className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] transition-colors ${
                p.slug === preview.slug
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white/60 text-neutral-500 hover:border-neutral-300 hover:text-neutral-900"
              }`}
            >
              {p.title}
            </Link>
          ))}
        </div>
      </div>

      {/* Viewport */}
      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-28 sm:px-6 lg:px-8"
      >
        {mode === "graph" && (
          <div className="h-[calc(100vh-320px)] min-h-[560px] w-full">
            <CausalGraphViewer
              graph={preview.graph}
              highlightedIds={highlighted}
              onAskAboutSelection={(ids) => {
                setHighlighted(ids);
                setMode("ask");
              }}
            />
          </div>
        )}
        {mode === "explainer" && <ExplainerView graph={preview.graph} />}
        {mode === "errors" && (
          <ErrorsView
            graph={preview.graph}
            onHighlightNodes={setHighlighted}
          />
        )}
        {mode === "changes" && (
          <ChangesView
            graph={preview.graph}
            commits={commits}
            onHighlightNodes={setHighlighted}
          />
        )}
        {mode === "ask" && (
          <AskView
            graph={preview.graph}
            onHighlightNodes={setHighlighted}
          />
        )}
      </motion.div>

      {/* Floating mode switcher */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
        <ModeSwitcher mode={mode} onChange={setMode} />
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono text-neutral-800">
        {value.toLocaleString()}
      </span>
      <span className="uppercase tracking-wider text-neutral-400">{label}</span>
    </div>
  );
}
