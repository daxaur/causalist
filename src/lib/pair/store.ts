// Ephemeral pair-code store. In-memory only — same trade-off as the
// stream bus: good for local dev + single-instance Vercel. Swap for
// Upstash Redis when you need multi-instance scaling.
//
// Contract:
// - POST /api/pair                → creates a code, returns { code, sessionId }
// - GET  /api/pair?code=<code>    → consumes the code, returns { sessionId, token }
// - Codes are single-use and expire after 10 minutes.

interface PairEntry {
  sessionId: string;
  token: string;
  createdAt: number;
  /** Set once the CLI has claimed the code. */
  claimedAt?: number;
}

const codes = new Map<string, PairEntry>();
const TTL_MS = 10 * 60 * 1000;
const CLEANUP_INTERVAL = 60 * 1000;

// Lazy GC — delete expired entries on every read so we don't need a
// persistent interval timer (Vercel serverless can't keep one alive).
function gc() {
  const now = Date.now();
  for (const [code, entry] of codes) {
    if (now - entry.createdAt > TTL_MS) codes.delete(code);
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

export function mintCode(sessionId: string, token: string): string {
  maybeGc();
  const code = generate6();
  codes.set(code, { sessionId, token, createdAt: Date.now() });
  return code;
}

export function claimCode(
  code: string,
): { sessionId: string; token: string; claimedAt: number } | null {
  maybeGc();
  const entry = codes.get(code);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    codes.delete(code);
    return null;
  }
  if (entry.claimedAt) return null; // single-use
  entry.claimedAt = Date.now();
  return {
    sessionId: entry.sessionId,
    token: entry.token,
    claimedAt: entry.claimedAt,
  };
}

export function isClaimed(code: string): boolean {
  const entry = codes.get(code);
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
