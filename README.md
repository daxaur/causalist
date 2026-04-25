<div align="center">

<svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg">
  <path d="M18 5.2 A 8.5 8.5 0 1 0 18 18.8"/>
  <circle cx="18" cy="18.8" r="1.9" fill="currentColor" stroke="none"/>
  <circle cx="18" cy="5.2" r="1.9"/>
</svg>

# causalist

**See what your code actually means. In 3D.**

Paste a GitHub URL. Claude agents map the repo into an interactive 3D causal
graph. Explore the architecture, understand connections, review PRs visually.

[![Built with Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-D97757?logo=anthropic&logoColor=white)](https://claude.com/claude-code)
[![Claude Opus 4.7](https://img.shields.io/badge/Model-Opus%204.7-D97757?logo=anthropic&logoColor=white)](https://anthropic.com)
[![MIT](https://img.shields.io/badge/license-MIT-black)](LICENSE)

</div>

---

## How it works

Every repository gets a shareable link:

```
causalist.xyz/app/<owner>/<repo>
```

If that repo has been mapped before, it loads instantly. If not, you add your
Anthropic API key in settings and Causalist generates the graph in your browser
— four Claude Opus 4.7 agents running in parallel:

| Agent          | Role                                                   |
|----------------|--------------------------------------------------------|
| **Structure**  | Walks the file tree, detects frameworks                |
| **Dependency** | Extracts imports, calls, and data-flow edges           |
| **Semantic**   | Labels each node with plain English + layer class      |
| **Oracle**     | Synthesizes the graph and answers "what if?" questions |

Every edge is then **AST-verified** with `@babel/parser` (JS/TS) or a Python
import scan, so each one is stamped `verified: true|false` for the agent and
the human to trust-gate.

The graph renders as a 3D galaxy — files and modules color-coded by semantic
layer, with hot (top 10% by fan-in) nodes painted magenta.

## Surfaces

Three interfaces share one core graph:

| Surface | Who it's for | How |
|---|---|---|
| **Web app** | Humans in a browser | Paste a URL, browse the graph in 3D |
| **CLI + Skill** | Claude Code | `npm i -g causalist-cli && causalist install` — eleven graph-query subcommands + a `SKILL.md` that teaches the agent when to use them |
| **MCP server** | Cursor, Claude.ai web, anything without a shell | `claude mcp add causalist -- npx -y causalist-mcp@latest --session <code>` |

Anthropic's modern stack ([Code Execution with MCP](https://www.anthropic.com/engineering/code-execution-with-mcp), Nov 2025) prefers code/CLI over tool-call JSON for coding agents. We ship both and let the client pick.

## Try it

Live at **[causalist.xyz](https://causalist.xyz)**. Three pre-rendered previews:

- `/app/preview/causalist` — the app, mapping itself
- `/app/preview/next-js` — a hand-curated slice of `vercel/next.js`
- `/app/preview/flask` — `pallets/flask`

## Develop

```bash
git clone https://github.com/daxaur/causalist.git
cd causalist
npm install
npm run dev -- --port 4141
```

## Stack

- Next.js 16 (App Router, async params, Turbopack)
- TypeScript, Tailwind v4, shadcn/ui
- Phosphor icons (duotone) + custom Arc+Terminus logomark
- Clash Display (display) + Satoshi (body) + JetBrains Mono (code)
- `react-force-graph-3d` / `-2d` + three.js
- `@anthropic-ai/claude-agent-sdk` — Opus 4.7 with four parallel subagents
- `@octokit/rest` for GitHub ingestion
- Devicon CDN for language/framework node icons

## License

MIT — see [`LICENSE`](LICENSE).

Claude and Anthropic are trademarks of Anthropic PBC. This project is
independent and unaffiliated.
