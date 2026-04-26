// Anthropic-clean palette + Causalist singleton magenta. Cream ground,
// ink for everything text-like, magenta as the only accent in any
// frame. Never gradients, never glow except very softly on the
// magenta dot.

export const COLORS = {
  cream: "#faf9f5",
  creamShadow: "#e8e6dc",
  ink: "#141413",
  midGray: "#b0aea5",
  hairline: "rgba(20, 20, 19, 0.08)",
  magenta: "#D24798", // desaturated 12% from #E838A4 for cream pairing
  magentaPure: "#E838A4", // for ink-dark scenes
  magentaSoft: "rgba(210, 71, 152, 0.08)",
};

export const TYPE = {
  display: '"Clash Display", "Styrene B", "Inter", system-ui, sans-serif',
  body: '"Tiempos Text", "Tiempos", Georgia, serif',
  mono: '"JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace',
};

// Standard ease curves — only ever use these so motion stays unified.
export const EASE = {
  outQuart: [0.165, 0.84, 0.44, 1] as const,
  outCubic: [0.22, 1, 0.36, 1] as const,
  inOut: [0.65, 0, 0.35, 1] as const,
};
