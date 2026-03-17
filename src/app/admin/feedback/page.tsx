"use client";
import { useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SurveyRow {
  id: string;
  created_at: string;
  trigger_action: string;
  satisfaction_rating: number;
  purchase_intent: "yes" | "maybe" | "no";
  feedback_text: string | null;
  email: string | null;
  builder_snapshot: {
    container?: string | null;
    substrate?: string | null;
    itemCount?: number;
    totalPrice?: number;
  } | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function pct(count: number, total: number): string {
  if (!total) return "0%";
  return Math.round((count / total) * 100) + "%";
}

const STARS = ["", "★", "★★", "★★★", "★★★★", "★★★★★"];

const INTENT_COLORS: Record<string, string> = {
  yes:   "bg-grove-sage",
  maybe: "bg-amber-400",
  no:    "bg-grove-border",
};

const INTENT_TEXT_COLORS: Record<string, string> = {
  yes:   "text-grove-sage",
  maybe: "text-amber-600",
  no:    "text-grove-muted",
};

const INTENT_LABELS: Record<string, string> = {
  yes:   "Yes, definitely",
  maybe: "Maybe later",
  no:    "Not right now",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export default function FeedbackDashboard() {
  const [rows,    setRows]    = useState<SurveyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) { setError("Supabase not configured."); setLoading(false); return; }
    sb.from("survey_responses")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error: e }) => {
        if (e) setError(e.message);
        else setRows((data ?? []) as SurveyRow[]);
        setLoading(false);
      });
  }, []);

  // ── Derived stats ──────────────────────────────────────────────────────────
  const total       = rows.length;
  const avgRating   = avg(rows.map((r) => r.satisfaction_rating));
  const emailCount  = rows.filter((r) => r.email).length;
  const ratingDist  = [5, 4, 3, 2, 1].map((n) => ({
    n,
    count: rows.filter((r) => r.satisfaction_rating === n).length,
  }));
  const intentDist  = (["yes", "maybe", "no"] as const).map((v) => ({
    v,
    count: rows.filter((r) => r.purchase_intent === v).length,
  }));

  return (
    <div className="min-h-screen bg-grove-bg px-6 py-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[0.65rem] tracking-[0.2em] uppercase text-grove-muted font-medium mb-2">
          Admin
        </p>
        <h1
          className="text-[2.2rem] font-light tracking-[-0.04em] text-grove-text"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Feedback Dashboard
        </h1>
      </div>

      {/* ── Loading / Error ── */}
      {loading && (
        <div className="flex gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 flex-1 rounded-2xl bg-grove-border/30 animate-pulse" />
          ))}
        </div>
      )}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      {!loading && !error && (
        <>
          {/* ── Stat cards ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {/* Total */}
            <StatCard
              label="Total responses"
              value={String(total)}
              sub={total === 0 ? "No data yet" : "all time"}
            />
            {/* Avg rating */}
            <StatCard
              label="Avg satisfaction"
              value={total ? avgRating.toFixed(1) : "—"}
              sub={total ? `out of 5 stars` : "no data"}
              accent={avgRating >= 4 ? "green" : avgRating >= 3 ? "amber" : "red"}
            />
            {/* Would buy */}
            <StatCard
              label="Would buy"
              value={intentDist.find((d) => d.v === "yes")?.count ? String(intentDist.find((d) => d.v === "yes")!.count) : "0"}
              sub={total ? `${pct(intentDist.find((d) => d.v === "yes")?.count ?? 0, total)} of respondents` : "no data"}
              accent="green"
            />
            {/* Emails */}
            <StatCard
              label="Emails collected"
              value={String(emailCount)}
              sub={total ? `${pct(emailCount, total)} left email` : "no data"}
            />
          </div>

          {/* ── Charts row ─────────────────────────────────────────────────── */}
          {total > 0 && (
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {/* Rating distribution */}
              <div className="rounded-2xl border border-grove-border bg-grove-panel p-5">
                <p className="text-[0.65rem] tracking-[0.18em] uppercase text-grove-muted font-semibold mb-4">
                  Satisfaction distribution
                </p>
                <div className="space-y-2.5">
                  {ratingDist.map(({ n, count }) => (
                    <div key={n} className="flex items-center gap-3">
                      <span className="text-[0.72rem] text-grove-muted w-12 shrink-0 tabular-nums">
                        {STARS[n]}
                      </span>
                      <div className="flex-1 h-5 bg-grove-bg rounded-full overflow-hidden">
                        <div
                          className="h-full bg-grove-sage rounded-full transition-all duration-500"
                          style={{ width: pct(count, total) }}
                        />
                      </div>
                      <span className="text-[0.72rem] text-grove-muted w-8 text-right tabular-nums shrink-0">
                        {count}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Purchase intent */}
              <div className="rounded-2xl border border-grove-border bg-grove-panel p-5">
                <p className="text-[0.65rem] tracking-[0.18em] uppercase text-grove-muted font-semibold mb-4">
                  Purchase intent
                </p>
                <div className="space-y-3">
                  {intentDist.map(({ v, count }) => (
                    <div key={v}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={["text-[0.78rem] font-semibold", INTENT_TEXT_COLORS[v]].join(" ")}>
                          {INTENT_LABELS[v]}
                        </span>
                        <span className="text-[0.72rem] text-grove-muted tabular-nums">
                          {count} ({pct(count, total)})
                        </span>
                      </div>
                      <div className="h-3 bg-grove-bg rounded-full overflow-hidden">
                        <div
                          className={["h-full rounded-full transition-all duration-500", INTENT_COLORS[v]].join(" ")}
                          style={{ width: pct(count, total) }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── Response list ───────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-grove-border bg-grove-panel overflow-hidden">
            <div className="px-6 py-4 border-b border-grove-border">
              <p className="text-[0.65rem] tracking-[0.18em] uppercase text-grove-muted font-semibold">
                All responses · {total} total
              </p>
            </div>

            {total === 0 ? (
              <div className="px-6 py-16 text-center">
                <span className="text-3xl opacity-20 block mb-3">📋</span>
                <p className="text-grove-muted text-[0.85rem]">No responses yet.</p>
                <p className="text-grove-muted/60 text-[0.75rem] mt-1">
                  Survey appears after &quot;Order&quot; or &quot;Save Design&quot; in the builder.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-grove-border">
                {rows.map((row) => (
                  <ResponseRow key={row.id} row={row} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: "green" | "amber" | "red";
}) {
  const valueColor =
    accent === "green" ? "text-grove-sage" :
    accent === "amber" ? "text-amber-600" :
    accent === "red"   ? "text-red-600" :
    "text-grove-text";

  return (
    <div className="rounded-2xl border border-grove-border bg-grove-panel p-5">
      <p className="text-[0.62rem] tracking-[0.14em] uppercase text-grove-muted font-medium mb-2">
        {label}
      </p>
      <p className={["text-[2rem] font-light leading-none mb-1", valueColor].join(" ")}
         style={{ fontFamily: "var(--font-display)" }}>
        {value}
      </p>
      <p className="text-[0.65rem] text-grove-muted/70">{sub}</p>
    </div>
  );
}

function ResponseRow({ row }: { row: SurveyRow }) {
  const snap = row.builder_snapshot;
  return (
    <div className="px-6 py-4 hover:bg-grove-bg/60 transition-colors">
      <div className="flex items-start gap-4">
        {/* Rating badge */}
        <div className="shrink-0 mt-0.5">
          <div className={[
            "w-9 h-9 rounded-xl flex items-center justify-center text-[0.9rem] font-bold",
            row.satisfaction_rating >= 4 ? "bg-grove-sage/15 text-grove-sage" :
            row.satisfaction_rating >= 3 ? "bg-amber-50 text-amber-600" :
            "bg-red-50 text-red-600",
          ].join(" ")}>
            {row.satisfaction_rating}
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {/* Intent pill */}
            <span className={[
              "inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.65rem] font-semibold border",
              row.purchase_intent === "yes"   ? "bg-grove-sage/10 text-grove-sage border-grove-sage/20" :
              row.purchase_intent === "maybe" ? "bg-amber-50 text-amber-700 border-amber-200" :
              "bg-grove-bg text-grove-muted border-grove-border",
            ].join(" ")}>
              {INTENT_LABELS[row.purchase_intent]}
            </span>

            {/* Trigger */}
            <span className="text-[0.62rem] text-grove-muted/60 font-mono">
              {row.trigger_action === "order_click" ? "via Order" : "via Save"}
            </span>

            {/* Email indicator */}
            {row.email && (
              <span className="text-[0.62rem] text-grove-sage font-medium">
                ✉ {row.email}
              </span>
            )}

            {/* Timestamp */}
            <span className="text-[0.62rem] text-grove-muted/50 ml-auto shrink-0">
              {formatDate(row.created_at)}
            </span>
          </div>

          {/* Feedback text */}
          {row.feedback_text && (
            <p className="text-[0.78rem] text-grove-text/80 leading-relaxed mb-1.5">
              &ldquo;{row.feedback_text}&rdquo;
            </p>
          )}

          {/* Snapshot summary */}
          {snap && (
            <p className="text-[0.65rem] text-grove-muted/60">
              {[
                snap.container && `${snap.container}`,
                snap.substrate && `${snap.substrate}`,
                snap.itemCount != null && `${snap.itemCount} items`,
                snap.totalPrice != null && `$${Number(snap.totalPrice).toFixed(2)}`,
              ].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
