// Synthetic commit histories for canned previews. When we wire up
// real repositories we'll source these from Octokit + parse the diff
// to get the touched files. For now, hand-crafted so Changes mode has
// something to scrub through.

export interface SyntheticCommit {
  sha: string;
  title: string;
  author: string;
  date: string; // ISO
  /** Touched node ids (must match ids in the corresponding preview graph). */
  touched: string[];
  /** +additions, -deletions for the metadata strip. */
  additions: number;
  deletions: number;
}

export const COMMITS: Record<string, SyntheticCommit[]> = {
  causalist: [
    {
      sha: "f2e1a9d",
      title: "initial scaffold — next.js + shadcn + constellation hero",
      author: "daxaur",
      date: "2026-04-22T00:51:00Z",
      touched: ["layout", "page", "globals", "constellation"],
      additions: 420,
      deletions: 0,
    },
    {
      sha: "a3babf9",
      title: "rename to causalist + fraunces/geist/geist-mono typography",
      author: "daxaur",
      date: "2026-04-22T12:14:00Z",
      touched: ["layout", "globals", "page", "repo-page"],
      additions: 274,
      deletions: 110,
    },
    {
      sha: "6bb3917",
      title: "3D + 2D causal graph viewer with canned previews",
      author: "daxaur",
      date: "2026-04-22T14:02:00Z",
      touched: [
        "graph-viewer",
        "node-panel",
        "layer-legend",
        "types",
        "devicon",
        "preview-page",
        "preview-causalist",
        "preview-nextjs",
        "previews-index",
      ],
      additions: 816,
      deletions: 27,
    },
    {
      sha: "539b5cc",
      title: "bring-your-own-keys — Anthropic + GitHub in one settings flow",
      author: "daxaur",
      date: "2026-04-22T16:30:00Z",
      touched: ["settings-page", "settings-store", "page"],
      additions: 333,
      deletions: 3,
    },
    {
      sha: "d7c046b",
      title: "phase 1: logo · clash display/satoshi · /[owner]/[repo] · plan",
      author: "daxaur",
      date: "2026-04-22T18:45:00Z",
      touched: [
        "logo",
        "layout",
        "globals",
        "repo-page",
        "analyze-prompt",
        "page",
        "icon",
        "og",
      ],
      additions: 617,
      deletions: 166,
    },
    {
      sha: "08e3b44",
      title: "phase 2: fleshed previews, bento hero, dashboard, claude sdk",
      author: "daxaur",
      date: "2026-04-22T21:10:00Z",
      touched: [
        "preview-causalist",
        "preview-nextjs",
        "preview-flask",
        "previews-index",
        "page",
        "dashboard-page",
        "ext-anthropic",
        "ext-agent-sdk",
      ],
      additions: 2221,
      deletions: 235,
    },
    {
      sha: "a7aa17d",
      title: "phase 3: cli + claude code plugin + graph viewer rebuild",
      author: "daxaur",
      date: "2026-04-22T23:55:00Z",
      touched: [
        "graph-viewer",
        "node-panel",
        "cli",
        "plugin",
      ],
      additions: 1428,
      deletions: 268,
    },
    {
      sha: "5a1b558",
      title: "visual neighborhoods + real agent pipeline + live stream",
      author: "daxaur",
      date: "2026-04-23T02:20:00Z",
      touched: [
        "graph-viewer",
        "node-panel",
        "agent-structure",
        "agent-dependency",
        "agent-semantic",
        "agent-oracle",
      ],
      additions: 935,
      deletions: 54,
    },
    {
      sha: "0b8189e",
      title: "multi-mode preview · library · explainer · stars widget",
      author: "daxaur",
      date: "2026-04-23T05:40:00Z",
      touched: [
        "preview-page",
        "page",
        "ui-bento",
        "ui-marquee",
        "ui-terminal",
      ],
      additions: 1350,
      deletions: 72,
    },
  ],

  "next-js": [
    {
      sha: "a1b2c3d",
      title: "Fix: Turbopack HMR stalls on server action re-exports",
      author: "wyattjoh",
      date: "2026-04-18T14:22:00Z",
      touched: ["turbopack", "build", "cmd-dev"],
      additions: 184,
      deletions: 47,
    },
    {
      sha: "b2c3d4e",
      title: "Feat: async params in all route segments (breaking)",
      author: "timneutkens",
      date: "2026-04-15T09:45:00Z",
      touched: ["server", "app-router", "app-render", "server-routes"],
      additions: 612,
      deletions: 284,
    },
    {
      sha: "c3d4e5f",
      title: "Refactor: move cache tag invalidation to incremental-cache",
      author: "ijjk",
      date: "2026-04-12T16:10:00Z",
      touched: ["cache-tags", "incremental-cache", "fetch-patch"],
      additions: 231,
      deletions: 198,
    },
    {
      sha: "d4e5f6a",
      title: "Perf: batch RSC flight payloads on initial navigation",
      author: "shuding",
      date: "2026-04-10T11:30:00Z",
      touched: ["app-render", "react-server", "client-runtime"],
      additions: 94,
      deletions: 22,
    },
    {
      sha: "e5f6a7b",
      title: "Chore: update @swc/core to 1.12",
      author: "sokra",
      date: "2026-04-08T08:15:00Z",
      touched: ["swc", "build", "pkg"],
      additions: 42,
      deletions: 40,
    },
  ],

  flask: [
    {
      sha: "1a2b3c4",
      title: "Reorganize ctx + globals for asyncio-safe contextvars",
      author: "davidism",
      date: "2026-04-19T13:00:00Z",
      touched: ["ctx", "globals", "app"],
      additions: 287,
      deletions: 194,
    },
    {
      sha: "2b3c4d5",
      title: "Add send_file ETag support",
      author: "pgjones",
      date: "2026-04-16T10:24:00Z",
      touched: ["helpers", "wrappers"],
      additions: 68,
      deletions: 12,
    },
    {
      sha: "3c4d5e6",
      title: "Fix session cookie SameSite default to 'Lax'",
      author: "davidism",
      date: "2026-04-12T17:50:00Z",
      touched: ["sessions", "wrappers"],
      additions: 15,
      deletions: 9,
    },
    {
      sha: "4d5e6f7",
      title: "Docs: clarify blueprint route precedence",
      author: "davidism",
      date: "2026-04-09T09:12:00Z",
      touched: ["blueprints", "sansio-bp"],
      additions: 42,
      deletions: 8,
    },
  ],
};

export function commitsFor(slug: string): SyntheticCommit[] {
  return COMMITS[slug] ?? [];
}
