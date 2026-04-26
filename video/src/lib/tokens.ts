// Anthropic-clean palette + Causalist singleton magenta. Cream ground,
// ink for everything text-like, magenta as the only accent in any
// frame. Never gradients, never glow except very softly on the
// magenta dot.

export const COLORS = {
  cream: "#faf9f5",
  creamShadow: "#e8e6dc",
  ink: "#141413",
  // Captions: previous "midGray" (#b0aea5) was too light against cream
  // and the user couldn't read it from a distance. Bumped to a
  // proper neutral that holds at small sizes but stays subordinate
  // to the headline.
  midGray: "#5a554c",
  // Soft tone for background hairlines + ghost details.
  softGray: "#9a948a",
  hairline: "rgba(20, 20, 19, 0.08)",
  magenta: "#D24798", // desaturated 12% from #E838A4 for cream pairing
  magentaPure: "#E838A4", // for ink-dark scenes
  magentaSoft: "rgba(210, 71, 152, 0.08)",
};

// Brand fonts — pinned to the same families the web app loads from
// Fontshare (see src/app/layout.tsx). Clash Display for headlines,
// Satoshi for body + captions. No mono — the prior JetBrains Mono
// captions read as code, not brand. If a Satoshi weight isn't
// available the system sans fallback handles it cleanly.
export const TYPE = {
  display: '"Clash Display", "Satoshi", ui-sans-serif, system-ui, sans-serif',
  // Body uses Satoshi too — the previous Tiempos serif had nothing
  // to do with the actual product UI.
  body: '"Satoshi", "Clash Display", ui-sans-serif, system-ui, sans-serif',
  // Mono retained for tiny brand markers (eyebrows / metadata).
  mono: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
};

// Standard ease curves — only ever use these so motion stays unified.
export const EASE = {
  outQuart: [0.165, 0.84, 0.44, 1] as const,
  outCubic: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
};
