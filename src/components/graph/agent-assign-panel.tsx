"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowUpRight,
  CheckCircle,
  GithubLogo,
  PaperPlaneRight,
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
  findings: {
    nodeId: string;
    kind: "reviewed" | "risky" | "fixed";
    note: string;
    path: string;
  }[];
  patches: Patch[];
  filesLoaded: number;
  errorMsg?: string;
  summary?: string;
  prUrl?: string;
  pushing?: boolean;
  startedAt: number;
}

// Suggestion chips — pre-fill the textarea, not separate code paths.
// They're seeds; the user can type anything. This is plan-mode.
const SUGGESTIONS = [
  "Audit for bugs and propose fixes",
  "Find security issues and patch them",
  "Look for perf hot paths to optimize",
  "Suggest safe refactors",
  "Explain what these files do",
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
    for (const nid of nodeIds) {
      const n = nodesById.get(nid);
      if (n?.path) nodePathMap[nid] = n.path;
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
          repo: graph.repo,
          branch: "main",
          selectedNodeIds: nodeIds,
          nodePathMap,
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
      case "finding": {
        const f = ev as unknown as Run["findings"][number];
        update(id, (r) => ({ ...r, findings: [...r.findings, f] }));
        onAssign?.([f.nodeId], f.kind);
        onHighlight?.([f.nodeId]);
        break;
      }
      case "patch": {
        const p = ev as unknown as Patch;
        update(id, (r) => ({
          ...r,
          patches: [...r.patches, { path: p.path, summary: p.summary, bytes: p.bytes }],
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
        <div className="shrink-0 border-b border-amber-200 bg-amber-50/60 px-4 py-2 text-[11px] text-amber-800">
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
        />
      ) : (
        <KeyGate />
      )}
    </div>
  );
}

/** Bottom-of-panel chat composer. Cursor / Claude-Desktop pattern. */
function Composer({
  plan,
  setPlan,
  submit,
  selectedCount,
  isRealRepo,
}: {
  plan: string;
  setPlan: (v: string) => void;
  submit: () => void;
  selectedCount: number;
  isRealRepo: boolean;
}) {
  const canSend = plan.trim().length > 0 && selectedCount > 0 && isRealRepo;
  return (
    <div className="shrink-0 border-t border-neutral-200 bg-white p-3">
      {/* Context chip — what's attached */}
      <div className="mb-2 flex items-center justify-between text-[10.5px]">
        {selectedCount > 0 ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-neutral-600">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-magenta" />
            {selectedCount} node{selectedCount === 1 ? "" : "s"} attached
          </span>
        ) : (
          <span className="font-mono text-neutral-400">
            select nodes in the graph to attach context
          </span>
        )}
        <span className="font-mono text-neutral-400">
          <kbd className="rounded border border-neutral-200 bg-white px-1 py-px text-[9px]">
            ⌘
          </kbd>
          <span className="mx-0.5">+</span>
          <kbd className="rounded border border-neutral-200 bg-white px-1 py-px text-[9px]">
            ↵
          </kbd>{" "}
          to send
        </span>
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

        {/* Suggestion chips + send button row */}
        <div className="flex items-end justify-between gap-2 border-t border-neutral-100 px-2 py-1.5">
          <div className="flex flex-wrap gap-1">
            {SUGGESTIONS.slice(0, 3).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setPlan(s)}
                className="rounded-md px-1.5 py-0.5 text-[10.5px] text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                {s.split(" ").slice(0, 3).join(" ")}…
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!canSend}
            aria-label="Send"
            className={cn(
              "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white transition-all",
              canSend
                ? "bg-accent-magenta hover:bg-accent-magenta/90"
                : "bg-neutral-200 text-neutral-400",
            )}
          >
            <PaperPlaneRight size={12} weight="fill" />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Replaces the composer entirely when no Anthropic key is set. */
function KeyGate() {
  return (
    <div className="shrink-0 border-t border-neutral-200 bg-[#FAFAF8] p-4">
      <div className="text-[12.5px] font-medium text-neutral-900">
        Add your Anthropic key
      </div>
      <p className="mt-0.5 text-[11.5px] leading-snug text-neutral-500">
        Agents call Claude Opus 4.7 from your browser. The key stays local.
      </p>
      <a
        href="/app/settings"
        className="mt-2.5 inline-flex h-8 items-center gap-1.5 rounded-md bg-neutral-900 px-3 text-[12px] font-medium text-white transition-colors hover:bg-neutral-800"
      >
        Add key in settings
        <span aria-hidden>→</span>
      </a>
    </div>
  );
}

/** Empty-state hero when no runs yet. Suggestion chips pre-fill composer. */
function EmptyChat({
  onPick,
  hasSelection,
}: {
  onPick: (s: string) => void;
  hasSelection: boolean;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="font-display text-[15px] font-medium text-neutral-900">
        Ask the agent.
      </div>
      <p className="mt-1 max-w-[280px] text-[12px] leading-snug text-neutral-500">
        {hasSelection
          ? "Describe a fix or audit. The agent reads the selected files and proposes a real PR."
          : "Pick nodes in the graph, then describe what to do — audit, fix, refactor, explain."}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] text-neutral-600 transition-all hover:border-accent-magenta/50 hover:text-neutral-900"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
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
            label={
              <span>
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
            className="inline-flex h-7 items-center gap-1 rounded-md border border-neutral-200 bg-white px-2 text-[10.5px] text-neutral-500 transition-colors hover:border-neutral-300 hover:text-neutral-900"
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
}: {
  status: StepStatus;
  label: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-[12px]">
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
