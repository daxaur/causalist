# Testing Causalist end-to-end

Quick steps to verify each surface. Run them in order.

## Prerequisites

```bash
# Anthropic key (for analyze, Ask, Explainer, Deep Dive)
export ANTHROPIC_API_KEY=sk-ant-...

# GitHub PAT (optional — needed for private repos + Actions failures)
# Create at github.com/settings/personal-access-tokens
export GITHUB_TOKEN=github_pat_...
```

## 1. Web — previews & filters (2 minutes)

1. Open `https://causalist.xyz/preview/causalist`.
2. You should see: 55-node graph, HOT nodes larger + top-right pill summarizing `hot · core · leaf`.
3. Press `f` — filter panel toggles. Check a layer box → non-matching nodes dim to 15%.
4. Press `/` — search input focuses. Type a partial label → only matching nodes stay bright.
5. Press `⌘K` → command palette opens. Type a node label, hit enter → graph focuses that node.
6. Copy the URL — it encodes filter + selection state. Open in another tab, filters restored.
7. Click any node → Node Panel opens on the right. **HOT / CORE / LEAF** badges have hover tooltips.
8. Click **Review prompt for this file** → modal opens with the generated prompt. Edit the Task line → prompt updates live. Click **Copy**.
9. Switch mode to **Ask** → Oracle opens. Ask: *"what breaks if I delete the graph viewer?"* — watch tool-use cards render inline as Claude calls `blast_radius`, etc.
10. Switch to **Changes** → commit picker at top, graph recolors (green = added, red = removed, amber = modified).
11. Switch to **Errors** → if `GITHUB_TOKEN` is set, last 8 failed workflow runs load; otherwise see the terminal empty state.

## 2. Web — analyze a real repo (3 minutes)

1. Go to `https://causalist.xyz/settings` → paste your Anthropic key (saved in `localStorage`).
2. Paste any repo in the hero input, e.g. `https://github.com/pallets/click`.
3. You land on `/pallets/click`. If no cached graph exists, the Analyze card shows.
4. Click **Run the 4-agent analyze**. Octokit fetches the tree, POSTs to `/api/analyze`, stream fires 4 agents.
5. Agent rail on the right shows Structure / Dependency / Semantic / Oracle in real time.
6. When **Oracle** completes, graph renders inline and auto-saves to `/library`.
7. Visit `/library` → the repo appears as a card. Click → full viewer.

## 3. CLI — install & map

```bash
git clone https://github.com/daxaur/causalist.git
cd causalist/packages/cli
npm install
npm run build
npm link   # exposes `causalist` globally

export ANTHROPIC_API_KEY=sk-ant-...

# Print a graph to stdout as JSON
causalist map vercel/next.js

# Open it in a browser
causalist map vercel/next.js --open

# Save to a file
causalist map pallets/click -o click.json
```

The CLI's `analyze` is currently a stub — real wiring is queued. The
open-browser flow works today and lands you on `/vercel/next.js`.

## 4. Session pairing (live Claude Code streaming)

In one terminal:

```bash
# Web
open https://causalist.xyz/pair
# copy the 6-char code displayed (e.g. ABC234)
```

In another terminal:

```bash
cd causalist/packages/cli
node dist/index.js pair ABC234
# -> writes ~/.causalist/session.json with sessionId + token

# Export for Claude Code to pick up
export CAUSALIST_SESSION=$(cat ~/.causalist/session.json | jq -r .sessionId)
export CAUSALIST_TOKEN=$(cat ~/.causalist/session.json | jq -r .token)
```

Browser flips to **Paired** within a second. The tab is now listening on
`/api/stream/<session>` for events posted to `/api/ingest/<session>`.

## 5. Claude Code plugin (session hooks)

```bash
# From the repo:
cd causalist/packages/plugin
/plugin install --local $(pwd)     # inside a Claude Code session
/reload-plugins
```

After plugin install, every `PostToolUse` hook in a CC session with
`CAUSALIST_SESSION` set will POST to `/api/ingest/<session>` — the
paired browser tab renders the tool-use event in real time.

Smoke test: in Claude Code, edit any file. The browser should log the
event within ~100ms.

## 6. MCP server (agent tool access)

```bash
# Build the server
cd causalist/packages/mcp
npm install
npm run build

# Start it standalone (uses the paired session)
node dist/index.js
# or against a local graph JSON
node dist/index.js --graph ./click.json
```

In Claude Code, add to `.mcp.json`:

```json
{
  "mcpServers": {
    "causalist": {
      "command": "node",
      "args": ["/path/to/causalist/packages/mcp/dist/index.js"],
      "env": { "CAUSALIST_SESSION": "$(cat ~/.causalist/session.json | jq -r .sessionId)" }
    }
  }
}
```

Reload plugins, then:

```
@causalist query_node graph-viewer
@causalist blast_radius graph-viewer 4
@causalist affected_tests ["graph-viewer", "node-panel"]
```

Tool names and argument shapes match `/agents` documentation exactly.

## 7. API smoke tests

```bash
# Pair
curl -X POST https://causalist.xyz/api/pair
# -> { "code": "ABC234", "sessionId": "..." }

# Stars
curl https://causalist.xyz/api/github-stars

# Stream (keep running)
curl -N https://causalist.xyz/api/stream/$CAUSALIST_SESSION &

# Ingest a fake event — should arrive in the stream above
curl -X POST https://causalist.xyz/api/ingest/$CAUSALIST_SESSION \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $CAUSALIST_TOKEN" \
  -H 'X-Causalist-Event: PostToolUse' \
  -d '{ "tool_name": "Edit", "tool_input": { "file_path": "src/foo.ts" } }'

# Annotate a node red
curl -X POST https://causalist.xyz/api/annotate/$CAUSALIST_SESSION \
  -H 'Content-Type: application/json' \
  -d '{ "nodeIds": ["graph-viewer"], "status": "failing", "source": "test" }'
```

## 8. What to watch for

- **Analyze latency** > 60s → Vercel is hitting a serverless limit; trim tree or switch to Haiku on Semantic.
- **OAuth loop** → confirm the GitHub OAuth app's callback is exactly `https://causalist.xyz/api/auth/github/callback` (no trailing slash).
- **Pair code expired** → single-use, 10-minute TTL; refresh `/pair`.
- **Hook didn't fire** → check `~/.claude/settings.json` has
  `"allowedHttpHookUrls": ["https://causalist.xyz/*"]`.
