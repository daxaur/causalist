"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  CausalGraph,
  CausalNode,
  SemanticLayer,
} from "./types";
import type { ImportanceTier } from "./importance";

export interface GraphFilters {
  q: string;
  layers: Set<SemanticLayer>;
  tiers: Set<ImportanceTier>;
  kinds: Set<NonNullable<CausalNode["kind"]>>;
  languages: Set<string>;
  pathPrefix: string;
}

export function emptyFilters(): GraphFilters {
  return {
    q: "",
    layers: new Set(),
    tiers: new Set(),
    kinds: new Set(),
    languages: new Set(),
    pathPrefix: "",
  };
}

export function isAnyActive(f: GraphFilters): boolean {
  return (
    f.q.length > 0 ||
    f.layers.size > 0 ||
    f.tiers.size > 0 ||
    f.kinds.size > 0 ||
    f.languages.size > 0 ||
    f.pathPrefix.length > 0
  );
}

/**
 * Visible = passes every active facet. Empty facet = match-all (the
 * obvious default for beginners; "clear" means "no filter" here).
 */
export function nodeMatches(
  n: CausalNode,
  f: GraphFilters,
  tierOf?: (id: string) => ImportanceTier | undefined,
): boolean {
  if (f.layers.size > 0 && !f.layers.has(n.layer)) return false;
  if (f.tiers.size > 0) {
    const tier = tierOf?.(n.id);
    if (!tier || !f.tiers.has(tier)) return false;
  }
  if (f.kinds.size > 0 && (!n.kind || !f.kinds.has(n.kind))) return false;
  if (f.languages.size > 0 && (!n.language || !f.languages.has(n.language)))
    return false;
  if (f.pathPrefix && (!n.path || !n.path.startsWith(f.pathPrefix))) {
    return false;
  }
  if (f.q) {
    const q = f.q.toLowerCase();
    const hay = `${n.label} ${n.path ?? ""} ${n.summary ?? ""}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

/** Build per-facet counts for the side panel. */
export interface FacetCounts {
  layer: Map<SemanticLayer, number>;
  tier: Map<ImportanceTier, number>;
  kind: Map<string, number>;
  language: Map<string, number>;
}

export function countFacets(
  graph: CausalGraph,
  tierOf: (id: string) => ImportanceTier | undefined,
): FacetCounts {
  const layer = new Map<SemanticLayer, number>();
  const tier = new Map<ImportanceTier, number>();
  const kind = new Map<string, number>();
  const language = new Map<string, number>();
  for (const n of graph.nodes) {
    layer.set(n.layer, (layer.get(n.layer) ?? 0) + 1);
    const t = tierOf(n.id);
    if (t) tier.set(t, (tier.get(t) ?? 0) + 1);
    if (n.kind) kind.set(n.kind, (kind.get(n.kind) ?? 0) + 1);
    if (n.language) language.set(n.language, (language.get(n.language) ?? 0) + 1);
  }
  return { layer, tier, kind, language };
}

// ── URL state ────────────────────────────────────────────────────

export function toSearchParams(f: GraphFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.layers.size > 0) p.set("layer", Array.from(f.layers).join(","));
  if (f.tiers.size > 0) p.set("tier", Array.from(f.tiers).join(","));
  if (f.kinds.size > 0) p.set("kind", Array.from(f.kinds).join(","));
  if (f.languages.size > 0) p.set("lang", Array.from(f.languages).join(","));
  if (f.pathPrefix) p.set("path", f.pathPrefix);
  return p;
}

export function fromSearchParams(sp: URLSearchParams): GraphFilters {
  const f = emptyFilters();
  f.q = sp.get("q") ?? "";
  const layer = sp.get("layer");
  if (layer)
    f.layers = new Set(
      layer.split(",").filter(Boolean) as SemanticLayer[],
    );
  const tier = sp.get("tier");
  if (tier)
    f.tiers = new Set(tier.split(",").filter(Boolean) as ImportanceTier[]);
  const kind = sp.get("kind");
  if (kind)
    f.kinds = new Set(
      kind.split(",").filter(Boolean) as NonNullable<CausalNode["kind"]>[],
    );
  const lang = sp.get("lang");
  if (lang) f.languages = new Set(lang.split(",").filter(Boolean));
  f.pathPrefix = sp.get("path") ?? "";
  return f;
}

// ── Hook ─────────────────────────────────────────────────────────

/**
 * URL-synced filter state. Reads query on mount; writes debounced to
 * `?q=...&layer=...` on every filter change. Uses replaceState so we
 * don't pollute the back stack.
 */
export function useGraphFilters(): {
  filters: GraphFilters;
  setFilters: (next: GraphFilters) => void;
  patch: (p: Partial<GraphFilters>) => void;
  toggleSetValue: <K extends "layers" | "tiers" | "kinds" | "languages">(
    key: K,
    value: GraphFilters[K] extends Set<infer V> ? V : never,
  ) => void;
  clear: () => void;
} {
  const [filters, setFilters] = useState<GraphFilters>(() => {
    if (typeof window === "undefined") return emptyFilters();
    return fromSearchParams(new URLSearchParams(window.location.search));
  });

  const writeTimer = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = window.setTimeout(() => {
      const p = toSearchParams(filters);
      const qs = p.toString();
      const target =
        window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash;
      window.history.replaceState(null, "", target);
    }, 200);
    return () => {
      if (writeTimer.current) clearTimeout(writeTimer.current);
    };
  }, [filters]);

  const patch = useCallback((p: Partial<GraphFilters>) => {
    setFilters((prev) => ({ ...prev, ...p }));
  }, []);

  const toggleSetValue = useCallback(
    <K extends "layers" | "tiers" | "kinds" | "languages">(
      key: K,
      value: GraphFilters[K] extends Set<infer V> ? V : never,
    ) => {
      setFilters((prev) => {
        const prevSet = prev[key] as Set<unknown>;
        const next = new Set(prevSet);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return { ...prev, [key]: next as GraphFilters[K] };
      });
    },
    [],
  );

  const clear = useCallback(() => setFilters(emptyFilters()), []);

  return { filters, setFilters, patch, toggleSetValue, clear };
}

/** Keyboard-level alias for `f` to toggle a drawer, `/` to focus
 * search, `c` to clear, `?` to open help. Provided as a hook so host
 * components can wire their own drawer state. */
export function useGraphKeyboard({
  onToggleFilters,
  onFocusSearch,
  onOpenPalette,
  onHelp,
  onClear,
}: {
  onToggleFilters?: () => void;
  onFocusSearch?: () => void;
  onOpenPalette?: () => void;
  onHelp?: () => void;
  onClear?: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;

      if (e.key === "/" && onFocusSearch) {
        e.preventDefault();
        onFocusSearch();
      } else if (e.key.toLowerCase() === "f" && onToggleFilters && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onToggleFilters();
      } else if (e.key === "?" && onHelp) {
        e.preventDefault();
        onHelp();
      } else if (e.key.toLowerCase() === "c" && onClear && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onClear();
      } else if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "k" &&
        onOpenPalette
      ) {
        e.preventDefault();
        onOpenPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onToggleFilters, onFocusSearch, onOpenPalette, onHelp, onClear]);
}

export function useVisibleIds(
  graph: CausalGraph,
  filters: GraphFilters,
  tierOf: (id: string) => ImportanceTier | undefined,
): Set<string> {
  return useMemo(() => {
    if (!isAnyActive(filters)) {
      return new Set(graph.nodes.map((n) => n.id));
    }
    const out = new Set<string>();
    for (const n of graph.nodes) {
      if (nodeMatches(n, filters, tierOf)) out.add(n.id);
    }
    return out;
  }, [graph, filters, tierOf]);
}
