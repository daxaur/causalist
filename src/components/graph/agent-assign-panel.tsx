"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowUp,
  ArrowUpRight,
  CheckCircle,
  GithubLogo,
  Sparkle,
  Stop,
  Warning,
} from "@phosphor-icons/react";
import type { CausalGraph } from "@/lib/graph/types";
import { CausalistSpinner } from "@/components/ui/causalist-loader";
import { RotatingVerb } from "@/components/ui/thinking";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { useSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { CAUSAL_AGENTS } from "@/lib/agents/prompts";
import { ModelPill } from "@/components/agents/model-pill";

type AgentMeta = { agentId: string; agentName: string; agentColor: string };
type AgentRunState = AgentMeta & {
  status: "running" | "done" | "error";
  paths: string[];
  findingCount: number;
  patchCount: number;
};

type AssignStatus = "running" | "done" | "error";

interface Patch {
  path: string;
  summary: string;
  bytes: number;
  newContent?: string;
}

interface Run {
  id: string;
  plan: string;
  nodeIds: string[];
  status: AssignStatus;
  findings: ({
    nodeId: string;
    kind: "reviewed" | "risky" | "fixed";
    note: string;
    path: string;
  } & Partial<AgentMeta>)[];
  patches: (Patch & Partial<AgentMeta>)[];
  filesLoaded: number;
  errorMsg?: string;
  summary?: string;
  prUrl?: string;
  pushing?: boolean;
  startedAt: number;
  agentCount: number;
  agents: AgentRunState[];
}

// Suggestion chips — pre-fill the textarea. Each one explicitly
// invokes the GRAPH (blast radius, upstream, riskiest edges, depends
// on, subgraph cut) so the agent leans on the topology as evidence
// rather than running a generic linter pass.
const SUGGESTIONS = [
  "Trace the blast radius of these nodes",
  "What's upstream of this in the graph?",
  "Show me the riskiest edges in the selection",
  "Which other nodes are most depended on by these?",
  "Find the simplest cut that isolates this subgraph",
];

export function AgentAssignPanel({
  graph,
  selectedIds,
  onAssign,
  onHighlight,
}: {
  graph: CausalGraph;
  selectedIds: Set<string>;
  onAssign?: (ids: string[], status: "reviewed" | "risky" | "fixed") => void;
  onHighlight?: (ids: string[]) => void;
}) {
  const [runs, setRuns] = useState<Run[]>([]);
  const [plan, setPlan] = useState("");
  const [model, setModel] = useState<string>("claude-opus-4-7");
  const [agentCount, setAgentCount] = useState<number>(1);
  const auth = useGithubAuth();
  const settings = useSettings();
  const cancelRef = useRef<Map<string, AbortController>>(new Map());

  useEffect(() => {
    const ctls = cancelRef.current;
    return () => {
      ctls.forEach((c) => c.abort());
      ctls.clear();
    };
  }, []);

  const isRealRepo = /^[\w.-]+\/[\w.-]+$/.test(graph.repo);
  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));

  const update = (id: string, fn: (r: Run) => Run) =>
    setRuns((prev) => prev.map((r) => (r.id === id ? fn(r) : r)));

  const submit = async () => {
    const trimmed = plan.trim();
    if (!trimmed) {
      toast.info("Type what you want the agent to do");
      return;
    }
    const nodeIds = Array.from(selectedIds);
    if (nodeIds.length === 0) {
      toast.info("Select nodes first", {
        description: "Click a node in the graph — shift-click to add more.",
      });
      return;
    }
    if (!settings.anthropicKey) {
      toast.error("Add your Anthropic key in Settings first", {
        description: "Agents call Claude Opus 4.7 directly.",
      });
      return;
    }

    const id = `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const nodePathMap: Record<string, string> = {};
    const selectedNodeContext: {
      id: string;
      path?: string;
      summary?: string;
    }[] = [];
    for (const nid of nodeIds) {
      const n = nodesById.get(nid);
      if (n?.path) nodePathMap[nid] = n.path;
      // Always include the node in context — even external packages
      // without paths still benefit from the agent knowing they're
      // in scope ("user is asking about react").
      selectedNodeContext.push({
        id: nid,
        path: n?.path,
        summary: (n as { summary?: string } | undefined)?.summary,
      });
    }

    const run: Run = {
      id,
      plan: trimmed,
      nodeIds,
      status: "running",
      findings: [],
      patches: [],
      filesLoaded: 0,
      startedAt: Date.now(),
      agentCount,
      agents: [],
    };
    setRuns((rs) => [run, ...rs]);
    setPlan("");

    toast.success("Agent started", {
      description: `Plan: ${trimmed.slice(0, 80)}${trimmed.length > 80 ? "…" : ""}`,
    });

    const ac = new AbortController();
    cancelRef.current.set(id, ac);

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: trimmed,
          model,
          agents: agentCount,
          repo: graph.repo,
          // Prefer the exact commit SHA the graph was built against —
          // those files definitely exist. Falls back to "main" then
          // "master" via server-side retry if no SHA is available.
          branch: graph.commit || "main",
          selectedNodeIds: nodeIds,
          nodePathMap,
          selectedNodeContext,
          apiKey: settings.anthropicKey,
        }),
        signal: ac.signal,
      });
      if (!res.ok || !res.body) {
        throw new Error(`agent run failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      type FinalOutput = {
        findings: Run["findings"];
        patches: { path: string; newContent: string; summary: string }[];
        summary: string;
      };
      let finalOutput: FinalOutput | null = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const events = buf.split("\n\n");
        buf = events.pop() ?? "";
        for (const block of events) {
          const line = block.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          const dataStr = line.slice(5).trim();
          if (!dataStr) continue;
          let parsed: { type: string; [k: string]: unknown };
          try {
            parsed = JSON.parse(dataStr);
          } catch {
            continue;
          }
          handleEvent(id, parsed);
          if (parsed.type === "done") finalOutput = parsed.output as FinalOutput;
        }
      }

      if (finalOutput) {
        update(id, (r) => ({
          ...r,
          status: "done",
          summary: finalOutput!.summary,
          patches: finalOutput!.patches.map((p) => ({
            path: p.path,
            summary: p.summary,
            bytes: p.newContent.length,
            newContent: p.newContent,
          })),
        }));
        toast.success("Agent done", {
          description: `${finalOutput.findings.length} finding${finalOutput.findings.length === 1 ? "" : "s"} · ${finalOutput.patches.length} patch${finalOutput.patches.length === 1 ? "" : "es"}`,
        });
      } else {
        update(id, (r) => (r.status === "running" ? { ...r, status: "error" } : r));
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "agent failed";
      update(id, (r) => ({ ...r, status: "error", errorMsg: message }));
      toast.error("Agent error", { description: message });
    } finally {
      cancelRef.current.delete(id);
    }
  };

  const handleEvent = (id: string, ev: { type: string; [k: string]: unknown }) => {
    switch (ev.type) {
      case "file_loaded":
        update(id, (r) => ({ ...r, filesLoaded: r.filesLoaded + 1 }));
        break;
      case "agent_started": {
        const meta = ev as unknown as AgentMeta & { paths: string[] };
        update(id, (r) => ({
          ...r,
          agents: [
            ...r.agents.filter((a) => a.agentId !== meta.agentId),
            {
              ...meta,
              status: "running",
              paths: meta.paths ?? [],
              findingCount: 0,
              patchCount: 0,
            },
          ],
        }));
        // Highlight all nodes any active agent is currently looking at,
        // so the graph shows real-time per-agent activity. We push the
        // union after setRuns settles.
        queueMicrotask(() => {
          setRuns((prev) => {
            const r = prev.find((x) => x.id === id);
            if (r) onHighlight?.(activeNodeIds(r, nodesById));
            return prev;
          });
        });
        break;
      }
      case "agent_finished": {
        const meta = ev as unknown as AgentMeta;
        update(id, (r) => ({
          ...r,
          agents: r.agents.map((a) =>
            a.agentId === meta.agentId ? { ...a, status: "done" } : a,
          ),
        }));
        queueMicrotask(() => {
          setRuns((prev) => {
            const r = prev.find((x) => x.id === id);
            if (r) onHighlight?.(activeNodeIds(r, nodesById));
            return prev;
          });
        });
        break;
      }
      case "agent_error": {
        const meta = ev as unknown as AgentMeta & { message?: string };
        update(id, (r) => ({
          ...r,
          agents: r.agents.map((a) =>
            a.agentId === meta.agentId ? { ...a, status: "error" } : a,
          ),
        }));
        break;
      }
      case "finding": {
        const f = ev as unknown as Run["findings"][number];
        update(id, (r) => ({
          ...r,
          findings: [...r.findings, f],
          agents: r.agents.map((a) =>
            a.agentId === f.agentId
              ? { ...a, findingCount: a.findingCount + 1 }
              : a,
          ),
        }));
        onAssign?.([f.nodeId], f.kind);
        onHighlight?.([f.nodeId]);
        break;
      }
      case "patch": {
        const p = ev as unknown as Patch & Partial<AgentMeta>;
        update(id, (r) => ({
          ...r,
          patches: [
            ...r.patches,
            {
              path: p.path,
              summary: p.summary,
              bytes: p.bytes,
              agentId: p.agentId,
              agentName: p.agentName,
              agentColor: p.agentColor,
            },
          ],
          agents: r.agents.map((a) =>
            a.agentId === p.agentId
              ? { ...a, patchCount: a.patchCount + 1 }
              : a,
          ),
        }));
        break;
      }
      case "summary": {
        const text = String((ev as { text?: string }).text ?? "");
        update(id, (r) => ({ ...r, summary: text }));
        break;
      }
      case "error":
        update(id, (r) => ({
          ...r,
          status: "error",
          errorMsg: String((ev as { message?: string }).message ?? "error"),
        }));
        break;
    }
  };

  const cancel = (id: string) => {
    cancelRef.current.get(id)?.abort();
    update(id, (r) => ({ ...r, status: "error", errorMsg: "cancelled" }));
  };

  const openPr = async (r: Run) => {
    if (!auth.authenticated) {
      toast.error("Sign in to GitHub", {
        description: "We push the PR through your GitHub OAuth token.",
        action: {
          label: "Sign in",
          onClick: () => {
            window.location.href = "/api/auth/github/login";
          },
        },
      });
      return;
    }
    if (r.patches.length === 0) {
      toast.info("No patches to push", {
        description: "This run only produced findings, no code changes.",
      });
      return;
    }
    update(r.id, (x) => ({ ...x, pushing: true }));
    try {
      const res = await fetch("/api/agent/push-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: graph.repo,
          baseBranch: "main",
          prTitle: `Causalist: ${r.plan.slice(0, 60)}${r.plan.length > 60 ? "…" : ""}`,
          prBody: buildPrBody(r),
          files: r.patches
            .filter((p): p is Patch & { newContent: string } =>
              typeof p.newContent === "string",
            )
            .map((p) => ({ path: p.path, content: p.newContent })),
        }),
      });
      const body = (await res.json()) as { prUrl?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "push failed");
      update(r.id, (x) => ({ ...x, pushing: false, prUrl: body.prUrl }));
      toast.success("PR opened", {
        description: body.prUrl,
        action: body.prUrl
          ? { label: "Open", onClick: () => window.open(body.prUrl, "_blank") }
          : undefined,
      });
    } catch (e) {
      update(r.id, (x) => ({ ...x, pushing: false }));
      toast.error("PR push failed", {
        description: e instanceof Error ? e.message : "unknown error",
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Demo banner — preview/reference graphs aren't real repos */}
      {!isRealRepo && (
        <div className="shrink-0 border-b border-amber-200 bg-amber-50/60 px-4 py-2 text-[12px] text-amber-800">
          <span className="font-medium">Demo mode.</span> Sample graphs aren&rsquo;t
          tied to a real repo, so agents can&rsquo;t fetch files or open PRs.
        </div>
      )}

      {/* Conversation thread — fills the panel; oldest at top, newest
          at bottom; auto-scrolls to bottom as runs land. */}
      <div className="flex-1 overflow-y-auto px-4 py-5">
        {runs.length === 0 ? (
          <EmptyChat onPick={(s) => setPlan(s)} hasSelection={selectedIds.size > 0} />
        ) : (
          <ul className="space-y-6">
            <AnimatePresence initial={false}>
              {runs
                .slice()
                .reverse()
                .map((r) => (
                  <motion.li
                    key={r.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <RunThread
                      run={r}
                      nodesById={nodesById}
                      canPush={auth.authenticated && isRealRepo}
                      onCancel={() => cancel(r.id)}
                      onOpenPr={() => openPr(r)}
                    />
                  </motion.li>
                ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      {/* Composer or key-gate — sticks to the bottom, single block. */}
      {settings.anthropicKey ? (
        <Composer
          plan={plan}
          setPlan={setPlan}
          submit={submit}
          selectedCount={selectedIds.size}
          isRealRepo={isRealRepo}
          model={model}
          setModel={setModel}
          agentCount={agentCount}
          setAgentCount={setAgentCount}
        />
      ) : (
        <KeyGate />
      )}
    </div>
  );
}

/** Map an agent's owned file paths back to graph node ids so the
 *  viewer's externalHighlight can pulse them. Files outside the graph
 *  (e.g. the agent invented a path) are dropped silently. */
function activeNodeIds(
  r: Run,
  nodesById: Map<string, { path?: string }>,
): string[] {
  const out = new Set<string>();
  const pathToId = new Map<string, string>();
  for (const [id, n] of nodesById.entries()) {
    if (n.path) pathToId.set(n.path, id);
  }
  for (const a of r.agents) {
    if (a.status !== "running") continue;
    for (const p of a.paths) {
      const nid = pathToId.get(p);
      if (nid) out.add(nid);
    }
  }
  return Array.from(out);
}

/** Bottom-of-panel chat composer. Cursor / Claude-Desktop pattern. */
function Composer({
  plan,
  setPlan,
  submit,
  selectedCount,
  isRealRepo,
  model,
  setModel,
  agentCount,
  setAgentCount,
}: {
  plan: string;
  setPlan: (v: string) => void;
  submit: () => void;
  selectedCount: number;
  isRealRepo: boolean;
  model: string;
  setModel: (v: string) => void;
  agentCount: number;
  setAgentCount: (n: number) => void;
}) {
  const canSend = plan.trim().length > 0 && selectedCount > 0 && isRealRepo;
  return (
    <div className="relative shrink-0 border-t border-neutral-200 bg-white p-3">
      {/* Magenta accent strip on top — quiet brand presence */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-magenta/40 to-transparent" />

      {/* Scope chip on its own row (left-aligned, never wraps), then
          the parallel-agent picker on its own full-width row below.
          Stacking is required because the right panel is narrow and
          a single inline row forces the hint text to wrap one word
          per line. */}
      <div className="mb-2 space-y-2 text-[12px]">
        <div className="flex min-h-[20px] items-center">
          {selectedCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent-magenta/30 bg-accent-magenta/[0.06] px-2.5 py-0.5 font-mono text-accent-magenta">
              <CausalThinkingIcon size={11} />
              {agentCount === 1
                ? `${selectedCount} file${selectedCount === 1 ? "" : "s"} · 1 agent`
                : `${selectedCount} file${selectedCount === 1 ? "" : "s"} · ${agentCount} agents`}
            </span>
          ) : (
            <span className="truncate font-mono text-[11px] text-neutral-400">
              Select files to scope the agent
            </span>
          )}
        </div>
        <AgentCountPicker value={agentCount} onChange={setAgentCount} />
      </div>

      <div
        className={cn(
          "rounded-xl border bg-white transition-colors focus-within:border-accent-magenta/60 focus-within:ring-2 focus-within:ring-accent-magenta/15",
          plan.trim() ? "border-neutral-300" : "border-neutral-200",
        )}
      >
        <textarea
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={2}
          placeholder={
            selectedCount > 0
              ? "Ask anything about these files, or describe a fix to make…"
              : "Select nodes in the graph first, then ask…"
          }
          className="w-full resize-none rounded-xl bg-transparent px-3 py-2.5 text-[13px] leading-snug text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
        />

        {/* Footer — single quiet line: ModelPill on the left, send on
            the right. Suggestion chips were dropped here; they live in
            the empty-state hero only, which keeps the active-thread
            composer uncluttered. */}
        <div className="flex items-center justify-between gap-2 border-t border-neutral-100 px-2 py-1.5">
          <ModelPill
            size="sm"
            direction="up"
            value={model}
            onChange={setModel}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send"
            className={cn(
              "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white transition-all focus:outline-none focus:ring-2 focus:ring-accent-magenta/30 focus:ring-offset-1",
              canSend
                ? "bg-accent-magenta shadow-sm hover:bg-accent-magenta/90 hover:shadow-md hover:ring-2 hover:ring-accent-magenta/15"
                : "bg-neutral-100 text-neutral-300",
            )}
          >
            <ArrowUp size={14} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Graph-style swarm picker. Each agent renders as a tiny node-with-edges
 *  glyph in its color with the causal name beneath; raising the count
 *  lights up the next agent and adds an edge linking it into the chain
 *  — so the picker visually IS a small causal graph being assembled. */
function AgentCountPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div
      className="relative grid w-full grid-cols-5 items-end rounded-md border border-neutral-200 bg-white px-2 pb-1.5 pt-2"
      role="radiogroup"
      aria-label="Parallel agents"
    >
      {/* Single connector line behind the avatars. Width derived from
          how many agents are active — N active = line spans (N-1)/4
          of the grid. One element, one transition, perfectly centered
          across the dot row. */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-[10%] right-[10%] top-[16px] h-px bg-neutral-200"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute left-[10%] top-[16px] h-px bg-accent-magenta/60 transition-[width] duration-300 ease-out"
        style={{
          width: `calc((100% - 20%) * ${Math.max(0, value - 1) / 4})`,
        }}
      />

      {CAUSAL_AGENTS.map((agent, i) => {
        const n = i + 1;
        const active = n <= value;
        return (
          <button
            key={agent.id}
            type="button"
            role="radio"
            aria-checked={value === n}
            onClick={() => onChange(n)}
            title={`Run ${n} agent${n === 1 ? "" : "s"} — ${agent.name}: ${agent.lens}`}
            className="group relative z-10 flex flex-col items-center gap-1 transition-transform"
          >
            <AgentNodeGlyph color={agent.color} active={active} />
            <span
              className={cn(
                "font-mono text-[8.5px] uppercase tracking-wider transition-colors",
                active ? "text-neutral-700" : "text-neutral-300",
              )}
            >
              {agent.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Tiny node-with-edges glyph (~22px). Center disc in the agent's color
 *  with two short outbound lines fanning down-right and up-right. The
 *  visual cue is "this is a graph node," not just an abstract circle. */
function AgentNodeGlyph({
  color,
  active,
}: {
  color: string;
  active: boolean;
}) {
  // A single disc, sized to align cleanly with the horizontal
  // connector line behind the row. Inactive = empty ring; active =
  // filled in the agent's color. No fan-out lines — they competed
  // visually with the connector and made every dot look slightly
  // different at the pixel level.
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <circle
        cx={7}
        cy={7}
        r={5}
        fill={active ? color : "#ffffff"}
        stroke={active ? color : "#cbd5e1"}
        strokeWidth={1.4}
        style={{ transition: "fill 0.18s, stroke 0.18s" }}
      />
    </svg>
  );
}

/** Replaces the composer entirely when no Anthropic key is set. */
function KeyGate() {
  return (
    <div className="relative shrink-0 overflow-hidden border-t border-accent-magenta/30 bg-gradient-to-br from-accent-magenta/[0.04] via-white to-white p-4">
      {/* Subtle magenta accent strip on top — signature touch */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-magenta to-transparent" />
      <div className="flex items-center gap-2 text-[12.5px] font-medium text-neutral-900">
        <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-accent-magenta shadow-[0_0_8px_rgba(232,56,164,0.6)]" />
        Anthropic key required
      </div>
      <p className="mt-1 text-[12.5px] leading-snug text-neutral-500">
        Agents call Claude Opus 4.7 from your browser. Key stays local — never
        touches our servers.
      </p>
      <a
        href="/app/settings"
        className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-md bg-accent-magenta px-3 text-[12px] font-medium text-white transition-all hover:bg-accent-magenta/90 hover:shadow-[0_0_0_3px_rgba(232,56,164,0.15)]"
      >
        Add your key
        <span aria-hidden>→</span>
      </a>
    </div>
  );
}

/** Empty-state hero — small causal-graph "thinking" mark (3 nodes
 *  connected by lines that slowly draw in sequence). No clutter,
 *  reads as agents-on-a-graph at a glance. */
function EmptyChat({
  onPick,
  hasSelection,
}: {
  onPick: (s: string) => void;
  hasSelection: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <CausalThinkingIcon size={56} />

      <div className="mt-5 font-display text-[18px] font-medium tracking-tight text-neutral-900">
        {hasSelection ? "Tell the agent what to do." : "Pick files. Then tell the agent."}
      </div>
      <p className="mt-1.5 max-w-[300px] text-[12.5px] leading-relaxed text-neutral-500">
        {hasSelection
          ? "Audit, patch, refactor, explain — the agent reads the selected files and can open a real PR."
          : "Click nodes in the graph to scope the agent. One agent runs over your selection at a time."}
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-[12px] text-neutral-600 shadow-sm transition-all hover:border-accent-magenta hover:text-accent-magenta hover:shadow-[0_0_0_3px_rgba(232,56,164,0.08)]"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Three-node causal thinking icon. Edges draw in a slow loop so the
 *  agent feels alive without resorting to the pulsing-dot trope. Used
 *  in the empty hero AND inline in the scope chip. */
function CausalThinkingIcon({ size = 56 }: { size?: number }) {
  // Three node positions in a 100×100 viewBox.
  const nodes: Array<[number, number]> = [
    [22, 32],
    [78, 22],
    [54, 78],
  ];
  const edges: Array<[number, number]> = [
    [0, 1],
    [1, 2],
    [0, 2],
  ];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      style={{ display: "block" }}
    >
      <defs>
        {edges.map((_, i) => {
          const [a, b] = edges[i];
          const [x1, y1] = nodes[a];
          const [x2, y2] = nodes[b];
          const id = `causal-edge-${i}`;
          return (
            <linearGradient
              key={id}
              id={id}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#D24798" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#D24798" stopOpacity={0.9} />
            </linearGradient>
          );
        })}
      </defs>
      {edges.map((edge, i) => {
        const [a, b] = edge;
        const [x1, y1] = nodes[a];
        const [x2, y2] = nodes[b];
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={`url(#causal-edge-${i})`}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeDasharray="80 80"
            style={{
              animation: `causal-trace 2.4s ${i * 0.4}s ease-in-out infinite`,
            }}
          />
        );
      })}
      {nodes.map((n, i) => (
        <circle
          key={i}
          cx={n[0]}
          cy={n[1]}
          r={6}
          fill="#D24798"
          style={{
            animation: `causal-pulse-soft 2.4s ${i * 0.4}s ease-in-out infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes causal-trace {
          0%, 12% { stroke-dashoffset: 80; opacity: 0.2; }
          50%      { stroke-dashoffset: 0;  opacity: 1;   }
          100%    { stroke-dashoffset: -80; opacity: 0.2; }
        }
        @keyframes causal-pulse-soft {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
      `}</style>
    </svg>
  );
}

/**
 * Chat-style thread for one agent run. The user's plan sits at the top
 * as a dark bubble; below it the agent's steps (file_loaded, finding,
 * patch) render as small status cards in time order. Summary + patches
 * + Open PR appear at the bottom once the run finishes.
 */
function RunThread({
  run: r,
  nodesById,
  canPush,
  onCancel,
  onOpenPr,
}: {
  run: Run;
  nodesById: Map<string, { label: string }>;
  canPush: boolean;
  onCancel: () => void;
  onOpenPr: () => void;
}) {
  const meta = `${r.nodeIds.length} node${r.nodeIds.length === 1 ? "" : "s"} · ${new Date(r.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;

  return (
    <div className="space-y-2">
      {/* User bubble — the plan */}
      <div className="flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-br-sm bg-neutral-900 px-3 py-2 text-[12.5px] leading-snug text-white shadow-sm">
          {r.plan}
        </div>
      </div>
      <div className="flex justify-end font-mono text-[9px] text-neutral-400">
        {meta}
      </div>

      {/* Per-agent swarm strip — only when >1 agent. Shows live status
          per causal lens; the strip is the user's window into "who's
          working on what" while the streams are concurrent. */}
      {r.agentCount > 1 && r.agents.length > 0 && (
        <AgentSwarmStrip agents={r.agents} />
      )}

      {/* Agent thread */}
      <div className="space-y-1.5">
        {/* file_loaded steps as a single collapsed line so the feed
            doesn't drown in I/O noise */}
        {r.filesLoaded > 0 && (
          <StepCard
            status={r.filesLoaded < r.nodeIds.length ? "running" : "done"}
            label={`Read ${r.filesLoaded} of ${r.nodeIds.length} file${r.nodeIds.length === 1 ? "" : "s"}`}
            sub={r.status === "running" && r.filesLoaded < r.nodeIds.length ? "fetching" : undefined}
          />
        )}

        {/* While model is reasoning post-load, show a thinking row */}
        {r.status === "running" && r.filesLoaded >= r.nodeIds.length && (
          <StepCard
            status="running"
            label={
              <span className="inline-flex items-center gap-1.5">
                <RotatingVerb
                  verbs={["Reasoning", "Tracing", "Cross-checking", "Synthesising"]}
                />
              </span>
            }
          />
        )}

        {/* Findings as steps */}
        {r.findings.map((f, i) => (
          <StepCard
            key={`f-${i}`}
            status={f.kind === "risky" ? "warn" : f.kind === "fixed" ? "fixed" : "done"}
            agentColor={f.agentColor}
            label={
              <span>
                {f.agentName && (
                  <span
                    className="mr-1.5 inline-block rounded px-1 font-mono text-[9px] uppercase tracking-wider text-white"
                    style={{ backgroundColor: f.agentColor ?? "#999" }}
                  >
                    {f.agentName}
                  </span>
                )}
                <span
                  className={cn(
                    "font-medium",
                    f.kind === "risky"
                      ? "text-amber-700"
                      : f.kind === "fixed"
                        ? "text-accent-magenta"
                        : "text-neutral-900",
                  )}
                >
                  {f.kind === "risky" ? "Flagged" : f.kind === "fixed" ? "Patched" : "Reviewed"}
                </span>{" "}
                <span className="font-mono text-neutral-700">
                  {nodesById.get(f.nodeId)?.label ?? f.path.split("/").pop() ?? f.nodeId.slice(0, 24)}
                </span>
              </span>
            }
            sub={f.note}
          />
        ))}

        {/* Patch step rows */}
        {r.patches.map((p, i) => (
          <StepCard
            key={`p-${i}`}
            status="fixed"
            label={
              <span>
                <span className="font-medium text-accent-magenta">Patched</span>{" "}
                <code className="font-mono text-[11.5px] text-neutral-700">
                  {p.path}
                </code>
              </span>
            }
            sub={p.summary}
          />
        ))}
      </div>

      {/* Errors */}
      {r.errorMsg && (
        <div className="rounded-md border border-red-200 bg-red-50/60 px-3 py-2 text-[11px] text-red-700">
          <span className="font-medium">Error:</span> {r.errorMsg}
        </div>
      )}

      {/* Agent summary bubble */}
      {r.summary && r.status === "done" && (
        <div className="flex justify-start">
          <div className="max-w-[92%] rounded-2xl rounded-bl-sm border border-neutral-200 bg-white px-3 py-2 text-[12.5px] leading-snug text-neutral-700 shadow-sm">
            {r.summary}
          </div>
        </div>
      )}

      {/* Action row — Open PR */}
      {r.status === "done" && r.patches.length > 0 && (
        <div className="flex items-center justify-end gap-2 pt-1">
          {r.prUrl ? (
            <a
              href={r.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-[11.5px] font-medium text-white transition-colors hover:bg-emerald-700"
            >
              <CheckCircle size={11} weight="fill" />
              PR opened
              <ArrowUpRight size={11} />
            </a>
          ) : (
            <button
              type="button"
              onClick={onOpenPr}
              disabled={r.pushing || !canPush}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-neutral-900 px-3 text-[11.5px] font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <GithubLogo size={11} weight="fill" />
              {r.pushing ? "Pushing…" : `Open PR (${r.patches.length})`}
              <ArrowUpRight size={11} />
            </button>
          )}
        </div>
      )}

      {/* Cancel only while running */}
      {r.status === "running" && (
        <div className="flex justify-end pt-1">
          <button
            onClick={onCancel}
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 text-[12px] text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-900"
          >
            <Stop size={10} weight="fill" />
            cancel
          </button>
        </div>
      )}
    </div>
  );
}

type StepStatus = "running" | "done" | "warn" | "fixed";

function StepCard({
  status,
  label,
  sub,
  agentColor,
}: {
  status: StepStatus;
  label: React.ReactNode;
  sub?: React.ReactNode;
  /** Optional left border color — used to tag rows by agent. */
  agentColor?: string;
}) {
  return (
    <div
      className="flex items-start gap-2 overflow-hidden rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-[12px]"
      style={
        agentColor
          ? { boxShadow: `inset 3px 0 0 ${agentColor}` }
          : undefined
      }
    >
      <StatusGlyph status={status} />
      <div className="min-w-0 flex-1">
        <div className="leading-snug">{label}</div>
        {sub && (
          <div className="mt-0.5 truncate text-[11px] text-neutral-500">{sub}</div>
        )}
      </div>
    </div>
  );
}

/** Live per-agent status row — one chip per causal lens, color-coded,
 *  pulsing while running. The "real-time" face of a parallel run. */
function AgentSwarmStrip({ agents }: { agents: AgentRunState[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-neutral-200 bg-neutral-50/70 p-1.5">
      {agents.map((a) => {
        const isRunning = a.status === "running";
        const isError = a.status === "error";
        return (
          <div
            key={a.agentId}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border bg-white px-1.5 py-0.5 text-[10.5px] font-medium transition-opacity",
              isError && "opacity-60",
            )}
            style={{
              borderColor: isRunning ? a.agentColor : "#e5e5e5",
              color: isError ? "#a3a3a3" : "#171717",
            }}
            title={`${a.agentName} — ${a.status}${a.paths.length ? ` · owns ${a.paths.length} file${a.paths.length === 1 ? "" : "s"}` : ""}`}
          >
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                isRunning && "animate-pulse",
              )}
              style={{
                backgroundColor: a.agentColor,
                boxShadow: isRunning
                  ? `0 0 0 3px ${hexToRgba(a.agentColor, 0.18)}`
                  : undefined,
              }}
            />
            <span>{a.agentName}</span>
            {a.findingCount + a.patchCount > 0 && (
              <span className="ml-0.5 font-mono text-[9px] tabular-nums text-neutral-500">
                {a.findingCount + a.patchCount}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  if (m.length !== 6) return hex;
  const r = parseInt(m.slice(0, 2), 16);
  const g = parseInt(m.slice(2, 4), 16);
  const b = parseInt(m.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function StatusGlyph({ status }: { status: StepStatus }) {
  if (status === "running") {
    return (
      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
        <CausalistSpinner size={10} />
      </div>
    );
  }
  if (status === "warn") {
    return (
      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <Warning size={9} weight="fill" />
      </div>
    );
  }
  if (status === "fixed") {
    return (
      <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-magenta/15 text-accent-magenta">
        <Sparkle size={9} weight="fill" />
      </div>
    );
  }
  return (
    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
      <CheckCircle size={9} weight="fill" />
    </div>
  );
}

function buildPrBody(r: Run): string {
  const lines: string[] = [
    `_Opened by a Causalist agent on behalf of the user._`,
    "",
    `**Plan:** ${r.plan}`,
    "",
    r.summary ?? "(no summary)",
    "",
    "## Changes",
    "",
  ];
  for (const p of r.patches) {
    lines.push(`- \`${p.path}\` — ${p.summary}`);
  }
  if (r.findings.length > 0) {
    lines.push("", "## Findings", "");
    for (const f of r.findings) {
      lines.push(`- **${f.kind}** \`${f.path}\` — ${f.note}`);
    }
  }
  lines.push(
    "",
    "---",
    "🤖 Built with [Claude Opus 4.7](https://www.anthropic.com/claude) · Causalist",
  );
  return lines.join("\n");
}
