import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// This route handles the OAuth/magic-link redirect from Supabase.
// Supabase appends ?code=... to the URL; we exchange it for a session.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
