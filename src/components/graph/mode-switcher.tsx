"use client";

import {
  Article,
  Chat,
  Cube,
  GitBranch,
  Warning,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type PreviewMode = "graph" | "explainer" | "errors" | "changes" | "ask";

const MODES: {
  key: PreviewMode;
  label: string;
  icon: React.ReactNode;
}[] = [
  { key: "graph", label: "Graph", icon: <Cube size={13} weight="duotone" /> },
  {
    key: "changes",
    label: "Changes",
    icon: <GitBranch size={13} weight="duotone" />,
  },
  { key: "ask", label: "Ask", icon: <Chat size={13} weight="duotone" /> },
];

// Unused modes intentionally suppressed from the default switcher —
// Explainer and Errors felt incoherent alongside Graph and Ask. Kept
// as a type so other call sites can still render them standalone.
void Article;
void Warning;

export function ModeSwitcher({
  mode,
  onChange,
}: {
  mode: PreviewMode;
  onChange: (m: PreviewMode) => void;
}) {
  return (
    <div className="pointer-events-auto inline-flex items-center gap-0.5 rounded-full border border-neutral-200 bg-white/95 p-1 shadow-sm backdrop-blur">
      {MODES.map((m) => {
        const active = mode === m.key;
        return (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            aria-pressed={active}
            className={cn(
              "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors",
              active
                ? "bg-neutral-900 text-white"
                : "text-neutral-500 hover:text-neutral-900",
            )}
          >
            {m.icon}
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
