// Tool definitions for the Oracle agent. Each tool is a pure function
// over an in-memory CausalGraph — no side effects, no network calls,
// safe to run client-side.

import type { CausalEdge, CausalGraph, CausalNode, SemanticLayer } from "@/lib/graph/types";

export interface ToolResult {
  ok: boolean;
  summary: string;
  data?: unknown;
}

// ── Tool implementations ────────────────────────────────────────────

export function queryNode(
  graph: CausalGraph,
  args: { id: string },
): ToolResult {
  const node = graph.nodes.find((n) => n.id === args.id);
  if (!node) {
    return { ok: false, summary: `No node with id "${args.id}"` };
  }
  return {
    ok: true,
    summary: `${node.label} (${node.layer} · ${node.kind ?? "node"})`,
    data: {
      id: node.id,
      label: node.label,
      path: node.path,
      layer: node.layer,
      kind: node.kind,
      language: node.language,
      summary: node.summary,
    },
  };
}

export function getNeighbors(
  graph: CausalGraph,
  args: { id: string; direction?: "in" | "out" | "both" },
): ToolResult {
  const direction = args.direction ?? "both";
  const incoming: { source: string; kind: string; label: string }[] = [];
  const outgoing: { target: string; kind: string; label: string }[] = [];
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  if (!nodeMap.has(args.id)) {
    return { ok: false, summary: `No node with id "${args.id}"` };
  }
  for (const e of graph.edges) {
    if (e.target === args.id && (direction === "in" || direction === "both")) {
      const n = nodeMap.get(e.source);
      if (n) incoming.push({ source: e.source, kind: e.kind, label: n.label });
    }
    if (e.source === args.id && (direction === "out" || direction === "both")) {
      const n = nodeMap.get(e.target);
      if (n) outgoing.push({ target: e.target, kind: e.kind, label: n.label });
    }
  }
  return {
    ok: true,
    summary: `${incoming.length} incoming, ${outgoing.length} outgoing`,
    data: { incoming, outgoing },
  };
}

export function findPath(
  graph: CausalGraph,
  args: { source: string; target: string; maxHops?: number },
): ToolResult {
  const maxHops = args.maxHops ?? 6;
  const adj = new Map<string, { target: string; kind: string }[]>();
  for (const e of graph.edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push({ target: e.target, kind: e.kind });
  }

  // BFS
  const visited = new Set<string>([args.source]);
  const queue: { path: string[]; kinds: string[] }[] = [
    { path: [args.source], kinds: [] },
  ];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.path[cur.path.length - 1] === args.target) {
      return {
        ok: true,
        summary: `Path found in ${cur.path.length - 1} hop${cur.path.length === 2 ? "" : "s"}`,
        data: { path: cur.path, kinds: cur.kinds },
      };
    }
    if (cur.path.length > maxHops) continue;
    for (const nxt of adj.get(cur.path[cur.path.length - 1]) ?? []) {
      if (!visited.has(nxt.target)) {
        visited.add(nxt.target);
        queue.push({
          path: [...cur.path, nxt.target],
          kinds: [...cur.kinds, nxt.kind],
        });
      }
    }
  }
  return {
    ok: false,
    summary: `No path from "${args.source}" to "${args.target}" within ${maxHops} hops`,
  };
}

export function verifyEdge(
  graph: CausalGraph,
  args: { source: string; target: string; kind?: string },
): ToolResult {
  const matches = graph.edges.filter((e) => {
    if (e.source !== args.source || e.target !== args.target) return false;
    if (args.kind && e.kind !== args.kind) return false;
    return true;
  });
  if (matches.length === 0) {
    return {
      ok: false,
      summary: `No edge from "${args.source}" to "${args.target}"${args.kind ? ` of kind "${args.kind}"` : ""}`,
    };
  }
  return {
    ok: true,
    summary: `Found ${matches.length} matching edge${matches.length === 1 ? "" : "s"} · kinds: ${matches.map((e) => e.kind).join(", ")}`,
    data: matches,
  };
}

export function findNodesByLayer(
  graph: CausalGraph,
  args: { layer: SemanticLayer | string; limit?: number },
): ToolResult {
  const limit = args.limit ?? 20;
  const matching = graph.nodes.filter((n) => n.layer === args.layer);
  return {
    ok: true,
    summary: `${matching.length} nodes in layer "${args.layer}"`,
    data: {
      total: matching.length,
      returned: Math.min(matching.length, limit),
      nodes: matching.slice(0, limit).map((n) => ({
        id: n.id,
        label: n.label,
        kind: n.kind,
      })),
    },
  };
}

export function blastRadius(
  graph: CausalGraph,
  args: { id: string; depth?: number; via?: string[] },
): ToolResult {
  const maxDepth = args.depth ?? 3;
  const viaKinds = new Set(args.via ?? ["calls", "imports", "reads", "writes"]);
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  if (!nodeMap.has(args.id)) {
    return { ok: false, summary: `No node with id "${args.id}"` };
  }

  // Reverse-BFS: what depends on `id`?
  const visited = new Set<string>();
  const byDepth: { depth: number; id: string; label: string }[] = [];
  const queue: { id: string; depth: number }[] = [{ id: args.id, depth: 0 }];
  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (visited.has(id) || depth > maxDepth) continue;
    visited.add(id);
    if (depth > 0) {
      const n = nodeMap.get(id);
      if (n) byDepth.push({ depth, id, label: n.label });
    }
    for (const e of graph.edges) {
      if (e.target === id && viaKinds.has(e.kind) && !visited.has(e.source)) {
        queue.push({ id: e.source, depth: depth + 1 });
      }
    }
  }
  byDepth.sort((a, b) => a.depth - b.depth);
  return {
    ok: true,
    summary: `${byDepth.length} nodes depend on "${args.id}" within ${maxDepth} hops`,
    data: {
      affected: byDepth,
      byDepth: Object.fromEntries(
        Array.from({ length: maxDepth }, (_, i) => [
          i + 1,
          byDepth.filter((n) => n.depth === i + 1).length,
        ]),
      ),
    },
  };
}

// ── Tool schemas for the Claude API ─────────────────────────────────

export const TOOL_SCHEMAS = [
  {
    name: "query_node",
    description:
      "Get the details of a single node: label, path, layer, kind, language, and summary.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string", description: "Node id from the graph" } },
      required: ["id"],
    },
  },
  {
    name: "get_neighbors",
    description:
      "List the incoming, outgoing, or both sets of neighbors of a node with the edge kind that connects them.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        direction: {
          type: "string",
          enum: ["in", "out", "both"],
          description: "Default 'both'.",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "find_path",
    description:
      "Search for a causal path between two node ids. Uses BFS over outgoing edges. Returns the path and the edge kinds along it.",
    input_schema: {
      type: "object",
      properties: {
        source: { type: "string" },
        target: { type: "string" },
        maxHops: { type: "number", description: "Default 6." },
      },
      required: ["source", "target"],
    },
  },
  {
    name: "verify_edge",
    description:
      "Check that an edge exists between two nodes. Optional kind filter. Returns the matching edge(s) or an error.",
    input_schema: {
      type: "object",
      properties: {
        source: { type: "string" },
        target: { type: "string" },
        kind: {
          type: "string",
          description: "Optional: imports, calls, reads, writes, extends",
        },
      },
      required: ["source", "target"],
    },
  },
  {
    name: "find_nodes_by_layer",
    description:
      "List nodes by semantic layer. Layers: infra, data, logic, api, ui, test, config.",
    input_schema: {
      type: "object",
      properties: {
        layer: { type: "string" },
        limit: { type: "number", description: "Default 20." },
      },
      required: ["layer"],
    },
  },
  {
    name: "blast_radius",
    description:
      "Compute the reverse-reachable set from a node: everything that depends on it (directly or transitively) within 'depth' hops via selected edge kinds.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        depth: { type: "number", description: "Default 3." },
        via: {
          type: "array",
          items: { type: "string" },
          description:
            "Edge kinds to traverse. Default ['calls', 'imports', 'reads', 'writes'].",
        },
      },
      required: ["id"],
    },
  },
] as const;

export type ToolName = (typeof TOOL_SCHEMAS)[number]["name"];

export function runTool(
  graph: CausalGraph,
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  input: any,
): ToolResult {
  try {
    switch (name) {
      case "query_node":
        return queryNode(graph, input);
      case "get_neighbors":
        return getNeighbors(graph, input);
      case "find_path":
        return findPath(graph, input);
      case "verify_edge":
        return verifyEdge(graph, input);
      case "find_nodes_by_layer":
        return findNodesByLayer(graph, input);
      case "blast_radius":
        return blastRadius(graph, input);
      default:
        return { ok: false, summary: `Unknown tool: ${name}` };
    }
  } catch (e) {
    return {
      ok: false,
      summary: `Tool error: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

// Dummy export so TypeScript doesn't complain about unused type import
export type { CausalEdge, CausalNode };
