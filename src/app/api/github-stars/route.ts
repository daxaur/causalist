import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 600; // 10 min cache

/**
 * GET /api/github-stars — returns live star count for daxaur/causalist.
 * Cached at the edge for 10 min so we don't hammer the public API.
 */
export async function GET(): Promise<Response> {
  try {
    const res = await fetch(
      "https://api.github.com/repos/daxaur/causalist",
      {
        headers: { "User-Agent": "causalist-web" },
        next: { revalidate: 600 },
      },
    );
    if (!res.ok) {
      return NextResponse.json({ stars: null }, { status: 200 });
    }
    const data = await res.json();
    return NextResponse.json({ stars: data.stargazers_count ?? 0 });
  } catch {
    return NextResponse.json({ stars: null });
  }
}
