"use client";

import { AnimatePresence, motion } from "motion/react";
import { Keyboard, X } from "@phosphor-icons/react";

type Shortcut = { keys: string[]; label: string };

const SECTIONS: { title: string; items: Shortcut[] }[] = [
  {
    title: "Navigate",
    items: [
      { keys: ["j", "↓"], label: "Next node (importance rank)" },
      { keys: ["k", "↑"], label: "Previous node" },
      { keys: ["["], label: "Back in history" },
      { keys: ["]"], label: "Forward in history" },
      { keys: ["."], label: "Toggle focus on selection" },
      { keys: ["Esc"], label: "Clear selection / close panel" },
    ],
  },
  {
    title: "Find",
    items: [
      { keys: ["/"], label: "Focus search" },
      { keys: ["⌘", "K"], label: "Command palette" },
      { keys: ["f"], label: "Toggle filters" },
      { keys: ["c"], label: "Clear all filters" },
    ],
  },
  {
    title: "Export",
    items: [
      { keys: ["⌘", "K", "→", "Export PNG"], label: "Snapshot canvas" },
      { keys: ["⌘", "K", "→", "Export JSON"], label: "Download graph JSON" },
      { keys: ["⌘", "K", "→", "Copy prompt"], label: "Selection → Claude Code prompt" },
    ],
  },
];

export function HelpOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            role="dialog"
            aria-label="Keyboard shortcuts"
            className="relative w-[min(640px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
              <div className="flex items-center gap-2 text-neutral-900">
                <Keyboard size={15} weight="duotone" />
                <span className="font-display text-sm font-medium tracking-tight">
                  Keyboard shortcuts
                </span>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X size={14} />
              </button>
            </header>
            <div className="grid grid-cols-1 gap-6 px-5 py-5 sm:grid-cols-3">
              {SECTIONS.map((section) => (
                <section key={section.title}>
                  <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-400">
                    {section.title}
                  </div>
                  <ul className="space-y-2">
                    {section.items.map((item, i) => (
                      <li
                        key={i}
                        className="flex items-start justify-between gap-3 text-[12px]"
                      >
                        <span className="text-neutral-600">{item.label}</span>
                        <span className="flex shrink-0 items-center gap-1">
                          {item.keys.map((k, j) => (
                            <kbd
                              key={j}
                              className="inline-flex min-w-[18px] items-center justify-center rounded-sm border border-neutral-200 bg-neutral-50 px-1 py-[1px] font-mono text-[10px] text-neutral-700"
                            >
                              {k}
                            </kbd>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <footer className="border-t border-neutral-100 bg-neutral-50/60 px-5 py-3 font-mono text-[11px] text-neutral-500">
              Press{" "}
              <kbd className="rounded-sm border border-neutral-200 bg-white px-1 font-mono text-[10px]">
                ?
              </kbd>{" "}
              anywhere to open this panel ·{" "}
              <kbd className="rounded-sm border border-neutral-200 bg-white px-1 font-mono text-[10px]">
                Esc
              </kbd>{" "}
              to close.
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
