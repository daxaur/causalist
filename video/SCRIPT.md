# Causalist demo video — script + edit list

**Total target:** ~70 seconds. **Aspect:** 1920×1080 @ 30fps. **Style:** Anthropic-clean (cream `#faf9f5` ground, ink `#141413` text, magenta `#D24798` as the only accent). **Render quality:** h264 / crf 14 (visually lossless). **Sound:** ambient pad (very low) + a single soft bell hit on each hard cut. No music bed.

The Remotion compositions below are the **cuts**. Between them you slot **screen recordings** of the live product. The headline beat is **the live build view** — judges should see Causalist drawing the graph in real time within the first 15 seconds.

The PR/GitHub cuts from the previous edit are dropped. The story is "agents drawing the graph" + "Claude Code talking to the graph," not "agents opening pull requests."

---

## Edit timeline

| # | t | Source | Composition / SR | Length | Voiceover (optional) |
|---|---|---|---|---|---|
| 1 | 0.0 | Remotion | `cold-open` | 3.5s | *silent — let the logo draw itself in* |
| 2 | 3.5 | Remotion | `the-problem` | 2.5s | "Claude Code grepped four hundred eighty-seven files to find three affected tests." |
| 3 | 6.0 | Remotion | `the-pivot` | 2.5s | "There's a faster way." |
| 4 | 8.5 | Remotion | `bringing-causality-to-agents` | 3.0s | "Bringing causality closer to agents." |
| 5 | 11.5 | **Screen rec** | **SR-1: paste-url-and-build** | ~14s | *the live build view: nodes pop in, edges trace, agent chips pulse — this is the headline shot* |
| 6 | 25.5 | Remotion | `agents-on-graph` | 4.0s | "Four agents — Structure, Dependency, Semantic, Oracle — one graph." |
| 7 | 29.5 | **Screen rec** | **SR-2: select-and-ask** | ~12s | *select a few nodes, open the Agents tab, ask "trace the blast radius" — the swarm answers in graph terms* |
| 8 | 41.5 | Remotion | `claude-code-builds-for-you` | 3.5s | "Connect Claude Code, let it build for you." |
| 9 | 45.0 | **Screen rec** | **SR-3: claude-code-uses-mcp** | ~9s | *terminal: Claude Code calls a Causalist tool, returns a structured answer* |
|10 | 54.0 | Remotion | `closing` | 3.5s | "Causalist. Built with Claude Opus 4.7." |

**Total:** ~57s with the SRs paced as above. Tight, focused, every Remotion cut centered on the absolute middle of the frame.

---

## Screen-recording shot list

Three clips. Full 1920×1080. Cursor visible. Hide browser chrome (Cmd+Shift+F in Chrome, or record the inner window only).

### SR-1 · paste-url-and-build (~14s) — the headline shot

1. Empty browser on `causalist.xyz/app`. Click **New project**.
2. Paste a small public repo URL (e.g. `vercel/swr` or any ~25–50 file repo). Don't expand Advanced — the default Opus 4.7 across all four agents reads fastest.
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

# Render just the alternate opener if you want to A/B it:
npm run render:alt-opener

# Open the preview studio:
npm run studio
```

The production renders land in `video/out/final/`. Stitch them with the screen recordings in any editor (Final Cut, DaVinci Resolve, Premiere, iMovie).

## Audio

- **Bed:** no music. Optional very-low ambient pad at -38 dB.
- **Cut transitions:** a single soft bell hit (220 Hz triangle ping, 150 ms decay) at frame 0 of each Remotion cut. Skip on the screen-recording cuts.
- **Voiceover:** record dry, no reverb. Drop into the gaps. If you skip VO entirely, the text in the cuts carries the narrative.

## Brand notes

- **Singleton accent rule:** in any one frame, only one element is magenta. Never two — except in `agents-on-graph` and the LiveBuildView SR, where the four builder colors (magenta / blue / orange / green) are the whole point.
- **No gradients, no glow** (except the very soft halo on the magenta dot in `cold-open` and `closing`, and the brief pulse rings in `agents-on-graph`).
- **Hard cuts between cream scenes.** No dissolves or wipes between Remotion compositions. The bell hit handles the rhythm.
- **Don't speed up audio** to fit. Cut a beat from a screen recording instead.
