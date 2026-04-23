// In-memory session → graph store. Same trade-off as the pair + stream
// buses: works for single-instance Vercel and local dev; swap for
// Upstash Redis when you need multi-instance. Keyed by sessionId, TTL
// 2 hours so a long agent session stays reachable but nothing leaks.

import type { CausalGraph } from "@/lib/graph/types";

interface StoredGraph {
  graph: CausalGraph;
  updatedAt: number;
}

const store = new Map<string, StoredGraph>();
const TTL_MS = 2 * 60 * 60 * 1000;
const GC_INTERVAL = 5 * 60 * 1000;

let lastGc = 0;
function maybeGc() {
  const now = Date.now();
  if (now - lastGc < GC_INTERVAL) return;
  lastGc = now;
  for (const [id, entry] of store) {
    if (now - entry.updatedAt > TTL_MS) store.delete(id);
  }
}

export function putSessionGraph(sessionId: string, graph: CausalGraph): void {
  maybeGc();
  store.set(sessionId, { graph, updatedAt: Date.now() });
}

export function getSessionGraph(sessionId: string): CausalGraph | null {
  maybeGc();
  const entry = store.get(sessionId);
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > TTL_MS) {
    store.delete(sessionId);
    return null;
  }
  return entry.graph;
}
