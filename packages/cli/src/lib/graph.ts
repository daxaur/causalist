// Minimal graph types + loader + pure tool implementations. Mirrors
// the eleven MCP tools in packages/mcp/src/index.ts so the CLI emits
// the same shape — an agent piping CLI through `jq` gets the exact
// same JSON it would get from MCP.

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";

export type SemanticLayer =
  | "infra"
  | "data"
  | "logic"
  | "api"
  | "ui"
  | "test"
  | "config";

export interface CausalNode {
  id: string;
  label: string;
  path?: string;
  layer: SemanticLayer;
  language?: string;
  kind?: "file" | "module" | "function" | "type" | "external";
  size?: number;
  summary?: string;
}

export interface CausalEdge {
  source: string;
  target: string;
  kind: "imports" | "calls" | "reads" | "writes" | "extends";
  verified?: boolean;
}

export interface CausalGraph {
  repo: string;
  rootLabel?: string;
  commit?: string;
  nodes: CausalNode[];
  edges: CausalEdge[];
}

export interface GraphSource {
  graph: CausalGraph;
  /** Where it came from — for `causalist help` output. */
  origin: { kind: "session" | "local"; ref: string; web?: string };
}

const DEFAULT_WEB = "https://causalist.xyz";

export interface LoadOptions {
  /** Explicit session id; if absent we read ~/.causalist/session.json. */
  session?: string;
  /** Local graph file (skips network). */
  graphFile?: string;
  /** Override the web app base URL. */
  web?: string;
}

export async function loadGraph(opts: LoadOptions = {}): Promise<GraphSource> {
  const web = (
    opts.web ??
    process.env.CAUSALIST_WEB ??
    DEFAULT_WEB
  ).replace(/\/$/, "");

  if (opts.graphFile) {
    const raw = await readFile(opts.graphFile, "utf-8");
    const graph = JSON.parse(raw) as CausalGraph;
    return { graph, origin: { kind: "local", ref: opts.graphFile } };
  }

  const sessionId = await resolveSession(opts.session);
  if (!sessionId) {
    throw new ExitError(
      "No session paired. Run `causalist pair <code>` first, or pass --session <id> / --graph <path>.",
      2,
    );
  }
  const url = `${web}/api/session/${sessionId}/graph`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new ExitError(
      `Failed to fetch graph for session ${sessionId} from ${web} (${res.status}).`,
      2,
    );
  }
  const payload = (await res.json()) as { graph?: CausalGraph } | CausalGraph;
  const graph =
    (payload as { graph?: CausalGraph }).graph ?? (payload as CausalGraph);
  if (!graph?.nodes) {
    throw new ExitError(
      `Session ${sessionId} has no graph yet. Map a repo first: \`causalist map <repo>\`.`,
      2,
    );
  }
  return {
    graph,
    origin: { kind: "session", ref: sessionId, web },
  };
}

export async function resolveSession(explicit?: string): Promise<string | null> {
  if (explicit) return explicit.trim();
  if (process.env.CAUSALIST_SESSION) return process.env.CAUSALIST_SESSION.trim();
  try {
    const file = resolve(homedir(), ".causalist", "session.json");
    const raw = await readFile(file, "utf-8");
    const parsed = JSON.parse(raw) as { sessionId?: string };
    return parsed.sessionId?.trim() ?? null;
  } catch {
    return null;
  }
}

/** Thrown by tools when the agent (or human) should see exit code 2. */
export class ExitError extends Error {
  constructor(message: string, public code: number = 2) {
    super(message);
  }
}

// ── Pure tool implementations ──────────────────────────────────────

export interface ToolResult<T = unknown> {
  ok: boolean;
  summary: string;
  data?: T;
}

export function queryNode(g: CausalGraph, id: string): ToolResult<CausalNode> {
  const node = g.nodes.find((n) => n.id === id);
  if (!node) return { ok: false, summary: `No node "${id}"` };
  return { ok: true, summary: `${node.label} (${node.layer})`, data: node };
}

export function getNeighbors(
  g: CausalGraph,
  id: string,
  direction: "in" | "out" | "both" = "both",
): ToolResult<{
  incoming: { source: string; kind: string; label?: string; verified?: boolean }[];
  outgoing: { target: string; kind: string; label?: string; verified?: boolean }[];
}> {
  const byId = new Map(g.nodes.map((n) => [n.id, n]));
  if (!byId.has(id)) return { ok: false, summary: `No node "${id}"` };
  const incoming = g.edges
    .filter((e) => e.target === id && direction !== "out")
    .map((e) => ({
      source: e.source,
      kind: e.kind,
      label: byId.get(e.source)?.label,
      verified: e.verified,
    }));
  const outgoing = g.edges
    .filter((e) => e.source === id && direction !== "in")
    .map((e) => ({
      target: e.target,
      kind: e.kind,
      label: byId.get(e.target)?.label,
      verified: e.verified,
    }));
  return {
    ok: true,
    summary: `${incoming.length} in, ${outgoing.length} out`,
    data: { incoming, outgoing },
  };
}

export function findPath(
  g: CausalGraph,
  source: string,
  target: string,
  maxHops = 6,
): ToolResult<{ path: string[]; kinds: string[] }> {
  const adj = new Map<string, { target: string; kind: string }[]>();
  for (const e of g.edges) {
    if (!adj.has(e.source)) adj.set(e.source, []);
    adj.get(e.source)!.push({ target: e.target, kind: e.kind });
  }
  const visited = new Set([source]);
  const queue: { path: string[]; kinds: string[] }[] = [
    { path: [source], kinds: [] },
  ];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur.path[cur.path.length - 1] === target) {
      return {
        ok: true,
        summary: `Path in ${cur.path.length - 1} hops`,
        data: cur,
      };
    }
    if (cur.path.length > maxHops) continue;
    for (const nx of adj.get(cur.path[cur.path.length - 1]) ?? []) {
      if (!visited.has(nx.target)) {
        visited.add(nx.target);
        queue.push({
          path: [...cur.path, nx.target],
          kinds: [...cur.kinds, nx.kind],
        });
      }
    }
  }
  return { ok: false, summary: `No path within ${maxHops} hops` };
}

export function findNodesByLayer(
  g: CausalGraph,
  layer: string,
  limit = 50,
): ToolResult<{ total: number; nodes: CausalNode[] }> {
  const matches = g.nodes.filter((n) => n.layer === layer);
  return {
    ok: true,
    summary: `${matches.length} in "${layer}"`,
    data: { total: matches.length, nodes: matches.slice(0, limit) },
  };
}

export function blastRadius(
  g: CausalGraph,
  id: string,
  depth = 3,
  via: string[] = ["calls", "imports", "reads", "writes"],
): ToolResult<{
  affected: { depth: number; id: string; label: string }[];
}> {
  const allowed = new Set(via);
  const visited = new Set<string>();
  const out: { depth: number; id: string; label: string }[] = [];
  const q: { id: string; d: number }[] = [{ id, d: 0 }];
  while (q.length) {
    const { id: cur, d } = q.shift()!;
    if (visited.has(cur) || d > depth) continue;
    visited.add(cur);
    const n = g.nodes.find((x) => x.id === cur);
    if (n && d > 0) out.push({ depth: d, id: cur, label: n.label });
    for (const e of g.edges) {
      if (e.target === cur && allowed.has(e.kind))
        q.push({ id: e.source, d: d + 1 });
    }
  }
  return {
    ok: true,
    summary: `${out.length} depend on "${id}"`,
    data: { affected: out.sort((a, b) => a.depth - b.depth) },
  };
}

export function affectedTests(
  g: CausalGraph,
  changedIds: string[],
  maxHops = 4,
): ToolResult<{
  affected: { id: string; hopsFromChange: number; label: string }[];
  totalTests: number;
}> {
  const rev = new Map<string, string[]>();
  for (const e of g.edges) {
    if (!rev.has(e.target)) rev.set(e.target, []);
    rev.get(e.target)!.push(e.source);
  }
  const testIds = new Set(g.nodes.filter((n) => n.layer === "test").map((n) => n.id));
  const hits = new Map<string, number>();
  for (const start of changedIds) {
    const seen = new Set<string>();
    const q: { id: string; d: number }[] = [{ id: start, d: 0 }];
    while (q.length) {
      const { id, d } = q.shift()!;
      if (seen.has(id) || d > maxHops) continue;
      seen.add(id);
      if (d > 0 && testIds.has(id)) {
        const prev = hits.get(id) ?? Infinity;
        if (d < prev) hits.set(id, d);
      }
      for (const s of rev.get(id) ?? []) q.push({ id: s, d: d + 1 });
    }
  }
  const affected = [...hits.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([id, d]) => ({
      id,
      hopsFromChange: d,
      label: g.nodes.find((n) => n.id === id)?.label ?? id,
    }));
  return {
    ok: true,
    summary: `${affected.length} of ${testIds.size} tests affected`,
    data: { affected, totalTests: testIds.size },
  };
}

export function findWriters(
  g: CausalGraph,
  target: string,
): ToolResult<{ writers: { id: string; label: string }[] }> {
  const writers = g.edges
    .filter((e) => e.target === target && e.kind === "writes")
    .map((e) => ({
      id: e.source,
      label: g.nodes.find((n) => n.id === e.source)?.label ?? e.source,
    }));
  return {
    ok: writers.length > 0,
    summary: `${writers.length} writer(s) of "${target}"`,
    data: { writers },
  };
}

export function similarNodes(
  g: CausalGraph,
  id: string,
  limit = 5,
): ToolResult<{ id: string; label: string; score: number }[]> {
  const src = g.nodes.find((n) => n.id === id);
  if (!src) return { ok: false, summary: `No node "${id}"` };
  const outDeg = g.edges.filter((e) => e.source === id).length;
  const inDeg = g.edges.filter((e) => e.target === id).length;
  const scored = g.nodes
    .filter((n) => n.id !== id)
    .map((n) => {
      let score = 0;
      if (n.layer === src.layer) score += 3;
      if (n.kind === src.kind) score += 1;
      if (n.language && n.language === src.language) score += 1;
      const oOut = g.edges.filter((e) => e.source === n.id).length;
      const oIn = g.edges.filter((e) => e.target === n.id).length;
      if (Math.abs(oOut - outDeg) <= 1 && Math.abs(oIn - inDeg) <= 1) score += 2;
      return { id: n.id, label: n.label, score };
    })
    .filter((x) => x.score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return { ok: true, summary: `${scored.length} similar`, data: scored };
}

export function topoOrder(
  g: CausalGraph,
  ids: string[],
): ToolResult<{ layers: string[][] }> {
  const set = new Set(ids);
  const inDeg = new Map<string, number>();
  const out = new Map<string, string[]>();
  for (const id of set) {
    inDeg.set(id, 0);
    out.set(id, []);
  }
  for (const e of g.edges) {
    if (set.has(e.source) && set.has(e.target)) {
      out.get(e.source)!.push(e.target);
      inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
    }
  }
  const layers: string[][] = [];
  let front = [...set].filter((id) => (inDeg.get(id) ?? 0) === 0);
  while (front.length) {
    layers.push(front);
    const next: string[] = [];
    for (const id of front) {
      for (const t of out.get(id) ?? []) {
        inDeg.set(t, (inDeg.get(t) ?? 0) - 1);
        if (inDeg.get(t) === 0) next.push(t);
      }
    }
    front = next;
  }
  return { ok: true, summary: `${layers.length} layers`, data: { layers } };
}

export function verifyEdge(
  g: CausalGraph,
  source: string,
  target: string,
  kind?: string,
): ToolResult<CausalEdge[]> {
  const matches = g.edges.filter(
    (e) =>
      e.source === source &&
      e.target === target &&
      (!kind || e.kind === kind),
  );
  return {
    ok: matches.length > 0,
    summary: matches.length
      ? `${matches.length} matching edge(s)`
      : "No matching edge",
    data: matches,
  };
}
