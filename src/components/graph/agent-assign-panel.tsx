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
        <div className="border-b border-amber-200 bg-amber-50/60 px-4 py-2 text-[11px] text-amber-800">
          <span className="font-medium">Demo mode.</span> Sample graphs aren&rsquo;t
          tied to a real repo, so agents can&rsquo;t fetch files or open PRs.
          Try this on your own analyzed project.
        </div>
      )}

      {/* Plan composer */}
      <div className="border-b border-neutral-100 p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
            <Sparkle size={10} weight="fill" className="text-accent-magenta" />
            Run an agent
          </div>
          <div className="font-mono text-[10px] text-neutral-400">
            {selectedIds.size > 0 ? (
              <>
                <span className="font-medium text-neutral-700">
                  {selectedIds.size}
                </span>{" "}
                node{selectedIds.size === 1 ? "" : "s"} selected
              </>
            ) : (
              <span className="text-amber-600">no selection</span>
            )}
          </div>
        </div>
        <textarea
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              submit();
            }
          }}
          rows={3}
          placeholder="What should the agent do? e.g., audit these files for bugs and propose fixes."
          className="w-full resize-none rounded-md border border-neutral-200 bg-white px-3 py-2 text-[12.5px] leading-snug text-neutral-900 placeholder:text-neutral-400 focus:border-accent-magenta/60 focus:outline-none focus:ring-2 focus:ring-accent-magenta/15"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPlan(s)}
              className="rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[10.5px] text-neutral-600 transition-all hover:border-accent-magenta/50 hover:text-neutral-900"
            >
              {s}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="font-mono text-[10px] text-neutral-400">
            <kbd className="rounded border border-neutral-200 bg-white px-1 py-px">
              ⌘
            </kbd>
            <span className="mx-0.5">+</span>
            <kbd className="rounded border border-neutral-200 bg-white px-1 py-px">
              ↵
            </kbd>{" "}
            to run
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={!plan.trim() || selectedIds.size === 0 || !isRealRepo}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-neutral-900 px-3 text-[12px] font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <PaperPlaneRight size={11} weight="fill" />
            Run agent
          </button>
        </div>
        {!settings.anthropicKey && (
          <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-2.5 text-[11px] text-neutral-500">
            Agents call Claude Opus 4.7.{" "}
            <a
              href="/app/settings"
              className="font-medium text-accent-magenta hover:underline"
            >
              Add your key
            </a>{" "}
            to run them.
          </div>
        )}
      </div>

      {/* Run feed */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
          Activity {runs.length > 0 ? `· ${runs.length}` : ""}
        </div>
        {runs.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-200 px-4 py-6 text-center text-[11px] text-neutral-400">
            No runs yet.
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {runs.map((r) => (
                <motion.li
                  key={r.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-md border border-neutral-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      {r.status === "running" ? (
                        <CausalistSpinner size={11} />
                      ) : r.status === "error" ? (
                        <Warning size={11} weight="fill" className="text-red-500" />
                      ) : (
                        <CheckCircle
                          size={11}
                          weight="fill"
                          className="text-emerald-500"
                        />
                      )}
                      <span className="truncate font-mono text-[11px] text-neutral-700">
                        {r.plan}
                      </span>
                    </div>
                    {r.status === "running" && (
                      <button
                        onClick={() => cancel(r.id)}
                        aria-label="Cancel"
                        className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                      >
                        <Stop size={10} weight="fill" />
                      </button>
                    )}
                  </div>

                  <div className="mt-1 font-mono text-[10px] text-neutral-400">
                    {r.nodeIds.length} node{r.nodeIds.length === 1 ? "" : "s"} ·{" "}
                    {r.filesLoaded}/{r.nodeIds.length} loaded
                  </div>

                  {r.status === "running" && (
                    <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-accent-magenta">
                      <RotatingVerb
                        verbs={[
                          r.filesLoaded < r.nodeIds.length ? "Reading" : "Reasoning",
                          "Tracing",
                          "Cross-checking",
                          "Synthesising",
                        ]}
                      />
                    </div>
                  )}

                  {r.errorMsg && (
                    <p className="mt-2 font-mono text-[10px] text-red-500">
                      {r.errorMsg}
                    </p>
                  )}

                  {r.summary && r.status === "done" && (
                    <p className="mt-2 text-[11px] leading-snug text-neutral-700">
                      {r.summary}
                    </p>
                  )}

                  {r.findings.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {r.findings.slice(-6).map((f, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-1.5 text-[11px]"
                        >
                          <span
                            aria-hidden
                            className={cn(
                              "mt-[3px] shrink-0",
                              f.kind === "risky"
                                ? "text-amber-500"
                                : f.kind === "fixed"
                                  ? "text-accent-magenta"
                                  : "text-emerald-500",
                            )}
                          >
                            {f.kind === "risky" ? (
                              <Warning size={9} weight="fill" />
                            ) : (
                              <CheckCircle size={9} weight="fill" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1 text-neutral-600">
                            <span className="font-mono text-neutral-900">
                              {nodesById.get(f.nodeId)?.label ??
                                f.path.split("/").pop() ??
                                f.nodeId.slice(0, 24)}
                            </span>
                            <span className="mx-1 text-neutral-300">·</span>
                            <span>{f.note}</span>
                          </span>
                        </li>
                      ))}
                      {r.findings.length > 6 && (
                        <li className="font-mono text-[10px] text-neutral-400">
                          +{r.findings.length - 6} more
                        </li>
                      )}
                    </ul>
                  )}

                  {r.status === "done" && r.patches.length > 0 && (
                    <div className="mt-3 rounded-md border border-neutral-100 bg-[#FAFAF8] p-2.5">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                        {r.patches.length} patch
                        {r.patches.length === 1 ? "" : "es"}
                      </div>
                      <ul className="mt-1.5 space-y-0.5">
                        {r.patches.slice(0, 4).map((p, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-1.5 truncate font-mono text-[10px] text-neutral-600"
                          >
                            <span className="h-1 w-1 rounded-full bg-accent-magenta" />
                            <span className="truncate">{p.path}</span>
                          </li>
                        ))}
                      </ul>
                      {r.prUrl ? (
                        <a
                          href={r.prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 inline-flex h-7 items-center gap-1 rounded-md bg-emerald-600 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-emerald-700"
                        >
                          <CheckCircle size={11} weight="fill" />
                          PR opened
                          <ArrowUpRight size={11} />
                        </a>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openPr(r)}
                          disabled={r.pushing || !auth.authenticated || !isRealRepo}
                          className="mt-2 inline-flex h-7 items-center gap-1 rounded-md bg-neutral-900 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <GithubLogo size={11} weight="fill" />
                          {r.pushing ? "Pushing…" : "Open PR"}
                          <ArrowUpRight size={11} />
                        </button>
                      )}
                    </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
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
