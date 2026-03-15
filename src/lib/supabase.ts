import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Returns the Supabase client, or null if env vars are not configured.
 * Always returns null during SSR so the server never touches the vars.
 */
export function getSupabase(): SupabaseClient | null {
  if (typeof window === "undefined") return null; // SSR guard
  if (_client) return _client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  if (!url.startsWith("http") || !key || key.startsWith("your_")) return null;
  try {
    _client = createClient(url, key);
    return _client;
  } catch {
    return null;
  }
}
