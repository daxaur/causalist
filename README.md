<div align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/8/8a/Claude_AI_logo.svg" alt="Claude" height="48" />

# causalist

**See what your code actually means. In 3D.**

[![Built with Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-D97757?logo=anthropic&logoColor=white)](https://claude.com/claude-code)
[![Claude Opus 4.7](https://img.shields.io/badge/Model-Opus%204.7-D97757?logo=anthropic&logoColor=white)](https://anthropic.com)
[![License](https://img.shields.io/badge/license-MIT-black)](LICENSE)

</div>

Paste a GitHub URL. Claude managed agents map the entire repository into an
interactive 3D causal graph — a galaxy of files, functions, and modules
connected by imports, calls, and data flow.

- **Explore** architecture visually. Zoom from modules → functions like Google
  Earth.
- **Review** PRs by blast radius. See what a diff *actually* affects, not just
  the diff.
- **Ask** "what if I delete this?" Claude simulates the intervention on the
  graph before any code is written.

Built for the **Built with Opus 4.7** Claude Code hackathon (Apr 21–27 2026).

## Surfaces

Causalist ships three interfaces that share one core:

| Surface | Who uses it | How |
|---|---|---|
| **Web app** | Humans in a browser | Paste a URL, browse the graph |
| **MCP server** | Any AI agent (Claude Code, Hermes, Cursor, …) | `causalist-mcp` — exposes tools like `map_repo`, `query_node`, `blast_radius`, `simulate` |
| **CLI** | Humans in a terminal | `causalist map <url>` → opens graph in browser |

## Develop

```bash
npm install
npm run dev
```

Open <http://localhost:4141>.

## Stack

- Next.js 16 (App Router, async params)
- TypeScript, Tailwind v4, shadcn/ui
- Phosphor icons (duotone)
- 3d-force-graph + three.js for the 3D viewer
- vis.js for the 2D fallback
- Fraunces (display) + Geist (sans) + Geist Mono (code)
- Octokit for GitHub ingestion
- `@anthropic-ai/sdk` — Claude Opus 4.7 for Structure / Dependency / Semantic / Oracle agents

## Notes

- This Next.js version has breaking changes from older releases — read
  `node_modules/next/dist/docs/` before writing Next.js code.
- Claude and Anthropic are trademarks of Anthropic PBC. This project is
  independent and unaffiliated.
