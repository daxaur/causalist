import type { CausalGraph } from "@/lib/graph/types";

/**
 * An entry the user has saved to their local library. The graph
 * payload is split out in storage so the lightweight index can be
 * loaded quickly on cold-start without pulling in every full graph.
 */
export interface LibraryEntry {
  id: string; // nanoid
  owner: string;
  repo: string;
  nickname?: string;
  graph: CausalGraph;
  sourceCommitSha?: string;
  generatedAt: number;
  lastOpenedAt: number;
  pinned: boolean;
  tags: string[];
  notes?: string;
  nodeCount: number;
  edgeCount: number;
  shareId?: string;
  explainer?: {
    generatedAt: number;
    text: string;
  };
}

/** Fast-loading projection stored separately for cold starts. */
export type LibraryIndexEntry = Omit<
  LibraryEntry,
  "graph" | "explainer" | "notes"
>;
