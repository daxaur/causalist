"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { usePairStatus } from "@/hooks/use-pair-status";
import {
  ArrowUpRight,
  Clock,
  Folders,
  GithubLogo,
  Plus,
  Terminal,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { useSettings } from "@/lib/settings";
import { useLibrary } from "@/lib/library/store";
import type { LibraryIndexEntry } from "@/lib/library/types";
import { NewProjectModal } from "@/components/projects/new-project-modal";
import { ConnectClaudeCard } from "@/components/projects/connect-claude-card";

/**
 * Projects — the central hub. New Project CTA opens a modal; below it
 * sits the user's saved graphs (their localStorage library), then a
 * row of featured demo graphs. Repository discovery happens INSIDE the
 * modal, not as a sidebar duplicate.
 */
interface ServerProject {
  owner: string;
  repo: string;
  nodeCount: number;
  edgeCount: number;
  commit?: string;
  updatedAt: number;
}

export default function ProjectsPage() {
  const settings = useSettings();
  const auth = useGithubAuth();
  const { entries: libraryEntries, loading: loadingLib } = useLibrary();
  const [query, setQuery] = useState("");
  const [bus, setBus] = useState<{ events: number }>({ events: 0 });
  const [serverProjects, setServerProjects] = useState<ServerProject[]>([]);
  const isConnected = auth.authenticated || Boolean(settings.githubToken);

  // Pull the user's server-side project list once on mount + whenever
  // a fresh upload arrives. So a user who built on another device or
  // wiped their browser cache still sees their projects.
  useEffect(() => {
    if (!auth.authenticated) return;
    let cancelled = false;
    const fetchServer = async () => {
      try {
        const res = await fetch("/api/projects/list", {
          credentials: "same-origin",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { projects?: ServerProject[] };
        if (!cancelled && data.projects) setServerProjects(data.projects);
      } catch {
        // ignore — local library still shows
      }
    };
    void fetchServer();
    return () => {
      cancelled = true;
    };
  }, [auth.authenticated, bus.events]);

  // Live SSE listener — when the MCP server pushes a new project to
  // this paired browser, the library refreshes and the new entry
  // appears here without a manual reload. Re-subscribes whenever the
  // pair sessionId changes (unpair / re-pair) so we don't leak the
  // previous EventSource.
  const pair = usePairStatus();
  useEffect(() => {
    if (!pair.sessionId) return;
    const es = new EventSource(`/api/stream/${pair.sessionId}`);
    const onProject = () => setBus((b) => ({ events: b.events + 1 }));
    es.addEventListener("project_added", onProject);
    return () => {
      es.removeEventListener("project_added", onProject);
      es.close();
    };
  }, [pair.sessionId]);

  // API-key channel — when an agent calls POST /api/projects with a
  // Bearer token tied to this user's GitHub identity, the project
  // arrives here and we offer to open it. This is the API-only path:
  // no pair-code dance required, just a key the user minted in /app/settings.
  const router = useRouter();
  useEffect(() => {
    if (!auth.userId) return;
    const es = new EventSource(`/api/stream/user-${auth.userId}`);

    // project_added — agent registered a project but didn't build it
    // (legacy "open this URL to build" flow)
    const onProject = (e: MessageEvent) => {
      setBus((b) => ({ events: b.events + 1 }));
      try {
        const data = JSON.parse(e.data) as {
          project?: { owner?: string; repo?: string; nickname?: string };
        };
        const p = data.project;
        if (!p?.owner || !p?.repo) return;
        const label = p.nickname || `${p.owner}/${p.repo}`;
        toast.success(`Project added · ${label}`, {
          description: "Open it to run the build.",
          action: {
            label: "Open",
            onClick: () => router.push(`/app/${p.owner}/${p.repo}`),
          },
        });
      } catch {
        // ignore malformed events
      }
    };
    es.addEventListener("project_added", onProject);

    // graph_uploaded — agent ran the FULL build in the terminal and
    // uploaded the finished graph. Save straight to library so it
    // appears in Your projects without the user opening anything.
    const onGraph = async (e: MessageEvent) => {
      setBus((b) => ({ events: b.events + 1 }));
      try {
        const data = JSON.parse(e.data) as {
          project?: { owner?: string; repo?: string; nickname?: string };
          graph?: import("@/lib/graph/types").CausalGraph;
        };
        const p = data.project;
        const g = data.graph;
        if (!p?.owner || !p?.repo || !g) return;
        const { saveEntry } = await import("@/lib/library/store");
        await saveEntry({
          owner: p.owner,
          repo: p.repo,
          graph: g,
          sourceCommitSha: g.commit,
        });
        const label = p.nickname || `${p.owner}/${p.repo}`;
        toast.success(`Built by Claude Code · ${label}`, {
          description: `${g.nodes.length} nodes · ${g.edges.length} edges`,
          action: {
            label: "Open",
            onClick: () => router.push(`/app/${p.owner}/${p.repo}`),
          },
        });
      } catch {
        // ignore malformed events
      }
    };
    es.addEventListener("graph_uploaded", onGraph);

    return () => {
      es.removeEventListener("project_added", onProject);
      es.removeEventListener("graph_uploaded", onGraph);
      es.close();
    };
  }, [auth.userId, router]);

  // Merge: local library is the canonical "I've got the graph cached
  // here" set; serverProjects fills in anything the user built on
  // another device or that hasn't been touched yet on this browser.
  // Keyed by owner/repo so duplicates (same project in both places)
  // collapse and prefer the local entry (it has nickname/pinned/etc).
  const merged = useMemo(() => {
    const byKey = new Map<string, LibraryIndexEntry>();
    for (const e of libraryEntries) byKey.set(`${e.owner}/${e.repo}`, e);
    for (const p of serverProjects) {
      const key = `${p.owner}/${p.repo}`;
      if (byKey.has(key)) continue;
      // Synthesize a library-shaped row for the projects list. id is
      // the owner/repo string so React keys are stable; clicking
      // navigates to /app/owner/repo where RepoAnalyzePrompt will
      // hydrate the graph from the server fetch.
      byKey.set(key, {
        id: `server:${key}`,
        owner: p.owner,
        repo: p.repo,
        generatedAt: p.updatedAt,
        lastOpenedAt: p.updatedAt,
        pinned: false,
        tags: [],
        nodeCount: p.nodeCount,
        edgeCount: p.edgeCount,
      } as LibraryIndexEntry);
    }
    return Array.from(byKey.values()).sort(
      (a, b) => b.lastOpenedAt - a.lastOpenedAt,
    );
  }, [libraryEntries, serverProjects]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return merged;
    return merged.filter(
      (e) =>
        `${e.owner}/${e.repo}`.toLowerCase().includes(q) ||
        (e.nickname ?? "").toLowerCase().includes(q),
    );
  }, [merged, query]);

  return (
    <div className="h-full overflow-y-auto bg-[#FAFAF8]">
      <div className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
              Workspace
            </div>
            <h1 className="mt-1 font-display text-3xl font-medium tracking-[-0.02em] sm:text-4xl">
              Projects
            </h1>
            <p className="mt-2 text-[13px] text-neutral-500">
              {libraryEntries.length === 0
                ? "Drop in a GitHub URL to map your first codebase."
                : `${libraryEntries.length} project${libraryEntries.length === 1 ? "" : "s"} mapped${bus.events > 0 ? ` · ${bus.events} live update${bus.events === 1 ? "" : "s"}` : ""}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {libraryEntries.length > 0 && (
              <Input
                placeholder="Search projects"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-10 w-56"
              />
            )}
            <NewProjectModal>
              <button
                type="button"
                className="group inline-flex h-10 items-center gap-2 rounded-md bg-neutral-900 px-4 text-[13px] font-medium text-white transition-colors hover:bg-neutral-800"
              >
                <Plus size={13} weight="bold" />
                New project
              </button>
            </NewProjectModal>
          </div>
        </div>

        {/* Connect Claude Code — API-key first. The card mints a key on
            click, then shows a copy-pasteable two-line install snippet. */}
        <div className="mb-8">
          <ConnectClaudeCard />
        </div>

        {/* Saved projects */}
        <section className="mb-12">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
              <Folders size={11} weight="duotone" />
              Your projects
              {libraryEntries.length > 0 && (
                <span className="text-neutral-300">
                  · {libraryEntries.length}
                </span>
              )}
            </h2>
          </div>

          {loadingLib ? (
            <div className="rounded-xl border border-dashed border-neutral-200 p-10 text-center text-sm text-neutral-400">
              Loading…
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState isConnected={isConnected} />
          ) : (
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {filtered.map((e) => (
                <SavedRow key={e.id} entry={e} />
              ))}
            </ul>
          )}
        </section>

        {/* Docs strip */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-neutral-200 pt-6 text-[12px] text-neutral-500">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
            Docs
          </span>
          <Link href="/docs/foundations" className="transition-colors hover:text-accent-magenta">
            Causal foundations
          </Link>
          <Link href="/docs/graph-schema" className="transition-colors hover:text-accent-magenta">
            Graph schema
          </Link>
          <Link href="/docs/retrieval" className="transition-colors hover:text-accent-magenta">
            Retrieval model
          </Link>
          <Link
            href="/app/settings"
            className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] text-neutral-400 transition-colors hover:text-accent-magenta"
          >
            <Terminal size={10} />
            API keys
          </Link>
        </div>
      </div>
    </div>
  );
}

function SavedRow({ entry }: { entry: LibraryIndexEntry }) {
  return (
    <li>
      <Link
        href={`/app/${entry.owner}/${entry.repo}`}
        className="group flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 transition-all hover:border-accent-magenta/40 hover:shadow-[0_1px_0_rgba(0,0,0,0.02)]"
      >
        <div className="min-w-0">
          <div className="truncate font-mono text-[13px] text-neutral-900">
            {entry.nickname ?? `${entry.owner}/${entry.repo}`}
          </div>
          {entry.nickname && (
            <div className="mt-0.5 truncate font-mono text-[10px] text-neutral-400">
              {entry.owner}/{entry.repo}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 text-[10px] text-neutral-400">
          <span className="font-mono">
            {entry.nodeCount}n · {entry.edgeCount}e
          </span>
          <span className="flex items-center gap-0.5">
            <Clock size={9} />
            {relTime(entry.lastOpenedAt)}
          </span>
          <ArrowUpRight
            size={12}
            className="text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-900"
          />
        </div>
      </Link>
    </li>
  );
}

function EmptyState({ isConnected }: { isConnected: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-200 bg-white p-10 text-center">
      <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-700">
        <Folders size={16} weight="duotone" />
      </div>
      <h3 className="font-display text-[15px] font-medium text-neutral-900">
        No projects yet
      </h3>
      <p className="mx-auto mt-1.5 max-w-sm text-[12px] text-neutral-500">
        Hit <span className="font-mono text-neutral-700">New project</span> to
        map a repo, or connect Claude Code above to create projects from your
        terminal.
      </p>
      {!isConnected && (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-[#FAFAF8] px-3 py-1 font-mono text-[10px] text-neutral-500">
          <GithubLogo size={10} weight="fill" />
          Optional: connect GitHub in Settings to read private repos.
        </p>
      )}
    </div>
  );
}

function relTime(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
  return new Date(ts).toLocaleDateString();
}
