import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

// Lazy singleton — only constructed in the browser so SSR/prerender never
// touches the env vars. Falls back gracefully when vars are not yet set.
export function getSupabase(): SupabaseClient {
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase env vars are not configured.");
  _client = createClient(url, key);
  return _client;
}

// Convenience re-export — use getSupabase() in code that may run during SSR.
// For client-only components the direct export is fine.
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return getSupabase()[prop as keyof SupabaseClient];
  },
});
