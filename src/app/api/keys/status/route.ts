// /api/keys/status — diagnostic endpoint for the API-keys UI.
//
// Returns whether keys actually persist (Supabase configured + table
// reachable) or run in ephemeral memory mode (will vanish on the next
// cold start). The card surfaces this so users aren't confused when
// their key disappears after a refresh.

import { NextResponse } from "next/server";
import { hasSupabase, serverSupabase } from "@/lib/supabase/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (!hasSupabase()) {
    return NextResponse.json({
      persistence: "memory",
      ok: true,
      reason: "supabase_unconfigured",
      message:
        "Keys live in this server process only — they vanish on the next deploy or cold start.",
    });
  }

  // Confirm the table actually exists. Without this the user could
  // have Supabase configured but no migration run yet.
  const sb = serverSupabase()!;
  const probe = await sb
    .from("causalist_api_keys")
    .select("id", { count: "exact", head: true })
    .limit(1);
  if (probe.error) {
    return NextResponse.json({
      persistence: "memory",
      ok: false,
      reason: "table_missing",
      message:
        "Supabase is configured but the causalist_api_keys table is missing. Run the migration in SETUP.md.",
      error: probe.error.message,
    });
  }
  return NextResponse.json({
    persistence: "supabase",
    ok: true,
    message: "Keys persist in Supabase, scoped to your GitHub user id.",
  });
}
