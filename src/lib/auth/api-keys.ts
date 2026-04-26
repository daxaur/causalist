// Causalist API keys — Bearer-token auth for agents and CI.
//
// User signs in with GitHub (cookie) → mints a key in /app/settings.
// Key is shown once in plaintext, then only its prefix is recoverable.
// Server stores SHA-256(key) tied to the user's GitHub login + numeric
// id. Agents call any /api/projects endpoint with
//   Authorization: Bearer cspl_live_<32-base64url>
// and we resolve back to the user.
//
// Persistence prefers Supabase (table: causalist_api_keys); falls back
// to an in-memory map for local dev. Same pattern as the pair store.

import { createHash, randomBytes } from "node:crypto";
import { serverSupabase } from "@/lib/supabase/client";

export const KEY_PREFIX = "cspl_live_";

export interface ApiKeyOwner {
  /** Numeric GitHub user id — stable across login renames. */
  userId: number;
  /** Current GitHub login — informational only; userId is canonical. */
  userLogin: string;
}

export interface ApiKeyRecord extends ApiKeyOwner {
  id: string;
  /** First ~12 chars including the prefix — safe to render in lists. */
  keyPrefix: string;
  name: string;
  createdAt: number;
  lastUsedAt?: number;
}

interface MemRow extends ApiKeyRecord {
  hash: string;
}

const memory = new Map<string, MemRow>(); // key = id (uuid)
const memoryByHash = new Map<string, MemRow>();

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Generate a key. Returns the plaintext token (show once) and the
 *  metadata that gets persisted. */
function generate(
  owner: ApiKeyOwner,
  name: string,
): { token: string; record: ApiKeyRecord; hash: string } {
  const id = crypto.randomUUID();
  const random = randomBytes(24).toString("base64url");
  const token = `${KEY_PREFIX}${random}`;
  const keyPrefix = token.slice(0, KEY_PREFIX.length + 6);
  const hash = sha256(token);
  const record: ApiKeyRecord = {
    id,
    userId: owner.userId,
    userLogin: owner.userLogin,
    keyPrefix,
    name: name.trim().slice(0, 80) || "untitled",
    createdAt: Date.now(),
  };
  return { token, record, hash };
}

export async function mintKey(
  owner: ApiKeyOwner,
  name: string,
): Promise<{ token: string; record: ApiKeyRecord }> {
  const { token, record, hash } = generate(owner, name);
  const sb = serverSupabase();
  if (sb) {
    const { error } = await sb.from("causalist_api_keys").insert({
      id: record.id,
      user_id: record.userId,
      user_login: record.userLogin,
      key_prefix: record.keyPrefix,
      key_hash: hash,
      name: record.name,
    });
    if (error) throw new Error(`api key insert failed: ${error.message}`);
  } else {
    const row: MemRow = { ...record, hash };
    memory.set(record.id, row);
    memoryByHash.set(hash, row);
  }
  return { token, record };
}

export async function listKeys(owner: ApiKeyOwner): Promise<ApiKeyRecord[]> {
  const sb = serverSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("causalist_api_keys")
      .select("id, user_id, user_login, key_prefix, name, created_at, last_used_at")
      .eq("user_id", owner.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToRecord);
  }
  return Array.from(memory.values())
    .filter((r) => r.userId === owner.userId)
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(({ hash: _h, ...rest }) => rest);
}

export async function revokeKey(
  owner: ApiKeyOwner,
  id: string,
): Promise<boolean> {
  const sb = serverSupabase();
  if (sb) {
    const { error, count } = await sb
      .from("causalist_api_keys")
      .delete({ count: "exact" })
      .eq("user_id", owner.userId)
      .eq("id", id);
    if (error) throw new Error(error.message);
    return (count ?? 0) > 0;
  }
  const row = memory.get(id);
  if (!row || row.userId !== owner.userId) return false;
  memory.delete(id);
  memoryByHash.delete(row.hash);
  return true;
}

/** Resolve a Bearer token to its owner. Returns null on miss. */
export async function lookupKey(token: string): Promise<ApiKeyRecord | null> {
  if (!token.startsWith(KEY_PREFIX)) return null;
  const hash = sha256(token);
  const sb = serverSupabase();
  if (sb) {
    const { data, error } = await sb
      .from("causalist_api_keys")
      .select("id, user_id, user_login, key_prefix, name, created_at, last_used_at")
      .eq("key_hash", hash)
      .maybeSingle();
    if (error || !data) return null;
    // Best-effort last_used update — fire and forget.
    void sb
      .from("causalist_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id);
    return rowToRecord(data);
  }
  const row = memoryByHash.get(hash);
  if (!row) return null;
  row.lastUsedAt = Date.now();
  const { hash: _h, ...rest } = row;
  return rest;
}

/** Helper for routes — pulls Bearer from req, resolves, returns owner
 *  or null. Doesn't 401 itself; caller decides the response shape. */
export async function requireApiKey(
  req: Request,
): Promise<ApiKeyRecord | null> {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  return lookupKey(m[1].trim());
}

function rowToRecord(r: Record<string, unknown>): ApiKeyRecord {
  return {
    id: r.id as string,
    userId: (r.user_id as number) ?? 0,
    userLogin: (r.user_login as string) ?? "",
    keyPrefix: (r.key_prefix as string) ?? "",
    name: (r.name as string) ?? "",
    createdAt: r.created_at
      ? new Date(r.created_at as string).getTime()
      : Date.now(),
    lastUsedAt: r.last_used_at
      ? new Date(r.last_used_at as string).getTime()
      : undefined,
  };
}
