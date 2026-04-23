// Shareable graph store. Always uses Supabase — "no-DB" fallback
// doesn't make sense for shares (they have to be addressable).

import { serverSupabase } from "@/lib/supabase/client";
import type { CausalGraph } from "@/lib/graph/types";

export interface ShareRecord {
  id: string;
  owner: string | null;
  repo: string;
  title: string | null;
  graph: CausalGraph;
  viewCount: number;
  createdAt: string;
}

export async function createShare(input: {
  id: string;
  owner?: string;
  repo: string;
  title?: string;
  graph: CausalGraph;
}): Promise<void> {
  const sb = serverSupabase();
  if (!sb) throw new Error("Supabase not configured (SUPABASE_SERVICE_ROLE_KEY missing)");
  const { error } = await sb.from("causalist_shares").insert({
    id: input.id,
    owner: input.owner ?? null,
    repo: input.repo,
    title: input.title ?? null,
    graph: input.graph,
  });
  if (error) throw new Error(`share insert: ${error.message}`);
}

export async function getShare(id: string): Promise<ShareRecord | null> {
  const sb = serverSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("causalist_shares")
    .select("id, owner, repo, title, graph, view_count, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  // Fire-and-forget view increment. RPCs return a thenable but not a
  // rejecting promise — call .then(noop) to silence any logger.
  sb.rpc("increment_causalist_share_view", { share_id: id }).then(() => {});
  return {
    id: data.id,
    owner: data.owner,
    repo: data.repo,
    title: data.title,
    graph: data.graph as CausalGraph,
    viewCount: data.view_count,
    createdAt: data.created_at,
  };
}
