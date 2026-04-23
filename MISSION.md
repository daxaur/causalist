# Causalist — Mission

> Make Causalist the MCP substrate that Claude Code uses to reason
> about code. Humans watch the same graph; agents act on it.

## Thesis

**Claude Code already knows what it changed. Causalist knows what that
change *means*.** One shared causal graph, consumed by both the agent
(via MCP tools) and the human (via the browser viewer). Every edit fires
an annotation; every graph query changes the agent's next move.

## The demo that wins (90 seconds)

Split screen. Claude Code on the left, Causalist on the right.

1. **0:00–0:10** — `Next.js repo, 800 files.` Graph already rendered.
2. **0:10–0:25** — User asks CC: *"add rate limiting to every authenticated API route."* CC visibly calls `find_nodes_by_layer("api")` + `get_neighbors(auth-middleware)`. Returns 11 routes.
3. **0:25–0:40** — Browser pulses those 11 nodes. CC prints the plan: *"11 files, skipping 4 public routes. Proceed?"* — a plan no grep could produce.
4. **0:40–0:60** — Approve. CC edits. Each edit streams to the graph via SSE — nodes flash `modified`.
5. **0:60–0:75** — CC calls `affected_tests(edited_ids)` → returns 12 of 340. Runs only those.
6. **0:75–0:90** — Green. Close line: **"Claude Code already knows what it changed. Causalist knows what that change means."**

## Mission points

### 1. Agent tool surface (MCP, highest leverage)

Current: `query_node`, `get_neighbors`, `find_path`, `verify_edge`,
`find_nodes_by_layer`, `blast_radius`.

Add, in order:

1. **`affected_tests(changedIds)`** — topologically reachable test nodes. The "3 tests not 300" story.
2. **`find_writers(target)`** — everything that writes to a table / state / cache. The security pitch.
3. **`similar_nodes(id)`** — same layer + edge-shape. The "add a route like this one" flow.
4. **`co_change(id)`** — commit-history clustering. Catches implicit contracts.
5. **`topo_order(ids)`** — layered build order. Turns "add feature X" into a checklist.

### 2. Annotation schema (unify the states)

One enum the whole system shares:
`modified | failing | fixed | risky | verified | stale`

Validate in `/api/annotate`. Render as color overlays in the viewer.

### 3. Session pairing (the demo is blocked on this)

- `/api/pair` mints a 6-char code, stores `{code → {sessionId, token}}` with TTL.
- `/pair` browser page accepts the code → establishes cookie, streams to `/api/stream/<session>`.
- CLI `causalist pair ABC123` exchanges code for token, writes `~/.causalist/session.json`.

### 4. Path → node_id manifest

`GET /api/session/<id>/manifest` returns `{ path: node_id }`. Cached
client-side. Lets CC resolve file paths to graph nodes.

### 5. Real analyze pipeline (not scripted)

`/api/analyze` streams real four-agent SSE using `@anthropic-ai/sdk`
server-side. The RepoAnalyzePrompt's AgentRail consumes actual events,
not setTimeouts.

### 6. UI polish that serves the thesis

- **Loading skeletons** across dashboard, library, preview — nothing
  should ever be blank.
- **Hover-chain dim** — hover a node, non-neighbors fade to 35%. The
  single highest-praised micro-interaction in graph UIs.
- **Auto-tooltip on first HOT** — one-shot, teaches without a modal tour.
- **Mode-preview on hover** — hovering the Errors button briefly flashes
  failing nodes red. Teaching by doing.

## What we're cutting (or deprioritizing)

Per stress-test — these aren't load-bearing for the thesis:

- **Explainer mode** — pretty, but judges won't remember it. Keep the
  code, remove from the demo script.
- **Errors mode** — adjacent product unless wired to annotations. Keep
  but not demo'd.
- **3D camera polish beyond first impression** — earns its keep for
  scale perception in 3 seconds, no further.
- **Oracle chat as primary UX** — Oracle is our internal test harness
  for MCP tools. The product is the MCP surface. Oracle is demo'd
  briefly to show the tools working; CC is the hero.

## Build order (this sprint)

1. **5 new agent tools** — high-leverage, ~400 LOC total
2. **Loading skeletons** + hover-chain dim + auto-tooltip — ~250 LOC
3. **Annotation schema enum + validation** — ~60 LOC
4. **Session pairing (`/pair` + `/api/pair`)** — ~200 LOC
5. **Path → node_id manifest** — ~80 LOC
6. **Real analyze pipeline (server-side `@anthropic-ai/sdk`)** — ~400 LOC
7. **Agent API docs page at `/agents`** — ~300 LOC

Not in this sprint but queued: pre-edit hook contract documented in
plugin, graph freshness (`dirty` endpoint), published MCP server via npm.
