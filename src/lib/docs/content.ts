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

See \`src/lib/graph/importance.ts::rankImportance\`. The Agent tab uses this implicitly — pointing a plan-mode agent at a hot node will surface more downstream impact than picking a leaf.

## Rendering stack

The 3D and 2D viewers are built on Vasco Asturiano's [3d-force-graph](https://github.com/vasturiano/3d-force-graph) and [react-force-graph](https://github.com/vasturiano/react-force-graph) — Three.js + d3-force-3d for the WebGL canvas, with React bindings. Causalist consumes them via \`react-force-graph-3d\` and \`react-force-graph-2d\` (dynamically imported with \`ssr: false\`).

The lib's \`nodeThreeObject\` API caches each node's mesh on \`node.__threeObj\` and only invokes the factory once per node. We exploit that: the factory is \`useCallback([])\` and pre-creates named children (\`core\`, \`stroke\`, \`ring\`, \`arc\`); a \`useEffect\` watches selection / hover / focus state and mutates those cached children directly via \`getObjectByName(...)\`. This is the maintainer's recommended pattern (see [3d-force-graph#61](https://github.com/vasturiano/3d-force-graph/issues/61) and [react-force-graph#204](https://github.com/vasturiano/react-force-graph/issues/204)) — keeps a custom mesh stable while still reflecting React state changes, without re-igniting the simulation on every hover.
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

We don't run Personalized PageRank or anything fancy at retrieval time. We expose **eleven typed tools** that Claude can reach for two ways: as CLI subcommands (preferred for Claude Code, per Anthropic's [Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp) recommendation — code over tool-call JSON), and as MCP tools (for Cursor, Claude.ai web, and any non-CLI client). Either way, the same eleven primitives:

- \`causalist node <id>\` / \`query_node(id)\` — node metadata.
- \`causalist neighbors <id>\` / \`get_neighbors(id, direction)\` — fan-in / fan-out.
- \`causalist path <a> <b>\` / \`find_path(source, target)\` — shortest path.
- \`causalist blast <id>\` / \`blast_radius(id, depth)\` — reverse-reachable set.
- \`causalist tests <ids…>\` / \`affected_tests(changedIds)\` — tests reachable from changes.
- \`causalist writers <id>\` / \`find_writers(target)\` — every node that writes.
- \`causalist similar <id>\` / \`similar_nodes(id)\` — same layer / kind / degree.
- \`causalist layer <name>\` / \`find_nodes_by_layer(layer)\` — list a semantic layer.
- \`causalist topo <ids…>\` / \`topo_order(ids)\` — layered subgraph order.
- \`causalist verify <a> <b>\` / \`verify_edge(source, target, kind?)\` — confirm an edge.
- \`create_project(owner, repo)\` — MCP-only; pushes a new project into the paired browser.

Each call returns the same typed JSON envelope (\`{ ok, summary, data? }\`). Claude composes them: "find the neighbors of \`auth-middleware\`, then \`tests\` from those, then read the test files." Three calls, no re-grepping.

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
    subtitle: "Four Claude agents, sequenced for shared context",
    body: `
## Four specialized agents

Causalist generates a graph by calling Claude Opus 4.7 in four roles. Each agent has its own system prompt constraining output to strict JSONL — one parseable JSON object per line, so the browser can stream nodes / edges into the live force-graph as they emit. Models are configurable per-agent via the New Project modal (defaults to Opus 4.7 for all four; Sonnet 4.6 / Haiku 4.5 also wired).

### 1. Structure agent
Walks the repo tree, classifies every file into one of seven layers — \`infra\`, \`data\`, \`logic\`, \`api\`, \`ui\`, \`test\`, \`config\` — and emits one \`CausalNode\` per line.

### 2. Dependency agent
Receives Structure's node manifest plus up to 80 curated source files (entry-points + index files prioritized). Extracts typed edges — \`imports\`, \`calls\`, \`reads\`, \`writes\`, \`extends\` — and emits one \`CausalEdge\` per line. Edge endpoints are required to be exact node ids from the manifest.

### 3. Semantic agent
Receives the same node manifest. Writes a one-sentence plain-English summary per node. Rules: starts with a verb, no "this file" preamble, under 140 characters.

### 4. Oracle agent
Receives all three upstream outputs, merges them into a final \`CausalGraph\`, deduplicates and drops orphan edges, fixes obvious miscategorized layers, and ensures every node has a summary.

## Sequential, then parallel

Structure runs first because Dependency and Semantic both reference its node ids. Once Structure completes, Dependency and Semantic run concurrently against that node manifest. Oracle synthesizes after both settle:

$$
\\text{Graph} \\;=\\; \\text{Oracle}\\big(\\text{Struct}(\\text{tree}),\\; \\text{Dep}(\\text{tree, nodes}),\\; \\text{Sem}(\\text{nodes})\\big)
$$

We tried full three-way parallelism in an early version — Dependency would invent edge endpoints that didn't match Structure's ids, and the orphan-edge filter would drop almost everything. Sequencing Structure first eliminated that whole class of failure. Side benefit: it's a better demo — file structure forms first, then edges trace between the placed nodes.

A fuzzy ID resolver runs after Dependency completes, mapping any model-emitted endpoints (path strings, slashed-id variants, leading "./") back to canonical node ids before the orphan filter applies. AST verification (\`@babel/parser\` for JS/TS, line-scan for Python) then stamps each surviving edge with a \`verified\` boolean.

## Cost budgeting

| Agent | Input shape | Typical tokens |
|-------|-------------|----------------|
| Structure | file tree JSON (paths + sizes) | ~5k in, ~8k out |
| Dependency | node manifest + ≤80 source files (≤30KB each) | ~30k in, ~10k out |
| Semantic | node manifest | ~8k in, ~6k out |
| Oracle | merged outputs + schema | ~25k in, ~16k out |

[Prompt caching](https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching) cuts repeat costs to ~10% on subsequent runs against the same repo. First analyze of a medium repo is around $0.30 in Opus tokens; the post-build Ask agent (a [Claude Managed Agent](https://docs.claude.com/en/docs/build-with-claude/managed-agents) with the 11 graph-query tools as custom tools) typically resolves a question in 3–6 tool calls.
`,
  },
  {
    slug: "integrations",
    title: "Integrations",
    subtitle: "CLI + Skill, MCP, live streaming",
    body: `
## Surfaces

Causalist ships three ways to invoke it, all backed by the same core graph:

### Web app
Paste a GitHub URL at [causalist.xyz](https://causalist.xyz) and Claude maps the repo. Hand-curated demos load instantly; live analyze of any public repo runs when you add your Anthropic key in Settings.

### CLI + Skill (preferred for Claude Code)
\`\`\`bash
npm i -g causalist-cli
causalist install        # drops SKILL.md into ~/.claude/skills/causalist/
causalist pair <code>    # one-time browser pair
\`\`\`

The CLI ships eleven graph-query subcommands (\`causalist node\`, \`blast\`, \`tests\`, \`writers\`, \`path\`, …) — JSON-by-default when piped, plain text in TTY, exit codes 0 ok / 1 ok=false / 2 fatal-stderr. \`causalist install\` drops a [Claude Code Skill](https://code.claude.com/docs/en/skills) at \`~/.claude/skills/causalist/SKILL.md\` so the agent auto-discovers when to use which command.

This is the path Anthropic recommends in [Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp): code over tool-call JSON. Tool descriptions don't pollute context; only the chunks the agent actually needs come back.

### MCP server (for non-CLI clients)
\`\`\`bash
claude mcp add causalist -- npx -y causalist-mcp@latest --session ABC123
\`\`\`

For Cursor, Claude.ai web, or any client that doesn't have a shell. Same eleven tools exposed over stdio. Pair codes come from [/pair](https://causalist.xyz/pair).

## The eleven tools (CLI + MCP)

| CLI | MCP | What it does |
|-----|-----|--------------|
| \`causalist node <id>\` | \`query_node\` | Node metadata, layer, summary |
| \`causalist neighbors <id>\` | \`get_neighbors\` | In/out edges + verified flag |
| \`causalist path <a> <b>\` | \`find_path\` | Shortest causal path |
| \`causalist layer <name>\` | \`find_nodes_by_layer\` | Filter by semantic layer |
| \`causalist blast <id>\` | \`blast_radius\` | What transitively depends on a node |
| \`causalist tests <ids…>\` | \`affected_tests\` | "3 tests not 300" — reachable tests |
| \`causalist writers <id>\` | \`find_writers\` | Every node that writes to a target |
| \`causalist similar <id>\` | \`similar_nodes\` | Structurally similar nodes |
| \`causalist topo <ids…>\` | \`topo_order\` | Topological layering of a subgraph |
| \`causalist verify <a> <b>\` | \`verify_edge\` | Confirm an edge exists |
| — | \`create_project\` | (MCP-only) push a project to the paired browser |
| \`causalist info\` | — | Capabilities manifest with active session |

## Live streaming

When Claude Code is paired with the browser, its \`PostToolUse\` hook posts tool-use events to \`/api/ingest/<session>\`. The browser viewer subscribes via Server-Sent Events at \`/api/stream/<session>\` and highlights nodes in real time — open the repo's graph in another tab and *watch Claude work.*

Pairing is how the browser and local Claude session agree on a \`sessionId\` without requiring a user account.

## Plan-mode agent runs (web)

The Agent tab in the right-side panel exposes two endpoints:

- \`POST /api/agent/run\` — SSE. Body \`{ plan, repo, branch, selectedNodeIds, nodePathMap, apiKey }\`. The user types a plan in plain English ("audit these files for security issues and fix any injection vulnerabilities"); the server streams \`file_loaded\`, \`finding\`, \`patch\`, \`done\`, \`error\` events as Claude Opus 4.7 carries it out against the selected files.
- \`POST /api/agent/push-pr\` — uses your GitHub OAuth cookie to create a branch via the Git Tree+Commit API and open a real pull request from the patches.

## Analyze API

\`POST /api/analyze\` is a public SSE endpoint. Pass \`Authorization: Bearer <your-anthropic-key>\` and a JSON body \`{owner, repo, commit, tree, files?}\`; receive \`agent\` events as each of the four pipeline agents (Structure, Dependency, Semantic, Oracle) completes, then a \`done\` event with the final graph.
`,
  },
];

export function sectionBySlug(slug: string): DocSection | null {
  return SECTIONS.find((s) => s.slug === slug) ?? null;
}
