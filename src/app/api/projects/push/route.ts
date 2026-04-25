// MCP → browser bridge. The published `causalist-mcp` server posts here
// when the user runs `causalist project create <owner/repo>` from their
// terminal; the paired browser receives a `project_added` SSE event on
// /api/stream/<session> and adds the entry to its localStorage list.
//
// No auth: scoped to a session id that's only known by the paired
// terminal + browser. Same trust model as the existing pair flow.

import { NextResponse } from "next/server";
import { publish } from "@/lib/stream/memory-bus";

export const runtime = "nodejs";

interface PushBody {
  session: string;
  project: {
    owner: string;
    repo: string;
    nickname?: string;
    addedAt?: number;
  };
}

export async function POST(req: Request): Promise<Response> {
  let body: PushBody;
  try {
    body = (await req.json()) as PushBody;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const { session, project } = body;
  if (!session || !project?.owner || !project?.repo) {
    return NextResponse.json({ error: "missing fields" }, { status: 400 });
  }

  publish(session, {
    event: "project_added",
    ts: Date.now(),
    project: {
      owner: project.owner,
      repo: project.repo,
      nickname: project.nickname,
      addedAt: project.addedAt ?? Date.now(),
    },
  });

  return NextResponse.json({ ok: true });
}
