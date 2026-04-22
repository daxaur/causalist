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
    subtitle: "Why a coding agent needs causal reasoning",
    body: `
## The claim

A coding agent that only chases correlations between code patterns and outcomes will fail on the first real refactor. An agent that maintains a model of *what causes what* in a codebase can generalize to edits it has never seen.

This isn't just intuition. [Richens & Everitt (ICLR 2024)](#cite-richens-everitt-2024) prove that **any agent whose regret stays bounded across distributional shifts must have implicitly learned an approximate causal model of its environment.** Formally, for agent policy $\\pi$ and environment distributions $P$ and $P'$ differing only in their causal structure, if

$$
\\sup_{P, P'} \\; \\mathbb{E}_{P'} \\big[ R(\\pi) \\big] - \\mathbb{E}_{P} \\big[ R(\\pi) \\big] \\;\\leq\\; \\epsilon
$$

for small $\\epsilon$, then $\\pi$ encodes a causal model approximating the true structural causal model of the environment. The upshot: **robust agents are causal agents.** If you want a coding agent to survive a refactor it hasn't seen, you have to give it a causal graph.

## The coding-agent setting

For a repository, every edit is an intervention, every test is a partial oracle, and every commit is a historical experiment. This maps onto [Pearl's do-calculus](#cite-pearl-causality) almost directly:

- **Observational** edges: what the code syntactically does. Imports, calls, inheritance.
- **Interventional** edges: what happens when you change a file — which tests fail, which downstream modules break.
- **Counterfactual** edges: what *would* have happened under a different commit.

Most coding tools only capture the observational layer — a static import graph. Causalist captures all three, and makes the distinction visible: you can see at a glance which edges are trusted because they're AST-derived versus which are inferred and need verification.

## What "causal" means in this product

**Honest note.** At launch, most of Causalist's edges are either structural (AST-derived: \`imports\`, \`calls\`, \`extends\`) or LLM-inferred (from Claude's reasoning trace: \`caused\`, \`explains\`, \`resolves\`). Neither is *interventional* in the Pearl sense. They're scaffolding for causal reasoning, not a true structural causal model.

Getting to proper causal edges is the next step:

1. **Mutation testing** — programmatically mutate a function and re-run the test suite. If tests fail that weren't previously touching this node, promote the edge from \`calls\` to \`causes-to-fail\`.
2. **Git commits as natural experiments** — a commit that touched $n$ files and broke a test $t$ suggests $P(\\text{break}(t) \\mid \\text{edit}(f)) > P(\\text{break}(t) \\mid \\neg\\text{edit}(f))$ for some $f$ in those files. Aggregate across history to estimate each file's effect on each test.
3. **Counterfactual replay** — "what would have happened if I hadn't touched \`file.ts\`?" requires simulating an alternate history; we use Claude to hypothesize and the test suite to verify.

We don't claim what we haven't earned yet — but the architecture is ready for each of these.
`,
  },
  {
    slug: "graph-schema",
    title: "Graph schema",
    subtitle: "Nodes, edges, layers, confidence",
    body: `
## The four semantic layers

Causalist inherits [Tracey's](https://github.com/CTRLabs/tracey) multi-layer separation, informed by [MAGMA](https://arxiv.org/abs/2601.03236)'s finding that orthogonal graphs for different signal types beat a flat unified memory.

| Layer | Source | Examples |
|-------|--------|----------|
| **Code** | Static AST + filesystem | files, functions, classes, imports |
| **Execution** | Runtime + tool calls | observations, errors, tool-use events |
| **Knowledge** | LLM reasoning | bugs, solutions, patterns, decisions |
| **Project** | User messages | tasks, constraints, goals |

In the viewer, each layer gets its own color; selecting a node reveals only edges within its layer plus cross-layer "explains" bridges.

## Node kinds

Every node has a \`kind\`:

- \`file\` — a source file
- \`module\` — a logical unit (package, directory with a role)
- \`function\` / \`type\` — AST-level entities
- \`external\` — npm/cargo/pip dependencies

## Edge kinds

Edges are typed. This is the key thing most dependency-graph tools miss — not all "X depends on Y" relationships are the same.

| Edge | Semantics |
|------|-----------|
| \`imports\` | \`X\` statically imports \`Y\`. From AST. Highest trust. |
| \`calls\` | \`X\` invokes \`Y\` at runtime. From AST + call-site resolution. |
| \`reads\` | \`X\` reads state from \`Y\` (DB row, config key, cache). Often inferred. |
| \`writes\` | \`X\` mutates \`Y\`. Narrower than reads; invariant-critical. |
| \`extends\` | \`X\` inherits / implements / conforms to \`Y\`. |
| \`caused\` | Execution-layer: event $e_1$ directly triggered $e_2$. |
| \`explains\` | Knowledge-layer: learned pattern $p$ accounts for observation $o$. |

## Confidence scoring

Each edge carries a confidence score $c \\in [0, 1]$:

$$
c_{\\text{edge}} \\;=\\; c_{\\text{source}} \\cdot e^{-\\lambda (t - t_0)}
$$

- $c_{\\text{source}}$ depends on provenance: AST-derived edges start at $1.0$, LLM-inferred at $0.6$.
- The decay $e^{-\\lambda (t - t_0)}$ means edges not touched for a long time lose trust. A file refactor that nobody has looked at for six months has a softer claim on the graph than yesterday's lint rule.

Edges below threshold are dimmed in the viewer. Queries with \`min_confidence\` filter them out of reasoning context.

## Structural invariants

The verifier checks three properties after every update:

1. **Acyclicity** on causal edges — cycles indicate incorrectly-directed edges. A cycle $A \\to B \\to A$ on \`caused\` edges is a contradiction by definition.
2. **No contradictions** — $X$ cannot both \`prevent\` and \`cause\` $Y$ at overlapping timestamps.
3. **Typed consistency** — a node of \`kind: "external"\` cannot appear as the target of an \`extends\` edge from a local node in a language without multiple inheritance.

Violations don't halt the agent; they get surfaced as warnings you can investigate.
`,
  },
  {
    slug: "retrieval",
    title: "Graph retrieval",
    subtitle: "Personalized PageRank with HippoRAG node-specificity",
    body: `
## The problem

Given a query — "where does user authentication happen?" — retrieve the smallest subgraph that is sufficient for Claude to answer. Flat vector retrieval misses multi-hop: the file that validates a JWT may not contain the word "authentication" anywhere; it's reached via \`auth-middleware.ts → jwt-verifier.ts → crypto-utils.ts\`.

[HippoRAG (NeurIPS 2024)](#cite-hipporag-2024) reports a ~20% improvement over flat retrieval on multi-hop QA by using Personalized PageRank over an entity-linked graph. Causalist borrows this.

## Personalized PageRank

Starting from a query, we identify *seed nodes* via entity mention and semantic matching. We then compute the stationary distribution of a random walk that restarts with probability $\\alpha$ at the seeds:

$$
r \\;=\\; (1 - \\alpha)\\, M r \\;+\\; \\alpha s
$$

where

- $r \\in \\mathbb{R}^{|V|}$ is the retrieved-relevance score for every node,
- $M$ is the column-stochastic transition matrix of the graph (edge weights from confidence × inverse degree of the source),
- $s$ is the seed distribution (one-hot on query-relevant nodes, or a soft distribution from semantic similarity),
- $\\alpha \\in [0, 1]$ is the restart probability, typically $0.15$.

We solve this iteratively via power iteration until $\\lVert r^{(k+1)} - r^{(k)} \\rVert_1 < 10^{-5}$. Typical convergence is 30–50 iterations.

## Node specificity (the HippoRAG trick)

A naive PPR over a codebase drowns the retrieval in hub nodes — \`main.ts\`, \`index.ts\`, \`types.ts\` — that connect to everything. HippoRAG applies a **node-specificity** weight to the seed distribution:

$$
s_i \\;\\propto\\; \\log\\!\\left(\\frac{N}{\\text{degree}(i)}\\right)
$$

where $N = |V|$. Hubs get small seed weight; specific, narrow nodes get large seed weight. The effect is dramatic: retrieval becomes about the *distinctive* files for a query, not the central ones.

## Subgraph extraction

Once $r$ is computed, we extract the top-$k$ highest-scoring nodes (typically $k = 20$) and all edges between them. The resulting subgraph is what Claude sees as context.

## Topological ordering

[Causal Graphs Meet Thoughts](#cite-causal-thoughts-2025) shows that putting cause nodes *before* effect nodes in the prompt, so chain-of-thought aligns with graph traversal, improves reasoning accuracy on causal queries. We sort the retrieved subgraph topologically before serialization:

$$
\\text{prompt\\_order}(n) \\;=\\; \\text{topo\\_rank}(n)
$$

with ties broken by descending PPR score. Cycles (which shouldn't exist but do during indexing) are broken by removing the lowest-confidence edge in the cycle.
`,
  },
  {
    slug: "verification",
    title: "Verification",
    subtitle: "Contradictions, DAG invariants, interventional edges",
    body: `
## Structural verification

Every time the graph is updated, Causalist runs:

1. **Cycle detection on causal edges.** \`caused\`, \`prevented\`, and \`causes-to-fail\` must form a DAG. We use [Tarjan's SCC algorithm](https://en.wikipedia.org/wiki/Tarjan%27s_strongly_connected_components_algorithm) in $O(V + E)$; any non-singleton SCC is a contradiction.
2. **Pairwise contradiction detection.** Edges $(X, Y, \\text{cause})$ and $(X, Y, \\text{prevent})$ with overlapping timestamps are incompatible; we surface both and ask the user (or the agent's introspection loop) to resolve.
3. **Confidence floor.** Edges below $c = 0.2$ are dimmed in the viewer; edges below $c = 0.05$ are dropped from reasoning context entirely.

## From structural to interventional

Today's edges are observational or LLM-inferred. The research program for Causalist v2 is to promote them to interventional where possible.

### Mutation testing

Given a function $f$, a test suite $T$, and an existing \`calls\` edge $(f, g)$:

1. Apply a semantic mutation to $g$ (e.g. flip a comparison, return a constant).
2. Re-run $T$. Let $T_{\\text{fail}}(g')$ be the set of newly-failing tests.
3. For each $t \\in T_{\\text{fail}}(g')$, promote or create the edge $(g, t, \\texttt{causes-to-fail})$ with confidence

$$
c \\;=\\; 1 \\;-\\; P(\\text{flake}(t))
$$

estimated from test-history flake rate. This yields genuinely causal edges in Pearl's sense: we intervened, we observed, the counterfactual is the unmutated world.

### Git commits as natural experiments

Every commit $c$ touches a set of files $F_c$ and either leaves the build green or turns a test $t$ red. Across many commits we have samples that let us estimate

$$
P\\big(\\text{fail}(t) \\,\\big|\\, f \\in F_c\\big) \\quad\\text{vs.}\\quad P\\big(\\text{fail}(t) \\,\\big|\\, f \\notin F_c\\big)
$$

Files with a large positive gap are load-bearing for that test. This isn't a true intervention (commits correlate with each other), but it's a principled way to rank candidate causal edges for mutation testing without having to mutate everything.

### Counterfactual replay

Given a regression introduced by commit $c$, the counterfactual is *"what would have happened if $c$ had reverted file $f$ to its state at $c-1$?"* We use Claude + the test suite to hypothesize, then run the test to verify. Edges surviving this are labeled \`counterfactually-required\`.

## The introspection loop

Every few agent iterations, a dedicated pass reads the graph and reports:

- **Repeated actions** — if the agent has called \`Edit\` on the same file 4+ times without an intervening successful test, it's stuck. Surface it.
- **Contradictions** — any new violations of DAG or pairwise checks.
- **Low-confidence territory** — clusters of nodes where average edge confidence < 0.3 deserve human review.

This snapshot gets injected back into the next turn's context, so the agent can course-correct on its own memory. It echoes [Reflexion (NeurIPS 2023)](#cite-reflexion-2023) — agents that read their own trajectory outperform agents that don't.
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

Causalist ships three ways to invoke it, all backed by the same core library:

### Web app
Paste a GitHub URL at [causalist.xyz/&lt;owner&gt;/&lt;repo&gt;](https://causalist.xyz). Instant previews for hand-curated demos; live analyze for any public repo when you supply your Anthropic key.

### CLI
\`\`\`bash
npm install -g causalist
export ANTHROPIC_API_KEY=sk-ant-...
causalist map vercel/next.js --open
\`\`\`

Universal shell interface — works with Claude Code, Cursor, Hermes, Aider, or any agent that can spawn subprocesses.

### Claude Code plugin
\`\`\`bash
causalist install
# prints: /plugin install --local ~/.causalist/plugin
\`\`\`

Drop into Claude Code. You get \`/causalist:map <repo>\` and an MCP server exposing \`map_repo\`, \`query_node\`, \`blast_radius\`, and \`simulate\`.

## Live streaming

While Claude Code works on a local repository, the plugin's \`PostToolUse\` hook posts every tool-use event to \`https://causalist.xyz/api/ingest/<session>\`. The browser viewer subscribes via Server-Sent Events at \`/api/stream/<session>\` and highlights nodes in real time — you can open the repo's graph in another tab and *watch Claude work.*

The pairing flow (browser shows a 6-char code, CLI calls \`causalist pair ABC123\`) is how the browser and local session agree on a \`sessionId\` without requiring a user account.

## MCP tools (stable)

| Tool | What it does |
|------|-------------|
| \`map_repo(url)\` | Fetch + analyze, returns the full graph |
| \`query_node(id)\` | Node metadata + summary + language |
| \`get_neighbors(id, direction)\` | Incoming or outgoing edges with kinds |
| \`find_path(source, target)\` | Shortest causal path between two nodes |
| \`verify_edge(source, target)\` | Check the edge exists and return its confidence |
| \`blast_radius(id, depth)\` | Everything reachable within $k$ hops via \`calls\` / \`writes\` |
| \`simulate(intervention)\` | Extended-thinking "what if?" counterfactual |

## API

The \`POST /api/analyze\` route is a public Server-Sent Events endpoint. Pass \`Authorization: Bearer <your-anthropic-key>\` and a JSON body \`{owner, repo, commit, tree, files?}\`; receive \`agent\` events as each of the four agents completes, then a \`done\` event with the final graph.
`,
  },
];

export function sectionBySlug(slug: string): DocSection | null {
  return SECTIONS.find((s) => s.slug === slug) ?? null;
}
