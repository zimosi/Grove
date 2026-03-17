"use client";
import { useState, useEffect } from "react";
import { getSupabase } from "@/lib/supabase";
import { getSessionId } from "@/lib/session";

export interface BuilderSnapshot {
  container: string | null;
  substrate: string | null;
  itemCount: number;
  totalPrice: number;
}

interface SurveyModalProps {
  open: boolean;
  onClose: () => void;
  triggerAction: "order_click" | "save_design";
  builderSnapshot?: BuilderSnapshot;
  designId?: string | null;
  userId?: string | null;
}

type SurveyStep = "form" | "success";
type PurchaseIntent = "yes" | "maybe" | "no";

const INTENT_OPTIONS: {
  value: PurchaseIntent;
  label: string;
  activeClass: string;
}[] = [
  { value: "yes",   label: "Definitely",  activeClass: "border-grove-sage bg-grove-sage text-white"   },
  { value: "maybe", label: "Maybe later", activeClass: "border-amber-400 bg-amber-400 text-white"     },
  { value: "no",    label: "Not really",  activeClass: "border-grove-muted bg-grove-muted text-white" },
];

const RATING_LABEL = ["", "Not great", "Could be better", "It's OK", "Pretty good", "Love it!"];

export default function SurveyModal({
  open,
  onClose,
  triggerAction,
  builderSnapshot,
  designId,
  userId,
}: SurveyModalProps) {
  const [step,         setStep]         = useState<SurveyStep>("form");
  const [rating,       setRating]       = useState<number | null>(null);
  const [hoverRating,  setHoverRating]  = useState<number | null>(null);
  const [intent,       setIntent]       = useState<PurchaseIntent | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [email,        setEmail]        = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep("form");
      setRating(null);
      setHoverRating(null);
      setIntent(null);
      setFeedbackText("");
      setEmail("");
      setError(null);
    }
  }, [open]);

  const canSubmit = rating !== null && intent !== null;
  const isOrderFlow = triggerAction === "order_click";
  const displayRating = hoverRating ?? rating;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const sb = getSupabase();
      if (sb) {
        const { error: dbError } = await sb.from("survey_responses").insert({
          source_page:         "builder",
          trigger_action:      triggerAction,
          satisfaction_rating: rating,
          purchase_intent:     intent,
          feedback_text:       feedbackText.trim() || null,
          email:               email.trim()        || null,
          builder_snapshot:    builderSnapshot     ?? null,
          user_id:             userId              ?? null,
          session_id:          getSessionId(),
          design_id:           designId            ?? null,
        });
        if (dbError) throw dbError;
      }
      setStep("success");
    } catch (e) {
      const msg =
        e instanceof Error ? e.message :
        (e && typeof e === "object" && "message" in e) ? String((e as { message: unknown }).message) :
        String(e);
      setError(msg || "Something went wrong — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* ── Success ─────────────────────────────────────────────────────── */}
        {step === "success" && (
          <div className="px-8 py-14 flex flex-col items-center text-center">
            <div className="text-5xl mb-5">🌿</div>
            <h2 className="text-[1.5rem] font-semibold text-grove-text mb-2 tracking-tight">
              Thanks so much!
            </h2>
            <p className="text-[0.85rem] text-grove-muted leading-relaxed">
              {email.trim()
                ? "We'll keep you posted on our launch."
                : "Your feedback helps us build something great."}
            </p>
            <button
              onClick={onClose}
              className="mt-8 h-11 px-8 rounded-2xl bg-grove-sage text-white text-[0.8rem] font-semibold hover:bg-grove-moss transition-colors"
            >
              Back to builder
            </button>
          </div>
        )}

        {/* ── Form ────────────────────────────────────────────────────────── */}
        {step === "form" && (
          <>
            {/* Green top bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-grove-sage to-grove-moss" />

            <div className="px-7 pt-7 pb-7">
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-5 right-5 w-7 h-7 rounded-full flex items-center justify-center text-grove-muted hover:text-grove-text hover:bg-grove-bg transition-colors text-sm"
              >
                ✕
              </button>

              {/* Header */}
              <div className="mb-8">
                <h2 className="text-[1.4rem] font-semibold text-grove-text tracking-tight mb-1.5">
                  How was your experience?
                </h2>
                <p className="text-[0.82rem] text-grove-muted">
                  Takes 20 seconds · helps us improve
                </p>
              </div>

              {/* ── Star rating ── */}
              <div className="mb-8">
                <p className="text-[0.7rem] font-semibold text-grove-text/50 uppercase tracking-widest mb-4">
                  Your rating
                </p>
                <div
                  className="flex gap-2.5"
                  onMouseLeave={() => setHoverRating(null)}
                >
                  {[1, 2, 3, 4, 5].map((n) => {
                    const active = displayRating !== null && n <= displayRating;
                    return (
                      <button
                        key={n}
                        onClick={() => setRating(n)}
                        onMouseEnter={() => setHoverRating(n)}
                        className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl border-2 transition-all duration-150 select-none"
                        style={{
                          borderColor: active ? "#4a7c59" : "rgba(28,33,30,0.08)",
                          background:  active ? "rgba(74,124,89,0.08)" : "white",
                          transform:   active ? "scale(1.06)" : "scale(1)",
                        }}
                      >
                        <span className={["text-[1.3rem] leading-none", active ? "text-grove-sage" : "text-grove-muted/30"].join(" ")}>
                          {active ? "★" : "☆"}
                        </span>
                        <span className={["text-[0.6rem] font-semibold tabular-nums", active ? "text-grove-sage" : "text-grove-muted/40"].join(" ")}>
                          {n}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="h-5 mt-2.5 text-center">
                  {displayRating && (
                    <p className="text-[0.78rem] text-grove-sage font-medium">
                      {RATING_LABEL[displayRating]}
                    </p>
                  )}
                </div>
              </div>

              {/* ── Purchase intent ── */}
              <div className="mb-8">
                <p className="text-[0.7rem] font-semibold text-grove-text/50 uppercase tracking-widest mb-4">
                  Would you buy this?
                </p>
                <div className="flex gap-2.5">
                  {INTENT_OPTIONS.map(({ value, label, activeClass }) => (
                    <button
                      key={value}
                      onClick={() => setIntent(value)}
                      className={[
                        "flex-1 py-4 rounded-2xl border-2 text-center transition-all duration-150 text-[0.78rem] font-semibold",
                        intent === value
                          ? activeClass
                          : "border-grove-border bg-white text-grove-muted hover:border-grove-muted/30 hover:text-grove-text",
                      ].join(" ")}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Feedback ── */}
              <div className="mb-4">
                <p className="text-[0.7rem] font-semibold text-grove-text/50 uppercase tracking-widest mb-4">
                  Any feedback? <span className="normal-case font-normal tracking-normal text-grove-muted/60">optional</span>
                </p>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="What would make this better?"
                  rows={2}
                  className="w-full rounded-2xl border border-grove-border bg-grove-bg/50 px-4 py-3.5 text-[0.85rem] text-grove-text placeholder:text-grove-muted/40 outline-none focus:border-grove-sage/50 focus:bg-white transition-all resize-none"
                />
              </div>

              {/* ── Email ── */}
              <div className="mb-7">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isOrderFlow ? "Email — notify me at launch (optional)" : "Email — stay updated (optional)"}
                  className="w-full rounded-2xl border border-grove-border bg-grove-bg/50 px-4 py-3.5 text-[0.85rem] text-grove-text placeholder:text-grove-muted/40 outline-none focus:border-grove-sage/50 focus:bg-white transition-all"
                />
              </div>

              {error && (
                <p className="text-[0.75rem] text-red-500 mb-3">{error}</p>
              )}

              {/* ── Actions ── */}
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className="text-grove-muted text-[0.78rem] font-medium hover:text-grove-text transition-colors px-1"
                >
                  Skip
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || submitting}
                  className="flex-1 h-12 rounded-2xl bg-grove-sage text-white text-[0.82rem] font-semibold hover:bg-grove-moss active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {submitting ? "Saving…" : isOrderFlow ? "Submit & Notify Me" : "Submit Feedback"}
                </button>
              </div>

              {!canSubmit && (
                <p className="text-[0.62rem] text-grove-muted/35 text-center mt-3">
                  Select a rating and intent to continue
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
