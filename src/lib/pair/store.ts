// Pair-code store with Supabase persistence and in-memory fallback.
// Codes are 6-char, single-use, and expire after 10 minutes.

import { serverSupabase } from "@/lib/supabase/client";

interface PairEntry {
  sessionId: string;
  token: string;
  createdAt: number;
  /** Set once the CLI has claimed the code. */
  claimedAt?: number;
}

const memory = new Map<string, PairEntry>();
const TTL_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL = 60 * 1000;

function gc() {
  const now = Date.now();
  for (const [code, entry] of memory) {
    if (now - entry.createdAt > TTL_MS) memory.delete(code);
  }
}

let lastGc = 0;
function maybeGc() {
  const now = Date.now();
  if (now - lastGc > CLEANUP_INTERVAL) {
    gc();
    lastGc = now;
  }
}

export async function mintCode(
  sessionId: string,
  token: string,
): Promise<string> {
  maybeGc();
  const code = generate6();
  const sb = serverSupabase();
  if (sb) {
    const { error } = await sb.from("causalist_pair_codes").insert({
      code,
      session_id: sessionId,
      token,
    });
    if (error) throw new Error(`pair code insert failed: ${error.message}`);
  } else {
    memory.set(code, { sessionId, token, createdAt: Date.now() });
  }
  return code;
}

export async function claimCode(
  code: string,
): Promise<{ sessionId: string; token: string; claimedAt: number } | null> {
  maybeGc();
  const sb = serverSupabase();
  if (sb) {
    // Atomic claim: update row, set claimed_at if not set and not expired.
    const now = new Date();
    const expiryCutoff = new Date(Date.now() - TTL_MS).toISOString();
    const { data, error } = await sb
      .from("causalist_pair_codes")
      .update({ claimed_at: now.toISOString() })
      .eq("code", code)
      .is("claimed_at", null)
      .gt("created_at", expiryCutoff)
      .select("session_id, token")
      .maybeSingle();
    if (error || !data) return null;
    return {
      sessionId: data.session_id as string,
      token: data.token as string,
      claimedAt: now.getTime(),
    };
  }
  const entry = memory.get(code);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    memory.delete(code);
    return null;
  }
  if (entry.claimedAt) return null;
  entry.claimedAt = Date.now();
  return {
    sessionId: entry.sessionId,
    token: entry.token,
    claimedAt: entry.claimedAt,
  };
}

export async function isClaimed(code: string): Promise<boolean> {
  const sb = serverSupabase();
  if (sb) {
    const { data } = await sb
      .from("causalist_pair_codes")
      .select("claimed_at")
      .eq("code", code)
      .maybeSingle();
    return Boolean(data?.claimed_at);
  }
  const entry = memory.get(code);
  return Boolean(entry?.claimedAt);
}

/** Generate a 6-char code with unambiguous glyphs. */
function generate6(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
