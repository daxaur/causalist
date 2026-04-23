"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Key,
  Sparkle,
  Warning,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { saveEntry } from "@/lib/library/store";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { useSettings } from "@/lib/settings";
import { Logo } from "@/components/brand/logo";
import { CausalGraphViewer } from "./causal-graph-viewer";
import { AgentRail, type AgentState } from "./agent-rail";
import type { CausalGraph } from "@/lib/graph/types";

function initialAgents(): AgentState[] {
  return [
    {
      id: "structure",
      name: "structure",
      description: "walks the tree, classifies files by layer",
      status: "pending",
      progress: [0, 2],
      events: [],
    },
    {
      id: "dependency",
      name: "dependency",
      description: "extracts imports, calls, reads, writes",
      status: "pending",
      progress: [0, 2],
      events: [],
    },
    {
      id: "semantic",
      name: "semantic",
      description: "one-sentence summary per node",
      status: "pending",
      progress: [0, 2],
      events: [],
    },
    {
      id: "oracle",
      name: "oracle",
      description: "synthesizes + verifies the graph",
      status: "pending",
      progress: [0, 2],
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
  const auth = useGithubAuth();
  const githubToken = auth.token ?? settings.githubToken;

  const [agents, setAgents] = useState<AgentState[]>(initialAgents);
  const [stage, setStage] = useState<"idle" | "fetching" | "running" | "done" | "error">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [graph, setGraph] = useState<CausalGraph | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const canAnalyze = Boolean(settings.anthropicKey);

  useEffect(() => () => abortRef.current?.abort(), []);

  const updateAgent = useCallback(
    (id: string, patch: Partial<AgentState>) => {
      setAgents((as) => as.map((a) => (a.id === id ? { ...a, ...patch } : a)));
    },
    [],
  );
  const pushEvent = useCallback(
    (id: string, text: string, kind: "action" | "finding" | "done" | "error") => {
      setAgents((as) =>
        as.map((a) =>
          a.id === id
            ? {
                ...a,
                events: [...a.events, { ts: Date.now(), kind, text }],
                progress: [
                  Math.min(a.progress[1], a.events.length + 1),
                  a.progress[1],
                ] as [number, number],
              }
            : a,
        ),
      );
    },
    [],
  );

  const startAnalysis = async () => {
    if (!canAnalyze) return;
    setError(null);
    setGraph(null);
    setStage("fetching");
    setAgents(initialAgents());
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // 1) Fetch the GitHub tree via Octokit
      const { Octokit } = await import("@octokit/rest");
      const octokit = new Octokit({ auth: githubToken || undefined });
      let commitSha = "HEAD";
      try {
        const { data: repoData } = await octokit.repos.get({ owner, repo });
        const defaultBranch = repoData.default_branch;
        const { data: branch } = await octokit.repos.getBranch({
          owner,
          repo,
          branch: defaultBranch,
        });
        commitSha = branch.commit.sha;
      } catch (e) {
        throw new Error(
          `Couldn't fetch repo metadata — ${e instanceof Error ? e.message : String(e)}. If this repo is private, connect GitHub in Settings.`,
        );
      }
      const { data: tree } = await octokit.git.getTree({
        owner,
        repo,
        tree_sha: commitSha,
        recursive: "true",
      });
      const entries = tree.tree
        .filter((t) => t.type === "blob" || t.type === "tree")
        .map((t) => ({
          path: t.path ?? "",
          size: t.size,
          type: (t.type === "tree" ? "dir" : "file") as "file" | "dir",
        }));

      pushEvent(
        "structure",
        `Fetched ${entries.length} tree entries from ${owner}/${repo}`,
        "finding",
      );

      // 2) POST /api/analyze, stream SSE, dispatch to agents
      setStage("running");
      updateAgent("structure", { status: "running", startedAt: Date.now() });
      updateAgent("dependency", { status: "running", startedAt: Date.now() });
      updateAgent("semantic", { status: "running", startedAt: Date.now() });

      const res = await fetch("/api/analyze", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${settings.anthropicKey}`,
        },
        body: JSON.stringify({
          owner,
          repo,
          commit: commitSha,
          tree: entries.slice(0, 1500), // cap payload
        }),
      });
      if (!res.body) throw new Error("Analyze endpoint returned no body");
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`Analyze failed (${res.status}): ${text}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buffer.indexOf("\n\n")) >= 0) {
          const chunk = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          const lines = chunk.split("\n");
          let event = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event:")) event = line.slice(6).trim();
            else if (line.startsWith("data:")) data += line.slice(5).trim();
          }
          if (!data) continue;
          let parsed: unknown;
          try {
            parsed = JSON.parse(data);
          } catch {
            continue;
          }
          if (event === "agent") {
            handleAgentEvent(parsed as {
              stage: string;
              status: string;
              payload?: unknown;
              message?: string;
            });
          } else if (event === "done") {
            const finalGraph = parsed as CausalGraph;
            setGraph(finalGraph);
            setStage("done");
            setAgents((as) =>
              as.map((a) => ({
                ...a,
                status: "done",
                finishedAt: a.finishedAt ?? Date.now(),
                progress: [a.progress[1], a.progress[1]] as [number, number],
              })),
            );
            // Auto-save to library
            try {
              await saveEntry({
                owner,
                repo,
                graph: finalGraph,
                sourceCommitSha: commitSha,
              });
            } catch {
              // non-fatal
            }
          } else if (event === "error") {
            const msg =
              (parsed as { message?: string })?.message ?? "Analyze failed";
            setError(msg);
            setStage("error");
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(e instanceof Error ? e.message : String(e));
      setStage("error");
    } finally {
      abortRef.current = null;
    }
  };

  const handleAgentEvent = (ev: {
    stage: string;
    status: string;
    payload?: unknown;
    message?: string;
  }) => {
    const id = ev.stage;
    if (ev.status === "started") {
      updateAgent(id, {
        status: "running",
        startedAt: Date.now(),
        progress: [1, 2],
      });
      pushEvent(id, `started`, "action");
    } else if (ev.status === "completed") {
      const count =
        Array.isArray(ev.payload) ? (ev.payload as unknown[]).length : 0;
      pushEvent(id, `produced ${count} ${id === "oracle" ? "graph" : "entries"}`, "finding");
      updateAgent(id, {
        status: "done",
        finishedAt: Date.now(),
        progress: [2, 2],
      });
    } else if (ev.status === "error") {
      pushEvent(id, ev.message ?? "error", "error");
      updateAgent(id, { status: "error", finishedAt: Date.now() });
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-neutral-200 bg-neutral-50/60 p-10 text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 animate-pulse rounded-full bg-[#E838A4]/15 blur-2xl" />
            <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200 bg-white">
              <Logo size={20} className="text-neutral-900" />
            </div>
          </div>
          <div className="mb-2 font-mono text-[10px] uppercase tracking-wider text-neutral-400">
            {stage === "done" ? "Mapped" : "Not yet mapped"}
          </div>
          <h1 className="mb-2 font-display text-2xl font-medium tracking-[-0.02em] sm:text-3xl">
            {stage === "done" ? "Saved to library" : "Map"}{" "}
            <span className="font-mono text-[0.72em] text-neutral-500">
              {owner}/{repo}
            </span>
          </h1>
          <p className="mb-5 max-w-md text-sm leading-relaxed text-neutral-500">
            {stage === "done"
              ? "Four Claude Opus 4.7 agents produced this graph. Open the full viewer below or in your Library."
              : "Four Claude Opus 4.7 agents run server-side with your key. The graph arrives in ~20–40s depending on repo size."}
          </p>

          {!canAnalyze ? (
            <MissingKeyCard />
          ) : stage === "idle" || stage === "error" ? (
            <Button
              onClick={startAnalysis}
              className="h-11 bg-[#E838A4] px-5 text-sm text-white hover:bg-[#C92E8E]"
            >
              <Sparkle size={15} weight="duotone" className="mr-1.5" />
              {stage === "error" ? "Retry analyze" : "Run the 4-agent analyze"}
              <ArrowRight size={14} className="ml-1.5" />
            </Button>
          ) : stage === "done" ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/app/${owner}/${repo}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-xs text-white transition-colors hover:bg-neutral-800"
              >
                Open full viewer
                <ArrowRight size={12} />
              </Link>
              <Link
                href="/library"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-4 text-xs text-neutral-700 transition-colors hover:border-neutral-300"
              >
                Library
              </Link>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E838A4]/30 bg-[#E838A4]/10 px-3 py-1 text-xs text-[#C92E8E]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#E838A4]" />
              {stage === "fetching" ? "fetching repo tree" : "4 agents streaming"}
            </div>
          )}

          {error && (
            <p className="mt-4 max-w-md flex items-start gap-2 text-xs text-red-500">
              <Warning size={13} className="mt-0.5 shrink-0" />
              {error}
            </p>
          )}
        </div>

        <div className="h-full min-h-[480px]">
          <AgentRail agents={agents} />
        </div>
      </div>

      {/* When done, render the finished graph inline. */}
      {graph && stage === "done" && (
        <div className="h-[calc(100vh-360px)] min-h-[520px] w-full">
          <CausalGraphViewer graph={graph} />
        </div>
      )}
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
        Your key is sent directly to the analyze route as a Bearer header.
        We never store it.
      </p>
      <Link
        href="/app/settings"
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-xs text-white transition-colors hover:bg-neutral-800"
      >
        Open settings
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}
