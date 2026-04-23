// Hand-crafted reference causal graphs — teaching material, not
// specific repos. Each graph explains how a language or framework
// actually works by drawing the causal chain end-to-end.

import type {
  CausalEdge,
  CausalGraph,
  CausalNode,
  SemanticLayer,
} from "./types";

export interface ReferenceMeta {
  slug: string;
  title: string;
  subtitle: string;
  why: string;
  startHereId: string;
  suggestedQuestions: string[];
  graph: CausalGraph;
}

// Normalize raw authoring data — research output used "module" as a
// layer and "config" as a kind; neither is in our strict types.
type RawNode = Omit<CausalNode, "layer" | "kind"> & {
  layer: SemanticLayer | "module";
  kind?: CausalNode["kind"] | "config";
};

function normalize(nodes: RawNode[], edges: CausalEdge[]): {
  nodes: CausalNode[];
  edges: CausalEdge[];
} {
  const out: CausalNode[] = nodes.map((n) => ({
    ...n,
    layer: n.layer === "module" ? "logic" : n.layer,
    kind: n.kind === "config" ? "file" : n.kind,
  }));
  return { nodes: out, edges };
}

function build(
  repo: string,
  rootLabel: string,
  raw: { nodes: RawNode[]; edges: CausalEdge[] },
): CausalGraph {
  const { nodes, edges } = normalize(raw.nodes, raw.edges);
  return { repo, rootLabel, commit: "reference", nodes, edges };
}

// ── 1. Python imports ────────────────────────────────────────────

const pythonImports = build("reference/python-imports", "python import system", {
  nodes: [
    { id: "interpreter", label: "python", layer: "infra", kind: "external", summary: "The CPython process that boots the import machinery before running your script." },
    { id: "sys-path", label: "sys.path", layer: "config", kind: "external", summary: "Ordered list of directories searched for modules; first match wins." },
    { id: "pythonpath-env", label: "PYTHONPATH", layer: "config", kind: "external", summary: "Env var prepended to sys.path at startup." },
    { id: "sys-modules", label: "sys.modules", layer: "data", kind: "external", summary: "Global cache of already-imported modules keyed by dotted name — imports hit this first." },
    { id: "finders", label: "meta_path finders", layer: "logic", kind: "function", summary: "Objects that decide which loader can handle a given module name." },
    { id: "loaders", label: "loaders", layer: "logic", kind: "function", summary: "Read source, compile, and produce a module object." },
    { id: "package-init", label: "mypkg/__init__.py", layer: "module", kind: "file", summary: "Marks a directory as a package and runs once when any submodule is first imported." },
    { id: "submodule-a", label: "mypkg/a.py", layer: "module", kind: "file", summary: "Imported as 'mypkg.a' — its module identity depends on how it's reached." },
    { id: "submodule-b", label: "mypkg/b.py", layer: "module", kind: "file", summary: "Uses 'from . import a' — the dot resolves via __package__, not the filesystem." },
    { id: "main-script", label: "__main__", layer: "api", kind: "file", summary: "The entrypoint script — its __name__ is '__main__', so relative imports from it fail." },
    { id: "namespace-pkg", label: "namespace package", layer: "module", kind: "file", summary: "A package with no __init__.py, assembled from multiple sys.path entries." },
    { id: "site-packages", label: "site-packages", layer: "infra", kind: "external", summary: "Where pip installs third-party packages; added to sys.path by the site module." },
    { id: "importlib", label: "importlib", layer: "logic", kind: "module", summary: "The public import API — import_module, invalidate_caches, reload." },
    { id: "compiled-cache", label: "__pycache__", layer: "data", kind: "file", summary: "Bytecode cache; skipped when source mtime changes." },
    { id: "circular", label: "circular import", layer: "test", kind: "function", summary: "A half-initialized module in sys.modules that bites when two files import each other at top level." },
  ],
  edges: [
    { source: "interpreter", target: "pythonpath-env", kind: "reads" },
    { source: "interpreter", target: "sys-path", kind: "writes" },
    { source: "pythonpath-env", target: "sys-path", kind: "writes" },
    { source: "site-packages", target: "sys-path", kind: "writes" },
    { source: "interpreter", target: "sys-modules", kind: "writes" },
    { source: "interpreter", target: "main-script", kind: "calls" },
    { source: "main-script", target: "importlib", kind: "calls" },
    { source: "importlib", target: "sys-modules", kind: "reads" },
    { source: "importlib", target: "finders", kind: "calls" },
    { source: "finders", target: "sys-path", kind: "reads" },
    { source: "finders", target: "loaders", kind: "calls" },
    { source: "loaders", target: "package-init", kind: "reads" },
    { source: "loaders", target: "submodule-a", kind: "reads" },
    { source: "loaders", target: "compiled-cache", kind: "reads" },
    { source: "loaders", target: "sys-modules", kind: "writes" },
    { source: "package-init", target: "submodule-a", kind: "imports" },
    { source: "submodule-b", target: "submodule-a", kind: "imports" },
    { source: "main-script", target: "package-init", kind: "imports" },
    { source: "finders", target: "namespace-pkg", kind: "reads" },
    { source: "submodule-a", target: "submodule-b", kind: "imports" },
    { source: "circular", target: "sys-modules", kind: "reads" },
    { source: "submodule-b", target: "circular", kind: "calls" },
  ],
});

// ── 2. React render ───────────────────────────────────────────────

const reactRender = build("reference/react-render-tree", "react render pipeline", {
  nodes: [
    { id: "root", label: "createRoot", layer: "api", kind: "function", summary: "Entry point that attaches a Fiber root to a DOM container." },
    { id: "scheduler", label: "scheduler", layer: "infra", kind: "external", summary: "Decides when to run work, splits it into time slices, handles priorities." },
    { id: "fiber-tree", label: "Fiber tree", layer: "data", kind: "module", summary: "Double-buffered linked-list representation of the component tree." },
    { id: "app", label: "<App/>", layer: "ui", kind: "function", summary: "Root component whose return value becomes children Fibers." },
    { id: "layout", label: "<Layout/>", layer: "ui", kind: "function", summary: "Parent component — its render runs before children's." },
    { id: "list", label: "<List/>", layer: "ui", kind: "function", summary: "Consumer of context; re-renders when the provider value changes." },
    { id: "item", label: "<Item/>", layer: "ui", kind: "function", summary: "Leaf component; memoized to skip renders when props are shallow-equal." },
    { id: "hook-state", label: "useState", layer: "logic", kind: "function", summary: "Stored as a linked list on the Fiber, indexed by call order." },
    { id: "hook-effect", label: "useEffect", layer: "logic", kind: "function", summary: "Queues a callback to run after commit, not during render." },
    { id: "hook-memo", label: "useMemo", layer: "logic", kind: "function", summary: "Caches a value across renders keyed by dep array." },
    { id: "context", label: "ThemeContext", layer: "data", kind: "module", summary: "Provider publishes a value; consumers subscribe implicitly." },
    { id: "reconciler", label: "reconciler", layer: "logic", kind: "function", summary: "Diffs old and new Fiber trees to produce an effect list." },
    { id: "commit", label: "commit phase", layer: "logic", kind: "function", summary: "Applies DOM mutations synchronously and fires layout effects." },
    { id: "dom", label: "DOM", layer: "ui", kind: "external", summary: "The host tree React mutates; the only place paint actually happens." },
    { id: "strict-mode", label: "StrictMode", layer: "test", kind: "module", summary: "Double-invokes render and effects in dev to surface impurity." },
  ],
  edges: [
    { source: "root", target: "fiber-tree", kind: "writes" },
    { source: "root", target: "scheduler", kind: "calls" },
    { source: "scheduler", target: "reconciler", kind: "calls" },
    { source: "reconciler", target: "app", kind: "calls" },
    { source: "app", target: "layout", kind: "calls" },
    { source: "layout", target: "list", kind: "calls" },
    { source: "list", target: "item", kind: "calls" },
    { source: "app", target: "hook-state", kind: "calls" },
    { source: "layout", target: "hook-memo", kind: "calls" },
    { source: "list", target: "context", kind: "reads" },
    { source: "item", target: "hook-effect", kind: "calls" },
    { source: "hook-state", target: "fiber-tree", kind: "writes" },
    { source: "hook-effect", target: "fiber-tree", kind: "writes" },
    { source: "hook-memo", target: "fiber-tree", kind: "writes" },
    { source: "context", target: "list", kind: "writes" },
    { source: "reconciler", target: "fiber-tree", kind: "reads" },
    { source: "reconciler", target: "commit", kind: "calls" },
    { source: "commit", target: "dom", kind: "writes" },
    { source: "commit", target: "hook-effect", kind: "calls" },
    { source: "strict-mode", target: "app", kind: "calls" },
    { source: "strict-mode", target: "hook-effect", kind: "calls" },
    { source: "scheduler", target: "commit", kind: "calls" },
  ],
});

// ── 3. Rust ownership ─────────────────────────────────────────────

const rustOwnership = build("reference/rust-ownership", "rust borrow checker", {
  nodes: [
    { id: "owner", label: "let s = String::from", layer: "data", kind: "function", summary: "The binding that owns the heap allocation; when it goes out of scope, Drop runs." },
    { id: "heap", label: "heap allocation", layer: "infra", kind: "external", summary: "Backing bytes for String; owned by exactly one binding at a time." },
    { id: "move", label: "move", layer: "logic", kind: "function", summary: "Transfers ownership — the source binding is statically invalidated." },
    { id: "clone", label: ".clone()", layer: "logic", kind: "function", summary: "Deep-copies heap data so both bindings own independent allocations." },
    { id: "copy", label: "Copy trait", layer: "logic", kind: "module", summary: "Types whose bits can be duplicated trivially — assignment doesn't move." },
    { id: "immut-borrow", label: "&s", layer: "logic", kind: "function", summary: "Shared reference — many may exist, none may mutate." },
    { id: "mut-borrow", label: "&mut s", layer: "logic", kind: "function", summary: "Exclusive reference — at most one, and no shared refs while it lives." },
    { id: "borrow-checker", label: "borrow checker", layer: "test", kind: "function", summary: "Compile-time pass enforcing aliasing XOR mutation." },
    { id: "lifetime", label: "'a lifetime", layer: "config", kind: "module", summary: "A named scope proving a reference's target outlives the reference." },
    { id: "scope-end", label: "end of scope", layer: "logic", kind: "function", summary: "Where bindings are dropped in reverse order of declaration." },
    { id: "drop-impl", label: "Drop::drop", layer: "logic", kind: "function", summary: "Destructor — frees heap, closes files, releases locks." },
    { id: "box", label: "Box<T>", layer: "data", kind: "module", summary: "Single owner of a heap value; moves the pointer, not the payload." },
    { id: "rc", label: "Rc<T>", layer: "data", kind: "module", summary: "Shared ownership via reference counting — single-threaded only." },
    { id: "refcell", label: "RefCell<T>", layer: "data", kind: "module", summary: "Moves borrow checking to runtime — panics on conflicting borrows." },
    { id: "function-param", label: "fn takes(&mut s)", layer: "api", kind: "function", summary: "Callee temporarily holds the exclusive borrow for the call's duration." },
  ],
  edges: [
    { source: "owner", target: "heap", kind: "writes" },
    { source: "owner", target: "drop-impl", kind: "calls" },
    { source: "move", target: "owner", kind: "reads" },
    { source: "clone", target: "heap", kind: "writes" },
    { source: "copy", target: "owner", kind: "reads" },
    { source: "immut-borrow", target: "owner", kind: "reads" },
    { source: "mut-borrow", target: "owner", kind: "reads" },
    { source: "borrow-checker", target: "immut-borrow", kind: "reads" },
    { source: "borrow-checker", target: "mut-borrow", kind: "reads" },
    { source: "borrow-checker", target: "lifetime", kind: "reads" },
    { source: "lifetime", target: "immut-borrow", kind: "extends" },
    { source: "lifetime", target: "mut-borrow", kind: "extends" },
    { source: "scope-end", target: "drop-impl", kind: "calls" },
    { source: "scope-end", target: "owner", kind: "reads" },
    { source: "drop-impl", target: "heap", kind: "writes" },
    { source: "box", target: "heap", kind: "writes" },
    { source: "box", target: "drop-impl", kind: "calls" },
    { source: "rc", target: "heap", kind: "reads" },
    { source: "rc", target: "drop-impl", kind: "calls" },
    { source: "refcell", target: "borrow-checker", kind: "extends" },
    { source: "function-param", target: "mut-borrow", kind: "calls" },
    { source: "function-param", target: "owner", kind: "reads" },
    { source: "move", target: "function-param", kind: "calls" },
  ],
});

// ── 4. Next.js App Router ─────────────────────────────────────────

const nextjsAppRouter = build("reference/nextjs-app-router", "next.js request pipeline", {
  nodes: [
    { id: "request", label: "incoming request", layer: "api", kind: "external", summary: "HTTP request hitting the Next.js edge or node runtime." },
    { id: "middleware", label: "middleware.ts", layer: "api", kind: "file", summary: "Runs on the Edge before routing — can rewrite, redirect, or set headers." },
    { id: "router", label: "App Router", layer: "logic", kind: "module", summary: "Matches the URL to nested segments based on the app/ directory." },
    { id: "root-layout", label: "app/layout.tsx", layer: "ui", kind: "file", summary: "Root Server Component wrapping every page; renders once per request." },
    { id: "nested-layout", label: "app/(dash)/layout.tsx", layer: "ui", kind: "file", summary: "Segment layout that persists across child navigations." },
    { id: "page", label: "app/(dash)/page.tsx", layer: "ui", kind: "file", summary: "Server Component that fetches data and returns JSX." },
    { id: "loading", label: "loading.tsx", layer: "ui", kind: "file", summary: "Suspense fallback streamed until the page resolves." },
    { id: "error-boundary", label: "error.tsx", layer: "ui", kind: "file", summary: "Catches errors thrown during render of its segment." },
    { id: "client-comp", label: "'use client' Island", layer: "ui", kind: "file", summary: "Hydrated in the browser; receives serialized props from its Server parent." },
    { id: "data-fetch", label: "fetch() + cache", layer: "data", kind: "function", summary: "Deduped per-request; memoized across the React tree." },
    { id: "server-action", label: "'use server' action", layer: "api", kind: "function", summary: "POST endpoint generated from a function — invoked via form or client call." },
    { id: "revalidate", label: "revalidatePath", layer: "logic", kind: "function", summary: "Invalidates the Router Cache so the next navigation refetches." },
    { id: "router-cache", label: "Router Cache", layer: "data", kind: "module", summary: "Client-side cache of rendered segments; keyed by path." },
    { id: "rsc-payload", label: "RSC payload", layer: "data", kind: "module", summary: "Streamed serialized tree that the client reconciles into the DOM." },
    { id: "browser", label: "browser", layer: "ui", kind: "external", summary: "Consumes the RSC stream, hydrates client islands, handles navigation." },
  ],
  edges: [
    { source: "request", target: "middleware", kind: "calls" },
    { source: "middleware", target: "router", kind: "calls" },
    { source: "router", target: "root-layout", kind: "calls" },
    { source: "root-layout", target: "nested-layout", kind: "calls" },
    { source: "nested-layout", target: "page", kind: "calls" },
    { source: "nested-layout", target: "loading", kind: "calls" },
    { source: "nested-layout", target: "error-boundary", kind: "calls" },
    { source: "page", target: "data-fetch", kind: "calls" },
    { source: "page", target: "client-comp", kind: "imports" },
    { source: "page", target: "rsc-payload", kind: "writes" },
    { source: "root-layout", target: "rsc-payload", kind: "writes" },
    { source: "rsc-payload", target: "browser", kind: "writes" },
    { source: "browser", target: "client-comp", kind: "calls" },
    { source: "browser", target: "router-cache", kind: "writes" },
    { source: "client-comp", target: "server-action", kind: "calls" },
    { source: "server-action", target: "data-fetch", kind: "writes" },
    { source: "server-action", target: "revalidate", kind: "calls" },
    { source: "revalidate", target: "router-cache", kind: "writes" },
    { source: "router-cache", target: "router", kind: "reads" },
    { source: "data-fetch", target: "rsc-payload", kind: "writes" },
    { source: "loading", target: "rsc-payload", kind: "writes" },
    { source: "middleware", target: "request", kind: "writes" },
  ],
});

// ── 5. Vite bundle ────────────────────────────────────────────────

const viteBundle = build("reference/vite-bundle", "vite module graph", {
  nodes: [
    { id: "entry", label: "index.html", layer: "config", kind: "file", summary: "Vite's true entry — <script type=module> starts the graph walk." },
    { id: "main", label: "src/main.ts", layer: "module", kind: "file", summary: "JS entry imported by the HTML; root of the module graph." },
    { id: "resolver", label: "resolver", layer: "logic", kind: "function", summary: "Turns import specifiers into absolute file paths using package exports and aliases." },
    { id: "loader", label: "loader", layer: "logic", kind: "function", summary: "Reads file contents and hands them to transform plugins." },
    { id: "transform", label: "transform plugins", layer: "logic", kind: "function", summary: "Chained passes: TS → JSX → PostCSS → user plugins." },
    { id: "module-graph", label: "module graph", layer: "data", kind: "module", summary: "Nodes are modules; edges are static and dynamic imports." },
    { id: "static-import", label: "static import", layer: "logic", kind: "function", summary: "Followed eagerly; its target ends up in the parent's chunk by default." },
    { id: "dynamic-import", label: "import()", layer: "logic", kind: "function", summary: "Creates a split point — its subgraph becomes a separate chunk." },
    { id: "css-module", label: "styles.css", layer: "ui", kind: "file", summary: "Imported like JS; emitted as a sibling CSS asset in prod." },
    { id: "node-module", label: "node_modules/pkg", layer: "module", kind: "external", summary: "Third-party code — Vite pre-bundles it with esbuild for dev speed." },
    { id: "rollup", label: "Rollup (prod)", layer: "infra", kind: "external", summary: "Builds the final chunked output with tree-shaking." },
    { id: "esbuild-dev", label: "esbuild (dev)", layer: "infra", kind: "external", summary: "On-demand transforms; serves one file per URL, no bundling." },
    { id: "chunk-main", label: "main chunk", layer: "data", kind: "file", summary: "Emitted bundle containing everything reachable via static imports from entry." },
    { id: "chunk-lazy", label: "lazy chunk", layer: "data", kind: "file", summary: "Emitted when a dynamic import splits the graph." },
    { id: "tree-shake", label: "tree-shake", layer: "logic", kind: "function", summary: "Drops exports with no reachable import — relies on ES module purity hints." },
    { id: "side-effects", label: "sideEffects: false", layer: "config", kind: "config", summary: "package.json flag telling Rollup it's safe to drop unused imports." },
  ],
  edges: [
    { source: "entry", target: "main", kind: "imports" },
    { source: "main", target: "resolver", kind: "calls" },
    { source: "resolver", target: "loader", kind: "calls" },
    { source: "loader", target: "transform", kind: "calls" },
    { source: "transform", target: "module-graph", kind: "writes" },
    { source: "main", target: "static-import", kind: "calls" },
    { source: "main", target: "dynamic-import", kind: "calls" },
    { source: "static-import", target: "module-graph", kind: "writes" },
    { source: "dynamic-import", target: "module-graph", kind: "writes" },
    { source: "main", target: "css-module", kind: "imports" },
    { source: "static-import", target: "node-module", kind: "imports" },
    { source: "esbuild-dev", target: "node-module", kind: "reads" },
    { source: "esbuild-dev", target: "transform", kind: "calls" },
    { source: "rollup", target: "module-graph", kind: "reads" },
    { source: "rollup", target: "tree-shake", kind: "calls" },
    { source: "tree-shake", target: "side-effects", kind: "reads" },
    { source: "rollup", target: "chunk-main", kind: "writes" },
    { source: "rollup", target: "chunk-lazy", kind: "writes" },
    { source: "chunk-main", target: "main", kind: "reads" },
    { source: "chunk-lazy", target: "dynamic-import", kind: "reads" },
    { source: "tree-shake", target: "chunk-main", kind: "writes" },
    { source: "css-module", target: "chunk-main", kind: "writes" },
  ],
});

// ── 6. SQL query execution ───────────────────────────────────────

const sqlExecution = build("reference/sql-query-execution", "sql query executor", {
  nodes: [
    { id: "sql-text", label: "SELECT ...", layer: "api", kind: "external", summary: "Raw query string submitted by the client." },
    { id: "parser", label: "parser", layer: "logic", kind: "function", summary: "Tokenizes and produces an AST; rejects syntactic garbage." },
    { id: "ast", label: "AST", layer: "data", kind: "module", summary: "Tree representation of the query before semantic analysis." },
    { id: "analyzer", label: "analyzer", layer: "logic", kind: "function", summary: "Resolves names against the catalog and type-checks expressions." },
    { id: "catalog", label: "system catalog", layer: "data", kind: "module", summary: "Metadata: tables, columns, types, indexes, statistics." },
    { id: "planner", label: "planner", layer: "logic", kind: "function", summary: "Turns the resolved tree into logical operators — Scan, Filter, Join, Agg." },
    { id: "optimizer", label: "cost-based optimizer", layer: "logic", kind: "function", summary: "Considers alternative plans; picks the cheapest using catalog stats." },
    { id: "stats", label: "table stats", layer: "data", kind: "module", summary: "Row counts and histograms — stale stats = bad plans." },
    { id: "plan", label: "physical plan", layer: "data", kind: "module", summary: "Concrete operator tree chosen for execution (e.g. IndexScan + HashJoin)." },
    { id: "executor", label: "executor", layer: "logic", kind: "function", summary: "Walks the plan pulling tuples through operators on demand." },
    { id: "seq-scan", label: "SeqScan", layer: "logic", kind: "function", summary: "Reads every row of a heap — cheap for small tables, death for large ones." },
    { id: "index-scan", label: "IndexScan", layer: "logic", kind: "function", summary: "Traverses a B-tree to find matching tuples without full scan." },
    { id: "hash-join", label: "HashJoin", layer: "logic", kind: "function", summary: "Builds a hash of one side, probes with the other." },
    { id: "heap", label: "table heap", layer: "data", kind: "external", summary: "Pages of tuples on disk — the actual row data." },
    { id: "buffer-pool", label: "buffer pool", layer: "infra", kind: "external", summary: "In-memory page cache; disk I/O only happens on miss." },
    { id: "result", label: "result set", layer: "api", kind: "external", summary: "Rows streamed back to the client." },
  ],
  edges: [
    { source: "sql-text", target: "parser", kind: "calls" },
    { source: "parser", target: "ast", kind: "writes" },
    { source: "ast", target: "analyzer", kind: "reads" },
    { source: "analyzer", target: "catalog", kind: "reads" },
    { source: "analyzer", target: "planner", kind: "calls" },
    { source: "planner", target: "optimizer", kind: "calls" },
    { source: "optimizer", target: "stats", kind: "reads" },
    { source: "optimizer", target: "catalog", kind: "reads" },
    { source: "optimizer", target: "plan", kind: "writes" },
    { source: "executor", target: "plan", kind: "reads" },
    { source: "plan", target: "seq-scan", kind: "extends" },
    { source: "plan", target: "index-scan", kind: "extends" },
    { source: "plan", target: "hash-join", kind: "extends" },
    { source: "executor", target: "seq-scan", kind: "calls" },
    { source: "executor", target: "index-scan", kind: "calls" },
    { source: "executor", target: "hash-join", kind: "calls" },
    { source: "seq-scan", target: "buffer-pool", kind: "reads" },
    { source: "index-scan", target: "buffer-pool", kind: "reads" },
    { source: "hash-join", target: "seq-scan", kind: "calls" },
    { source: "hash-join", target: "index-scan", kind: "calls" },
    { source: "buffer-pool", target: "heap", kind: "reads" },
    { source: "executor", target: "result", kind: "writes" },
  ],
});

// ── 7. Node event loop ───────────────────────────────────────────

const nodeEventLoop = build("reference/node-event-loop", "node.js event loop", {
  nodes: [
    { id: "script", label: "main script", layer: "api", kind: "file", summary: "Top-level code runs to completion before the loop starts iterating." },
    { id: "call-stack", label: "call stack", layer: "infra", kind: "external", summary: "V8's synchronous execution stack — the loop only advances when it's empty." },
    { id: "loop", label: "libuv loop", layer: "infra", kind: "external", summary: "C loop that cycles through phases until there's no work left." },
    { id: "timers", label: "timers phase", layer: "logic", kind: "function", summary: "Runs callbacks scheduled by setTimeout / setInterval whose threshold elapsed." },
    { id: "pending", label: "pending callbacks", layer: "logic", kind: "function", summary: "Runs deferred I/O callbacks held over from last iteration." },
    { id: "poll", label: "poll phase", layer: "logic", kind: "function", summary: "Waits for new I/O and runs its callbacks — where the loop spends most of its time." },
    { id: "check", label: "check phase", layer: "logic", kind: "function", summary: "Runs setImmediate callbacks immediately after poll." },
    { id: "close", label: "close callbacks", layer: "logic", kind: "function", summary: "Runs 'close' events like socket.on('close')." },
    { id: "microtasks", label: "microtask queue", layer: "data", kind: "module", summary: "Promises' then/catch/finally — drained after every task, not every phase boundary." },
    { id: "next-tick", label: "nextTick queue", layer: "data", kind: "module", summary: "Node-specific higher-priority queue, drained before microtasks." },
    { id: "set-timeout", label: "setTimeout(cb, 0)", layer: "api", kind: "function", summary: "Queues for the next timers phase — minimum ~1ms, not zero." },
    { id: "set-immediate", label: "setImmediate", layer: "api", kind: "function", summary: "Queues for the check phase of the current iteration." },
    { id: "promise-then", label: ".then(cb)", layer: "api", kind: "function", summary: "Queues a microtask when the promise settles." },
    { id: "thread-pool", label: "uv thread pool", layer: "infra", kind: "external", summary: "Workers for fs, dns, crypto — results flow back into the poll phase." },
    { id: "io", label: "fs.readFile", layer: "api", kind: "function", summary: "Dispatches to the thread pool; its callback lands in the poll phase." },
  ],
  edges: [
    { source: "script", target: "call-stack", kind: "writes" },
    { source: "script", target: "set-timeout", kind: "calls" },
    { source: "script", target: "set-immediate", kind: "calls" },
    { source: "script", target: "promise-then", kind: "calls" },
    { source: "script", target: "io", kind: "calls" },
    { source: "set-timeout", target: "timers", kind: "writes" },
    { source: "set-immediate", target: "check", kind: "writes" },
    { source: "promise-then", target: "microtasks", kind: "writes" },
    { source: "io", target: "thread-pool", kind: "calls" },
    { source: "thread-pool", target: "poll", kind: "writes" },
    { source: "loop", target: "timers", kind: "calls" },
    { source: "loop", target: "pending", kind: "calls" },
    { source: "loop", target: "poll", kind: "calls" },
    { source: "loop", target: "check", kind: "calls" },
    { source: "loop", target: "close", kind: "calls" },
    { source: "timers", target: "call-stack", kind: "writes" },
    { source: "poll", target: "call-stack", kind: "writes" },
    { source: "check", target: "call-stack", kind: "writes" },
    { source: "call-stack", target: "next-tick", kind: "calls" },
    { source: "next-tick", target: "microtasks", kind: "calls" },
    { source: "microtasks", target: "call-stack", kind: "writes" },
    { source: "call-stack", target: "loop", kind: "reads" },
  ],
});

export const REFERENCES: ReferenceMeta[] = [
  {
    slug: "python-imports",
    title: "How Python imports work",
    subtitle: "sys.path, packages, and the __init__.py mystery",
    why: "Most devs think imports are file lookups; they're actually name bindings in a cached module registry keyed by dotted path.",
    startHereId: "interpreter",
    suggestedQuestions: [
      "Why does `from . import sibling` break when I run the file directly?",
      "What's the difference between sys.path and PYTHONPATH?",
      "Why is my module imported twice with two different identities?",
    ],
    graph: pythonImports,
  },
  {
    slug: "react-render-tree",
    title: "How React actually renders",
    subtitle: "Fiber, hooks order, and the render/commit split",
    why: "Components look like functions that paint the screen — they're actually pure descriptions consumed twice.",
    startHereId: "root",
    suggestedQuestions: [
      "Why must hooks always be called in the same order?",
      "What runs during render vs commit?",
      "Why did my effect fire twice in dev?",
    ],
    graph: reactRender,
  },
  {
    slug: "rust-ownership",
    title: "How Rust ownership works",
    subtitle: "Owners, borrows, lifetimes, and Drop",
    why: "Borrow-checker errors feel arbitrary until you see ownership as a directed graph where references must not outlive their source.",
    startHereId: "owner",
    suggestedQuestions: [
      "Why can't I have a mutable borrow while an immutable one is alive?",
      "When exactly does Drop run?",
      "What does a lifetime annotation actually constrain?",
    ],
    graph: rustOwnership,
  },
  {
    slug: "nextjs-app-router",
    title: "How a Next.js App Router request flows",
    subtitle: "middleware → layout → page → server action",
    why: "SSR feels monolithic — App Router is a nested pipeline where each segment has its own cache and runtime.",
    startHereId: "request",
    suggestedQuestions: [
      "When does a Server vs Client Component actually run?",
      "What triggers a layout to re-render without unmounting?",
      "How does a server action mutate and revalidate?",
    ],
    graph: nextjsAppRouter,
  },
  {
    slug: "vite-bundle",
    title: "How a Vite build graphs your code",
    subtitle: "entry → modules → chunks → tree-shake",
    why: "Bundlers feel like magic until you see them as a graph walk where every chunk boundary is an import() or entry.",
    startHereId: "entry",
    suggestedQuestions: [
      "Why did my dynamic import create a new chunk?",
      "What stops tree-shaking from removing dead code?",
      "Why does dev feel instant but prod has to 'build'?",
    ],
    graph: viteBundle,
  },
  {
    slug: "sql-query-execution",
    title: "How SQL actually runs",
    subtitle: "parse → plan → optimize → execute",
    why: "SQL looks declarative, but every query compiles into a tree of physical operators — that tree is why it's slow.",
    startHereId: "sql-text",
    suggestedQuestions: [
      "Why is my WHERE clause not using the index?",
      "What does EXPLAIN ANALYZE tell me that EXPLAIN doesn't?",
      "Why did adding a column break the query plan?",
    ],
    graph: sqlExecution,
  },
  {
    slug: "node-event-loop",
    title: "How the Node event loop works",
    subtitle: "phases, microtasks, and why setTimeout(0) isn't 0",
    why: "People picture one 'event loop' queue — it's actually six phases, with microtasks draining between every task.",
    startHereId: "script",
    suggestedQuestions: [
      "Why does a Promise resolve before a setTimeout(0)?",
      "What's the difference between setImmediate and setTimeout?",
      "How does process.nextTick starve the loop?",
    ],
    graph: nodeEventLoop,
  },
];

export function referenceBySlug(slug: string): ReferenceMeta | null {
  return REFERENCES.find((r) => r.slug === slug) ?? null;
}
