---
name: causalist
description: |
  Query a typed causal graph of any code repository paired with
  Causalist. TRIGGER on questions about cross-file impact, blast
  radius, which tests cover a change, who writes to a piece of state,
  dependency paths, layer membership, topological build order, or
  edge sanity ("is this import real?"). Phrases like "what breaks if
  I change X", "what depends on", "affected tests", "who writes to",
  "find path from", "is the import real" should fire this skill.
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
allowed-tools: Bash(causalist *) Bash(jq *)
argument-hint: "<question or node id>"
---

# Causalist — typed graph queries for any repo

You have a CLI named `causalist` on PATH that queries a typed causal
graph for the active project. It's faster and cheaper than re-grepping
the repo: every command returns structured JSON in one round-trip.

## Resolve the session first

Run this once at the start of any task that touches code structure:

```bash
causalist info --json | jq '{session, repo}'
```

If `session` is `null`, the repo isn't paired yet. Tell the user:

> "Generate a pair code at https://causalist.xyz/pair, then run
> `causalist pair <code>`."

If they have one, you're ready.

## Decision tree (which command for which question)

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

Every command:

- Defaults to JSON when stdout is piped (`--json` to force).
- Returns `{ ok: bool, summary: string, data?: ... }`.
- Exits `0` on success, `1` on `ok: false`, `2` on fatal errors (read stderr).
- Reads the active session from `~/.causalist/session.json` automatically.

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

## Citing nodes back to the user

When you reference a finding, link it to the live graph so the user
can click through:

```
https://causalist.xyz/app/preview/<session>?node=<id>
```

(Use the `session` from `causalist info`.)

## When the CLI fails

If `causalist` exits with code 2, surface the stderr message to the
user and stop. Don't retry. Common causes:

- Session not paired → tell them to visit `/pair`.
- Network error → confirm `causalist.xyz` is reachable.
- Node id not found → list candidates with `causalist layer <best-guess>`.
