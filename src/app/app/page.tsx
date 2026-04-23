"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  CheckCircle,
  CircleNotch,
  Cube,
  Folders,
  GithubLogo,
  Graph,
  Key,
  MagnifyingGlass,
  Plugs,
  Star,
  Terminal,
  Warning,
} from "@phosphor-icons/react";
import { PageHeader, PageShell } from "@/components/layout/page-shell";
import { Input } from "@/components/ui/input";
import { useGithubAuth } from "@/hooks/use-github-auth";
import { useSettings } from "@/lib/settings";
import { PreviewDialog } from "@/components/landing/preview-dialog";
import { PREVIEWS, type PreviewMeta } from "@/lib/graph/previews";
import { REFERENCES } from "@/lib/graph/references";
import { useLibrary } from "@/lib/library/store";
import { cn } from "@/lib/utils";

type Tab = "repos" | "previews" | "reference" | "library" | "claude-code";

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
  const auth = useGithubAuth();
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<Tab>("previews");
  const { entries: libraryEntries, loading: loadingLib } = useLibrary();

  const githubToken = auth.token ?? settings.githubToken;
  const isConnected = auth.authenticated || Boolean(settings.githubToken);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const t = sp.get("tab") as Tab | null;
    if (
      t &&
      ["repos", "previews", "reference", "library", "claude-code"].includes(t)
    ) {
      setTab(t);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    sp.set("tab", tab);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}?${sp}${window.location.hash}`,
    );
  }, [tab]);

  useEffect(() => {
    if (!githubToken || tab !== "repos") return;
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
  }, [githubToken, tab]);

  const filteredRepos = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        (r.description ?? "").toLowerCase().includes(q),
    );
  }, [repos, query]);

  const filteredPreviews = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PREVIEWS;
    return PREVIEWS.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q),
    );
  }, [query]);

  const filteredReferences = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return REFERENCES;
    return REFERENCES.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.subtitle.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q),
    );
  }, [query]);

  const filteredLibrary = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return libraryEntries;
    return libraryEntries.filter(
      (e) =>
        `${e.owner}/${e.repo}`.toLowerCase().includes(q) ||
        (e.nickname ?? "").toLowerCase().includes(q),
    );
  }, [libraryEntries, query]);

  const TABS: {
    key: Tab;
    label: string;
    count: number | null;
    icon: React.ReactNode;
  }[] = [
    {
      key: "previews",
      label: "Demo graphs",
      count: PREVIEWS.length,
      icon: <Cube size={12} weight="duotone" />,
    },
    {
      key: "reference",
      label: "How things work",
      count: REFERENCES.length,
      icon: <BookOpen size={12} weight="duotone" />,
    },
    {
      key: "repos",
      label: "Your repos",
      count: repos.length || (isConnected ? 0 : 0),
      icon: <GithubLogo size={12} weight="fill" />,
    },
    {
      key: "library",
      label: "Saved",
      count: libraryEntries.length,
      icon: <Folders size={12} weight="duotone" />,
    },
    {
      key: "claude-code",
      label: "Use with Claude Code",
      count: null,
      icon: <Plugs size={12} weight="duotone" />,
    },
  ];

  return (
    <PageShell width="docs">
      <PageHeader
        eyebrow="Dashboard"
        title="Browse everything"
        description="One place for every graph — your repos, the live demos, language/framework references, and your saved library."
      />

      {/* Tabs */}
      <div className="mb-5 flex items-center gap-1 overflow-x-auto border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm transition-colors",
              tab === t.key
                ? "text-neutral-900"
                : "text-neutral-500 hover:text-neutral-900",
            )}
          >
            <span
              className={cn(
                tab === t.key ? "text-accent-magenta" : "text-neutral-400",
              )}
            >
              {t.icon}
            </span>
            {t.label}
            {t.count !== null && (
              <span className="font-mono text-[10px] text-neutral-400">
                {t.count}
              </span>
            )}
            {tab === t.key && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 bg-accent-magenta" />
            )}
          </button>
        ))}
      </div>

      {/* Search */}
      {tab !== "claude-code" && (
        <div className="relative mb-5">
          <MagnifyingGlass
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <Input
            placeholder={`Search ${TABS.find((t) => t.key === tab)?.label.toLowerCase() ?? tab}`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 pl-9"
          />
        </div>
      )}

      {/* Content */}
      {tab === "previews" && <PreviewsGrid items={filteredPreviews} />}

      {tab === "reference" && <ReferenceGrid items={filteredReferences} />}

      {tab === "repos" && (
        <>
          {!isConnected ? (
            <MissingTokenCard />
          ) : loadingRepos ? (
            <LoadingList />
          ) : error ? (
            <ErrorCard message={error} />
          ) : filteredRepos.length === 0 ? (
            <EmptyHint message={query ? "No repos match." : "No repositories found."} />
          ) : (
            <ul className="space-y-2">
              {filteredRepos.map((r) => (
                <RepoRow key={r.id} repo={r} />
              ))}
            </ul>
          )}
        </>
      )}

      {tab === "library" && (
        <>
          {loadingLib ? (
            <div className="rounded-xl border border-dashed border-neutral-200 p-10 text-center text-sm text-neutral-400">
              Loading…
            </div>
          ) : filteredLibrary.length === 0 ? (
            <EmptyHint message="Nothing saved yet. Analyze a repo to build your first graph." />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredLibrary.map((e) => (
                <Link
                  key={e.id}
                  href={`/app/${e.owner}/${e.repo}`}
                  className="group rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:-translate-y-px hover:border-neutral-300 hover:shadow-sm"
                >
                  <div className="font-mono text-[13px] text-neutral-900">
                    {e.nickname ?? `${e.owner}/${e.repo}`}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-[11px] text-neutral-400">
                    <Metric label="nodes" value={e.nodeCount} />
                    <Metric label="edges" value={e.edgeCount} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "claude-code" && <ClaudeCodeTab />}
    </PageShell>
  );
}

function ClaudeCodeTab() {
  return (
    <div className="space-y-8">
      {/* Pitch */}
      <div className="relative overflow-hidden rounded-2xl border border-accent-magenta/20 bg-accent-magenta/5 p-6">
        <div className="relative flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-accent-magenta/30 bg-white">
              <Plugs size={18} weight="duotone" className="text-accent-magenta" />
            </div>
            <div>
              <h2 className="font-display text-lg font-medium tracking-tight text-neutral-900">
                Use Causalist inside Claude Code
              </h2>
              <p className="mt-0.5 text-[13px] text-neutral-600">
                Give your coding agent a map of the repo it&rsquo;s working in.
                It picks better files to touch and catches what breaks before
                it ships.
              </p>
            </div>
          </div>
          <a
            href="https://docs.claude.com/en/docs/claude-code/overview"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-neutral-900/10 bg-white px-3 text-[11px] text-neutral-700 transition-colors hover:border-neutral-300 hover:text-neutral-900"
          >
            What is Claude Code?
            <ArrowRight size={11} />
          </a>
        </div>
      </div>

      {/* 3-step setup */}
      <section>
        <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
          Setup · 3 steps
        </h3>
        <ol className="space-y-3">
          <SetupStep
            n={1}
            title="Install Claude Code"
            body={
              <>
                Grab the CLI from{" "}
                <a
                  href="https://docs.claude.com/en/docs/claude-code/overview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:decoration-accent-magenta"
                >
                  docs.claude.com/claude-code
                </a>
                . Run <code className="font-mono text-[12px]">claude</code>{" "}
                in your repo — it&rsquo;s an agent that reads, writes, and
                runs shells.
              </>
            }
          />
          <SetupStep
            n={2}
            title="Add the Causalist MCP server"
            body={
              <>
                One line in your Claude Code MCP config (
                <code className="font-mono text-[12px]">~/.claude/mcp.json</code>
                ):
                <pre className="mt-2 overflow-x-auto rounded-md border border-neutral-200 bg-neutral-50 p-3 font-mono text-[11.5px] text-neutral-800">
{`{
  "mcpServers": {
    "causalist": {
      "command": "npx",
      "args": ["-y", "causalist-mcp@latest"]
    }
  }
}`}
                </pre>
                Claude Code now has 10 graph-reading tools:{" "}
                <code className="font-mono text-[12px]">query_node</code>,{" "}
                <code className="font-mono text-[12px]">get_neighbors</code>,{" "}
                <code className="font-mono text-[12px]">find_path</code>,{" "}
                <code className="font-mono text-[12px]">blast_radius</code>,
                and more.
              </>
            }
          />
          <SetupStep
            n={3}
            title="Pair your browser"
            body={
              <>
                So the tool-use events you see in the terminal stream into
                this tab in real time. Run:
                <pre className="mt-2 overflow-x-auto rounded-md border border-neutral-200 bg-neutral-50 p-3 font-mono text-[11.5px] text-neutral-800">
                  curl -sSL https://causalist.xyz/api/pair/setup?code=XXXXXX |
                  sh
                </pre>
                <Link
                  href="/pair"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-neutral-800"
                >
                  <Terminal size={11} />
                  Get a pair code
                  <ArrowRight size={10} />
                </Link>
              </>
            }
          />
        </ol>
      </section>

      {/* The loop that matters */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h3 className="mb-1 font-display text-[15px] font-medium tracking-tight text-neutral-900">
          The loop that matters
        </h3>
        <p className="mb-4 text-[13px] text-neutral-500">
          Concretely, here&rsquo;s how Claude Code uses the graph when you
          give it a task.
        </p>
        <ul className="space-y-2.5 text-[13px] leading-relaxed text-neutral-700">
          <LoopStep n={1}>
            <em>You:</em> &ldquo;Add rate limiting to every authenticated API
            route.&rdquo;
          </LoopStep>
          <LoopStep n={2}>
            Claude calls{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[12px]">
              find_nodes_by_layer(&quot;api&quot;)
            </code>{" "}
            → finds 15 routes.
          </LoopStep>
          <LoopStep n={3}>
            Filters by{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[12px]">
              get_neighbors(auth-middleware, &quot;in&quot;)
            </code>{" "}
            → 11 depend on auth.
          </LoopStep>
          <LoopStep n={4}>Prints a plan. You approve.</LoopStep>
          <LoopStep n={5}>
            Edits files. Each Edit fires a{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[12px]">
              PostToolUse
            </code>{" "}
            hook → browser tab highlights the node.
          </LoopStep>
          <LoopStep n={6}>
            Calls{" "}
            <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[12px]">
              affected_tests(edited_ids)
            </code>{" "}
            → 12 of 340 tests touched. Runs those only.
          </LoopStep>
        </ul>
        <p className="mt-5 font-display text-[14px] italic text-neutral-600">
          Claude Code already knows what it changed. Causalist knows what
          that change <em>means</em>.
        </p>
      </section>

      {/* Tools exposed */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h3 className="mb-3 font-display text-[15px] font-medium tracking-tight text-neutral-900">
          Tools exposed to your agent
        </h3>
        <div className="grid grid-cols-1 gap-2 text-[13px] sm:grid-cols-2">
          {TOOL_SUMMARIES.map((t) => (
            <div
              key={t.name}
              className="rounded-lg border border-neutral-100 bg-neutral-50/60 px-3 py-2"
            >
              <code className="font-mono text-[12px] font-medium text-neutral-900">
                {t.name}
              </code>
              <p className="mt-0.5 text-[12px] text-neutral-500">{t.what}</p>
            </div>
          ))}
        </div>
        <Link
          href="/agents"
          className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-accent-magenta hover:underline underline-offset-2"
        >
          Full tool docs
          <ArrowRight size={11} />
        </Link>
      </section>
    </div>
  );
}

function SetupStep({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: React.ReactNode;
}) {
  return (
    <li className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-900 font-mono text-[11px] font-medium text-white">
        {n}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 font-display text-[14px] font-medium text-neutral-900">
          {title}
          <CheckCircle
            size={12}
            weight="fill"
            className="text-emerald-400 opacity-0"
          />
        </div>
        <div className="mt-1 text-[13px] leading-relaxed text-neutral-600">
          {body}
        </div>
      </div>
    </li>
  );
}

function LoopStep({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 font-mono text-[11px] text-neutral-400">
        {n}.
      </span>
      <span className="flex-1">{children}</span>
    </li>
  );
}

const TOOL_SUMMARIES = [
  { name: "query_node", what: "Full metadata on any node by id or path." },
  { name: "get_neighbors", what: "All imports / callers — one hop, any direction." },
  { name: "find_path", what: "Shortest causal chain between two nodes." },
  { name: "find_nodes_by_layer", what: "Every API route, every UI component, etc." },
  { name: "blast_radius", what: "What breaks if this node changes." },
  { name: "affected_tests", what: "Which tests transitively touch these edits." },
  { name: "find_writers", what: "Who mutates this piece of state?" },
  { name: "similar_nodes", what: "Siblings by structure and semantics." },
  { name: "topo_order", what: "Dependency order for a subgraph." },
  { name: "co_change", what: "Nodes that tend to change together in commits." },
];

function PreviewsGrid({ items }: { items: PreviewMeta[] }) {
  if (items.length === 0)
    return <EmptyHint message="No demos match that search." />;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((p) => (
        <PreviewDialog key={p.slug} preview={p}>
          <button
            type="button"
            className="group relative flex w-full flex-col gap-4 overflow-hidden rounded-xl border border-neutral-200 bg-white p-5 text-left transition-all hover:-translate-y-px hover:border-neutral-300 hover:shadow-[0_2px_14px_rgba(0,0,0,0.05)]"
          >
            <div
              className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-accent-magenta transition-transform group-hover:scale-x-100"
              aria-hidden
            />
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-accent-magenta/30 bg-accent-magenta/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent-magenta">
                live demo
              </span>
              <span className="flex items-center gap-1 font-mono text-[10px] text-neutral-400">
                <Graph size={10} weight="duotone" />
                {p.graph.nodes.length}n · {p.graph.edges.length}e
              </span>
            </div>
            <div>
              <h3 className="font-display text-lg font-medium tracking-tight text-neutral-900">
                {p.title}
              </h3>
              <p className="mt-1 font-mono text-[11px] text-neutral-400">
                {p.subtitle}
              </p>
              <p className="mt-3 text-[13px] leading-relaxed text-neutral-500">
                {p.tagline}
              </p>
            </div>
            <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-400">
              <span className="font-mono">click to open</span>
              <ArrowRight
                size={13}
                className="text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-accent-magenta"
              />
            </div>
          </button>
        </PreviewDialog>
      ))}
    </div>
  );
}

function ReferenceGrid({
  items,
}: {
  items: { slug: string; title: string; subtitle: string; graph: { nodes: unknown[]; edges: unknown[] } }[];
}) {
  if (items.length === 0)
    return <EmptyHint message="No references match." />;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((r) => (
        <Link
          key={r.slug}
          href={`/reference/${r.slug}`}
          className="group relative flex flex-col gap-4 overflow-hidden rounded-xl border border-neutral-200 bg-white p-5 transition-all hover:-translate-y-px hover:border-neutral-300 hover:shadow-[0_2px_14px_rgba(0,0,0,0.05)]"
        >
          <div
            className="absolute inset-x-0 top-0 h-[2px] origin-left scale-x-0 bg-accent-magenta transition-transform group-hover:scale-x-100"
            aria-hidden
          />
          <div className="flex items-center justify-between">
            <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-neutral-500">
              reference
            </span>
            <span className="flex items-center gap-1 font-mono text-[10px] text-neutral-400">
              <Graph size={10} weight="duotone" />
              {r.graph.nodes.length}n · {r.graph.edges.length}e
            </span>
          </div>
          <div>
            <h3 className="font-display text-lg font-medium leading-snug tracking-tight text-neutral-900">
              {r.title}
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-neutral-500">
              {r.subtitle}
            </p>
          </div>
          <div className="flex items-center justify-between pt-1 text-[11px] text-neutral-400">
            <span className="font-mono">{r.slug}</span>
            <ArrowRight
              size={13}
              className="text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-accent-magenta"
            />
          </div>
        </Link>
      ))}
    </div>
  );
}

function RepoRow({ repo }: { repo: Repo }) {
  return (
    <li>
      <Link
        href={`/app/${repo.fullName}`}
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

function EmptyHint({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-neutral-200 p-8 text-center text-sm text-neutral-500">
      {message}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="font-mono text-sm text-neutral-700">
        {value.toLocaleString()}
      </span>
      <span className="font-mono text-[9px] uppercase tracking-wider text-neutral-400">
        {label}
      </span>
    </div>
  );
}
