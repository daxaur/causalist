---
name: map
description: Generate a 3D causal graph for a GitHub repository. Use when the user asks to visualize, map, explore, or understand a codebase. Accepts either a github.com URL or an owner/repo slug.
---

# /causalist:map

Given a GitHub URL or `owner/repo` slug, map the repository into a causal graph and open it in the Causalist web UI.

## Steps

1. Extract `owner` and `repo` from `$ARGUMENTS`. Accept either `https://github.com/<owner>/<repo>` or `<owner>/<repo>`.
2. Run:
   ```bash
   causalist map "$ARGUMENTS" --open
   ```
3. The CLI will:
   - Fetch the repo tree via Octokit (uses `$GITHUB_TOKEN` if set, otherwise public only)
   - Run four Claude agents in parallel (`ANTHROPIC_API_KEY` required): Structure → Dependency → Semantic → Oracle
   - Stream progress as each agent completes
   - Print the final `CausalGraph` JSON to stdout
   - Open the graph at `https://causalist.dev/<owner>/<repo>` in the user's browser
4. Summarize the key findings to the user: number of nodes, number of edges, top semantic layers, any particularly interesting causal clusters.

## When to use this skill

- "Show me what's in this repo"
- "Map the dependencies in X"
- "What does this codebase look like?"
- "Find the blast radius of changing module Y"

## What to return

A short natural-language summary of the graph plus the live URL. Do not paste the full JSON — the user already has the visual.

## Required environment

- `ANTHROPIC_API_KEY` — Causalist's own analyze calls. You can use the same key Claude Code is already using.
- `GITHUB_TOKEN` — optional, only needed for private repositories.
