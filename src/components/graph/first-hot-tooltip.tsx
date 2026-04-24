"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Fire, X } from "@phosphor-icons/react";

const SEEN_KEY = "causalist:tooltip:first-hot-v1";

/**
 * One-shot tooltip that fires the first time a user sees a HOT node
 * in the viewer. Explains what HOT means, then disappears forever.
 * Triggered via props.enabled; self-dismissing after 8s or on click.
 */
export function FirstHotTooltip({
  enabled,
  hotCount,
  rightOffset = 16,
}: {
  enabled: boolean;
  hotCount: number;
  /** Pixel offset from the right edge — lets the caller shift when a side panel is open. */
  rightOffset?: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled || hotCount === 0) return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(SEEN_KEY)) return;
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, [enabled, hotCount]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => dismiss(), 8500);
    return () => clearTimeout(t);
  }, [visible]);

  const dismiss = () => {
    setVisible(false);
    try {
      window.localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch {
      // ignore
    }
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          style={{ right: `${rightOffset}px` }}
          className="pointer-events-auto absolute top-28 z-30 flex max-w-[280px] items-start gap-2.5 rounded-lg border border-accent-magenta/30 bg-white/95 p-3 shadow-lg shadow-black/5 backdrop-blur-xl"
        >
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-magenta/15">
            <Fire size={10} weight="fill" className="text-accent-magenta" />
          </div>
          <div className="min-w-0 text-[11px] leading-[1.5] text-neutral-600">
            <div className="mb-0.5 font-mono text-[9px] uppercase tracking-wider text-accent-magenta">
              HOT · load-bearing
            </div>
            The larger, brighter nodes are the top 10% most depended-on
            files. Changing one ripples through many others — click any
            to see the blast radius.
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="-m-1 shrink-0 rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
          >
            <X size={10} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
