#!/usr/bin/env node
/**
 * causalist-mcp — Model Context Protocol stdio server.
 *
 * Wraps the same ten tool implementations used by the Oracle so any
 * MCP-capable client (Claude Code, Cursor, Hermes, and anyone else who
 * implements the spec) can call them directly — no shell round-trip.
 *
 * Run:
 *   causalist-mcp --session $CAUSALIST_SESSION --web https://causalist.xyz
 *
 * The server fetches the latest CausalGraph for the paired session,
 * then exposes tools against that graph. When no session is provided,
 * the server still starts but returns an error for every tool call so
 * clients can detect misconfiguration clearly.
 */

import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ── Tool implementations (inlined to keep the package standalone) ──

interface CausalNode {
  id: string;
  label: string;
  path?: string;
  layer: string;
  language?: string;
  kind?: string;
  summary?: string;
  size?: number;
}
interface CausalEdge {
  source: string;
  target: string;
  kind: string;
}
interface CausalGraph {
  repo: string;
  rootLabel: string;
  commit?: string;
  nodes: CausalNode[];
  edges: CausalEdge[];
}

// The MCP server can pull the graph three ways:
//   1. --graph <path>     — static local file. Never auto-refreshes.
//   2. --session <id>     — pulls from causalist.xyz/api/session/<id>/graph.
//   3. ~/.causalist/session.json — same as 2, auto-discovered.
//
// For (2) and (3), we refresh from the web on a TTL so tool calls
// made after a repo change see the new graph. TTL is short (10s) so
// the agent's "is this still true?" model of the world stays honest.
let CACHED_GRAPH: CausalGraph | null = null;
let CACHED_AT = 0;
let SESSION_SRC: { session: string; web: string } | null = null;
const REFRESH_TTL_MS = 10_000;

const TOOLS = [
  {
    name: "query_node",
    description: "Get details of a single node by id — label, path, layer, kind, summary.",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "get_neighbors",
    description: "List incoming / outgoing neighbors of a node with edge kinds.",
    inputSchema: {
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
    inputSchema: {
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
    name: "find_nodes_by_layer",
    description: "List nodes in a semantic layer: infra, data, logic, api, ui, test, config.",
    inputSchema: {
      type: "object",
      properties: { layer: { type: "string" }, limit: { type: "number" } },
      required: ["layer"],
    },
  },
  {
    name: "blast_radius",
    description:
      "Reverse-reachable set from a node — everything that transitively depends on it.",
    inputSchema: {
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
      "Given a set of changed node ids, return tests topologically reachable from them. The '3 tests not 300' query.",
    inputSchema: {
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
    description: "Find every node that writes to a given target. Security/audit query.",
    inputSchema: {
      type: "object",
      properties: { target: { type: "string" } },
      required: ["target"],
    },
  },
  {
    name: "similar_nodes",
    description:
      "Find nodes structurally similar to the given one (same layer, kind, neighbor-count).",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string" }, limit: { type: "number" } },
      required: ["id"],
    },
  },
  {
    name: "topo_order",
    description:
      "Topological layering of a subgraph. Turns 'build feature X' into a layered plan.",
    inputSchema: {
      type: "object",
      properties: { ids: { type: "array", items: { type: "string" } } },
      required: ["ids"],
    },
  },
  {
    name: "verify_edge",
    description: "Confirm an edge exists between two nodes, optionally of a kind.",
    inputSchema: {
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
    name: "create_project",
    description:
      "Push a new project entry to the paired browser's Projects list. Use when the user asks Claude Code to register a repo as a Causalist project.",
    inputSchema: {
      type: "object",
      properties: {
        owner: { type: "string", description: "GitHub owner (username or org)" },
        repo: { type: "string", description: "GitHub repo name" },
        nickname: {
          type: "string",
          description: "Optional friendly name shown in the projects list.",
        },
      },
      required: ["owner", "repo"],
    },
  },
];

async function requireGraph(): Promise<CausalGraph> {
  // If we have a session source, refresh from the web on a TTL so the
  // agent never sees a stale graph after the user has remapped.
  if (SESSION_SRC && Date.now() - CACHED_AT > REFRESH_TTL_MS) {
    try {
      const res = await fetch(
        `${SESSION_SRC.web.replace(/\/$/, "")}/api/session/${SESSION_SRC.session}/graph`,
      );
      if (res.ok) {
        const payload = (await res.json()) as { graph?: CausalGraph } | CausalGraph;
        const g = (payload as { graph?: CausalGraph }).graph ?? (payload as CausalGraph);
        if (g?.nodes) {
          CACHED_GRAPH = g;
          CACHED_AT = Date.now();
        }
      }
    } catch (e) {
      process.stderr.write(
        `[causalist-mcp] refresh failed: ${e instanceof Error ? e.message : String(e)}\n`,
      );
    }
  }
  if (!CACHED_GRAPH) {
    throw new Error(
      "No graph loaded. Pair the CLI (`causalist pair <code>`) and run `causalist map <repo>` first, or start the MCP server with --graph /path/to/graph.json",
    );
  }
  return CACHED_GRAPH;
}

async function exec(
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  const g = await requireGraph();
  switch (name) {
    case "query_node": {
      const node = g.nodes.find((n) => n.id === args.id);
      if (!node) return { ok: false, summary: `No node "${args.id}"` };
      return { ok: true, summary: `${node.label} (${node.layer})`, data: node };
    }
    case "get_neighbors": {
      const id = args.id as string;
      const direction = (args.direction as string) ?? "both";
      const byId = new Map(g.nodes.map((n) => [n.id, n]));
      if (!byId.has(id)) return { ok: false, summary: `No node "${id}"` };
      const incoming = g.edges
        .filter((e) => e.target === id && direction !== "out")
        .map((e) => ({ source: e.source, kind: e.kind, label: byId.get(e.source)?.label }));
      const outgoing = g.edges
        .filter((e) => e.source === id && direction !== "in")
        .map((e) => ({ target: e.target, kind: e.kind, label: byId.get(e.target)?.label }));
      return {
        ok: true,
        summary: `${incoming.length} in, ${outgoing.length} out`,
        data: { incoming, outgoing },
      };
    }
    case "find_path": {
      const source = args.source as string;
      const target = args.target as string;
      const maxHops = (args.maxHops as number) ?? 6;
      const adj = new Map<string, { target: string; kind: string }[]>();
      for (const e of g.edges) {
        if (!adj.has(e.source)) adj.set(e.source, []);
        adj.get(e.source)!.push({ target: e.target, kind: e.kind });
      }
      const visited = new Set([source]);
      const queue: { path: string[]; kinds: string[] }[] = [{ path: [source], kinds: [] }];
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
            queue.push({ path: [...cur.path, nx.target], kinds: [...cur.kinds, nx.kind] });
          }
        }
      }
      return { ok: false, summary: `No path within ${maxHops} hops` };
    }
    case "find_nodes_by_layer": {
      const layer = args.layer as string;
      const limit = (args.limit as number) ?? 20;
      const matches = g.nodes.filter((n) => n.layer === layer);
      return {
        ok: true,
        summary: `${matches.length} in "${layer}"`,
        data: { total: matches.length, nodes: matches.slice(0, limit) },
      };
    }
    case "blast_radius": {
      const id = args.id as string;
      const maxDepth = (args.depth as number) ?? 3;
      const via = new Set(
        (args.via as string[]) ?? ["calls", "imports", "reads", "writes"],
      );
      const visited = new Set<string>();
      const out: { depth: number; id: string; label: string }[] = [];
      const q: { id: string; d: number }[] = [{ id, d: 0 }];
      while (q.length) {
        const { id, d } = q.shift()!;
        if (visited.has(id) || d > maxDepth) continue;
        visited.add(id);
        const n = g.nodes.find((x) => x.id === id);
        if (n && d > 0) out.push({ depth: d, id, label: n.label });
        for (const e of g.edges) {
          if (e.target === id && via.has(e.kind)) q.push({ id: e.source, d: d + 1 });
        }
      }
      return {
        ok: true,
        summary: `${out.length} depend on "${id}"`,
        data: { affected: out.sort((a, b) => a.depth - b.depth) },
      };
    }
    case "affected_tests": {
      const changed = args.changedIds as string[];
      const maxHops = (args.maxHops as number) ?? 4;
      const rev = new Map<string, string[]>();
      for (const e of g.edges) {
        if (!rev.has(e.target)) rev.set(e.target, []);
        rev.get(e.target)!.push(e.source);
      }
      const testIds = new Set(g.nodes.filter((n) => n.layer === "test").map((n) => n.id));
      const hits = new Map<string, number>();
      for (const start of changed) {
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
    case "find_writers": {
      const target = args.target as string;
      const writers = g.edges
        .filter((e) => e.target === target && e.kind === "writes")
        .map((e) => ({
          id: e.source,
          label: g.nodes.find((n) => n.id === e.source)?.label ?? e.source,
        }));
      return {
        ok: true,
        summary: `${writers.length} writer(s) of "${target}"`,
        data: { writers },
      };
    }
    case "similar_nodes": {
      const id = args.id as string;
      const limit = (args.limit as number) ?? 5;
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
    case "topo_order": {
      const ids = new Set(args.ids as string[]);
      const inDeg = new Map<string, number>();
      const out = new Map<string, string[]>();
      for (const id of ids) {
        inDeg.set(id, 0);
        out.set(id, []);
      }
      for (const e of g.edges) {
        if (ids.has(e.source) && ids.has(e.target)) {
          out.get(e.source)!.push(e.target);
          inDeg.set(e.target, (inDeg.get(e.target) ?? 0) + 1);
        }
      }
      const layers: string[][] = [];
      let front = [...ids].filter((id) => (inDeg.get(id) ?? 0) === 0);
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
    case "verify_edge": {
      const matches = g.edges.filter(
        (e) =>
          e.source === args.source &&
          e.target === args.target &&
          (!args.kind || e.kind === args.kind),
      );
      return {
        ok: matches.length > 0,
        summary: matches.length
          ? `${matches.length} matching edge(s)`
          : "No matching edge",
        data: matches,
      };
    }
    case "create_project": {
      if (!SESSION_SRC) {
        return {
          ok: false,
          summary:
            "Not paired — start the MCP server with --session <id> or run `causalist init` first.",
        };
      }
      const owner = String(args.owner ?? "").trim();
      const repo = String(args.repo ?? "").trim();
      if (!owner || !repo) {
        return { ok: false, summary: "Both owner and repo are required" };
      }
      const url = `${SESSION_SRC.web.replace(/\/$/, "")}/api/projects/push`;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session: SESSION_SRC.session,
            project: {
              owner,
              repo,
              nickname: args.nickname,
              addedAt: Date.now(),
            },
          }),
        });
        if (!res.ok) {
          return {
            ok: false,
            summary: `Push failed: ${res.status} ${res.statusText}`,
          };
        }
        return {
          ok: true,
          summary: `Project "${owner}/${repo}" pushed to the browser.`,
          data: { owner, repo },
        };
      } catch (e) {
        return {
          ok: false,
          summary: `Push error: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function loadSessionGraph(web: string, session: string): Promise<void> {
  SESSION_SRC = { web, session };
  const url = `${web.replace(/\/$/, "")}/api/session/${session}/graph`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const payload = (await res.json()) as { graph?: CausalGraph } | CausalGraph;
      const g = (payload as { graph?: CausalGraph }).graph ?? (payload as CausalGraph);
      if (g?.nodes) {
        CACHED_GRAPH = g;
        CACHED_AT = Date.now();
      }
    } else {
      process.stderr.write(
        `[causalist-mcp] initial fetch from ${url} returned ${res.status}\n`,
      );
    }
  } catch (e) {
    process.stderr.write(
      `[causalist-mcp] initial fetch failed: ${e instanceof Error ? e.message : String(e)}\n`,
    );
  }
}

async function loadLocalGraph(path: string): Promise<void> {
  const text = await readFile(path, "utf-8");
  CACHED_GRAPH = JSON.parse(text) as CausalGraph;
}

async function main() {
  // Flags: --session <id> --web <url> --graph <path>
  const argv = process.argv.slice(2);
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };
  const session = get("--session") ?? process.env.CAUSALIST_SESSION;
  const web = get("--web") ?? process.env.CAUSALIST_WEB ?? "https://causalist.xyz";
  const localPath = get("--graph");

  if (localPath) {
    await loadLocalGraph(localPath);
  } else if (session) {
    await loadSessionGraph(web, session);
  } else {
    // Try the default session file written by `causalist pair`
    try {
      const file = resolve(homedir(), ".causalist", "session.json");
      const raw = await readFile(file, "utf-8");
      const parsed = JSON.parse(raw) as { sessionId?: string };
      if (parsed.sessionId) await loadSessionGraph(web, parsed.sessionId);
    } catch {
      // first-run: no session, server still starts
    }
  }

  const server = new Server(
    { name: "causalist-mcp", version: "0.1.0" },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    try {
      const result = await exec(req.params.name, req.params.arguments ?? {});
      return {
        content: [{ type: "text", text: JSON.stringify(result) }],
      };
    } catch (e) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              ok: false,
              summary: e instanceof Error ? e.message : String(e),
            }),
          },
        ],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  process.stderr.write(`causalist-mcp fatal: ${err}\n`);
  process.exit(1);
});
