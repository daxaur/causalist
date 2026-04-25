// Hand-curated docs content for Causalist. Each section is a markdown
// string with block-level math delimited by $$...$$ and inline math by
// $...$. Citations are [label](arxiv-url).

export interface DocSection {
  slug: string;
  title: string;
  subtitle: string;
  body: string;
}

export interface Citation {
  key: string;
  authors: string;
  title: string;
  venue: string;
  year: number;
  url: string;
}

export const CITATIONS: Citation[] = [
  {
    key: "richens-everitt-2024",
    authors: "Richens, Everitt",
    title: "Robust agents learn causal world models",
    venue: "ICLR",
    year: 2024,
    url: "https://arxiv.org/abs/2402.10877",
  },
  {
    key: "hipporag-2024",
    authors: "Gutiérrez et al.",
    title: "HippoRAG: Neurobiologically inspired long-term memory for LLMs",
    venue: "NeurIPS",
    year: 2024,
    url: "https://arxiv.org/abs/2405.14831",
  },
  {
    key: "repograph-2025",
    authors: "Ouyang et al.",
    title: "RepoGraph: Enhancing AI software engineering with repository-level code graph",
    venue: "ICLR",
    year: 2025,
    url: "https://arxiv.org/abs/2410.14684",
  },
  {
    key: "locagent-2025",
    authors: "Chen et al.",
    title: "LocAgent: Graph-guided LLM agents for code localization",
    venue: "ACL",
    year: 2025,
    url: "https://arxiv.org/abs/2503.09089",
  },
  {
    key: "reflexion-2023",
    authors: "Shinn et al.",
    title: "Reflexion: Language agents with verbal reinforcement learning",
    venue: "NeurIPS",
    year: 2023,
    url: "https://arxiv.org/abs/2303.11366",
  },
  {
    key: "causal-thoughts-2025",
    authors: "Liu et al.",
    title: "Causal Graphs Meet Thoughts",
    venue: "arXiv",
    year: 2025,
    url: "https://arxiv.org/abs/2501.14892",
  },
  {
    key: "pearl-causality",
    authors: "Pearl",
    title: "Causality: Models, Reasoning, and Inference",
    venue: "Cambridge University Press",
    year: 2009,
    url: "https://bayes.cs.ucla.edu/BOOK-2K/",
  },
];

export const SECTIONS: DocSection[] = [
  {
    slug: "foundations",
    title: "Foundations",
    subtitle: "Why a coding agent needs a real graph",
    body: `
## The claim

A coding agent that only reads files in isolation will get small things wrong over and over: edit a function, miss a call site, break a test it never opened. The fix isn't a smarter agent — it's a better view of the codebase.

Causalist gives that view: a typed graph of every file, every dependency, every test. Claude Code reads it through tools, not by re-grepping the repo each turn.

## What we model

For each repository:

- **Files and modules** — every source file, classified into a semantic layer (infra, data, logic, api, ui, test, config).
- **Typed edges** — \`imports\`, \`calls\`, \`reads\`, \`writes\`, \`extends\`. Every edge carries a \`verified\` flag based on whether the AST actually backs it up.
- **Importance tiers** — top 10% by fan-in are "hot" (changing them ripples), the next 15% are "core", everything else is "leaf" (safe to refactor).

That's it. No probability scores. No interventional / counterfactual edges. We ship the parts that produce a useful graph today and skip the parts we haven't earned yet.

## Why it actually helps

When Claude Code asks \`affected_tests\` instead of grepping for test files, it gets back exactly the tests that depend on the changed nodes — usually 3 instead of 300. When it asks \`blast_radius\`, it gets the actual reverse-reachable set. The agent stops re-discovering structure on every turn and starts reasoning about it.

That's the whole pitch. The math behind why graph-aware retrieval helps multi-hop QA is in [HippoRAG (2024)](#cite-hipporag-2024); the case for graph-guided code localization is in [LocAgent (2025)](#cite-locagent-2025) and [RepoGraph (2025)](#cite-repograph-2025). We borrow the conclusion: graphs work better than flat retrieval. We don't reproduce the proof here — read the papers if you want it.
`,
  },
  {
    slug: "graph-schema",
    title: "Graph schema",
    subtitle: "Nodes, edges, semantic layers, AST verification",
    body: `
## Seven semantic layers

Every node carries a \`layer\` tag. The Structure agent picks one of seven, deliberately small enough that an LLM can pick reliably and large enough that the viewer can render distinct colors per layer.

| Layer | What lives here |
|-------|-----------------|
| \`infra\` | Build, CI, deployment, hosting glue |
| \`data\` | Schemas, migrations, persistence |
| \`logic\` | Core domain code |
| \`api\` | HTTP routes, RPC handlers, controllers |
| \`ui\` | React/Vue/Svelte components, templates, styles |
| \`test\` | Tests and test fixtures |
| \`config\` | Settings, env, lockfiles, manifests |

The viewer paints each layer its own color (see \`LAYER_COLORS\` in \`src/lib/graph/types.ts\`).

## Node kinds

\`\`\`ts
interface CausalNode {
  id: string;
  label: string;
  path?: string;
  layer: SemanticLayer;
  language?: string;
  kind?: "file" | "module" | "function" | "type" | "external";
  size?: number;
  summary?: string;
}
\`\`\`

- \`file\` / \`module\` — source files or logical units (a directory with a role).
- \`function\` / \`type\` — AST-level entities for languages where we resolve them.
- \`external\` — npm / cargo / pip dependencies.

## Edge kinds

Causalist ships five edge kinds. Each is **typed** — most "dep graph" tools collapse everything into a single "depends on" relationship and lose the structure that makes the graph useful.

| Edge | Semantics |
|------|-----------|
| \`imports\` | \`X\` statically imports \`Y\` (AST-derivable in JS/TS via \`@babel/parser\`, regex+import scan in Python). |
| \`calls\` | \`X\` invokes \`Y\`. Higher-level than \`imports\`; LLM-inferred today. |
| \`reads\` | \`X\` reads state from \`Y\` (DB row, config key, cache). |
| \`writes\` | \`X\` mutates \`Y\`. Narrower than \`reads\`; invariant-critical for security audits. |
| \`extends\` | \`X\` inherits / implements / conforms to \`Y\`. |

\`\`\`ts
interface CausalEdge {
  source: string;
  target: string;
  kind: "imports" | "calls" | "reads" | "writes" | "extends";
  verified?: boolean;
}
\`\`\`

## AST verification

Every edge gets a \`verified\` flag after the Oracle agent finishes. The verifier (\`src/lib/analyze/ast-verify.ts\`) walks the real source via \`@babel/parser\` for JS/TS and a line-scan for Python, then stamps:

- \`verified: true\` — the AST contains a matching import/require/dynamic import statement that justifies the edge.
- \`verified: false\` — Oracle proposed the edge but no AST entry backs it up.

The viewer renders verified edges as solid lines and unverified ones at lower opacity with a thinner stroke, so users (and downstream agents) can trust-gate the graph at a glance. We chose this binary signal over a continuous confidence score because it's cheap to verify and unambiguous to display.

## Importance tiers

The viewer ranks every node by fan-in (how many edges point at it) and bins them:

- \`hot\` — top ~10%, the load-bearing files. Painted magenta.
- \`core\` — the next ~15%.
- \`leaf\` — everything else; nothing depends on these (safe to refactor).

See \`src/lib/graph/importance.ts::rankImportance\`. The Agents tab uses this implicitly — selecting a hot node and assigning a Refactor agent is more interesting than picking a leaf.
`,
  },
  {
    slug: "retrieval",
    title: "Graph retrieval",
    subtitle: "How Claude reads the graph through tools",
    body: `
## The problem

When Claude Code asks "where does user authentication happen?", flat text search misses the multi-hop trail — the file that validates a JWT may not contain the word "authentication" anywhere; it's reached through \`auth-middleware.ts → jwt-verifier.ts → crypto-utils.ts\`.

A graph fixes this: traversal beats grep when the answer is two or three hops away.

## How retrieval works in Causalist today

We don't run Personalized PageRank or anything fancy at retrieval time. We expose **eleven typed tools** to Claude through the MCP server, and let the model decide how to traverse:

- \`query_node(id)\` — get a node's metadata.
- \`get_neighbors(id, direction)\` — fan-in / fan-out from a node.
- \`find_path(source, target)\` — shortest path between two nodes.
- \`blast_radius(id, depth)\` — reverse-reachable set ("what depends on this?").
- \`affected_tests(changedIds)\` — tests reachable from a set of changed files.
- \`find_writers(target)\` — every node that writes to a target (security audit).
- \`similar_nodes(id)\` — nodes with the same layer, kind, and degree profile.
- \`find_nodes_by_layer(layer)\` — list everything in a semantic layer.
- \`topo_order(ids)\` — topological layering of a subgraph.
- \`verify_edge(source, target, kind?)\` — confirm an edge exists.
- \`create_project(owner, repo)\` — push a project to the paired browser's list.

Each call returns typed JSON (not text). Claude composes them: "find the neighbors of \`auth-middleware\`, then \`find_path\` from each to a test, then read the test files." Three calls, no re-grepping.

## Why graph-first beats vector-first here

For factual code questions, graph traversal is grounded — the answer is in the graph by construction. Vector retrieval guesses from similarity. [LocAgent (ACL 2025)](#cite-locagent-2025) shows graph-guided retrieval significantly outperforms flat vector search on code-localization benchmarks; [HippoRAG (NeurIPS 2024)](#cite-hipporag-2024) shows the same on multi-hop QA in general.

We don't reproduce their math here. We use the conclusion: typed graph tools work better than embeddings for this kind of question.
`,
  },
  {
    slug: "verification",
    title: "Verification",
    subtitle: "Contradictions, DAG invariants, interventional edges",
    body: `
## What we verify today

After the Oracle agent emits a graph, we run two real checks before handing it back to the browser:

1. **Edge-endpoint sanity.** Every edge whose source or target isn't in the node list is dropped. This catches Oracle hallucinations where the model invents a node id that didn't appear in Structure's output.
2. **AST verification** (\`src/lib/analyze/ast-verify.ts\`). For every edge, we parse the real source files using \`@babel/parser\` (JS/TS) or a Python import scan and check whether the edge is justified by a matching \`import\` / \`require\` / dynamic \`import()\`. Edges that pass get \`verified: true\`; edges that don't get rendered as faint dashed lines so the user (and any downstream agent) can tell what's grounded versus inferred.

That's it for the launch verifier. It's deliberately cheap — runs on every analyze, no extra LLM cost. The next two sections describe where this is going.

## What we'd add next

Cheap to dream, harder to ship. The roadmap from here:

- **Mutation testing.** Mutate a function, re-run the tests. Tests that newly fail tell you which functions are *load-bearing* for which tests — a real causal signal. Today we approximate this with reachability via \`calls\` edges, which is correct in shape but not in strength.
- **Commit history as evidence.** A commit that touches \`auth.ts\` and breaks \`auth.test.ts\` is one data point. Aggregate across thousands of commits and you can rank which files actually break which tests, without having to mutate anything.
- **Agent self-review.** When Claude Code edits the same file four times in a row without a passing test, it's stuck. A small pass over the graph + recent tool history could surface that and inject it back into context, similar to [Reflexion](#cite-reflexion-2023).

We don't ship any of this today. The launch verifier is the AST check above. Everything else is honest-future-work, not honest-present.
`,
  },
  {
    slug: "pipeline",
    title: "Pipeline",
    subtitle: "Four Claude agents, running in parallel",
    body: `
## Four specialized agents

Causalist generates a graph by calling Claude Opus 4.7 in four parallel roles. Each agent has a dedicated system prompt constraining its output to strict JSON.

### 1. Structure agent
Walks the repo tree, classifies every file and module into one of seven layers: \`infra\`, \`data\`, \`logic\`, \`api\`, \`ui\`, \`test\`, \`config\`. Produces \`CausalNode[]\`.

### 2. Dependency agent
Reads sampled file contents and extracts typed edges: \`imports\`, \`calls\`, \`reads\`, \`writes\`, \`extends\`. Produces \`CausalEdge[]\`.

### 3. Semantic agent
Writes a one-sentence plain-English summary per node. Rules: starts with a verb, no "this file" preamble, under 140 characters. Produces \`{id, summary}[]\`.

### 4. Oracle agent
Receives the three previous outputs, merges them into a final \`CausalGraph\`, drops orphan edges, runs the structural verification pass, and answers any "what-if?" follow-up questions using [extended thinking](https://docs.anthropic.com/en/docs/build-with-claude/extended-thinking) when multi-hop tracing is required.

## Parallel fan-out, serial merge

Structure, Dependency, and Semantic run in \`Promise.all\` — they only depend on the raw repository tree. Oracle synthesizes after all three return:

$$
\\text{Graph} \\;=\\; \\text{Oracle}\\big(\\text{Struct}(\\text{tree}),\\; \\text{Dep}(\\text{tree}),\\; \\text{Sem}(\\text{tree})\\big)
$$

Three-way parallelism on the first stage is ~3× wall-clock faster than a sequential pipeline for medium repos, at the cost of no shared context across the three — each agent works blind to the others' outputs. For most codebases this is a good trade. If an agent's output disagrees (e.g. Dependency emits an edge whose endpoints Structure didn't classify), Oracle drops the edge and logs it.

## Cost budgeting

| Agent | Input shape | Typical tokens |
|-------|-------------|----------------|
| Structure | file tree JSON (paths + sizes) | ~5k in, ~8k out |
| Dependency | curated file contents, capped at 40KB | ~15k in, ~8k out |
| Semantic | paths + exports, not full bodies | ~8k in, ~6k out |
| Oracle | merged outputs + schema | ~25k in, ~16k out |

With [prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching), the shared repo context (tree + sampled contents) is cached at write time and billed at 10% on subsequent "what-if?" queries against the same graph. Net: first analyze of a medium repo is around $0.30 in Opus tokens; follow-up Ask turns are pennies.
`,
  },
  {
    slug: "integrations",
    title: "Integrations",
    subtitle: "CLI, Claude Code plugin, MCP, live streaming",
    body: `
## Surfaces

Causalist ships two ways to invoke it, both backed by the same core library:

### Web app
Paste a GitHub URL at [causalist.xyz](https://causalist.xyz) and Claude maps the repo. Hand-curated demos load instantly; live analyze of any public repo runs when you add your Anthropic key in Settings.

### Claude Code MCP server
\`\`\`bash
claude mcp add causalist -- npx -y causalist-mcp@latest --session ABC123
\`\`\`

One command. \`npx\` fetches the latest server — no global npm install needed. The \`causalist-mcp\` package exposes the eleven tools below over stdio. Pair codes come from [/pair](https://causalist.xyz/pair) in the browser; pass yours via the \`--session\` flag and Claude Code knows which browser to push graphs into.

Once wired, Claude Code's \`create_project\` tool pushes new graphs straight into your Projects list — no manual paste step.

## Live streaming

When Claude Code is paired with the browser, its \`PostToolUse\` hook posts tool-use events to \`https://causalist.xyz/api/ingest/<session>\`. The browser viewer subscribes via Server-Sent Events at \`/api/stream/<session>\` and highlights nodes in real time — open the repo's graph in another tab and *watch Claude work.*

Pairing is how the browser and local Claude session agree on a \`sessionId\` without requiring a user account.

## MCP tools (eleven, stable)

| Tool | What it does |
|------|-------------|
| \`query_node(id)\` | Node metadata, layer, summary |
| \`get_neighbors(id, direction)\` | Incoming or outgoing edges with kinds |
| \`find_path(source, target)\` | Shortest causal path between two nodes |
| \`find_nodes_by_layer(layer)\` | Filter nodes by semantic layer |
| \`blast_radius(id, depth)\` | Everything that transitively depends on a node |
| \`affected_tests(changedIds)\` | "3 tests not 300" — only the tests reachable from your changes |
| \`find_writers(target)\` | Audit query — every node that writes to a target |
| \`similar_nodes(id)\` | Structurally similar nodes (same layer / kind / degree) |
| \`topo_order(ids)\` | Topological layering of a subgraph |
| \`verify_edge(source, target, kind?)\` | Confirm an edge exists |
| \`create_project(owner, repo)\` | Push a new project into the paired browser's list |

## Live agent runs (web)

The web app exposes two endpoints for the Agents tab:

- \`POST /api/agent/run\` — SSE. Body \`{ agent, repo, branch, selectedNodeIds, nodePathMap, apiKey }\`. Streams \`file_loaded\`, \`finding\`, \`patch\`, \`done\`, \`error\` events as the Auditor / Security / Performance / Refactor agent works through the selected files.
- \`POST /api/agent/push-pr\` — uses your GitHub OAuth cookie to create a branch via the Git Tree+Commit API and open a real pull request.

## Analyze API

\`POST /api/analyze\` is a public SSE endpoint. Pass \`Authorization: Bearer <your-anthropic-key>\` and a JSON body \`{owner, repo, commit, tree, files?}\`; receive \`agent\` events as each of the four pipeline agents completes, then a \`done\` event with the final graph.
`,
  },
];

export function sectionBySlug(slug: string): DocSection | null {
  return SECTIONS.find((s) => s.slug === slug) ?? null;
}
