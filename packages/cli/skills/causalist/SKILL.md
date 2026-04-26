---
name: causalist
description: |
  Query a typed causal graph of any code repository, and create new
  Causalist projects on the user's account. TRIGGER on questions about
  cross-file impact, blast radius, which tests cover a change, who
  writes to a piece of state, dependency paths, layer membership,
  topological build order, edge sanity ("is this import real?"), or
  when the user asks to map / register a new repository as a Causalist
  project. Phrases like "what breaks if I change X", "what depends
  on", "affected tests", "who writes to", "find path from", "is the
  import real", "map this repo", "create a Causalist project" should
  fire this skill.
  SKIP for pure single-file refactors or syntax-only questions.
when_to_use: |
  - "what breaks if I change <file/symbol>"  →  causalist blast
  - "what tests cover <node>"                →  causalist tests
  - "how does X reach Y"                     →  causalist path
  - "who writes to <state>"                  →  causalist writers
  - "is the import X→Y real (or hallucinated)" →  causalist verify
  - "what's structurally similar to <node>"  →  causalist similar
  - "give me the build order for these"      →  causalist topo
  - "what's in the api / data / ui layer"    →  causalist layer
  - "create a project for <repo>"            →  causalist project create
allowed-tools: Bash(causalist *) Bash(jq *)
argument-hint: "<question or node id>"
---

# Causalist — typed graph queries for any repo

You have a CLI named `causalist` on PATH that queries a typed causal
graph for the active project, and creates new projects on the user's
Causalist account. Every command returns structured JSON in one
round-trip — faster and cheaper than re-grepping the repo.

## Setup (one time)

The user mints an API key in `causalist.xyz/app/settings` and runs:

```bash
causalist login --api-key cspl_live_…
```

After that, every `causalist` command on this machine is authenticated
to their account. **No pair codes, no browser tab, no 6-char dance.**
The key is stored at `~/.causalist/session.json`. You can also export
`CAUSALIST_API_KEY=cspl_live_…` for shell-wide use.

If `causalist login` hasn't been run, tell the user:

> "Mint an API key at https://causalist.xyz/app/settings (sign in with
> GitHub first), then run `causalist login --api-key <KEY>`."

## Creating a new project — full local build

When the user wants Causalist to map a new repo, **you build it
yourself, right here in the terminal**:

```bash
causalist project create <github-url-or-owner/repo>
```

This runs the full 4-agent pipeline (Structure / Dependency /
Semantic / Oracle) **locally** using `$ANTHROPIC_API_KEY` from the
environment, then uploads the finished graph to the user's account
via the API key. The user's `/app` tab (if open) saves the entry to
their library on receipt.

You will see live progress: "Structure agent — classifying nodes ✓",
"Dependency agent — extracting edges ✓", etc. The whole thing takes
20–60 seconds depending on repo size. **The build completes before
this command returns.** Once it's done, the graph is real and
queryable — you can immediately follow up with `causalist blast`,
`causalist tests`, etc.

### Required env

- `ANTHROPIC_API_KEY` — for the four agent calls
- `CAUSALIST_API_KEY` — auth to the user's Causalist account
  (auto-loaded from `~/.causalist/session.json` after `causalist
  login`)
- `GITHUB_TOKEN` — only needed for **private** repos. The user's
  PAT or OAuth token. Public repos work without it.

### When to use `--no-build`

```bash
causalist project create <repo> --no-build
```

If `ANTHROPIC_API_KEY` isn't set or the user explicitly wants the
build to run in their browser (so the cost is on their browser-side
key, not the terminal env), pass `--no-build`. The command returns
immediately with a viewer URL the user opens to trigger the
in-browser build.

### Private repos

Both paths handle private repos. For the local-build path, set
`GITHUB_TOKEN` to a PAT with `repo` scope. For the browser-build
path, the user's GitHub OAuth cookie already has `repo` scope.

### Don't lie about state

If you just ran `causalist project create <repo>`, the build has
already happened — say so. If you ran it with `--no-build`, the
build hasn't started — tell the user to open the URL.

## Decision tree (which graph-query command for which question)

| Question shape | Command |
|---|---|
| What breaks if I change `X`? | `causalist blast <id> --depth 3 --json` |
| Which tests cover these changes? | `causalist tests <id1> <id2> ... --json` |
| Does code path go from A to B? | `causalist path <a> <b> --json` |
| Who writes to this state? | `causalist writers <id> --json` |
| Is this import / call real? | `causalist verify <src> <tgt> --json` |
| What's similar to this node? | `causalist similar <id> --limit 10 --json` |
| Layered build order for these ids? | `causalist topo <id1> <id2> ... --json` |
| List nodes in a semantic layer | `causalist layer <api\|data\|logic\|ui\|test\|config\|infra> --json` |
| Inspect one node | `causalist node <id> --json` |
| Direct edges in/out of a node | `causalist neighbors <id> --json` |
| Register a new repo as a project | `causalist project create <url-or-slug>` |

Every command:

- Defaults to JSON when stdout is piped (`--json` to force).
- Returns `{ ok: bool, summary: string, data?: ... }`.
- Exits `0` on success, `1` on `ok: false`, `2` on fatal errors.

## Composing

Pipe through `jq` to extract just the fields you need — don't dump
whole results into context. Examples:

```bash
# Blast radius → just the affected file ids
causalist blast src/auth/login.ts --json | jq -r '.data.affected[].id'

# Affected tests for every file in the api layer
causalist layer api --json \
  | jq -r '.data.nodes[].id' \
  | xargs causalist tests --json \
  | jq '.data.affected'

# Verify an edge before trusting it
causalist verify src/auth/login.ts src/db/users.ts --json \
  | jq '.data[].verified'
```

## Edge verification — important

Edges in the graph carry a `verified` flag:

- `verified: true` — confirmed by a real AST parse (Babel for JS/TS,
  import scan for Python). Treat as ground truth.
- `verified: false` — LLM-inferred. May be wrong. If it matters,
  confirm via `causalist verify` or a quick `Read` of the source.

Always check `verified` on edges that drive your decisions.

## When the CLI fails

If `causalist` exits with code 2, surface the stderr message to the
user and stop. Don't retry. Common causes:

- No API key → tell them to run `causalist login --api-key <KEY>`
  (mint at `causalist.xyz/app/settings`).
- Network error → confirm `causalist.xyz` is reachable.
- Node id not found → list candidates with `causalist layer <best-guess>`.

## Legacy: pair-code path (rarely needed)

The 6-char `causalist pair <code>` flow still works, but it only
covers the live browser-tab streaming case. For everything an agent
does — querying the graph, creating projects — the API key is the
better path. Don't suggest the pair-code dance unless the user
explicitly asks for live browser-tab streaming.
