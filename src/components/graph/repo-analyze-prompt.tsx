"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, Key } from "@phosphor-icons/react";
import { listIndex, getEntry, saveEntry, touch } from "@/lib/library/store";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { useSettings } from "@/lib/settings";
import { CausalGraphViewer } from "./causal-graph-viewer";
import {
  LiveBuildView,
  type AgentLiveState,
} from "./live-build-view";
import { BuildConfigModal } from "./build-config-modal";
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

function initialEnabled(): Record<BuilderAgentId, boolean> {
  return { structure: true, dependency: true, semantic: true, oracle: true };
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
  const [enabled, setEnabled] = useState<Record<BuilderAgentId, boolean>>(
    initialEnabled,
  );
  const [stage, setStage] = useState<
    "idle" | "fetching" | "running" | "done" | "error"
  >("idle");
  const router = useRouter();
  // Modal owns the build configuration step. Opens automatically when
  // we're on /app/owner/repo with no saved graph and stage === idle.
  const [configOpen, setConfigOpen] = useState(false);
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

  // On mount: check the library, then the server, for a previously-
  // built graph for this owner/repo. If found, render immediately
  // and skip the analyze prompt. Re-runs whenever the library fires
  // its changed event so a fresh upload while the page is open also
  // takes effect.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // 1) Local IndexedDB library (fast)
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
            return;
          }
        }
        // 2) Server fallback — graph might exist from a different
        //    device or terminal session. Costs one HTTP round-trip;
        //    silent if not signed in / no row.
        try {
          const res = await fetch(
            `/api/projects/get-graph?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`,
            { credentials: "same-origin" },
          );
          if (cancelled) return;
          if (res.ok) {
            const data = (await res.json()) as {
              found?: boolean;
              graph?: CausalGraph;
            };
            if (data.found && data.graph) {
              setGraph(data.graph);
              setStage("done");
              // Also hydrate the local library so subsequent loads
              // are instant.
              try {
                await saveEntry({
                  owner,
                  repo,
                  graph: data.graph,
                  sourceCommitSha: data.graph.commit,
                });
              } catch {
                // best-effort cache only
              }
            }
          }
        } catch {
          // server unreachable — analyze prompt will appear
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

  const setAgentEnabled = useCallback(
    (id: BuilderAgentId, value: boolean) => {
      setEnabled((prev) => ({ ...prev, [id]: value }));
    },
    [],
  );

  // Open the build-config modal automatically once we know the user
  // has a key, the library check is done, and there's no existing
  // graph to render.
  useEffect(() => {
    if (
      canAnalyze &&
      !hydrating &&
      stage === "idle" &&
      !graph &&
      !configOpen
    ) {
      setConfigOpen(true);
    }
  }, [canAnalyze, hydrating, stage, graph, configOpen]);

  const enabledAgentsForApi = useMemo(
    () => ({
      dependency: enabled.dependency,
      semantic: enabled.semantic,
    }),
    [enabled.dependency, enabled.semantic],
  );

  // No auto-start — the user lands on the LiveBuildView empty state
  // ("Ready to build") with the per-agent ModelPills visible in the
  // top strip. They pick the model for each agent (Opus 4.7 / Sonnet
  // 4.6 / Haiku 4.5) then click "Run the 4-agent build" themselves.

  const startAnalysis = async () => {
    if (!canAnalyze) return;
    setConfigOpen(false);
    setError(null);
    setGraph(null);
    setLiveNodes([]);
    setLiveEdges([]);
    setStage("fetching");
    // Initialize agent strip: enabled ones are pending, disabled ones
    // are marked "done" up-front so they read as "skipped" in the UI
    // instead of perpetually pending.
    const init = initialAgents();
    for (const a of BUILDER_AGENTS) {
      if (!enabled[a.id]) init[a.id] = { id: a.id, status: "done", count: 0 };
    }
    setAgents(init);
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
          enabledAgents: enabledAgentsForApi,
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
            // Save to local IndexedDB library (per-browser cache)
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
            // Mirror to Supabase so other devices / browsers / cold
            // loads can fetch it back. Cookie auth, best-effort.
            try {
              await fetch("/api/projects/save-graph", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  owner,
                  repo,
                  graph: finalGraph,
                }),
              });
            } catch {
              // best-effort — local library still has it
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
          // Pin each emitted node at a deterministic position on a
          // golden-angle spiral around origin. fx/fy locks the node
          // — d3-force-2d won't try to move it, so existing nodes
          // don't shift when a new one arrives. The graph grows as
          // a coherent disc with zero ricochet, zero glitch.
          const idx = prev.length;
          const angle = (idx * 137.5 * Math.PI) / 180; // golden angle
          const r = 12 + Math.sqrt(idx) * 7;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          const seeded = {
            ...n,
            x,
            y,
            fx: x,
            fy: y,
            _pulse: Date.now(),
          } as CausalNode;
          return [...prev, seeded];
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

  // Toast once when the build finishes — replaces the old wrapper
  // header that said "Saved to library." The user is now dropped
  // straight into the full viewer; the toast is the only confirmation.
  const didToastDoneRef = useRef(false);
  useEffect(() => {
    if (stage === "done" && graph && !didToastDoneRef.current) {
      didToastDoneRef.current = true;
      toast.success(`Saved ${owner}/${repo} to your library`);
    }
  }, [stage, graph, owner, repo]);

  if (!canAnalyze) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#FAFAF8]">
        <MissingKeyCard />
      </div>
    );
  }

  // Hydrating — short window where we don't yet know if a saved graph
  // exists. Showing the empty "Ready to build" state would cause a
  // flicker if the lookup resolves to a hit. Render a calm placeholder.
  if (hydrating && stage === "idle") {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#FAFAF8]">
        <div className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
          checking your library…
        </div>
      </div>
    );
  }

  // Done — full-bleed viewer, no wrapper header, no buttons. The route
  // page already shows the breadcrumb (owner/repo) above us.
  if (graph && stage === "done") {
    return (
      <div className="h-full w-full">
        <CausalGraphViewer graph={graph} />
      </div>
    );
  }

  // Idle / fetching / running / error — full-bleed live build view.
  // Run CTA lives in the BuildConfigModal, not in the canvas. While
  // the modal is open the underlying view is the empty/streaming
  // canvas. Closing the modal without running drops the user back to
  // the projects page.
  return (
    <div className="relative h-full w-full">
      <LiveBuildView
        agents={agents}
        models={models}
        onModelChange={setModel}
        nodes={liveNodes}
        edges={liveEdges}
        modelsLocked={isBuildLive}
        running={isBuildLive}
        stage={stage}
        // No onRun — the modal is the only entry point for starting a
        // build, so the empty-canvas hint stays a passive "warming up"
        // state.
        footerNote={
          error ??
          (isBuildLive
            ? undefined
            : configOpen
              ? "Configure agents in the dialog…"
              : "Build cancelled. Reopen via Projects.")
        }
      />
      <BuildConfigModal
        open={configOpen}
        owner={owner}
        repo={repo}
        models={models}
        onModelChange={setModel}
        enabled={enabled}
        onEnabledChange={setAgentEnabled}
        onRun={() => void startAnalysis()}
        onClose={() => {
          setConfigOpen(false);
          // If the user dismisses without running and no graph exists,
          // send them back to the project list so they don't sit on a
          // dead empty viewer.
          if (stage === "idle") router.push("/app");
        }}
      />
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
