import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const revalidate = 600; // 10 min cache

/**
 * GET /api/github-stars — returns live star count for daxaur/causalist.
 * Cached at the edge for 10 min so we don't hammer the public API.
 */
export async function GET(): Promise<Response> {
  try {
    // If the repo is private, the unauthenticated API returns 404.
    // Fall back to a server-side GITHUB_TOKEN when set so the star
    // count works even before the repo is made public.
    const headers: Record<string, string> = {
      "User-Agent": "causalist-web",
      Accept: "application/vnd.github+json",
    };
    const token =
      process.env.GITHUB_TOKEN ??
      process.env.GITHUB_PAT ??
      process.env.GH_TOKEN;
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(
      "https://api.github.com/repos/daxaur/causalist",
      { headers, next: { revalidate: 600 } },
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
