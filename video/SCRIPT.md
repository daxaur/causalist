# Causalist demo video — script + edit list

**Total target:** ~75 seconds. **Aspect:** 1920×1080 @ 30fps. **Style:** Anthropic-clean (cream `#faf9f5` ground, ink `#141413` text, magenta `#D24798` as the only accent). **Sound:** ambient pad (very low) + a single soft bell hit on each hard cut. No music bed.

The 10 Remotion compositions below are the **cuts**. Between them you slot **screen recordings** of the live product. Each cut is camera-locked; the screen recording sections are where the user sees motion.

---

## Edit timeline

| # | t  | Source            | Composition / SR   | Length | Voiceover (optional)                                                                                |
|---|----|-------------------|--------------------|--------|-----------------------------------------------------------------------------------------------------|
| 1 | 0.0  | Remotion          | `cold-open`        | 5.0s   | *silent — let the mark land*                                                                        |
| 2 | 5.0  | Remotion          | `the-problem`      | 3.0s   | "Claude Code grepped four hundred eighty-seven files to find three affected tests."                 |
| 3 | 8.0  | Remotion          | `the-pivot`        | 3.0s   | "There's a faster way."                                                                             |
| 4 | 11.0 | Remotion          | `section-map`      | 3.0s   | "Map any GitHub repo into a typed causal graph."                                                   |
| 5 | 14.0 | **Screen rec**    | **SR-1: paste-url-and-map** | ~7.0s  | *pause — let the four agents tick across the AgentRail in real time*                       |
| 6 | 21.0 | Remotion          | `four-agents`      | 3.0s   | "Four Claude Opus 4.7 agents. In parallel."                                                        |
| 7 | 24.0 | Remotion          | `ast-verified`     | 3.0s   | "Every edge AST-verified. No hallucinated call sites."                                              |
| 8 | 27.0 | Remotion          | `section-point`    | 3.0s   | "Point an agent at it: select, plan, ship."                                                         |
| 9 | 30.0 | **Screen rec**    | **SR-2: select-and-run-agent** | ~12.0s | *the agent streams findings; click Open PR*                                            |
|10 | 42.0 | Remotion          | `pr-opened`        | 3.0s   | "PR opened in forty-seven seconds." *(read whatever number SR-2 actually showed)*                   |
|11 | 45.0 | **Screen rec**    | **SR-3: real-PR-on-github** | ~5.0s  | *pan slowly down the diff*                                                                |
|12 | 50.0 | Remotion          | `section-connect`  | 3.0s   | "Two commands. Eleven graph-aware tools."                                                          |
|13 | 53.0 | **Screen rec**    | **SR-4: claude-code-uses-mcp** | ~10.0s | *Claude Code calls `affected_tests`, returns 3 of 340*                                |
|14 | 63.0 | Remotion          | `closing`          | 4.0s   | "Causalist. Open source. Built with Claude Opus 4.7."                                              |

**Total:** ~67–75s depending on screen-recording pacing. Aim under 75s — winning hackathon demos are tight.

---

## Screen-recording shot list

Record each of these as a separate clip, full 1920×1080. Mouse cursor visible. No browser chrome (use Cmd+Shift+F in Chrome to hide it, or record the inner window only).

### SR-1 · paste-url-and-map (~7s)

1. Empty browser on `causalist.xyz` → focus the URL input in the hero
2. Paste `vercel/next.js` (or any small repo). Hit ⏎.
3. Cut to `/app/owner/repo` page. The four-agent rail starts ticking. Graph nodes start populating.
4. End on the finished 3D galaxy.

### SR-2 · select-and-run-agent (~12s)

1. On `/app/preview/causalist`, click 3 magenta hot nodes (multi-select).
2. ⌘L to open the Agents tab.
3. Click the suggestion chip "Audit for bugs and propose fixes" — it pre-fills the composer.
4. Hit ⌘+↵.
5. Status cards stream in: "Read 3 files", "Reviewed `X`", "Patched `Y`".
6. Summary bubble appears.
7. "Open PR" button appears at the bottom — **don't click yet**, hold the frame for 1s.

### SR-3 · real-PR-on-github (~5s)

1. Cut to a real GitHub PR page on a repo you own.
2. Pan slowly down the file changes.
3. Show the PR description ending with "_Built with Claude Opus 4.7 · Causalist_".

### SR-4 · claude-code-uses-mcp (~10s)

1. Terminal. Show the prompt: `claude`.
2. Inside Claude Code, type: `what tests cover src/auth/login.ts in this repo?`
3. Tool calls fly by: `causalist tests` → JSON in / JSON out
4. Claude's answer arrives: "**3 tests** are affected: `auth.test.ts`, `session.test.ts`, `middleware.test.ts`."
5. Hold for 1s on the answer.

---

## Render the cuts

```bash
cd video
npm install                       # ~30 sec, one time

# render all 10 compositions to out/*.mp4
npm run render:all

# or one at a time, e.g.:
npx remotion render src/index.ts cold-open out/01-cold-open.mp4
npx remotion render src/index.ts the-problem out/02-the-problem.mp4
# ... etc.

# preview interactively in the browser:
npm run studio
```

The renders land in `video/out/`. Stitch them with the screen recordings in any editor (Final Cut, DaVinci Resolve, Premiere, even iMovie). Order them per the table above.

## Audio

- **Bed:** no music. Optional very-low ambient pad (e.g., `https://pixabay.com/music/ambient-soft-warm-pad`) at -38 dB.
- **Cut transitions:** a single soft bell hit (e.g., a 220 Hz triangle ping, 150 ms decay) at frame 0 of each Remotion cut. Skip on the screen-recording cuts.
- **Voiceover:** record dry, no reverb. Drop into the gaps in the table above. If you skip VO entirely, the text in the cuts carries the narrative.

## Brand notes

- **Singleton accent rule:** in any one frame, only one element is magenta. Never two.
- **No gradients, no glow** (except the very soft halo on the magenta dot in `cold-open` and `closing`).
- **Hard cuts between cream scenes.** No dissolves or wipes between Remotion compositions. The bell hit + the locked-frame settle handles the rhythm.
- **Don't speed up audio** to fit. Cut a beat from a screen recording instead.
