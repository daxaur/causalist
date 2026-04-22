# Causalist — build plan (v2)

## Product shape

**One line.** Paste any GitHub URL → Claude agents map the repository into an interactive 3D causal graph. Every file labeled. Every import traced. Every blast radius visualized. Works in the browser, from the CLI, and inside Claude Code.

## Mental model

```
causalist.dev/<owner>/<repo>
             ^ paste your domain before any github.com URL and the graph loads
```

Every repo is a URL. If a graph already exists (cached, or freshly computed by another user), it loads instantly. If not, you add your Anthropic API key once in /settings and Causalist generates the graph on your device — four agents running in parallel.

## Agent pipeline (Claude Agent SDK)

Four agents, each specialized, running in parallel `query()` calls:

| # | Agent       | System prompt shape                                     | Output         |
|---|-------------|---------------------------------------------------------|----------------|
| 1 | Structure   | Walks tree, classifies dirs, detects frameworks         | Node list + layer |
| 2 | Dependency  | Greps imports/calls, builds edge list                   | Edge list      |
| 3 | Semantic    | Labels every node in plain English                      | Summaries      |
| 4 | Oracle      | Merges the three, emits final `CausalGraph`, answers "what if?" | Final graph |

All four use `claude-opus-4-7`. Results stream into the viewer as they arrive — the graph *self-assembles* rather than appearing behind a spinner.

## Surfaces

```
                  ┌──────────────────────┐
                  │  core/ (TS library)  │
                  │  fetch · parse ·     │
                  │  analyze · cache     │
                  └──────────┬───────────┘
         ┌────────────┬──────┴──────┬────────────────┐
         ▼            ▼             ▼                ▼
    Next.js app   CLI binary   Claude Code       Any agent
    (web UI)     `causalist`    plugin           via shell-out
                                (skill + MCP)    to `causalist`
```

**Universality.** The CLI works with every agent that has shell access: Claude Code, Cursor, Hermes, OpenHands, Aider. Plugin form is a bonus for Claude Code's UX. We never require the plugin.

## Routes

| Route              | Behavior                                                                 |
|--------------------|--------------------------------------------------------------------------|
| `/`                | Landing — hero, BentoGrid features, language marquee, Claude credit      |
| `/<owner>/<repo>`  | Graph viewer. Cached → instant. Not cached → analyze prompt with 4-agent staged progress |
| `/preview/<slug>`  | Hand-curated instant demos: `causalist`, `next-js`, `flask`              |
| `/dashboard`       | User's GitHub repos (fetched client-side via PAT). Click → `/[owner]/[repo]` |
| `/settings`        | Anthropic key + GitHub PAT                                               |

## Auth + data

**Phase 1 (now).** Two keys in `localStorage`: Anthropic API key (required for analyze) + GitHub PAT (optional, needed for private repos or the `/dashboard` listing). Keys sent directly to `api.anthropic.com` and `api.github.com` from the browser. Zero server-side auth.

**Phase 2 (post-MVP).** Supabase cache of public-repo graphs — anyone can read, only the generator can write. GitHub OAuth for the "signed in" dashboard view. Plugin-installed users authenticate with the same GitHub session.

## Design system

- **Colors.** Minimalist white → graph on dark. Single accent: `#D97757` (Claude's orange) on badges and one interactive highlight.
- **Typography.** Clash Display (display) + Satoshi (body) + JetBrains Mono (code). All free via Fontshare + Google.
- **Brand mark.** Custom Arc+Terminus logo — 270° "C" arc between a filled and hollow terminus. Favicon, header, OG, footer.
- **Icons.** Phosphor, duotone for emphasis. No Lucide anywhere.
- **Composition.** shadcn base + Magic UI for motion (BentoGrid, AnimatedBeam, Marquee, NumberTicker, Terminal, AnimatedShinyText).
- **Motion.** Framer Motion for entrance animations. Graph self-draws edge-by-edge on analyze. Shiny text pass on eyebrow. No bouncy easings — everything is slow, deliberate, instrument-panel-confident.

## Hackathon framing

**Built with Opus 4.7** — Anthropic × Cerebral Valley (Apr 21–27 2026).

Confirmed prize categories (from Opus 4.6 precedent): 1st / 2nd / 3rd + **Keep Thinking** + **Creative Exploration**. No "Managed Agents" category this round. Our pitch hits all four judges:

- **Boris Cherny** (Claude Code) — Causalist ships as a first-class Claude Code plugin
- **Cat Wu** (PM) — functional, end-to-end, shippable Vercel URL
- **Thariq Shihipar** (Skills) — 4-agent SDK pipeline is agents pushed to a novel domain
- **Lydia Hallie** (DX, ex-Vercel) — visual communication making complex systems legible

## Work order

### ✅ Done
- Renamed to Causalist, fresh repo on `daxaur`
- Custom Arc+Terminus logomark + favicon + OG
- Clash Display + Satoshi + JetBrains Mono via Fontshare
- Phosphor icons everywhere (lucide purged)
- `/[owner]/[repo]` canonical route
- BYO keys flow at `/settings`
- 3D + 2D graph viewer with layer colors + side panel
- Canned previews: causalist (toy), next-js (toy)
- Magic UI installed: BentoGrid, AnimatedBeam, Marquee, NumberTicker, Terminal, AnimatedShinyText
- Claude wordmark + Claude mark in `/public`
- `PLAN.md` + README cleanup

### 🟡 In flight
- Massively flesh out previews — every file, every edge
- Homepage rebuild with Magic UI components + Claude credit + embedded graph demo
- `/dashboard` — real GitHub repo list via PAT
- Anthropic SDK install + stub analyze endpoint

### 🔜 Next
- Live analyze flow (four parallel `query()` calls, streaming to viewer)
- Custom loading — graph self-draws
- `core/` extracted library
- `cli/` package — `causalist map <url>`
- `plugin/` package — Claude Code plugin submittable to registry
- Supabase cache schema + read-through
- Vercel deploy → live URL replaces localhost in README

### ⏸ Blocked on user
- Delete `CTRLabs/cartograph` — needs `gh auth refresh -h github.com -s delete_repo`
- Vercel deploy — needs a Vercel account + domain approval

## Scoping discipline

This is a 6-day hackathon build. Discipline ruthless scope-cuts:

- **Skip** pure visual sugar that doesn't read in a 90-second demo
- **Skip** MCP-without-plugin until plugin story is working
- **Skip** database until the client-only flow is working end-to-end
- **Ship** the thing a judge would click on first: paste URL → graph appears
