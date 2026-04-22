# Causalist — build plan

## Product shape

**One-line.** A web app + CLI + Claude Code plugin that turns any GitHub repository into a 3D causal graph. Paste a URL (or prefix one with `causalist.dev/`) — Claude agents map the codebase, you explore the galaxy.

## Shared architecture

```
                  ┌──────────────────────┐
                  │  core/ (TS library)  │
                  │  fetch · parse ·     │
                  │  analyze · cache     │
                  └──────────┬───────────┘
         ┌────────────┬──────┴──────┬────────────────┐
         ▼            ▼             ▼                ▼
    Next.js app   CLI binary   MCP server      Claude Code
    (web UI)    (`causalist`) (universal)      plugin (skill
                                                + mcp + cli)
```

- **`core/`** — pure TypeScript lib. Given a GitHub URL + caller-supplied keys, returns a `CausalGraph`. Zero UI. Parallel `query()` against Claude Agent SDK (Structure / Dependency / Semantic / Oracle). Cache results by repo + commit SHA.
- **Web app** (this repo, Next.js) — calls `core` client-side using the user's keys. Renders the graph. No server-held secrets.
- **CLI** — `causalist map <url>` writes JSON to stdout, optionally opens browser.
- **MCP server** — wraps `core` tools: `map_repo`, `query_node`, `blast_radius`, `simulate`.
- **Claude Code plugin** — ships skill + `.mcp.json` + `bin/causalist` in one directory, submittable to the official plugin registry.

## Route structure

Every repo becomes a shareable link: `causalist.dev/<owner>/<repo>`.

| Route | Behavior |
|---|---|
| `/` | Landing — hero, preview pills, GitHub URL input |
| `/<owner>/<repo>` | Graph viewer. If cached, loads instantly. If not, shows "map this repo" state that calls the Agent SDK with user's keys. |
| `/preview/<slug>` | Canned templates for instant demo (no API calls) |
| `/dashboard` | User's connected repos (post-GitHub connect) |
| `/settings` | Anthropic key + GitHub PAT |

The legacy `/graph/[owner]/[repo]` route is being folded into the root `[owner]/[repo]` pattern.

## Data model

```ts
type CausalGraph = {
  repo: string           // "owner/repo"
  commit: string         // sha — unique cache key
  generatedAt: string    // ISO
  generatedBy: string    // model id
  rootLabel: string
  nodes: CausalNode[]
  edges: CausalEdge[]
}
```

Cache key: `(repo, commit)`. If DB cache present and `commit` matches current HEAD, serve cached. Otherwise prompt user to (re)analyze.

## Cache layer (optional, post-MVP)

Supabase (already installed) with a single table:

```sql
create table graphs (
  repo text not null,
  commit text not null,
  graph jsonb not null,
  generated_by text not null,
  generated_at timestamptz default now(),
  primary key (repo, commit)
);
```

Public reads (anyone viewing a cached graph). Authenticated writes (only the user who generated it). Deferred until core analyze flow is working.

## Agent pipeline (Claude Agent SDK)

Four parallel `query()` calls, each with its own specialized system prompt:

1. **Structure** — walks the file tree via `Read/Glob`, classifies directories (app, test, config, docs), detects frameworks.
2. **Dependency** — extracts import/call edges via `Grep` over the fetched tree.
3. **Semantic** — writes plain-English labels + semantic-layer assignment for each node.
4. **Oracle** — consumes the three outputs, emits final `CausalGraph` JSON, and later handles "what-if?" queries with extended thinking.

All four call `model: "claude-opus-4-7"`. User's key is passed via `ANTHROPIC_API_KEY` env var for CLI, or as a header from the browser for web.

## Authentication

**Phase 1 (now):** Bring-your-own keys stored in `localStorage`. Anthropic key + GitHub PAT. Zero server-side auth.

**Phase 2:** GitHub OAuth app for "see all my repos" dashboard. Supabase for user profiles + cached graphs. Claude Code plugin authenticates via the same GitHub session for its `/<owner>/<repo>` links.

## Loading / perceived-perf strategy

- Previews are **prerendered** at build time. Zero wait.
- Live analyze: streaming updates. As each agent returns, its nodes/edges fade in. User sees the graph *build itself* in real time rather than a spinner.
- Loading state: constellation that draws itself edge-by-edge using the final graph's edges, not a generic spinner.

## Work order

Tracked in the task list. Completed items below; the rest are sequenced by blast-radius descending.

- [x] Rename to Causalist, new repo on daxaur
- [x] Research fonts + logo + Claude integration
- [x] Graph viewer with 3D/2D toggle, layer colors, side panel
- [x] Preview templates (`causalist`, `next-js`)
- [x] Devicon CDN helper for node language icons
- [x] Bring-your-own-keys settings flow
- [ ] Replace lucide-react imports with Phosphor (3 shadcn files)
- [ ] Swap font pipeline to Clash Display + Satoshi + JetBrains Mono
- [ ] Design + ship the custom `<Logo>` mark (Arc + Terminus)
- [ ] Restructure routes `/graph/[owner]/[repo]` → `/[owner]/[repo]`
- [ ] SVG favicon + OG image using the new mark
- [ ] Fix README — remove localhost-as-demo link
- [ ] Polish graph visual (glow, bloom, better camera framing)
- [ ] Streaming analyze flow using `@anthropic-ai/claude-agent-sdk`
- [ ] Custom loading state (graph self-drawing)
- [ ] `/dashboard` with real GitHub repo list
- [ ] `core/` extracted as its own package
- [ ] `cli/` package — `causalist map <url>`
- [ ] `plugin/` package — Claude Code plugin bundle
- [ ] Supabase schema + cached-graph flow
- [ ] Deploy to Vercel, update README link
- [ ] Submit plugin to official Claude Code registry

## Hackathon framing

Prize categories confirmed (4.6 precedent, 4.7 is the same shape): 1st/2nd/3rd placement + "Keep Thinking" + "Creative Exploration." **No "Managed Agents" prize.** Pitch as *agentic repo cartographer built on Opus 4.7 + Agent SDK subagents.* Hits Lydia (visual communication), Boris (Claude Code plugin integration), Thariq (agents pushed to a new domain), Cat (functional + shippable).
