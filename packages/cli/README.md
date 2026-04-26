# causalist (CLI)

Causal-graph CLI for any GitHub repo. Used standalone or paired with
Claude Code via the bundled Skill / MCP server.

```bash
npm install -g causalist-cli

# 1. Mint a key at causalist.xyz/app/settings (sign in with GitHub)
causalist login --api-key cspl_live_…

# 2. Create a project — runs entirely from the terminal
causalist project create vercel/swr
```

That's the whole setup. No 6-char pair codes, no browser tab to keep
open. The key you minted ties this terminal to your account; every
`causalist` command is authenticated from then on.

## Commands

### Account

| Command | What it does |
|---|---|
| `causalist login --api-key <KEY>` | Save a Causalist API key to `~/.causalist/session.json` |
| `causalist project create <url-or-slug>` | Create a new private project on your account |

### Graph queries (work after `project create` lands a graph)

| Command | What it does |
|---|---|
| `causalist blast <id>` | Files affected by changing this node |
| `causalist tests <id…>` | Tests that cover the given nodes |
| `causalist path <a> <b>` | Shortest causal path A → B |
| `causalist verify <src> <tgt>` | AST-confirm an edge is real |
| `causalist neighbors <id>` | Direct in/out neighbors |
| `causalist layer <name>` | List nodes in a semantic layer |
| `causalist node <id>` | Inspect one node |
| `causalist similar <id>` | Structurally-similar nodes |
| `causalist topo <id…>` | Topological build order |
| `causalist writers <id>` | Who writes to this state |
| `causalist info` | Show active session + repo |

Append `--json` (forced when stdout is piped) for structured output —
every command returns `{ ok, summary, data? }`.

### Local-only

| Command | What it does |
|---|---|
| `causalist map <repo>` | Run the 4-agent build locally with your Anthropic key |
| `causalist install` | Drop the `causalist` Skill into `~/.claude/skills/` |
| `causalist serve` | Local web UI at `http://localhost:4141` |

### Legacy

| Command | What it does |
|---|---|
| `causalist pair <code>` | Old 6-char pair-code flow — only needed for live browser-tab streaming. Prefer `login`. |

## Environment

| Variable | Purpose |
|---|---|
| `CAUSALIST_API_KEY` | API key for Causalist (overrides `~/.causalist/session.json`) |
| `ANTHROPIC_API_KEY` | Required for local `causalist map` |
| `CAUSALIST_WEB` | Override the Causalist web base URL |
| `GITHUB_TOKEN` | Optional — needed for private repos |

## License

MIT. Claude and Anthropic are trademarks of Anthropic PBC.
