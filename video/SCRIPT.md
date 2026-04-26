# Causalist demo video — script + edit list

**Total target:** ~58 seconds. **Aspect:** 1920×1080 @ 30fps. **Style:** Anthropic-clean (cream `#faf9f5` ground, ink `#141413` text, magenta `#D24798` as the only accent). **Render quality:** h264 / crf 14. **Sound:** ambient pad (very low) + a single soft bell hit on each hard cut. No music bed.

**Strategic note:** The video opens with a positive thesis — never frames any specific tool as the problem. The story arc: *code is causal → agents work better with the graph → here's our graph being built → pair it with Claude Code.* Claude Code shows up only in the partnership beat, and Causalist is positioned as "the graph that makes Claude Code more powerful," never the alternative to it.

---

## Edit timeline

| # | t | Source | Composition / SR | Length | Voiceover (optional) |
|---|---|---|---|---|---|
| 1 | 0.0 | Remotion | `cold-open` | 3.5s | *silent — let the logo draw itself in* |
| 2 | 3.5 | Remotion | `see-the-shape` | 3.5s | "See what your code actually does. Not what it looks like in a file tree — the actual graph behind it." |
| 3 | 7.0 | Remotion | `code-is-causal` | 3.0s | "Every codebase is a graph. Files depend on files. Changes ripple." |
| 4 | 10.0 | Remotion | `agents-need-graphs` | 3.0s | "Agents work better with the graph." |
| 5 | 13.0 | Remotion | `bringing-causality-to-agents` | 3.0s | "Bringing causality closer to agents." |
| 6 | 16.0 | **Screen rec** | **SR-1: paste-url-and-build** | ~14s | *the live build view: nodes pop in, edges trace, agent chips pulse — pay off the thesis with the live demo* |
| 7 | 30.0 | Remotion | `agents-on-graph` | 4.0s | "Four agents — Structure, Dependency, Semantic, Oracle — one graph." |
| 8 | 34.0 | **Screen rec** | **SR-2: select-and-ask** | ~12s | *select a few nodes, ask "trace the blast radius" — the swarm answers in graph terms* |
| 9 | 46.0 | Remotion | `claude-code-builds-for-you` | 3.5s | "Pair it with Claude Code. MCP server, CLI, eleven graph-aware tools." |
|10 | 49.5 | **Screen rec** | **SR-3: claude-code-uses-mcp** | ~9s | *terminal: Claude Code calls a Causalist tool, returns a structured answer* |
|11 | 58.5 | Remotion | `closing` | 3.5s | "Causalist. Built with Claude Opus 4.7." |

**Total:** ~62s. Tight, focused, every Remotion cut centered on the absolute middle of the frame. The new `see-the-shape` cut sits right after the brand opener so the thesis lands before any setup beats.

### Screen-recording cut points — quick reference

| After cut | Insert | What it pays off |
|---|---|---|
| Cut 5 (`bringing-causality-to-agents`) | **SR-1: paste-url-and-build** | The thesis lands with the live build view drawing itself. |
| Cut 7 (`agents-on-graph`) | **SR-2: select-and-ask** | The "four agents, one graph" headline lands with the live agent swarm answering in graph terms. |
| Cut 9 (`claude-code-builds-for-you`) | **SR-3: claude-code-uses-mcp** | The "pair it with Claude Code" line lands with the actual terminal demo. |

### Render the v2 cut

```bash
cd video
npm run render:v2     # → out/v2/*.mp4 at h264 crf 14
```

---

## Screen-recording shot list

Three clips. Full 1920×1080. Cursor visible. Hide browser chrome (Cmd+Shift+F in Chrome, or record the inner window only).

### SR-1 · paste-url-and-build (~14s) — the headline shot

1. Empty browser on `causalist.xyz/app`. Click **New project**.
2. Paste a small public repo URL (e.g. `vercel/swr` or any ~25–50 file repo).
3. Click **Map it**. Land on the LiveBuildView.
4. Watch nodes pop in (Structure chip pulsing magenta), then edges start tracing (Dependency chip pulsing blue), then summaries land (Semantic chip orange). Oracle finishes the synthesis (green check).
5. Hold for ~1.5s on the completed graph before cutting away.

### SR-2 · select-and-ask (~12s)

1. On `/app/preview/causalist`, click 3 magenta hot nodes (multi-select).
2. ⌘L to open the Agents tab.
3. Click suggestion chip "Trace the blast radius of these nodes" — pre-fills composer.
4. Raise the swarm picker to ×3 (three causal-lens avatars light up).
5. Hit ⌘+↵.
6. Per-agent chips appear and pulse. Findings stream back, attributed by agent color.
7. Hold for 1.5s on the run summary.

### SR-3 · claude-code-uses-mcp (~9s)

1. Terminal. Show the prompt: `claude`.
2. Inside Claude Code, type: `what's the blast radius of src/lib/auth.ts in this repo?`
3. Tool calls fly by: `causalist blast_radius` → JSON in / JSON out.
4. Claude's answer arrives: a paragraph naming the affected files.
5. Hold for 1s on the answer.

---

## Render the cuts

```bash
cd video
npm install            # one-time, ~30s

# Render the production cuts in story order to out/final/*.mp4
npm run render:final

# Open the preview studio:
npm run studio
```

The production renders land in `video/out/final/`. Stitch them with the screen recordings in any editor.

## Audio

- **Bed:** no music. Optional very-low ambient pad at -38 dB.
- **Cut transitions:** a single soft bell hit (220 Hz triangle ping, 150 ms decay) at frame 0 of each Remotion cut. Skip on the screen-recording cuts.
- **Voiceover:** record dry, no reverb. Drop into the gaps. If you skip VO entirely, the text in the cuts carries the narrative.

## Brand notes

- **Singleton accent rule:** in any one frame, only one element is magenta. Never two — except in `agents-on-graph` and the LiveBuildView SR, where the four builder colors (magenta / blue / orange / green) are the whole point.
- **No gradients, no glow** (except the very soft halo on the magenta dot in `cold-open` and `closing`).
- **Hard cuts between cream scenes.** No dissolves or wipes between Remotion compositions. The bell hit handles the rhythm.
- **Strategic positioning:** never name a competing tool. The story is what graphs unlock for agents — not what the absence of graphs costs them.
