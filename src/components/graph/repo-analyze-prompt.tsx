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
import { listIndex, getEntry, saveEntry, touch } from "@/lib/library/store";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { useSettings } from "@/lib/settings";
import { Logo } from "@/components/brand/logo";
import { CausalGraphViewer } from "./causal-graph-viewer";
import {
  LiveBuildView,
  type AgentLiveState,
} from "./live-build-view";
import { BUILDER_AGENTS, type BuilderAgentId } from "@/lib/analyze/prompts";
import type {
  CausalEdge,
  CausalGraph,
  CausalNode,
} from "@/lib/graph/types";

const DEFAULT_MODEL = "claude-opus-4-7";

function initialAgents(): Record<BuilderAgentId, AgentLiveState> {
  return {
    structure: { id: "structure", status: "pending", count: 0 },
    dependency: { id: "dependency", status: "pending", count: 0 },
    semantic: { id: "semantic", status: "pending", count: 0 },
    oracle: { id: "oracle", status: "pending", count: 0 },
  };
}

function initialModels(): Record<BuilderAgentId, string> {
  return {
    structure: DEFAULT_MODEL,
    dependency: DEFAULT_MODEL,
    semantic: DEFAULT_MODEL,
    oracle: DEFAULT_MODEL,
  };
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

  const [agents, setAgents] = useState<Record<BuilderAgentId, AgentLiveState>>(
    initialAgents,
  );
  const [models, setModels] = useState<Record<BuilderAgentId, string>>(
    () => readModelsFromStorage() ?? initialModels(),
  );
  const [stage, setStage] = useState<
    "idle" | "fetching" | "running" | "done" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [graph, setGraph] = useState<CausalGraph | null>(null);
  // Live-build state. Nodes/edges accumulate as agents emit; pulse
  // markers fade in the LiveBuildView renderer.
  const [liveNodes, setLiveNodes] = useState<CausalNode[]>([]);
  const [liveEdges, setLiveEdges] = useState<CausalEdge[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const canAnalyze = Boolean(settings.anthropicKey);
  // While we check the library on mount, don't show the analyze
  // prompt — otherwise the user sees a flicker of "Run the build"
  // before we've confirmed there's already a saved graph.
  const [hydrating, setHydrating] = useState(true);

  useEffect(() => () => abortRef.current?.abort(), []);

  // On mount: check the library for a previously-built graph for this
  // owner/repo. If there is one (terminal upload, prior browser run,
  // anything), render it immediately and skip the analyze prompt.
  // Re-runs whenever the library fires its changed event so a fresh
  // upload while the page is open also takes effect.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const idx = await listIndex();
        const match = idx.find(
          (e) =>
            e.owner.toLowerCase() === owner.toLowerCase() &&
            e.repo.toLowerCase() === repo.toLowerCase(),
        );
        if (cancelled) return;
        if (match) {
          const full = await getEntry(match.id);
          if (cancelled) return;
          if (full?.graph) {
            setGraph(full.graph);
            setStage("done");
            void touch(match.id);
          }
        }
      } catch {
        // ignore — fall through to the analyze prompt
      } finally {
        if (!cancelled) setHydrating(false);
      }
    };
    void load();
    const onChanged = () => void load();
    if (typeof window !== "undefined") {
      window.addEventListener("causalist:library-changed", onChanged);
    }
    return () => {
      cancelled = true;
      if (typeof window !== "undefined") {
        window.removeEventListener("causalist:library-changed", onChanged);
      }
    };
  }, [owner, repo]);

  const updateAgent = useCallback(
    (id: BuilderAgentId, patch: Partial<AgentLiveState>) => {
      setAgents((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
    },
    [],
  );

  const setModel = useCallback((id: BuilderAgentId, model: string) => {
    setModels((prev) => {
      const next = { ...prev, [id]: model };
      writeModelsToStorage(next);
      return next;
    });
  }, []);

  const startAnalysis = async () => {
    if (!canAnalyze) return;
    setError(null);
    setGraph(null);
    setLiveNodes([]);
    setLiveEdges([]);
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

      // Curate source files for Dependency.
      const fileCandidates = entries
        .filter((e) => e.type === "file" && !!e.path)
        .filter((e) => {
          const p = e.path.toLowerCase();
          if (/\.(ts|tsx|js|jsx|py|rs|go|java|rb|kt|swift)$/.test(p))
            return true;
          if (/package\.json$|pyproject\.toml$|cargo\.toml$/.test(p))
            return true;
          return false;
        })
        .filter((e) => {
          if (typeof e.size === "number" && e.size > 50_000) return false;
          if (
            /(^|\/)(node_modules|dist|build|\.next|\.venv|\.git)\//.test(e.path)
          )
            return false;
          if (/(^|\/)__tests__|\.(spec|test)\./.test(e.path)) return false;
          return true;
        })
        .slice(0, 25);

      const files: { path: string; content: string }[] = [];
      for (const c of fileCandidates) {
        try {
          const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: c.path,
            ref: commitSha,
          });
          if (
            !Array.isArray(data) &&
            "content" in data &&
            typeof data.content === "string"
          ) {
            const text = atob(data.content.replace(/\n/g, ""));
            files.push({ path: c.path, content: text.slice(0, 30_000) });
          }
        } catch {
          // skip file; don't kill the run
        }
      }

      // 2) POST /api/analyze, stream SSE
      setStage("running");

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
          tree: entries.slice(0, 1500),
          files,
          models,
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
            handleAgentEvent(
              parsed as {
                stage: BuilderAgentId | "done" | string;
                status: string;
                payload?: unknown;
                message?: string;
              },
            );
          } else if (event === "done") {
            const finalGraph = parsed as CausalGraph;
            setGraph(finalGraph);
            setStage("done");
            for (const a of BUILDER_AGENTS) {
              updateAgent(a.id, { status: "done" });
            }
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
    stage: BuilderAgentId | "done" | string;
    status: string;
    payload?: unknown;
    message?: string;
  }) => {
    const id = ev.stage as BuilderAgentId;
    if (!isBuilder(id)) return;

    switch (ev.status) {
      case "started":
        updateAgent(id, { status: "running" });
        break;
      case "completed":
        updateAgent(id, { status: "done" });
        break;
      case "error":
        updateAgent(id, { status: "error", message: ev.message });
        break;
      case "emit_node": {
        const n = ev.payload as CausalNode;
        if (!n?.id) return;
        setLiveNodes((prev) => {
          if (prev.some((x) => x.id === n.id)) return prev;
          // Tag with _pulse so the renderer paints a brief glow.
          return [...prev, { ...n, _pulse: Date.now() } as CausalNode];
        });
        setAgents((prev) => ({
          ...prev,
          structure: {
            ...prev.structure,
            count: prev.structure.count + 1,
          },
        }));
        break;
      }
      case "emit_edge": {
        const e = ev.payload as CausalEdge;
        if (!e?.source || !e?.target) return;
        setLiveEdges((prev) => {
          const dupe = prev.some(
            (x) =>
              x.source === e.source && x.target === e.target && x.kind === e.kind,
          );
          if (dupe) return prev;
          return [...prev, { ...e, _pulse: Date.now() } as CausalEdge];
        });
        setAgents((prev) => ({
          ...prev,
          dependency: {
            ...prev.dependency,
            count: prev.dependency.count + 1,
          },
        }));
        break;
      }
      case "emit_summary":
        setAgents((prev) => ({
          ...prev,
          semantic: {
            ...prev.semantic,
            count: prev.semantic.count + 1,
          },
        }));
        break;
      case "progress":
        // Counts are already maintained via emit_*; ignore the
        // periodic progress event for now.
        break;
    }
  };

  const isBuildLive = stage === "fetching" || stage === "running";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
            {stage === "done" ? "Mapped" : "Mapping"}
          </div>
          <h1 className="font-display text-2xl font-medium tracking-[-0.02em] sm:text-3xl">
            {stage === "done" ? "Saved to library" : "Map"}{" "}
            <span className="font-mono text-[0.72em] text-neutral-500">
              {owner}/{repo}
            </span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {stage === "done" ? (
            <>
              <Link
                href={`/app/${owner}/${repo}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-xs text-white transition-colors hover:bg-neutral-800"
              >
                Open full viewer
                <ArrowRight size={12} />
              </Link>
              <Link
                href="/app"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-4 text-xs text-neutral-700 transition-colors hover:border-neutral-300"
              >
                Projects
              </Link>
            </>
          ) : hydrating ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs text-neutral-500">
              Checking your library…
            </span>
          ) : !canAnalyze ? null : (stage === "idle" || stage === "error") ? (
            <Button
              onClick={startAnalysis}
              className="h-10 bg-[#E838A4] px-5 text-sm text-white hover:bg-[#C92E8E]"
            >
              <Sparkle size={15} weight="duotone" className="mr-1.5" />
              {stage === "error" ? "Retry analyze" : "Run the 4-agent build"}
              <ArrowRight size={14} className="ml-1.5" />
            </Button>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E838A4]/30 bg-[#E838A4]/10 px-3 py-1 text-xs text-[#C92E8E]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#E838A4]" />
              {stage === "fetching" ? "fetching repo tree" : "4 agents streaming"}
            </span>
          )}
        </div>
      </div>

      {!canAnalyze ? (
        <div className="flex justify-center">
          <MissingKeyCard />
        </div>
      ) : (
        <div className="h-[calc(100vh-220px)] min-h-[560px] w-full">
          {isBuildLive ? (
            <LiveBuildView
              agents={agents}
              models={models}
              onModelChange={setModel}
              nodes={liveNodes}
              edges={liveEdges}
              modelsLocked={true}
              footerNote={error ?? undefined}
            />
          ) : graph && stage === "done" ? (
            <CausalGraphViewer graph={graph} />
          ) : (
            // idle / error — placeholder showing the current model config
            <LiveBuildView
              agents={agents}
              models={models}
              onModelChange={setModel}
              nodes={[]}
              edges={[]}
              modelsLocked={false}
              footerNote={error ?? "Click Run to start the build"}
            />
          )}
        </div>
      )}

      {/* Logo + bg accent */}
      <div className="pointer-events-none fixed bottom-6 right-6 opacity-30">
        <Logo size={20} className="text-neutral-900" />
      </div>

      {error && stage === "error" && (
        <p className="flex items-start gap-2 text-xs text-red-500">
          <Warning size={13} className="mt-0.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

function isBuilder(id: string): id is BuilderAgentId {
  return BUILDER_AGENTS.some((a) => a.id === id);
}

const MODELS_LS_KEY = "causalist:builder-models:v1";

function readModelsFromStorage(): Record<BuilderAgentId, string> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MODELS_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      structure: parsed.structure ?? DEFAULT_MODEL,
      dependency: parsed.dependency ?? DEFAULT_MODEL,
      semantic: parsed.semantic ?? DEFAULT_MODEL,
      oracle: parsed.oracle ?? DEFAULT_MODEL,
    };
  } catch {
    return null;
  }
}

function writeModelsToStorage(m: Record<BuilderAgentId, string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MODELS_LS_KEY, JSON.stringify(m));
  } catch {
    // ignore quota errors
  }
}

function MissingKeyCard() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 px-6 py-5 text-sm">
      <div className="flex items-center gap-2 text-amber-900">
        <Key size={15} weight="duotone" />
        Add your Anthropic API key to analyze
      </div>
      <p className="max-w-sm text-xs text-amber-800/70">
        Your key is sent directly to the analyze route as a Bearer header. We
        never store it.
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
