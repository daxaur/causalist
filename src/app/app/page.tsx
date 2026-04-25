"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Clock,
  Folders,
  GithubLogo,
  Plus,
  Sparkle,
  Terminal,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { useSettings } from "@/lib/settings";
import { useLibrary } from "@/lib/library/store";
import type { LibraryIndexEntry } from "@/lib/library/types";
import { NewProjectModal } from "@/components/projects/new-project-modal";
import { PairWizard } from "@/components/projects/pair-wizard";

/**
 * Projects — the central hub. New Project CTA opens a modal; below it
 * sits the user's saved graphs (their localStorage library), then a
 * row of featured demo graphs. Repository discovery happens INSIDE the
 * modal, not as a sidebar duplicate.
 */
export default function ProjectsPage() {
  const settings = useSettings();
  const auth = useGithubAuth();
  const { entries: libraryEntries, loading: loadingLib } = useLibrary();
  const [query, setQuery] = useState("");
  const [bus, setBus] = useState<{ events: number }>({ events: 0 });
  const isConnected = auth.authenticated || Boolean(settings.githubToken);

  // Live SSE listener — when the MCP server pushes a new project to
  // this paired browser, the library refreshes and the new entry
  // appears here without a manual reload.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const sessionId = window.localStorage.getItem("causalist:pair:session");
    if (!sessionId) return;
    const es = new EventSource(`/api/stream/${sessionId}`);
    const onProject = () => setBus((b) => ({ events: b.events + 1 }));
    es.addEventListener("project_added", onProject);
    return () => {
      es.removeEventListener("project_added", onProject);
      es.close();
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return libraryEntries;
    return libraryEntries.filter(
      (e) =>
        `${e.owner}/${e.repo}`.toLowerCase().includes(q) ||
        (e.nickname ?? "").toLowerCase().includes(q),
    );
  }, [libraryEntries, query]);

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

        {/* Pair Claude Code — opens a 3-step modal wizard. Click instead
            of routing so the friction stays low; the full setup guide
            is one link away if they want it. */}
        <PairWizard>
          <button
            type="button"
            className="group mb-8 flex w-full items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 text-left transition-all hover:border-accent-magenta/40 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/claude-code.png"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 font-display text-[14px] font-medium text-neutral-900">
                Pair Claude Code
                <Sparkle size={10} weight="fill" className="text-accent-magenta" />
              </div>
              <div className="mt-0.5 text-[12px] text-neutral-500">
                Two commands. Eleven graph tools, the SKILL.md, ready in 30 seconds.
              </div>
            </div>
            <ArrowRight
              size={14}
              className="shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-accent-magenta"
            />
          </button>
        </PairWizard>

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
            href="/pair"
            className="ml-auto inline-flex items-center gap-1 font-mono text-[10px] text-neutral-400 transition-colors hover:text-accent-magenta"
          >
            <Terminal size={10} />
            Pair terminal
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
        map a repo, or pair Claude Code to push graphs straight into this list.
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
