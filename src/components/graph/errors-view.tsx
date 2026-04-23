"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CircleNotch,
  GitCommit,
  GithubLogo,
  Target,
  Warning,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";
import { Terminal, TypingAnimation } from "@/components/ui/terminal";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { useSettings } from "@/lib/settings";
import type { CausalGraph } from "@/lib/graph/types";

interface FailedRun {
  id: number;
  name: string;
  conclusion: string;
  headSha: string;
  headBranch: string;
  htmlUrl: string;
  updatedAt: string;
  actor: string;
  touchedFiles: string[];
  matchedNodeIds: string[];
}

export function ErrorsView({
  graph,
  onHighlightNodes,
}: {
  graph: CausalGraph;
  onHighlightNodes?: (nodeIds: string[]) => void;
}) {
  const settings = useSettings();
  const auth = useGithubAuth();
  const githubToken = auth.token ?? settings.githubToken;

  const [owner, repo] = graph.repo.split("/");
  const [runs, setRuns] = useState<FailedRun[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pathsToIds = useMemo(() => {
    const m = new Map<string, string>();
    for (const n of graph.nodes) {
      if (n.path) m.set(n.path, n.id);
    }
    return m;
  }, [graph.nodes]);

  useEffect(() => {
    if (!githubToken || !owner || !repo) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { Octokit } = await import("@octokit/rest");
        const octokit = new Octokit({ auth: githubToken });
        const { data: runsData } = await octokit.actions.listWorkflowRunsForRepo({
          owner,
          repo,
          status: "failure",
          per_page: 10,
        });
        const failed = runsData.workflow_runs.slice(0, 8);

        const touched = await Promise.all(
          failed.map(async (r) => {
            let files: string[] = [];
            try {
              if (r.head_sha) {
                const { data: commit } = await octokit.repos.getCommit({
                  owner,
                  repo,
                  ref: r.head_sha,
                });
                files = (commit.files ?? [])
                  .map((f) => f.filename)
                  .slice(0, 50);
              }
            } catch {
              // skip if commit isn't reachable
            }
            const matchedNodeIds = files
              .map((f) => pathsToIds.get(f))
              .filter((v): v is string => Boolean(v));
            return {
              id: r.id,
              name: r.name ?? "Workflow run",
              conclusion: r.conclusion ?? "failure",
              headSha: r.head_sha ?? "",
              headBranch: r.head_branch ?? "",
              htmlUrl: r.html_url ?? "",
              updatedAt: r.updated_at ?? "",
              actor: r.actor?.login ?? "",
              touchedFiles: files,
              matchedNodeIds,
            } satisfies FailedRun;
          }),
        );

        if (cancelled) return;
        setRuns(touched);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load Actions runs");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [githubToken, owner, repo, pathsToIds]);

  if (!githubToken) {
    return <EmptyOfflineState repo={graph.repo} />;
  }

  return (
    <div className="mx-auto max-w-3xl px-6 pb-32">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
            GitHub Actions · failed runs
          </p>
          <h2 className="mt-1 font-display text-2xl font-medium tracking-[-0.02em]">
            Where things are red right now
          </h2>
        </div>
        <a
          href={`https://github.com/${graph.repo}/actions`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <GithubLogo size={12} weight="fill" />
          Open on GitHub
        </a>
      </header>

      {loading && <LoadingRows />}
      {error && (
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/70 p-4 text-sm">
          <WarningCircle size={16} weight="fill" className="mt-0.5 text-red-500" />
          <div>
            <p className="text-red-700">Couldn&rsquo;t load Actions runs</p>
            <p className="mt-1 font-mono text-[11px] text-red-500">{error}</p>
          </div>
        </div>
      )}

      {!loading && !error && runs && runs.length === 0 && (
        <div className="rounded-2xl border border-dashed border-neutral-200 p-10 text-center">
          <Target size={20} weight="duotone" className="mx-auto mb-3 text-emerald-500" />
          <h3 className="font-display text-lg font-medium">All green</h3>
          <p className="mt-1 text-sm text-neutral-500">
            No failed workflow runs for {graph.repo}.
          </p>
        </div>
      )}

      {runs && runs.length > 0 && (
        <ul className="space-y-3">
          {runs.map((r) => (
            <RunRow key={r.id} run={r} onHighlight={onHighlightNodes} />
          ))}
        </ul>
      )}
    </div>
  );
}

function RunRow({
  run,
  onHighlight,
}: {
  run: FailedRun;
  onHighlight?: (ids: string[]) => void;
}) {
  const canHighlight = run.matchedNodeIds.length > 0;
  return (
    <li className="group rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:border-neutral-300 hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-[11px] text-neutral-500">
            <XCircle size={13} weight="fill" className="text-red-500" />
            <span className="font-mono uppercase tracking-wider">
              {run.conclusion}
            </span>
            <span className="text-neutral-300">·</span>
            <span className="font-mono">{run.headSha.slice(0, 7)}</span>
            <span className="text-neutral-300">·</span>
            <span>{run.headBranch}</span>
            <span className="text-neutral-300">·</span>
            <span>{run.actor}</span>
          </div>
          <h3 className="mt-1 truncate font-display text-base font-medium text-neutral-900">
            {run.name}
          </h3>
          <div className="mt-0.5 flex items-center gap-2 font-mono text-[10px] text-neutral-400">
            <GitCommit size={11} />
            <span>{relTime(run.updatedAt)}</span>
            <span>·</span>
            <span>{run.touchedFiles.length} files touched</span>
            {run.matchedNodeIds.length > 0 && (
              <>
                <span>·</span>
                <span className="text-[#E838A4]">
                  {run.matchedNodeIds.length} in graph
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canHighlight && (
            <button
              onClick={() => onHighlight?.(run.matchedNodeIds)}
              className="flex items-center gap-1 rounded-md bg-[#E838A4] px-2.5 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-[#C92E8E]"
            >
              Highlight in graph
              <ArrowRight size={11} />
            </button>
          )}
          <a
            href={run.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open run"
            className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          >
            <GithubLogo size={12} weight="fill" />
          </a>
        </div>
      </div>
      {run.touchedFiles.length > 0 && (
        <details className="mt-2 text-xs">
          <summary className="cursor-pointer font-mono text-[10px] text-neutral-400 hover:text-neutral-700">
            Touched files
          </summary>
          <ul className="mt-2 space-y-0.5 pl-4 font-mono text-[11px] text-neutral-600">
            {run.touchedFiles.slice(0, 30).map((f) => (
              <li key={f} className="truncate">
                {f}
              </li>
            ))}
            {run.touchedFiles.length > 30 && (
              <li className="text-neutral-400">
                +{run.touchedFiles.length - 30} more
              </li>
            )}
          </ul>
        </details>
      )}
    </li>
  );
}

function LoadingRows() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-neutral-200 bg-white p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <div className="h-2 w-48 rounded bg-neutral-100" />
              <div className="h-3 w-72 rounded bg-neutral-100" />
              <div className="h-2 w-36 rounded bg-neutral-100" />
            </div>
            <CircleNotch
              size={14}
              className="mt-1 animate-spin text-neutral-300"
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyOfflineState({ repo }: { repo: string }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-8 w-full">
        <Terminal className="mx-auto max-w-xl">
          <TypingAnimation className="text-emerald-400">
            {`> causalist tail --errors ${repo}`}
          </TypingAnimation>
          <TypingAnimation delay={900} className="text-white/70">
            Connect GitHub to read Actions runs for this repo.
          </TypingAnimation>
          <TypingAnimation delay={1600} className="text-white/70">
            Scanned 0 tool failures in the last 24h.
          </TypingAnimation>
          <TypingAnimation delay={2200} className="text-[#E838A4]">
            ✓ clean — ship it.
          </TypingAnimation>
        </Terminal>
      </div>
      <h2 className="mb-2 font-display text-xl font-medium tracking-tight">
        Connect GitHub to see live failures
      </h2>
      <p className="mb-6 max-w-md text-sm text-neutral-500">
        With a GitHub token connected, this view pulls the last 8 failed
        workflow runs and maps their touched files back to nodes on the graph
        — click a run to highlight what broke.
      </p>
      <Link
        href="/settings"
        className="inline-flex h-10 items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-sm text-white transition-colors hover:bg-neutral-800"
      >
        <Warning size={13} />
        Connect GitHub
        <ArrowRight size={13} />
      </Link>
    </div>
  );
}

function relTime(iso: string): string {
  if (!iso) return "";
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString();
}
