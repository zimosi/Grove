"use client";
import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type Mode = "options" | "magic-link" | "check-email";

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("options");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setMode("options");
      setEmail("");
      setError(null);
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  const handleGoogleSignIn = async () => {
    const sb = getSupabase();
    if (!sb) { setError("Supabase is not configured yet."); return; }
    setLoading(true);
    setError(null);
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    const sb = getSupabase();
    if (!sb) { setError("Supabase is not configured yet."); return; }
    setLoading(true);
    setError(null);
    const { error } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setMode("check-email");
    }
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm mx-4 bg-grove-panel rounded-2xl border border-grove-border shadow-2xl p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-grove-muted hover:text-grove-text hover:bg-grove-forest/60 transition-colors"
          aria-label="Close"
        >
          ✕
        </button>

        {mode === "check-email" ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-4">✉️</div>
            <h2 className="text-[1.05rem] font-semibold text-grove-text mb-2">
              Check your email
            </h2>
            <p className="text-[0.8rem] text-grove-muted">
              We sent a magic link to <strong>{email}</strong>. Click it to sign
              in — no password needed.
            </p>
            <button
              onClick={() => setMode("options")}
              className="mt-6 text-[0.75rem] text-grove-sage hover:underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-[1.05rem] font-semibold text-grove-text mb-1">
              Sign in to Grove
            </h2>
            <p className="text-[0.78rem] text-grove-muted mb-6">
              Save and revisit your terrarium designs.
            </p>

            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[0.75rem] text-red-700">
                {error}
              </div>
            )}

            {mode === "options" && (
              <>
                {/* Google */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 h-10 rounded-xl border border-grove-border bg-white hover:bg-grove-forest/40 text-[0.82rem] font-medium text-grove-text transition-colors disabled:opacity-50 mb-3"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                    <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-grove-border" />
                  <span className="text-[0.7rem] text-grove-muted">or</span>
                  <div className="flex-1 h-px bg-grove-border" />
                </div>

                {/* Email magic link */}
                <button
                  onClick={() => setMode("magic-link")}
                  className="w-full h-10 rounded-xl border border-grove-border hover:bg-grove-forest/40 text-[0.82rem] font-medium text-grove-text transition-colors"
                >
                  Continue with Email
                </button>
              </>
            )}

            {mode === "magic-link" && (
              <form onSubmit={handleMagicLink} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-10 px-3 rounded-xl border border-grove-border bg-white text-[0.82rem] text-grove-text placeholder:text-grove-muted focus:outline-none focus:ring-2 focus:ring-grove-sage/30"
                />
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full h-10 rounded-xl bg-grove-sage text-white text-[0.82rem] font-medium hover:bg-grove-moss transition-colors disabled:opacity-50"
                >
                  {loading ? "Sending…" : "Send magic link"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("options")}
                  className="w-full text-[0.75rem] text-grove-muted hover:text-grove-text transition-colors"
                >
                  Back
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
