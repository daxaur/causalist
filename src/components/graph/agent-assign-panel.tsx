"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowUpRight,
  CheckCircle,
  GithubLogo,
  Plus,
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
import type { AgentKind } from "@/lib/agents/prompts";

type AssignStatus = "running" | "done" | "error";

interface Patch {
  path: string;
  summary: string;
  bytes: number;
  newContent?: string;
}

interface Assignment {
  id: string;
  agent: AgentKind;
  agentName: string;
  agentRole: string;
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

const AGENT_ROSTER: { kind: AgentKind; name: string; role: string }[] = [
  { kind: "auditor", name: "Auditor", role: "Bugs, dead branches, missing error handling" },
  { kind: "security", name: "Security", role: "Injection, auth gaps, tainted data flows" },
  { kind: "performance", name: "Performance", role: "Hot paths, N+1s, redundant work" },
  { kind: "refactor", name: "Refactor", role: "Safe structural improvements only" },
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
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const auth = useGithubAuth();
  const settings = useSettings();
  const cancelRef = useRef<Map<string, AbortController>>(new Map());

  // Cancel any in-flight runs on unmount.
  useEffect(() => {
    const ctls = cancelRef.current;
    return () => {
      ctls.forEach((c) => c.abort());
      ctls.clear();
    };
  }, []);

  const isRealRepo = /^[\w.-]+\/[\w.-]+$/.test(graph.repo);
  const nodesById = new Map(graph.nodes.map((n) => [n.id, n]));

  const update = (id: string, fn: (a: Assignment) => Assignment) =>
    setAssignments((prev) => prev.map((a) => (a.id === id ? fn(a) : a)));

  const assign = async (entry: (typeof AGENT_ROSTER)[number]) => {
    const nodeIds = Array.from(selectedIds);
    if (nodeIds.length === 0) {
      toast.info("Select nodes first", {
        description: "Click a node in the graph — shift-click to add more.",
      });
      return;
    }

    if (!settings.anthropicKey) {
      toast.error("Add your Anthropic key in Settings first", {
        description: "Agents call real Claude — that needs a key.",
      });
      return;
    }

    const id = `a_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const nodePathMap: Record<string, string> = {};
    for (const nid of nodeIds) {
      const n = nodesById.get(nid);
      if (n?.path) nodePathMap[nid] = n.path;
    }

    const assignment: Assignment = {
      id,
      agent: entry.kind,
      agentName: entry.name,
      agentRole: entry.role,
      nodeIds,
      status: "running",
      findings: [],
      patches: [],
      filesLoaded: 0,
      startedAt: Date.now(),
    };
    setAssignments((a) => [assignment, ...a]);

    toast.success(`${entry.name} · started`, {
      description: `Reviewing ${nodeIds.length} node${nodeIds.length === 1 ? "" : "s"}`,
    });

    const ac = new AbortController();
    cancelRef.current.set(id, ac);

    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent: entry.kind,
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

      // Parse SSE stream as it arrives.
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      // Collected patches need full content for the PR push, so the
      // route emits a final `done` event with the full output.
      type FinalOutput = {
        findings: Assignment["findings"];
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
          if (parsed.type === "done") {
            finalOutput = parsed.output as FinalOutput;
          }
        }
      }

      // Stash full patch contents for the PR push.
      if (finalOutput) {
        update(id, (a) => ({
          ...a,
          status: "done",
          summary: finalOutput!.summary,
          patches: finalOutput!.patches.map((p) => ({
            path: p.path,
            summary: p.summary,
            bytes: p.newContent.length,
            newContent: p.newContent,
          })),
        }));
        toast.success(`${entry.name} · done`, {
          description: `${finalOutput.findings.length} finding${finalOutput.findings.length === 1 ? "" : "s"} · ${finalOutput.patches.length} patch${finalOutput.patches.length === 1 ? "" : "es"}`,
        });
      } else {
        // Stream ended without 'done' — flag as error.
        update(id, (a) =>
          a.status === "running" ? { ...a, status: "error" } : a,
        );
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "agent failed";
      update(id, (a) => ({ ...a, status: "error", errorMsg: message }));
      toast.error(`${entry.name} · error`, { description: message });
    } finally {
      cancelRef.current.delete(id);
    }
  };

  const handleEvent = (
    id: string,
    ev: { type: string; [k: string]: unknown },
  ) => {
    switch (ev.type) {
      case "file_loaded":
        update(id, (a) => ({ ...a, filesLoaded: a.filesLoaded + 1 }));
        break;
      case "finding": {
        const f = ev as unknown as Assignment["findings"][number];
        update(id, (a) => ({ ...a, findings: [...a.findings, f] }));
        onAssign?.([f.nodeId], f.kind);
        onHighlight?.([f.nodeId]);
        break;
      }
      case "patch": {
        const p = ev as unknown as Patch;
        update(id, (a) => ({
          ...a,
          patches: [...a.patches, { path: p.path, summary: p.summary, bytes: p.bytes }],
        }));
        break;
      }
      case "summary": {
        const text = String((ev as { text?: string }).text ?? "");
        update(id, (a) => ({ ...a, summary: text }));
        break;
      }
      case "error":
        update(id, (a) => ({
          ...a,
          status: "error",
          errorMsg: String((ev as { message?: string }).message ?? "error"),
        }));
        break;
    }
  };

  const cancel = (id: string) => {
    const ac = cancelRef.current.get(id);
    ac?.abort();
    update(id, (a) => ({ ...a, status: "error", errorMsg: "cancelled" }));
  };

  const openPr = async (a: Assignment) => {
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
    if (a.patches.length === 0) {
      toast.info("No patches to push", {
        description: "This run only produced findings, no code changes.",
      });
      return;
    }
    update(a.id, (x) => ({ ...x, pushing: true }));
    try {
      const res = await fetch("/api/agent/push-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repo: graph.repo,
          baseBranch: "main",
          prTitle: `Causalist ${a.agentName}: ${a.summary?.slice(0, 60) ?? "review"}`,
          prBody: buildPrBody(a),
          files: a.patches
            .filter((p): p is Patch & { newContent: string } =>
              typeof p.newContent === "string",
            )
            .map((p) => ({ path: p.path, content: p.newContent })),
        }),
      });
      const body = (await res.json()) as { prUrl?: string; error?: string };
      if (!res.ok) throw new Error(body.error ?? "push failed");
      update(a.id, (x) => ({ ...x, pushing: false, prUrl: body.prUrl }));
      toast.success("PR opened", {
        description: body.prUrl,
        action: body.prUrl
          ? {
              label: "Open",
              onClick: () => window.open(body.prUrl, "_blank"),
            }
          : undefined,
      });
    } catch (e) {
      update(a.id, (x) => ({ ...x, pushing: false }));
      toast.error("PR push failed", {
        description: e instanceof Error ? e.message : "unknown error",
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Demo banner — preview/reference graphs aren't real repos */}
      {!isRealRepo && (
        <div className="border-b border-amber-200 bg-amber-50/60 px-4 py-2.5 text-[11px] text-amber-800">
          <span className="font-medium">Demo mode.</span> Sample graphs aren&rsquo;t
          tied to a real GitHub repo, so agents won&rsquo;t fetch files or open
          PRs. Try this on your own analyzed project.
        </div>
      )}

      {/* Assign section */}
      <div className="border-b border-neutral-100 p-4">
        <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
          <Sparkle size={10} weight="duotone" className="text-accent-magenta" />
          Assign agent
        </div>
        <div className="mb-3 text-[11px] text-neutral-500">
          {selectedIds.size > 0 ? (
            <>
              <span className="font-medium text-neutral-900">
                {selectedIds.size}
              </span>{" "}
              node{selectedIds.size === 1 ? "" : "s"} selected — pick an agent
              to review them.
            </>
          ) : (
            <>Multi-select nodes in the graph (shift-click), then pick an agent.</>
          )}
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {AGENT_ROSTER.map((a) => (
            <button
              key={a.kind}
              onClick={() => assign(a)}
              disabled={selectedIds.size === 0 || !isRealRepo}
              className="group flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-white px-3 py-2 text-left transition-all hover:border-accent-magenta/50 hover:bg-accent-magenta/[0.03] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-neutral-900">
                  {a.name}
                </div>
                <div className="truncate text-[11px] text-neutral-500">
                  {a.role}
                </div>
              </div>
              <Plus
                size={11}
                className="shrink-0 text-neutral-400 transition-colors group-hover:text-accent-magenta"
              />
            </button>
          ))}
        </div>
        {!settings.anthropicKey && (
          <div className="mt-3 rounded-md border border-neutral-200 bg-neutral-50 p-2.5 text-[11px] text-neutral-500">
            Agents call Claude Opus 4.7 directly.{" "}
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

      {/* Active + past assignments */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
          <span>Runs</span>
          {assignments.length > 0 && (
            <span className="text-neutral-400">{assignments.length}</span>
          )}
        </div>
        {assignments.length === 0 ? (
          <div className="rounded-md border border-dashed border-neutral-200 px-4 py-6 text-center text-[11px] text-neutral-400">
            No runs yet.
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {assignments.map((a) => (
                <motion.li
                  key={a.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="rounded-md border border-neutral-200 bg-white p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {a.status === "running" ? (
                        <CausalistSpinner size={11} />
                      ) : a.status === "error" ? (
                        <Warning size={11} weight="fill" className="text-red-500" />
                      ) : (
                        <CheckCircle
                          size={11}
                          weight="fill"
                          className="text-emerald-500"
                        />
                      )}
                      <span className="font-mono text-[11px] font-medium text-neutral-900">
                        {a.agentName}
                      </span>
                      <span className="text-[10px] text-neutral-400">
                        · {a.nodeIds.length} node{a.nodeIds.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    {a.status === "running" && (
                      <button
                        onClick={() => cancel(a.id)}
                        aria-label="Cancel"
                        className="flex h-6 w-6 items-center justify-center rounded text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                      >
                        <Stop size={10} weight="fill" />
                      </button>
                    )}
                  </div>

                  {a.status === "running" && (
                    <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-accent-magenta">
                      <RotatingVerb
                        verbs={[
                          a.filesLoaded < a.nodeIds.length ? "Reading" : "Reasoning",
                          "Tracing",
                          "Cross-checking",
                          "Synthesising",
                        ]}
                      />
                      <span className="text-neutral-400">
                        · {a.filesLoaded}/{a.nodeIds.length} loaded
                      </span>
                    </div>
                  )}

                  {a.errorMsg && (
                    <p className="mt-2 font-mono text-[10px] text-red-500">
                      {a.errorMsg}
                    </p>
                  )}

                  {a.summary && a.status === "done" && (
                    <p className="mt-2 text-[11px] leading-snug text-neutral-700">
                      {a.summary}
                    </p>
                  )}

                  {/* Findings */}
                  {a.findings.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {a.findings.slice(-6).map((f, i) => (
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
                      {a.findings.length > 6 && (
                        <li className="font-mono text-[10px] text-neutral-400">
                          +{a.findings.length - 6} more
                        </li>
                      )}
                    </ul>
                  )}

                  {/* Patches → Open PR */}
                  {a.status === "done" && a.patches.length > 0 && (
                    <div className="mt-3 rounded-md border border-neutral-100 bg-[#FAFAF8] p-2.5">
                      <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                        {a.patches.length} patch
                        {a.patches.length === 1 ? "" : "es"}
                      </div>
                      <ul className="mt-1.5 space-y-0.5">
                        {a.patches.slice(0, 4).map((p, i) => (
                          <li
                            key={i}
                            className="flex items-center gap-1.5 truncate font-mono text-[10px] text-neutral-600"
                          >
                            <span className="h-1 w-1 rounded-full bg-accent-magenta" />
                            <span className="truncate">{p.path}</span>
                          </li>
                        ))}
                      </ul>
                      {a.prUrl ? (
                        <a
                          href={a.prUrl}
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
                          onClick={() => openPr(a)}
                          disabled={a.pushing || !auth.authenticated || !isRealRepo}
                          className="mt-2 inline-flex h-7 items-center gap-1 rounded-md bg-neutral-900 px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <GithubLogo size={11} weight="fill" />
                          {a.pushing ? "Pushing…" : "Open PR"}
                          <ArrowUpRight size={11} />
                        </button>
                      )}
                      {!auth.authenticated && (
                        <a
                          href="/api/auth/github/login"
                          className="ml-2 text-[10px] text-neutral-400 underline underline-offset-2 hover:text-neutral-700"
                        >
                          Sign in to GitHub
                        </a>
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

function buildPrBody(a: Assignment): string {
  const lines: string[] = [
    `_Opened by Causalist **${a.agentName}** agent on behalf of the user._`,
    "",
    a.summary ?? "(no summary)",
    "",
    "## Changes",
    "",
  ];
  for (const p of a.patches) {
    lines.push(`- \`${p.path}\` — ${p.summary}`);
  }
  if (a.findings.length > 0) {
    lines.push("", "## Findings", "");
    for (const f of a.findings) {
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
