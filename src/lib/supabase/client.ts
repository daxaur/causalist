import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client. Uses the SERVICE_ROLE_KEY so it can
 * bypass RLS for pair-code / session-graph writes. Never export this
 * to a client bundle.
 *
 * Fails soft: if the env is missing (e.g. local dev without a real
 * Supabase project), returns null and callers fall back to the
 * in-memory stores.
 */
let _server: SupabaseClient | null | undefined;

export function serverSupabase(): SupabaseClient | null {
  if (_server !== undefined) return _server;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    _server = null;
    return null;
  }
  _server = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _server;
}

/**
 * Whether persistence is configured. Routes use this to pick between
 * the Supabase-backed path and the in-memory fallback.
 */
export function hasSupabase(): boolean {
  return serverSupabase() !== null;
}
