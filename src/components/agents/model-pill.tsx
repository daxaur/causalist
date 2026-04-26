"use client";

// Claude-branded model picker. Three call-sites today: the agent panel
// composer, the New Project modal's Advanced accordion, and the
// LiveBuildView per-agent strip. The trigger shows the magenta-tinted
// Claude mark + the model's short name + a chevron; clicking opens a
// hand-rolled popover (we don't pull in a DropdownMenu primitive for
// just this — shadcn isn't installed and the surface is small).

import { useEffect, useRef, useState } from "react";
import { CaretDown, CheckCircle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export interface ModelOption {
  id: string;
  label: string;
  /** One-word vibe — "best" / "fast" / "cheap". */
  tag: string;
}

export const DEFAULT_MODELS: ModelOption[] = [
  { id: "claude-opus-4-7", label: "Opus 4.7", tag: "best" },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6", tag: "fast" },
  { id: "claude-haiku-4-5", label: "Haiku 4.5", tag: "cheap" },
];

interface Props {
  value: string;
  onChange: (id: string) => void;
  options?: ModelOption[];
  /** Visual size — `sm` is the inline composer footer; `md` is the
   *  modal Advanced row + LiveBuildView strip. */
  size?: "sm" | "md";
  /** Disable interaction (e.g. mid-stream when restart isn't supported). */
  disabled?: boolean;
  className?: string;
}

export function ModelPill({
  value,
  onChange,
  options = DEFAULT_MODELS,
  size = "sm",
  disabled,
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Click-outside / escape to dismiss.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current =
    options.find((o) => o.id === value) ?? options[0];

  const sm = size === "sm";

  return (
    <div ref={wrapRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        onClick={() => !disabled && setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        className={cn(
          "inline-flex w-full items-center justify-between gap-1.5 whitespace-nowrap rounded-md border bg-white font-mono text-neutral-700 transition-colors",
          sm ? "h-7 px-2 text-[11px]" : "h-8 px-2.5 text-[12px]",
          disabled
            ? "cursor-not-allowed border-neutral-200 opacity-60"
            : open
              ? "border-accent-magenta/60 text-neutral-900"
              : "border-neutral-200 hover:border-neutral-300 hover:text-neutral-900",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/claude-mark.svg"
          alt=""
          aria-hidden
          className={cn("shrink-0", sm ? "h-3 w-3" : "h-3.5 w-3.5")}
          style={{
            // Tint the mark in brand magenta so it reads as part of the pill.
            filter:
              "invert(34%) sepia(93%) saturate(2200%) hue-rotate(298deg) brightness(96%) contrast(94%)",
          }}
        />
        <span className="shrink-0">{current.label}</span>
        <CaretDown size={sm ? 9 : 10} className="shrink-0 opacity-50" />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[180px] overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-lg shadow-black/5"
        >
          {options.map((o) => {
            const active = o.id === value;
            return (
              <li key={o.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(o.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-3 py-2 text-[12px] transition-colors hover:bg-neutral-50",
                    active && "text-neutral-900",
                  )}
                >
                  <span className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/claude-mark.svg"
                      alt=""
                      aria-hidden
                      className="h-3.5 w-3.5"
                      style={{
                        filter:
                          "invert(34%) sepia(93%) saturate(2200%) hue-rotate(298deg) brightness(96%) contrast(94%)",
                      }}
                    />
                    <span className="font-mono text-[12px]">{o.label}</span>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                      · {o.tag}
                    </span>
                  </span>
                  {active && (
                    <CheckCircle
                      size={11}
                      weight="fill"
                      className="text-accent-magenta"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
