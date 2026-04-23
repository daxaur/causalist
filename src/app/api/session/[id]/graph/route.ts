import type { NextRequest } from "next/server";
import { getSessionGraph, putSessionGraph } from "@/lib/session/graph-store";
import type { CausalGraph } from "@/lib/graph/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/session/:id/graph
 *   Returns the most recent CausalGraph pushed for this session, or 404.
 *   The MCP server and CLI call this to load graph state the browser has
 *   built.
 *
 * PUT /api/session/:id/graph
 *   Body: { graph: CausalGraph }. Stores the graph under the session id.
 *   The browser viewer calls this once analyze finishes, making the graph
 *   reachable from the paired terminal.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const graph = await getSessionGraph(id);
  if (!graph) {
    return Response.json(
      { error: "No graph stored for this session" },
      { status: 404 },
    );
  }
  return Response.json({ graph });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  let body: { graph?: CausalGraph };
  try {
    body = (await req.json()) as { graph?: CausalGraph };
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.graph?.nodes || !body.graph?.edges) {
    return Response.json(
      { error: "Body must be { graph: { nodes, edges, ... } }" },
      { status: 400 },
    );
  }
  await putSessionGraph(id, body.graph);
  return Response.json({ ok: true, nodes: body.graph.nodes.length });
}
