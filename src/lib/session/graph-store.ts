// Session → graph store. Supabase persistence with in-memory fallback.
// Keyed by sessionId, app-level 2-hour TTL.

import { serverSupabase } from "@/lib/supabase/client";
import type { CausalGraph } from "@/lib/graph/types";

interface StoredGraph {
  graph: CausalGraph;
  updatedAt: number;
}

const memory = new Map<string, StoredGraph>();
const TTL_MS = 2 * 60 * 60 * 1000;
const GC_INTERVAL = 5 * 60 * 1000;

let lastGc = 0;
function maybeGc() {
  const now = Date.now();
  if (now - lastGc < GC_INTERVAL) return;
  lastGc = now;
  for (const [id, entry] of memory) {
    if (now - entry.updatedAt > TTL_MS) memory.delete(id);
  }
}

export async function putSessionGraph(
  sessionId: string,
  graph: CausalGraph,
): Promise<void> {
  maybeGc();
  const sb = serverSupabase();
  if (sb) {
    const { error } = await sb.from("causalist_session_graphs").upsert({
      session_id: sessionId,
      graph,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(`session graph upsert: ${error.message}`);
    return;
  }
  memory.set(sessionId, { graph, updatedAt: Date.now() });
}

export async function getSessionGraph(
  sessionId: string,
): Promise<CausalGraph | null> {
  maybeGc();
  const sb = serverSupabase();
  if (sb) {
    const expiryCutoff = new Date(Date.now() - TTL_MS).toISOString();
    const { data } = await sb
      .from("causalist_session_graphs")
      .select("graph, updated_at")
      .eq("session_id", sessionId)
      .gt("updated_at", expiryCutoff)
      .maybeSingle();
    if (!data) return null;
    return data.graph as CausalGraph;
  }
  const entry = memory.get(sessionId);
  if (!entry) return null;
  if (Date.now() - entry.updatedAt > TTL_MS) {
    memory.delete(sessionId);
    return null;
  }
  return entry.graph;
}
