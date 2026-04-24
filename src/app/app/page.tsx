"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CircleNotch,
  Clock,
  Folders,
  GithubLogo,
  Key,
  MagnifyingGlass,
  Sparkle,
  Star,
  Warning,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { useSettings } from "@/lib/settings";
import { useLibrary } from "@/lib/library/store";
import type { LibraryIndexEntry } from "@/lib/library/types";
import { cn } from "@/lib/utils";

interface Repo {
  id: number;
  fullName: string;
  description: string | null;
  stars: number;
  language: string | null;
  isPrivate: boolean;
  updatedAt: string;
}

/**
 * Home — IDE-style hub. Left column: user's repos. Right column:
 * saved graphs (their library). A single "Connect Claude Code" card
 * at the top links to /app/claude-code. Everything else (references,
 * demos) lives on the landing page or in deep routes — Home stays
 * focused on *your project*.
 */
export default function HomePage() {
  const settings = useSettings();
  const auth = useGithubAuth();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const { entries: libraryEntries, loading: loadingLib } = useLibrary();

  const githubToken = auth.token ?? settings.githubToken;
  const isConnected = auth.authenticated || Boolean(settings.githubToken);

  useEffect(() => {
    if (!githubToken) return;
    let cancelled = false;
    const load = async () => {
      setLoadingRepos(true);
      setError(null);
      try {
        const { Octokit } = await import("@octokit/rest");
        const octokit = new Octokit({ auth: githubToken });
        const { data } = await octokit.repos.listForAuthenticatedUser({
          per_page: 100,
          sort: "updated",
          affiliation: "owner,collaborator,organization_member",
        });
        if (cancelled) return;
        setRepos(
          data.map((r) => ({
            id: r.id,
            fullName: r.full_name,
            description: r.description,
            stars: r.stargazers_count ?? 0,
            language: r.language,
            isPrivate: r.private,
            updatedAt: r.updated_at ?? "",
          })),
        );
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load repos");
      } finally {
        if (!cancelled) setLoadingRepos(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [githubToken]);

  const filteredRepos = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q),
    );
  }, [repos, query]);

  const filteredLibrary = useMemo(() => {
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
      <div className="mx-auto w-full max-w-6xl px-6 py-10 sm:px-8">
        {/* Page heading + global search */}
        <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
              Home
            </div>
            <h1 className="mt-1 font-display text-3xl font-medium tracking-[-0.02em] sm:text-4xl">
              Your projects
            </h1>
            <p className="mt-2 text-[13px] text-neutral-500">
              {isConnected
                ? `${repos.length || "—"} repo${repos.length === 1 ? "" : "s"} · ${libraryEntries.length} saved graph${libraryEntries.length === 1 ? "" : "s"}`
                : "Connect GitHub to see the repos you can map."}
            </p>
          </div>
          <div className="relative w-full md:w-72">
            <MagnifyingGlass
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
            />
            <Input
              placeholder="Search repos + saved"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10 pl-9"
            />
          </div>
        </div>

        {/* Claude Code banner — thin, not another card mass */}
        <Link
          href="/app/claude-code"
          className="group mb-8 flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:border-accent-magenta/40 hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
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
              Connect Claude Code
              <Sparkle
                size={10}
                weight="fill"
                className="text-accent-magenta"
              />
            </div>
            <div className="mt-0.5 text-[12px] text-neutral-500">
              Give your agent a typed causal graph of this project. Three-step
              install.
            </div>
          </div>
          <ArrowRight
            size={14}
            className="shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-accent-magenta"
          />
        </Link>

        {/* Two-column: repos | saved graphs */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
          {/* Repos */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                <GithubLogo size={11} weight="fill" />
                Your repos
                {repos.length > 0 && (
                  <span className="text-neutral-300">· {repos.length}</span>
                )}
              </h2>
              {!loadingRepos && isConnected && repos.length > 0 && (
                <span className="font-mono text-[10px] text-neutral-400">
                  {filteredRepos.length === repos.length
                    ? ""
                    : `${filteredRepos.length} shown`}
                </span>
              )}
            </div>

            {!isConnected ? (
              <MissingTokenCard />
            ) : loadingRepos ? (
              <LoadingList />
            ) : error ? (
              <ErrorCard message={error} />
            ) : filteredRepos.length === 0 ? (
              <EmptyHint
                message={
                  query ? "No repos match." : "No repositories found."
                }
              />
            ) : (
              <ul className="space-y-1.5">
                {filteredRepos.slice(0, 20).map((r) => (
                  <RepoRow key={r.id} repo={r} />
                ))}
              </ul>
            )}
          </section>

          {/* Saved graphs */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                <Folders size={11} weight="duotone" />
                Saved graphs
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
            ) : filteredLibrary.length === 0 ? (
              <EmptyHint message="Nothing saved yet. Analyze a repo to build your first graph." />
            ) : (
              <ul className="space-y-1.5">
                {filteredLibrary.slice(0, 20).map((e) => (
                  <SavedRow key={e.id} entry={e} />
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Docs strip at the bottom */}
        <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-neutral-200 pt-6 text-[12px] text-neutral-500">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
            Docs
          </span>
          <Link
            href="/docs/foundations"
            className="transition-colors hover:text-accent-magenta"
          >
            Causal foundations
          </Link>
          <Link
            href="/docs/graph-schema"
            className="transition-colors hover:text-accent-magenta"
          >
            Graph schema
          </Link>
          <Link
            href="/docs/retrieval"
            className="transition-colors hover:text-accent-magenta"
          >
            Retrieval model
          </Link>
          <Link
            href="/agents"
            className="transition-colors hover:text-accent-magenta"
          >
            Agent API
          </Link>
          <Link
            href="/pair"
            className="transition-colors hover:text-accent-magenta"
          >
            Pair terminal
          </Link>
        </div>
      </div>
    </div>
  );
}

function RepoRow({ repo }: { repo: Repo }) {
  return (
    <li>
      <Link
        href={`/app/${repo.fullName}`}
        className="group flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 transition-all hover:border-neutral-300 hover:shadow-[0_1px_0_rgba(0,0,0,0.02)]"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[13px]">
            <span className="truncate font-mono text-neutral-900">
              {repo.fullName}
            </span>
            {repo.isPrivate && (
              <span className="rounded-sm border border-neutral-200 px-1 py-px font-mono text-[9px] text-neutral-500">
                private
              </span>
            )}
          </div>
          {repo.description && (
            <p className="mt-0.5 truncate text-[11px] text-neutral-500">
              {repo.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-3 text-[10px] text-neutral-400">
          {repo.language && (
            <span className="font-mono">{repo.language}</span>
          )}
          {repo.stars > 0 && (
            <span className="flex items-center gap-0.5">
              <Star size={9} weight="fill" className="text-amber-400" />
              {repo.stars.toLocaleString()}
            </span>
          )}
          <ArrowRight
            size={12}
            className="text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-900"
          />
        </div>
      </Link>
    </li>
  );
}

function SavedRow({ entry }: { entry: LibraryIndexEntry }) {
  return (
    <li>
      <Link
        href={`/app/${entry.owner}/${entry.repo}`}
        className="group flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-3.5 py-2.5 transition-all hover:border-neutral-300 hover:shadow-[0_1px_0_rgba(0,0,0,0.02)]"
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

function LoadingList() {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center justify-between rounded-lg border border-neutral-200 bg-white px-3.5 py-3"
        >
          <div className="flex flex-col gap-1.5">
            <div className="h-2.5 w-40 rounded bg-neutral-100" />
            <div className="h-2 w-56 rounded bg-neutral-100" />
          </div>
          <CircleNotch size={12} className="animate-spin text-neutral-300" />
        </div>
      ))}
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/50 p-4">
      <Warning size={14} weight="fill" className="mt-0.5 text-red-500" />
      <div>
        <p className="text-[13px] text-red-700">
          Couldn&rsquo;t load repositories
        </p>
        <p className="mt-1 font-mono text-[11px] text-red-500">{message}</p>
        <Link
          href="/app/settings"
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-red-700 underline underline-offset-2 hover:text-red-900"
        >
          Check your GitHub token
        </Link>
      </div>
    </div>
  );
}

function MissingTokenCard() {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 text-center">
      <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 text-neutral-700">
        <GithubLogo size={16} weight="duotone" />
      </div>
      <h3 className="font-display text-[14px] font-medium">
        Connect GitHub
      </h3>
      <p className="mx-auto mt-1.5 max-w-xs text-[12px] text-neutral-500">
        Your repositories live behind GitHub. Token stays in your browser.
      </p>
      <Link
        href="/app/settings"
        className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md bg-neutral-900 px-3 text-[12px] text-white transition-colors hover:bg-neutral-800"
      >
        <Key size={12} />
        Add token
      </Link>
    </div>
  );
}

function EmptyHint({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-neutral-200 p-6 text-center text-[12px] text-neutral-500">
      {message}
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
