"use client";

import { Terminal, TypingAnimation } from "@/components/ui/terminal";
import type { CausalGraph } from "@/lib/graph/types";

/**
 * Errors mode — shows recent Claude Code tool failures keyed to graph
 * nodes. Canned previews have no errors; we show an empty state with a
 * typing-animation terminal. Real repos will wire into the stream bus.
 */
export function ErrorsView({ graph }: { graph: CausalGraph }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-8 w-full">
        <Terminal className="mx-auto max-w-xl">
          <TypingAnimation className="text-emerald-400">
            {`> causalist tail --errors ${graph.repo}`}
          </TypingAnimation>
          <TypingAnimation delay={900} className="text-white/70">
            Subscribed to Claude Code session stream…
          </TypingAnimation>
          <TypingAnimation delay={1600} className="text-white/70">
            Scanned 0 tool failures in the last 24h.
          </TypingAnimation>
          <TypingAnimation delay={2200} className="text-[#D97757]">
            ✓ clean — ship it.
          </TypingAnimation>
        </Terminal>
      </div>
      <h2 className="mb-2 font-display text-xl font-medium tracking-tight">
        No recent errors
      </h2>
      <p className="max-w-md text-sm text-neutral-500">
        When a Claude Code tool call errors in a live session, the file lights
        up red on the graph and lands here with a traceback.
      </p>
    </div>
  );
}
