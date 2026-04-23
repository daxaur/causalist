import type { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { createShare } from "@/lib/session/share-store";
import type { CausalGraph } from "@/lib/graph/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/share
 *   Body: { graph, owner?, repo, title? }
 *   Returns: { id, url }
 *
 * Stores a graph in causalist_shares and returns a /s/<id> URL anyone
 * with the link can open.
 */
export async function POST(req: NextRequest): Promise<Response> {
  let body: {
    graph?: CausalGraph;
    owner?: string;
    repo?: string;
    title?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (!body.graph?.nodes || !body.graph.edges || !body.repo) {
    return Response.json(
      { error: "body must be { graph, repo, owner?, title? }" },
      { status: 400 },
    );
  }
  const id = nanoid(10);
  try {
    await createShare({
      id,
      owner: body.owner,
      repo: body.repo,
      title: body.title,
      graph: body.graph,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");
  return Response.json({ id, url: `${base}/s/${id}` });
}
