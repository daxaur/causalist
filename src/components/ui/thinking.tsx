"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Rotating gerund — Claude Code's signature "word, not spinner"
 * pattern. Cycles every 3s with a 150ms cross-fade. Default verbs
 * are graph-specific but pass your own for any context.
 */
const DEFAULT_VERBS = [
  "Synthesising",
  "Linking",
  "Tracing",
  "Inferring",
  "Resolving",
];

export function RotatingVerb({
  verbs = DEFAULT_VERBS,
  intervalMs = 3000,
  className,
}: {
  verbs?: string[];
  intervalMs?: number;
  className?: string;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (verbs.length <= 1) return;
    const id = setInterval(() => setI((x) => (x + 1) % verbs.length), intervalMs);
    return () => clearInterval(id);
  }, [verbs, intervalMs]);
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={verbs[i]}
        initial={{ opacity: 0, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -2 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
        className={cn("inline-block", className)}
      >
        {verbs[i]}
      </motion.span>
    </AnimatePresence>
  );
}

/**
 * Three pulsing dots after a label — the "Claude is thinking…"
 * pattern. Use for any streaming-agent state where you want a
 * calm, editorial heartbeat.
 */
export function ThinkingDots({
  label = "Thinking",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[12px] text-neutral-600",
        className,
      )}
    >
      <span>{label}</span>
      <span className="flex gap-[2px]">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-1 w-1 rounded-full bg-neutral-500"
            animate={{ opacity: [0.25, 1, 0.25], y: [0, -1.5, 0] }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.15,
            }}
          />
        ))}
      </span>
    </span>
  );
}

/**
 * Magenta version — use for hero / primary status states.
 */
export function ThinkingDotsAccent({
  label = "Thinking",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[12px] text-accent-magenta",
        className,
      )}
    >
      <span>{label}</span>
      <span className="flex gap-[2px]">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-1 w-1 rounded-full bg-accent-magenta"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.17,
            }}
          />
        ))}
      </span>
    </span>
  );
}

/**
 * A single token being typed, rendered as a subtle animated caret.
 * Pair with streamed text to signal "more coming."
 */
export function StreamingCaret() {
  return (
    <motion.span
      className="ml-0.5 inline-block h-[1em] w-[2px] align-[-2px] bg-accent-magenta"
      animate={{ opacity: [0.9, 0.2, 0.9] }}
      transition={{ duration: 1.0, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
