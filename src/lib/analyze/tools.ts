// Tools the Oracle / MCP server exposes. Pure functions over an
// in-memory CausalGraph so they work client-side, server-side, and
// from the MCP stdio shim identically.

import type {
  CausalEdge,
  CausalGraph,
  CausalNode,
  SemanticLayer,
} from "@/lib/graph/types";

export interface ToolResult {
  ok: boolean;
  summary: string;
  data?: unknown;
}

// ─── query_node ────────────────────────────────────────────────────

export function queryNode(
  graph: CausalGraph,
  args: { id: string },
): ToolResult {
  const node = graph.nodes.find((n) => n.id === args.id);
  if (!node) return { ok: false, summary: `No node "${args.id}"` };
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

// ─── get_neighbors ─────────────────────────────────────────────────

export function getNeighbors(
  graph: CausalGraph,
  args: { id: string; direction?: "in" | "out" | "both" },
): ToolResult {
  const direction = args.direction ?? "both";
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  if (!nodeMap.has(args.id)) {
    return { ok: false, summary: `No node "${args.id}"` };
  }
  const incoming: { source: string; kind: string; label: string }[] = [];
  const outgoing: { target: string; kind: string; label: string }[] = [];
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
    summary: `${incoming.length} in, ${outgoing.length} out`,
    data: { incoming, outgoing },
  };
}

// ─── find_path ─────────────────────────────────────────────────────

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
  const visited = new Set<string>([args.source]);
  const queue: { path: string[]; kinds: string[] }[] = [
    { path: [args.source], kinds: [] },
  ];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (cur.path[cur.path.length - 1] === args.target) {
      return {
        ok: true,
        summary: `Path found in ${cur.path.length - 1} hops`,
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
    summary: `No path within ${maxHops} hops`,
  };
}

// ─── verify_edge ───────────────────────────────────────────────────

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
      summary: `No edge from "${args.source}" to "${args.target}"`,
    };
  }
  return {
    ok: true,
    summary: `${matches.length} edge${matches.length === 1 ? "" : "s"}: ${matches.map((e) => e.kind).join(", ")}`,
    data: matches,
  };
}

// ─── find_nodes_by_layer ───────────────────────────────────────────

export function findNodesByLayer(
  graph: CausalGraph,
  args: { layer: SemanticLayer | string; limit?: number },
): ToolResult {
  const limit = args.limit ?? 20;
  const matching = graph.nodes.filter((n) => n.layer === args.layer);
  return {
    ok: true,
    summary: `${matching.length} in layer "${args.layer}"`,
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

// ─── blast_radius ──────────────────────────────────────────────────

export function blastRadius(
  graph: CausalGraph,
  args: { id: string; depth?: number; via?: string[] },
): ToolResult {
  const maxDepth = args.depth ?? 3;
  const viaKinds = new Set(args.via ?? ["calls", "imports", "reads", "writes"]);
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  if (!nodeMap.has(args.id)) {
    return { ok: false, summary: `No node "${args.id}"` };
  }
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
    summary: `${byDepth.length} depend on "${args.id}" within ${maxDepth} hops`,
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

// ─── affected_tests (the "3 tests not 300" tool) ──────────────────

export function affectedTests(
  graph: CausalGraph,
  args: { changedIds: string[]; maxHops?: number },
): ToolResult {
  const maxHops = args.maxHops ?? 4;
  const tests = graph.nodes.filter((n) => n.layer === "test");
  if (tests.length === 0) {
    return {
      ok: true,
      summary: "No test nodes in the graph",
      data: { affected: [], total: 0 },
    };
  }
  // Build reverse adjacency (who depends on me?)
  const revAdj = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (!revAdj.has(e.target)) revAdj.set(e.target, []);
    revAdj.get(e.target)!.push(e.source);
  }
  // BFS outward from each changed id; mark reachable tests.
  const testIds = new Set(tests.map((t) => t.id));
  const reachable = new Map<string, number>(); // testId → min hops
  for (const start of args.changedIds) {
    const visited = new Set<string>();
    const q: { id: string; d: number }[] = [{ id: start, d: 0 }];
    while (q.length) {
      const { id, d } = q.shift()!;
      if (visited.has(id) || d > maxHops) continue;
      visited.add(id);
      if (testIds.has(id) && d > 0) {
        const prev = reachable.get(id) ?? Infinity;
        if (d < prev) reachable.set(id, d);
      }
      for (const src of revAdj.get(id) ?? []) {
        if (!visited.has(src)) q.push({ id: src, d: d + 1 });
      }
    }
  }
  const affected = [...reachable.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([id, hops]) => {
      const n = graph.nodes.find((x) => x.id === id);
      return {
        id,
        label: n?.label ?? id,
        hopsFromChange: hops,
        confidence: Math.max(0.3, 1 - hops * 0.15),
      };
    });
  return {
    ok: true,
    summary: `${affected.length} of ${tests.length} tests affected`,
    data: { affected, totalTests: tests.length },
  };
}

// ─── find_writers (security tool) ────────────────────────────────

export function findWriters(
  graph: CausalGraph,
  args: { target: string },
): ToolResult {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  if (!nodeMap.has(args.target)) {
    return { ok: false, summary: `No node "${args.target}"` };
  }
  const writers = graph.edges
    .filter((e) => e.target === args.target && e.kind === "writes")
    .map((e) => {
      const n = nodeMap.get(e.source);
      return {
        id: e.source,
        label: n?.label ?? e.source,
        layer: n?.layer,
      };
    });
  return {
    ok: true,
    summary: `${writers.length} writer${writers.length === 1 ? "" : "s"} of "${args.target}"`,
    data: { writers },
  };
}

// ─── similar_nodes (pattern match) ────────────────────────────────

export function similarNodes(
  graph: CausalGraph,
  args: { id: string; limit?: number },
): ToolResult {
  const limit = args.limit ?? 5;
  const node = graph.nodes.find((n) => n.id === args.id);
  if (!node) return { ok: false, summary: `No node "${args.id}"` };
  // Similarity on (same layer, similar kind, similar neighbor-count,
  // similar language).
  const outCount = graph.edges.filter((e) => e.source === args.id).length;
  const inCount = graph.edges.filter((e) => e.target === args.id).length;
  const scored = graph.nodes
    .filter((n) => n.id !== args.id)
    .map((other) => {
      let score = 0;
      let reason: string[] = [];
      if (other.layer === node.layer) {
        score += 3;
        reason.push(`same layer (${other.layer})`);
      }
      if (other.kind === node.kind) {
        score += 1;
        reason.push(`same kind`);
      }
      if (other.language === node.language && other.language) {
        score += 1;
        reason.push(`same language`);
      }
      const oOut = graph.edges.filter((e) => e.source === other.id).length;
      const oIn = graph.edges.filter((e) => e.target === other.id).length;
      if (Math.abs(oOut - outCount) <= 1 && Math.abs(oIn - inCount) <= 1) {
        score += 2;
        reason.push(`similar edge shape`);
      }
      return {
        id: other.id,
        label: other.label,
        score,
        reason: reason.join(", ") || "weakly similar",
      };
    })
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return {
    ok: true,
    summary: `${scored.length} similar node${scored.length === 1 ? "" : "s"}`,
    data: scored,
  };
}

// ─── co_change (commit-history clustering) ───────────────────────

export function coChange(
  graph: CausalGraph,
  args: { id: string; commits?: { sha: string; touched: string[] }[]; limit?: number },
): ToolResult {
  if (!args.commits || args.commits.length === 0) {
    return {
      ok: true,
      summary: "No commit history available",
      data: { partners: [] },
    };
  }
  const limit = args.limit ?? 5;
  const counts = new Map<string, number>();
  for (const c of args.commits) {
    if (!c.touched.includes(args.id)) continue;
    for (const other of c.touched) {
      if (other === args.id) continue;
      counts.set(other, (counts.get(other) ?? 0) + 1);
    }
  }
  const partners = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => {
      const n = graph.nodes.find((x) => x.id === id);
      return { id, label: n?.label ?? id, count };
    });
  return {
    ok: true,
    summary: `${partners.length} files co-change with "${args.id}"`,
    data: { partners },
  };
}

// ─── topo_order (task planning) ──────────────────────────────────

export function topoOrder(
  graph: CausalGraph,
  args: { ids: string[] },
): ToolResult {
  const subset = new Set(args.ids);
  const missing = args.ids.filter((id) => !graph.nodes.some((n) => n.id === id));
  if (missing.length > 0) {
    return { ok: false, summary: `Unknown ids: ${missing.join(", ")}` };
  }
  // Kahn's algorithm on the induced subgraph
  const inDeg = new Map<string, number>();
  const outAdj = new Map<string, string[]>();
  for (const id of subset) {
    inDeg.set(id, 0);
    outAdj.set(id, []);
  }
  for (const e of graph.edges) {
    if (subset.has(e.source) && subset.has(e.target)) {
      outAdj.get(e.source)!.push(e.target);
      inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
    }
  }
  const layers: string[][] = [];
  let frontier = [...subset].filter((id) => (inDeg.get(id) ?? 0) === 0);
  while (frontier.length > 0) {
    layers.push(frontier);
    const next: string[] = [];
    for (const id of frontier) {
      for (const tgt of outAdj.get(id) ?? []) {
        inDeg.set(tgt, (inDeg.get(tgt) ?? 0) - 1);
        if (inDeg.get(tgt) === 0) next.push(tgt);
      }
    }
    frontier = next;
  }
  return {
    ok: true,
    summary: `${layers.length} layers in dependency order`,
    data: { layers },
  };
}

// ─── Schemas for the Claude API / MCP surface ──────────────────

export const TOOL_SCHEMAS = [
  {
    name: "query_node",
    description: "Get details of a single node by id.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "get_neighbors",
    description:
      "List incoming / outgoing / both neighbors of a node with edge kinds.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        direction: { type: "string", enum: ["in", "out", "both"] },
      },
      required: ["id"],
    },
  },
  {
    name: "find_path",
    description: "BFS shortest causal path between two nodes.",
    input_schema: {
      type: "object",
      properties: {
        source: { type: "string" },
        target: { type: "string" },
        maxHops: { type: "number" },
      },
      required: ["source", "target"],
    },
  },
  {
    name: "verify_edge",
    description:
      "Confirm an edge exists between two nodes, optionally of a kind.",
    input_schema: {
      type: "object",
      properties: {
        source: { type: "string" },
        target: { type: "string" },
        kind: { type: "string" },
      },
      required: ["source", "target"],
    },
  },
  {
    name: "find_nodes_by_layer",
    description:
      "List nodes in a semantic layer (infra, data, logic, api, ui, test, config).",
    input_schema: {
      type: "object",
      properties: {
        layer: { type: "string" },
        limit: { type: "number" },
      },
      required: ["layer"],
    },
  },
  {
    name: "blast_radius",
    description:
      "Reverse-reachable set from a node — what transitively depends on it.",
    input_schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        depth: { type: "number" },
        via: { type: "array", items: { type: "string" } },
      },
      required: ["id"],
    },
  },
  {
    name: "affected_tests",
    description:
      "Given a set of changed node ids, return tests topologically reachable from any of them. The '3 tests not 300' query.",
    input_schema: {
      type: "object",
      properties: {
        changedIds: { type: "array", items: { type: "string" } },
        maxHops: { type: "number" },
      },
      required: ["changedIds"],
    },
  },
  {
    name: "find_writers",
    description:
      "Find every node that writes to a given target. The security/audit query.",
    input_schema: {
      type: "object",
      properties: { target: { type: "string" } },
      required: ["target"],
    },
  },
  {
    name: "similar_nodes",
    description:
      "Find nodes structurally similar to the given one (same layer, kind, neighbor-count). The 'add a thing like this' query.",
    input_schema: {
      type: "object",
      properties: { id: { type: "string" }, limit: { type: "number" } },
      required: ["id"],
    },
  },
  {
    name: "topo_order",
    description:
      "Return a topological layering of a subgraph. Turns 'build feature X' into a plan of sequential layers.",
    input_schema: {
      type: "object",
      properties: { ids: { type: "array", items: { type: "string" } } },
      required: ["ids"],
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
      case "affected_tests":
        return affectedTests(graph, input);
      case "find_writers":
        return findWriters(graph, input);
      case "similar_nodes":
        return similarNodes(graph, input);
      case "topo_order":
        return topoOrder(graph, input);
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

export type { CausalEdge, CausalNode };
