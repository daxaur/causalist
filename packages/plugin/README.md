# Causalist — Claude Code plugin

One-line install of Causalist into Claude Code. Gives you `/causalist:map` for
mapping any GitHub repository into a 3D causal graph, and an MCP server for
richer tool-use (`map_repo`, `query_node`, `blast_radius`, `simulate`).

## Install

### From the plugin directory

```bash
# Inside Claude Code:
/plugin install --local /path/to/causalist/packages/plugin
/reload-plugins
```

### Via the CLI

```bash
npm install -g causalist
causalist install
```

`causalist install` writes this plugin (and an `.mcp.json` pointing at the
stdio MCP server) into `~/.causalist/plugin/` and prints the
`/plugin install --local` command to run.

## What's in the bundle

```
packages/plugin/
├── .claude-plugin/
│   └── plugin.json            ← manifest, versioned with the CLI
├── .mcp.json                  ← wires causalist-mcp via npx
├── skills/
│   └── map/
│       ├── SKILL.md           ← /causalist:map
│       └── README.md
└── bin/
    └── causalist              ← bash shim → npx causalist
```

## Environment

- `ANTHROPIC_API_KEY` — required
- `GITHUB_TOKEN` — optional (only for private repos)

## Try it

After installation:

```
/causalist:map vercel/next.js
```

Claude Code will run the CLI, wait for Structure → Dependency → Semantic →
Oracle to finish, and open the rendered graph at
`https://causalist.dev/vercel/next.js`.
