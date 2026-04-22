"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowRight,
  CircleNotch,
  Key,
  Sparkle,
  Warning,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/lib/settings";
import { Logo } from "@/components/brand/logo";

export function RepoAnalyzePrompt({
  owner,
  repo,
}: {
  owner: string;
  repo: string;
}) {
  const settings = useSettings();
  const [status, setStatus] = useState<
    "idle" | "starting" | "structure" | "dependency" | "semantic" | "oracle" | "done" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);

  const canAnalyze = Boolean(settings.anthropicKey);

  const onAnalyze = async () => {
    if (!canAnalyze) return;
    try {
      setError(null);
      setStatus("starting");
      await new Promise((r) => setTimeout(r, 700));
      setStatus("structure");
      await new Promise((r) => setTimeout(r, 900));
      setStatus("dependency");
      await new Promise((r) => setTimeout(r, 900));
      setStatus("semantic");
      await new Promise((r) => setTimeout(r, 900));
      setStatus("oracle");
      await new Promise((r) => setTimeout(r, 900));
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  };

  const running = status !== "idle" && status !== "done" && status !== "error";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl flex-col items-center justify-center px-6 text-center">
      <div className="relative mb-8">
        <div className="absolute inset-0 animate-pulse rounded-full bg-neutral-100/70 blur-2xl" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-neutral-200 bg-white">
          <Logo size={28} className="text-neutral-900" />
        </div>
      </div>

      <h1 className="mb-3 font-display text-4xl font-medium tracking-[-0.02em] sm:text-5xl">
        No graph yet for{" "}
        <span className="font-mono text-[0.85em] text-neutral-500">
          {owner}/{repo}
        </span>
      </h1>
      <p className="mb-10 max-w-md text-sm leading-relaxed text-neutral-500">
        Causalist hasn&rsquo;t mapped this repository. Generate one now with
        your own Anthropic key — the four agents run in your browser and
        stream their findings into the graph.
      </p>

      {!canAnalyze ? (
        <MissingKeyCard />
      ) : status === "idle" ? (
        <Button
          onClick={onAnalyze}
          className="h-12 bg-neutral-900 px-6 text-sm text-white hover:bg-neutral-800"
        >
          <Sparkle size={16} weight="duotone" className="mr-2" />
          Analyze with Claude Opus 4.7
          <ArrowRight size={16} className="ml-2" />
        </Button>
      ) : (
        <AgentProgress status={status} />
      )}

      {error && (
        <p className="mt-6 flex items-center gap-2 text-xs text-red-500">
          <Warning size={14} />
          {error}
        </p>
      )}

      {status === "done" && (
        <p className="mt-6 text-xs text-neutral-400">
          (Live analyze pipeline ships in the next build —
          for now this is a staged preview of the four-agent flow.)
        </p>
      )}

      {running && (
        <div
          className="mt-10 flex items-center gap-2 text-xs text-neutral-400"
          aria-live="polite"
        >
          <CircleNotch size={12} className="animate-spin" />
          Agents are working. This takes ~30–90s on real repos.
        </div>
      )}
    </div>
  );
}

function MissingKeyCard() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-amber-200 bg-amber-50/50 px-6 py-5">
      <div className="flex items-center gap-2 text-sm text-amber-900">
        <Key size={16} weight="duotone" />
        Add your Anthropic API key to analyze
      </div>
      <p className="max-w-sm text-xs text-amber-800/70">
        Keys live in your browser only. Claude calls run from your device, not
        ours.
      </p>
      <Link
        href="/settings"
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-xs text-white transition-colors hover:bg-neutral-800"
      >
        Open settings
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}

const STEPS: { key: string; label: string; detail: string }[] = [
  { key: "structure", label: "Structure", detail: "walking the file tree, detecting frameworks" },
  { key: "dependency", label: "Dependency", detail: "extracting imports and call edges" },
  { key: "semantic", label: "Semantic", detail: "writing plain-English labels for each node" },
  { key: "oracle", label: "Oracle", detail: "synthesizing the causal graph" },
];

function AgentProgress({ status }: { status: string }) {
  const currentIdx = STEPS.findIndex((s) => s.key === status);
  return (
    <ol className="w-full max-w-md space-y-2.5 text-left">
      {STEPS.map((step, i) => {
        const done = currentIdx > i || status === "done";
        const active = currentIdx === i && status !== "done";
        return (
          <li
            key={step.key}
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
              active
                ? "border-neutral-900/20 bg-white shadow-sm"
                : done
                  ? "border-neutral-200 bg-neutral-50/60"
                  : "border-neutral-100 bg-white/60"
            }`}
          >
            <div
              className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                done
                  ? "border-emerald-500 bg-emerald-500"
                  : active
                    ? "border-neutral-900"
                    : "border-neutral-300"
              }`}
            >
              {done && (
                <span className="text-[9px] leading-none text-white">✓</span>
              )}
              {active && (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-900" />
              )}
            </div>
            <div className="min-w-0">
              <div
                className={`font-display text-sm font-medium ${active ? "text-neutral-900" : done ? "text-neutral-700" : "text-neutral-400"}`}
              >
                {step.label} agent
              </div>
              <div
                className={`mt-0.5 text-xs ${active ? "text-neutral-500" : "text-neutral-400"}`}
              >
                {step.detail}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
