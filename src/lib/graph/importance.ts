import type { CausalGraph } from "./types";

export type ImportanceTier = "hot" | "core" | "leaf";

export interface Importance {
  /** Normalized 0..1 score (higher = more important). */
  score: number;
  /** Raw fan-in count. */
  fanIn: number;
  /** Raw fan-out count. */
  fanOut: number;
  /** Tier bucket. */
  tier: ImportanceTier;
}

export interface ImportanceSummary {
  byId: Map<string, Importance>;
  hotIds: Set<string>;
  coreIds: Set<string>;
}

/**
 * Rank nodes by a weighted-degree score, then assign tier buckets.
 * Fan-in (being depended on) weighs more than fan-out (depending on
 * others) because load-bearing files are more architecturally valuable
 * than leaf files that just consume.
 *
 * This is a deliberate approximation of PageRank: it catches hubs
 * accurately on small-to-medium graphs without the extra cost of
 * iterating to convergence.
 */
export function rankImportance(graph: CausalGraph): ImportanceSummary {
  const fanIn = new Map<string, number>();
  const fanOut = new Map<string, number>();
  for (const n of graph.nodes) {
    fanIn.set(n.id, 0);
    fanOut.set(n.id, 0);
  }
  for (const e of graph.edges) {
    if (fanIn.has(e.target)) fanIn.set(e.target, (fanIn.get(e.target) ?? 0) + 1);
    if (fanOut.has(e.source))
      fanOut.set(e.source, (fanOut.get(e.source) ?? 0) + 1);
  }

  // Weighted degree — double-weight fan-in.
  const raw = new Map<string, number>();
  let max = 0;
  for (const n of graph.nodes) {
    const score = 2 * (fanIn.get(n.id) ?? 0) + 1 * (fanOut.get(n.id) ?? 0);
    raw.set(n.id, score);
    if (score > max) max = score;
  }

  // Sort ids by descending raw score to apply percentile cuts.
  const byScoreDesc = [...raw.entries()].sort((a, b) => b[1] - a[1]);
  const total = byScoreDesc.length;
  const hotCut = Math.max(1, Math.ceil(total * 0.1));
  const coreCut = Math.max(hotCut, Math.ceil(total * 0.25));

  const hotIds = new Set<string>();
  const coreIds = new Set<string>();
  const tierById = new Map<string, ImportanceTier>();
  byScoreDesc.forEach(([id], i) => {
    let tier: ImportanceTier;
    if (i < hotCut) {
      tier = "hot";
      hotIds.add(id);
    } else if (i < coreCut) {
      tier = "core";
      coreIds.add(id);
    } else {
      tier = "leaf";
    }
    tierById.set(id, tier);
  });

  const byId = new Map<string, Importance>();
  for (const n of graph.nodes) {
    const r = raw.get(n.id) ?? 0;
    byId.set(n.id, {
      score: max > 0 ? r / max : 0,
      fanIn: fanIn.get(n.id) ?? 0,
      fanOut: fanOut.get(n.id) ?? 0,
      tier: tierById.get(n.id) ?? "leaf",
    });
  }

  return { byId, hotIds, coreIds };
}
