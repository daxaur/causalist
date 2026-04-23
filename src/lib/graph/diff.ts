import type { CausalGraph, CausalNode } from "./types";
import type { SyntheticCommit } from "./previews/commits";

export type NodeDiffState = "added" | "removed" | "modified" | "unchanged";
export type EdgeDiffState = "added" | "removed" | "unchanged";

export interface DiffOverlay {
  nodes: Map<string, NodeDiffState>;
  edges: Map<string, EdgeDiffState>;
  focusMode: boolean;
  summary: {
    added: number;
    removed: number;
    modified: number;
    edgesAdded: number;
    edgesRemoved: number;
    topChangedIds: string[]; // nodes with largest edge-degree delta
  };
}

/**
 * For canned previews, we simulate "what existed at commit X" by
 * treating commits as checkpoints that touched certain nodes. A node
 * is considered to "exist" at a commit if any commit at or before it
 * touched it. A node is "modified" at commit X if it was touched by
 * exactly that commit. A node is "added" at commit X if X is the
 * earliest commit to touch it.
 */
function touchedUpTo(
  commits: SyntheticCommit[],
  sha: string,
): { existing: Set<string>; firstSeen: Map<string, string> } {
  const existing = new Set<string>();
  const firstSeen = new Map<string, string>();
  // Commits assumed authored-newest-first; iterate oldest → newest
  const ordered = [...commits].reverse();
  for (const c of ordered) {
    for (const id of c.touched) {
      if (!firstSeen.has(id)) firstSeen.set(id, c.sha);
      existing.add(id);
    }
    if (c.sha === sha) break;
  }
  return { existing, firstSeen };
}

/** Edge id helper. */
const edgeKey = (source: string, target: string, kind: string) =>
  `${source}→${target}::${kind}`;

export function computeDiff(
  graph: CausalGraph,
  commits: SyntheticCommit[],
  baseSha: string,
  headSha: string,
): DiffOverlay {
  const base = touchedUpTo(commits, baseSha);
  const head = touchedUpTo(commits, headSha);

  // A node is "touched by HEAD" if headSha appears in any commit's
  // touched list up to and including head.
  const headCommit = commits.find((c) => c.sha === headSha);
  const baseCommit = commits.find((c) => c.sha === baseSha);
  const inRange = new Set<string>();
  if (headCommit && baseCommit) {
    // Walk commits from head down to (but not including) base
    const ordered = [...commits].reverse();
    const baseIdx = ordered.findIndex((c) => c.sha === baseSha);
    const headIdx = ordered.findIndex((c) => c.sha === headSha);
    const from = Math.min(baseIdx, headIdx) + 1;
    const to = Math.max(baseIdx, headIdx);
    for (let i = from; i <= to; i++) {
      for (const id of ordered[i].touched) inRange.add(id);
    }
  }

  const nodes = new Map<string, NodeDiffState>();
  for (const n of graph.nodes) {
    const inBase = base.existing.has(n.id);
    const inHead = head.existing.has(n.id);
    const modifiedInRange = inRange.has(n.id) && inBase && inHead;
    if (!inBase && inHead) nodes.set(n.id, "added");
    else if (inBase && !inHead) nodes.set(n.id, "removed");
    else if (modifiedInRange) nodes.set(n.id, "modified");
    else nodes.set(n.id, "unchanged");
  }

  const edges = new Map<string, EdgeDiffState>();
  let edgesAdded = 0;
  let edgesRemoved = 0;
  for (const e of graph.edges) {
    const key = edgeKey(e.source, e.target, e.kind);
    const srcState = nodes.get(e.source);
    const tgtState = nodes.get(e.target);
    // An edge is considered added/removed with its endpoints.
    if (srcState === "added" || tgtState === "added") {
      edges.set(key, "added");
      edgesAdded++;
    } else if (srcState === "removed" || tgtState === "removed") {
      edges.set(key, "removed");
      edgesRemoved++;
    } else {
      edges.set(key, "unchanged");
    }
  }

  // Count summary
  let added = 0;
  let removed = 0;
  let modified = 0;
  const degreeDelta = new Map<string, number>();
  for (const [id, state] of nodes) {
    if (state === "added") added++;
    else if (state === "removed") removed++;
    else if (state === "modified") modified++;
  }
  for (const e of graph.edges) {
    const state = edges.get(edgeKey(e.source, e.target, e.kind));
    if (state !== "unchanged") {
      const delta = state === "added" ? 1 : -1;
      degreeDelta.set(e.source, (degreeDelta.get(e.source) ?? 0) + delta);
      degreeDelta.set(e.target, (degreeDelta.get(e.target) ?? 0) + delta);
    }
  }
  const topChangedIds = [...degreeDelta.entries()]
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, 3)
    .map(([id]) => id);

  const focusMode = edgesAdded + edgesRemoved > 40;
  return {
    nodes,
    edges,
    focusMode,
    summary: { added, removed, modified, edgesAdded, edgesRemoved, topChangedIds },
  };
}

// Helpers for color lookups — GitHub Primer diff hues
export const DIFF_HEX = {
  added: "#3FB950",
  removed: "#F85149",
  modified: "#D29922",
  unchanged: "#30363D",
} as const;

export function nodeDiffColor(state: NodeDiffState, fallback: string): string {
  if (state === "unchanged") return fallback;
  return DIFF_HEX[state];
}

export function nodeById(
  graph: CausalGraph,
  id: string,
): CausalNode | undefined {
  return graph.nodes.find((n) => n.id === id);
}

export { edgeKey };
