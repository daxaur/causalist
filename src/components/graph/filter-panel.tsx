"use client";

import { motion, AnimatePresence } from "motion/react";
import {
  CaretDown,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import {
  LAYER_COLORS,
  LAYER_LABELS,
  type CausalGraph,
  type CausalNode,
  type SemanticLayer,
} from "@/lib/graph/types";
import type { ImportanceSummary, ImportanceTier } from "@/lib/graph/importance";
import {
  countFacets,
  isAnyActive,
  type GraphFilters,
} from "@/lib/graph/filters";
import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

const LAYERS: SemanticLayer[] = [
  "infra",
  "data",
  "logic",
  "api",
  "ui",
  "test",
  "config",
];
const TIERS: ImportanceTier[] = ["hot", "core", "leaf"];
const KINDS = ["file", "module", "function", "type", "external"] as const;
const TIER_LABEL: Record<ImportanceTier, string> = {
  hot: "Hot · top 10%",
  core: "Core · top 25%",
  leaf: "Leaf · safe to refactor",
};

export function FilterPanel({
  graph,
  importance,
  filters,
  onToggleLayer,
  onToggleTier,
  onToggleKind,
  onToggleLanguage,
  onPatch,
  onClear,
  visibleCount,
  onClose,
}: {
  graph: CausalGraph;
  importance: ImportanceSummary;
  filters: GraphFilters;
  onToggleLayer: (v: SemanticLayer) => void;
  onToggleTier: (v: ImportanceTier) => void;
  onToggleKind: (v: NonNullable<CausalNode["kind"]>) => void;
  onToggleLanguage: (v: string) => void;
  onPatch: (p: Partial<GraphFilters>) => void;
  onClear: () => void;
  visibleCount: number;
  onClose?: () => void;
}) {
  const tierOf = useMemo(
    () => (id: string) => importance.byId.get(id)?.tier,
    [importance],
  );
  const counts = useMemo(() => countFacets(graph, tierOf), [graph, tierOf]);

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-white/5 bg-[#0C0611] text-white">
      <header className="flex items-center justify-between border-b border-white/5 px-3 py-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/50">
          Filters
        </span>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close filters"
            className="rounded p-1 text-white/40 hover:bg-white/5 hover:text-white"
          >
            <X size={11} />
          </button>
        )}
      </header>

      {/* Search */}
      <div className="border-b border-white/5 px-3 py-3">
        <div className="relative">
          <MagnifyingGlass
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/35"
          />
          <input
            id="filter-search-input"
            value={filters.q}
            onChange={(e) => onPatch({ q: e.target.value })}
            placeholder="Search label or summary"
            className="h-8 w-full rounded-md border border-white/10 bg-white/5 pl-7 pr-2 font-mono text-[11px] text-white placeholder:text-white/30 focus:border-[#E838A4]/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="border-b border-white/5 px-3 py-2.5 font-mono text-[10px] text-white/50">
        Showing{" "}
        <span className="text-white">
          {visibleCount}
        </span>{" "}
        / {graph.nodes.length}
      </div>

      <div className="flex-1 overflow-y-auto">
        <Facet title="Layer">
          {LAYERS.map((l) => (
            <FacetRow
              key={l}
              active={filters.layers.has(l)}
              onToggle={() => onToggleLayer(l)}
              label={LAYER_LABELS[l]}
              count={counts.layer.get(l) ?? 0}
              dotColor={LAYER_COLORS[l]}
            />
          ))}
        </Facet>

        <Facet title="Importance">
          {TIERS.map((t) => (
            <FacetRow
              key={t}
              active={filters.tiers.has(t)}
              onToggle={() => onToggleTier(t)}
              label={TIER_LABEL[t]}
              count={counts.tier.get(t) ?? 0}
              dotColor={
                t === "hot" ? "#E838A4" : t === "core" ? "#FBBF24" : "#94A3B8"
              }
            />
          ))}
        </Facet>

        <Facet title="Kind">
          {KINDS.map((k) => {
            const c = counts.kind.get(k) ?? 0;
            if (c === 0) return null;
            return (
              <FacetRow
                key={k}
                active={filters.kinds.has(k)}
                onToggle={() => onToggleKind(k)}
                label={k}
                count={c}
              />
            );
          })}
        </Facet>

        <Facet title="Language">
          {Array.from(counts.language.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([l, c]) => (
              <FacetRow
                key={l}
                active={filters.languages.has(l)}
                onToggle={() => onToggleLanguage(l)}
                label={l}
                count={c}
              />
            ))}
        </Facet>

        <Facet title="Path prefix">
          <div className="px-3 pb-2">
            <input
              value={filters.pathPrefix}
              onChange={(e) => onPatch({ pathPrefix: e.target.value })}
              placeholder="e.g. src/app/api"
              className="h-8 w-full rounded-md border border-white/10 bg-white/5 px-2 font-mono text-[10.5px] text-white placeholder:text-white/30 focus:border-[#E838A4]/50 focus:outline-none"
            />
          </div>
        </Facet>
      </div>

      {/* Footer */}
      <div className="border-t border-white/5 px-3 py-2.5">
        <button
          onClick={onClear}
          disabled={!isAnyActive(filters)}
          className="w-full rounded-md border border-white/10 bg-white/5 py-1.5 text-[11px] text-white/80 transition-colors enabled:hover:border-white/20 enabled:hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear all · C
        </button>
      </div>
    </aside>
  );
}

function Facet({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-white/5">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left"
      >
        <span className="font-mono text-[10px] uppercase tracking-wider text-white/40">
          {title}
        </span>
        <CaretDown
          size={9}
          className={cn(
            "text-white/30 transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden pb-1"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FacetRow({
  active,
  onToggle,
  label,
  count,
  dotColor,
}: {
  active: boolean;
  onToggle: () => void;
  label: string;
  count: number;
  dotColor?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "group flex w-full items-center justify-between px-3 py-1 text-left text-[11.5px] transition-colors",
        active ? "bg-white/5" : "hover:bg-white/3",
      )}
    >
      <span className="flex items-center gap-1.5 truncate">
        <span
          className={cn(
            "flex h-3 w-3 shrink-0 items-center justify-center rounded-sm border",
            active
              ? "border-[#E838A4] bg-[#E838A4]"
              : "border-white/20 bg-transparent",
          )}
        >
          {active && (
            <svg
              viewBox="0 0 8 8"
              className="h-2 w-2"
              fill="none"
              stroke="white"
              strokeWidth="1.6"
            >
              <path d="M1.5 4.5 L3 6 L6.5 2" strokeLinecap="round" />
            </svg>
          )}
        </span>
        {dotColor && (
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: dotColor }}
          />
        )}
        <span
          className={cn(
            "truncate",
            active ? "text-white" : "text-white/70",
          )}
        >
          {label}
        </span>
      </span>
      <span className="shrink-0 font-mono text-[9.5px] text-white/35">
        {count}
      </span>
    </button>
  );
}

export function FilterChipRow({
  filters,
  onRemoveLayer,
  onRemoveTier,
  onRemoveKind,
  onRemoveLanguage,
  onClearPath,
  onClearQ,
  onClearAll,
}: {
  filters: GraphFilters;
  onRemoveLayer: (v: SemanticLayer) => void;
  onRemoveTier: (v: ImportanceTier) => void;
  onRemoveKind: (v: NonNullable<CausalNode["kind"]>) => void;
  onRemoveLanguage: (v: string) => void;
  onClearPath: () => void;
  onClearQ: () => void;
  onClearAll: () => void;
}) {
  if (!isAnyActive(filters)) return null;
  return (
    <div className="pointer-events-auto flex flex-wrap items-center gap-1 rounded-md border border-white/10 bg-black/40 p-1 backdrop-blur">
      {filters.q && (
        <Chip label={`q: "${filters.q}"`} onRemove={onClearQ} />
      )}
      {[...filters.layers].map((l) => (
        <Chip
          key={`l-${l}`}
          label={`layer: ${l}`}
          onRemove={() => onRemoveLayer(l)}
        />
      ))}
      {[...filters.tiers].map((t) => (
        <Chip
          key={`t-${t}`}
          label={`tier: ${t}`}
          onRemove={() => onRemoveTier(t)}
        />
      ))}
      {[...filters.kinds].map((k) => (
        <Chip key={`k-${k}`} label={`kind: ${k}`} onRemove={() => onRemoveKind(k)} />
      ))}
      {[...filters.languages].map((x) => (
        <Chip key={`lg-${x}`} label={`lang: ${x}`} onRemove={() => onRemoveLanguage(x)} />
      ))}
      {filters.pathPrefix && (
        <Chip
          label={`path: ${filters.pathPrefix}`}
          onRemove={onClearPath}
        />
      )}
      <button
        onClick={onClearAll}
        className="ml-1 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-white/50 hover:bg-white/5 hover:text-white"
      >
        clear all
      </button>
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#E838A4]/30 bg-[#E838A4]/10 px-2 py-0.5 font-mono text-[10px] text-[#FF9CD9]">
      {label}
      <button
        onClick={onRemove}
        className="rounded hover:bg-white/10"
        aria-label={`Remove ${label}`}
      >
        <X size={8} />
      </button>
    </span>
  );
}
