"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Key,
  Sparkle,
  Warning,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings";
import { Logo } from "@/components/brand/logo";
import { AgentRail, type AgentState } from "./agent-rail";

/**
 * Simulated agent script for repos we can't actually analyze yet. The
 * events are shaped to look exactly like what a real Claude Agent SDK
 * stream would emit — when we wire the real pipeline, the UI stays
 * identical, only the event source changes.
 */
const SCRIPT: Record<
  string,
  { delay: number; kind: "action" | "finding" | "done" | "error"; text: string }[]
> = {
  structure: [
    { delay: 150, kind: "action", text: "Reading file tree" },
    { delay: 600, kind: "finding", text: "Detected framework: Next.js 15 (app router)" },
    { delay: 900, kind: "action", text: "Classifying src/app/ — 28 files" },
    { delay: 1400, kind: "finding", text: "Layered: ui 14, api 6, config 2, data 6" },
    { delay: 1800, kind: "action", text: "Classifying src/lib/ — 12 files" },
    { delay: 2300, kind: "finding", text: "Detected external deps: @anthropic-ai/sdk, @octokit/rest" },
    { delay: 2700, kind: "action", text: "Finalizing node kinds" },
    { delay: 3000, kind: "done", text: "56 nodes classified" },
  ],
  dependency: [
    { delay: 400, kind: "action", text: "Parsing imports" },
    { delay: 900, kind: "finding", text: "src/app/page.tsx imports ConstellationBackground" },
    { delay: 1400, kind: "action", text: "Resolving relative imports" },
    { delay: 1800, kind: "finding", text: "13 cross-layer calls: ui → logic" },
    { delay: 2300, kind: "action", text: "Extracting function-level calls" },
    { delay: 2800, kind: "finding", text: "42 imports, 38 calls traced" },
    { delay: 3200, kind: "done", text: "80 edges materialized" },
  ],
  semantic: [
    { delay: 600, kind: "action", text: "Summarizing layouts…" },
    { delay: 1200, kind: "finding", text: "app/layout.tsx: Root layout. Wires fonts + metadata." },
    { delay: 1700, kind: "action", text: "Summarizing API routes…" },
    { delay: 2300, kind: "finding", text: "api/analyze: Streams Server-Sent Events for the 4-agent pipeline." },
    { delay: 2800, kind: "action", text: "Summarizing lib/ helpers…" },
    { delay: 3400, kind: "finding", text: "lib/analyze/tools.ts: Six tool implementations for Oracle." },
    { delay: 3800, kind: "done", text: "56 summaries written" },
  ],
  oracle: [
    { delay: 2000, kind: "action", text: "Waiting for upstream agents…" },
    { delay: 3500, kind: "action", text: "Merging outputs" },
    { delay: 4100, kind: "finding", text: "Dropped 2 orphan edges" },
    { delay: 4500, kind: "action", text: "Running structural QA" },
    { delay: 5000, kind: "finding", text: "Graph is a valid DAG, zero contradictions" },
    { delay: 5400, kind: "done", text: "Final CausalGraph emitted" },
  ],
};

function initialAgents(): AgentState[] {
  return [
    {
      id: "structure",
      name: "structure",
      description: "walks the tree, classifies files by layer",
      status: "pending",
      progress: [0, 8],
      events: [],
    },
    {
      id: "dependency",
      name: "dependency",
      description: "extracts imports, calls, reads, writes",
      status: "pending",
      progress: [0, 7],
      events: [],
    },
    {
      id: "semantic",
      name: "semantic",
      description: "one-sentence summary per node",
      status: "pending",
      progress: [0, 7],
      events: [],
    },
    {
      id: "oracle",
      name: "oracle",
      description: "synthesizes + verifies the graph",
      status: "pending",
      progress: [0, 6],
      events: [],
    },
  ];
}

export function RepoAnalyzePrompt({
  owner,
  repo,
}: {
  owner: string;
  repo: string;
}) {
  const settings = useSettings();
  const [agents, setAgents] = useState<AgentState[]>(initialAgents);
  const [stage, setStage] = useState<"idle" | "running" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const timersRef = useRef<number[]>([]);

  const canAnalyze = Boolean(settings.anthropicKey);

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout);
    },
    [],
  );

  const startAnalysis = () => {
    if (!canAnalyze || stage === "running") return;
    setError(null);
    setStage("running");
    setAgents(initialAgents());

    const now = Date.now();
    // Structure, Dependency, Semantic run in parallel; Oracle starts
    // mid-stream and waits on the others.
    runScript("structure", now);
    runScript("dependency", now);
    runScript("semantic", now);
    runScript("oracle", now + 1500);
  };

  const runScript = (agentId: string, startAt: number) => {
    const script = SCRIPT[agentId];
    setAgents((as) =>
      as.map((a) =>
        a.id === agentId
          ? { ...a, status: "running", startedAt: startAt, progress: [0, script.length] }
          : a,
      ),
    );
    let step = 0;
    script.forEach((ev) => {
      const t = window.setTimeout(
        () => {
          step += 1;
          setAgents((as) =>
            as.map((a) =>
              a.id === agentId
                ? {
                    ...a,
                    status: ev.kind === "done" ? "done" : ev.kind === "error" ? "error" : "running",
                    finishedAt: ev.kind === "done" || ev.kind === "error" ? Date.now() : undefined,
                    events: [...a.events, { ts: Date.now(), kind: ev.kind, text: ev.text }],
                    progress: [step, script.length] as [number, number],
                  }
                : a,
            ),
          );
          // Check if all done
          setAgents((as) => {
            const allDone = as.every((a) => a.status === "done");
            if (allDone) setStage("done");
            return as;
          });
        },
        Math.max(0, startAt - Date.now()) + ev.delay,
      );
      timersRef.current.push(t);
    });
  };

  return (
    <div className="mx-auto grid min-h-[72vh] w-full max-w-5xl grid-cols-1 gap-6 px-6 py-6 md:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50/60 p-10 text-center">
        <div className="relative mb-6">
          <div className="absolute inset-0 animate-pulse rounded-full bg-[#E838A4]/15 blur-2xl" />
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-neutral-200 bg-white">
            <Logo size={22} className="text-neutral-900" />
          </div>
        </div>
        <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
          Not yet mapped
        </div>
        <h1 className="mb-2 font-display text-3xl font-medium tracking-[-0.02em] sm:text-4xl">
          Map{" "}
          <span className="font-mono text-[0.75em] text-neutral-500">
            {owner}/{repo}
          </span>
        </h1>
        <p className="mb-6 max-w-md text-sm leading-relaxed text-neutral-500">
          Four Claude Opus 4.7 agents run in parallel on your device using
          your own API key. Watch them work on the right — the graph
          materializes as they stream.
        </p>

        {!canAnalyze ? (
          <MissingKeyCard />
        ) : stage === "idle" ? (
          <Button
            onClick={startAnalysis}
            className="h-11 bg-[#E838A4] px-5 text-sm text-white hover:bg-[#C92E8E]"
          >
            <Sparkle size={15} weight="duotone" className="mr-1.5" />
            Run the 4-agent analyze
            <ArrowRight size={14} className="ml-1.5" />
          </Button>
        ) : stage === "done" ? (
          <div className="flex flex-col items-center gap-3">
            <div className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
              Pipeline complete · this is a staged preview for now
            </div>
            <p className="max-w-sm text-xs text-neutral-400">
              Real analyze (wired to the Claude Agent SDK) ships in the next
              release — the UI above is exactly how the live feed will look.
            </p>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 rounded-full border border-[#E838A4]/30 bg-[#E838A4]/10 px-3 py-1 text-xs text-[#C92E8E]">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#E838A4]" />
            4 agents streaming
          </div>
        )}

        {error && (
          <p className="mt-4 flex items-center gap-2 text-xs text-red-500">
            <Warning size={13} />
            {error}
          </p>
        )}
      </div>

      <div className="h-full min-h-[480px]">
        <AgentRail agents={agents} />
      </div>
    </div>
  );
}

function MissingKeyCard() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 px-6 py-5 text-sm">
      <div className="flex items-center gap-2 text-amber-900">
        <Key size={15} weight="duotone" />
        Add your Anthropic API key to analyze
      </div>
      <p className="max-w-sm text-xs text-amber-800/70">
        Keys live in your browser only. Claude calls run from your device,
        not ours.
      </p>
      <Link
        href="/settings"
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-xs text-white transition-colors hover:bg-neutral-800"
      >
        Open settings
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}
