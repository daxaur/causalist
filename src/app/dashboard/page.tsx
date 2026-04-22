"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CircleNotch,
  GithubLogo,
  Key,
  MagnifyingGlass,
  Star,
  Warning,
} from "@phosphor-icons/react";
import { Logo } from "@/components/brand/logo";
import { Input } from "@/components/ui/input";
import { useSettings } from "@/lib/settings";

interface Repo {
  id: number;
  fullName: string;
  description: string | null;
  stars: number;
  language: string | null;
  isPrivate: boolean;
  updatedAt: string;
}

export default function DashboardPage() {
  const settings = useSettings();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!settings.githubToken) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const { Octokit } = await import("@octokit/rest");
        const octokit = new Octokit({ auth: settings.githubToken });
        const { data } = await octokit.repos.listForAuthenticatedUser({
          per_page: 100,
          sort: "updated",
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
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [settings.githubToken]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q),
    );
  }, [repos, query]);

  return (
    <main className="min-h-screen bg-white text-neutral-900">
      <nav className="flex items-center justify-between border-b border-neutral-100 px-8 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft size={16} />
          <span>back</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-2 text-neutral-900 transition-opacity hover:opacity-80"
        >
          <Logo size={18} />
          <span className="font-display text-sm font-medium tracking-tight">
            dashboard
          </span>
        </Link>
        <Link
          href="/settings"
          className="text-xs text-neutral-500 transition-colors hover:text-neutral-900"
        >
          Settings
        </Link>
      </nav>

      <div className="mx-auto max-w-4xl px-8 pt-12 pb-24">
        <div className="mb-10">
          <h1 className="font-display text-4xl font-medium tracking-[-0.02em]">
            Your repositories
          </h1>
          <p className="mt-3 text-sm text-neutral-500">
            {settings.githubToken
              ? "Pick any repo to map it into a 3D causal graph."
              : "Connect GitHub to see the repos you can map."}
          </p>
        </div>

        {!settings.githubToken ? (
          <MissingTokenCard />
        ) : (
          <>
            <div className="relative mb-6">
              <MagnifyingGlass
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
              />
              <Input
                placeholder="Search your repos"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 pl-9"
              />
            </div>

            {loading && <LoadingList />}
            {error && <ErrorCard message={error} />}
            {!loading && !error && filtered.length === 0 && (
              <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
                No repositories match {query ? `"${query}"` : "this view"}.
              </div>
            )}

            <ul className="space-y-2">
              {filtered.map((r) => (
                <RepoRow key={r.id} repo={r} />
              ))}
            </ul>
          </>
        )}
      </div>
    </main>
  );
}

function RepoRow({ repo }: { repo: Repo }) {
  return (
    <li>
      <Link
        href={`/${repo.fullName}`}
        className="group flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-5 py-4 transition-all hover:border-neutral-300 hover:shadow-sm"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-mono text-neutral-900">{repo.fullName}</span>
            {repo.isPrivate && (
              <span className="rounded-full border border-neutral-200 px-1.5 py-0 font-mono text-[10px] text-neutral-500">
                private
              </span>
            )}
            {repo.language && (
              <span className="font-mono text-[10px] text-neutral-400">
                · {repo.language}
              </span>
            )}
          </div>
          {repo.description && (
            <p className="mt-1 truncate text-xs text-neutral-500">
              {repo.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-4 text-xs text-neutral-400">
          {repo.stars > 0 && (
            <span className="flex items-center gap-1">
              <Star size={11} weight="fill" className="text-amber-400" />
              {repo.stars.toLocaleString()}
            </span>
          )}
          <ArrowRight
            size={14}
            className="text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-900"
          />
        </div>
      </Link>
    </li>
  );
}

function LoadingList() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex animate-pulse items-center justify-between rounded-xl border border-neutral-200 bg-white px-5 py-4"
        >
          <div className="flex flex-col gap-2">
            <div className="h-3 w-48 rounded bg-neutral-100" />
            <div className="h-2.5 w-64 rounded bg-neutral-100" />
          </div>
          <CircleNotch size={14} className="animate-spin text-neutral-300" />
        </div>
      ))}
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/50 p-4">
      <Warning size={16} weight="fill" className="mt-0.5 text-red-500" />
      <div>
        <p className="text-sm text-red-700">Couldn&rsquo;t load repositories</p>
        <p className="mt-1 font-mono text-xs text-red-500">{message}</p>
        <Link
          href="/settings"
          className="mt-2 inline-flex items-center gap-1 text-xs text-red-700 underline underline-offset-2 hover:text-red-900"
        >
          Check your GitHub token
        </Link>
      </div>
    </div>
  );
}

function MissingTokenCard() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-neutral-200">
        <GithubLogo size={20} weight="duotone" className="text-neutral-700" />
      </div>
      <h2 className="font-display text-xl font-medium tracking-tight">
        Connect GitHub
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
        Causalist lists your repositories via a GitHub fine-grained personal
        access token. The token stays in your browser — we never see it.
      </p>
      <Link
        href="/settings"
        className="mt-6 inline-flex h-10 items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-sm text-white transition-colors hover:bg-neutral-800"
      >
        <Key size={14} />
        Add token
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
