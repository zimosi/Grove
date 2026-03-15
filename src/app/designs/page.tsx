"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getSupabase } from "@/lib/supabase";
import type { BuilderState } from "@/types";
import AuthModal from "@/components/auth/AuthModal";

interface TerrariumRow {
  id: string;
  name: string;
  state: BuilderState;
  created_at: string;
  updated_at: string;
}

function DesignCard({
  design,
  onOpen,
  onDelete,
}: {
  design: TerrariumRow;
  onOpen: () => void;
  onDelete: () => void;
}) {
  const date = new Date(design.updated_at).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const s = design.state;
  const itemCount = s.placedItems?.length ?? 0;
  const container = s.container ?? "—";
  const substrate = s.substrate ?? "—";

  return (
    <div className="group rounded-2xl border border-grove-border bg-grove-panel hover:border-grove-sage/40 transition-all duration-200 overflow-hidden flex flex-col">
      {/* Preview placeholder — forest-toned gradient */}
      <div className="h-32 bg-gradient-to-br from-[#e8ede9] to-[#d4dfd6] flex items-center justify-center shrink-0">
        <span className="text-4xl opacity-30">🌿</span>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-[0.88rem] font-semibold text-grove-text mb-1 leading-snug truncate">
          {design.name}
        </h3>
        <p className="text-[0.7rem] text-grove-muted mb-3">
          {container} · {substrate} · {itemCount} item{itemCount !== 1 ? "s" : ""}
        </p>
        <p className="text-[0.65rem] text-grove-muted/70 mb-4">Saved {date}</p>

        <div className="flex gap-2 mt-auto">
          <button
            onClick={onOpen}
            className="flex-1 h-9 rounded-xl bg-grove-sage text-white text-[0.72rem] font-semibold hover:bg-grove-moss transition-colors"
          >
            Open
          </button>
          <button
            onClick={onDelete}
            className="h-9 w-9 rounded-xl border border-grove-border text-grove-muted hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors text-sm flex items-center justify-center"
            title="Delete design"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DesignsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [designs, setDesigns] = useState<TerrariumRow[]>([]);
  const [fetching, setFetching] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const fetchDesigns = useCallback(async () => {
    if (!user) return;
    const sb = getSupabase();
    if (!sb) return;
    setFetching(true);
    const { data, error } = await sb
      .from("terrariums")
      .select("*")
      .order("updated_at", { ascending: false });
    if (!error && data) setDesigns(data as TerrariumRow[]);
    setFetching(false);
  }, [user]);

  useEffect(() => {
    if (!loading && !user) setAuthOpen(true);
    if (user) fetchDesigns();
  }, [user, loading, fetchDesigns]);

  const handleDelete = async (id: string) => {
    const sb = getSupabase();
    if (sb) await sb.from("terrariums").delete().eq("id", id);
    setDesigns((prev) => prev.filter((d) => d.id !== id));
  };

  // Opening a design: navigate to builder with state in sessionStorage
  const handleOpen = (design: TerrariumRow) => {
    sessionStorage.setItem("grove_load_state", JSON.stringify(design.state));
    router.push("/builder");
  };

  if (!loading && !user) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <p className="text-grove-muted text-[0.85rem] mb-4">
              Sign in to view your saved designs.
            </p>
            <button
              onClick={() => setAuthOpen(true)}
              className="h-10 px-6 rounded-xl bg-grove-sage text-white text-[0.78rem] font-semibold hover:bg-grove-moss transition-colors"
            >
              Sign in
            </button>
          </div>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-grove-bg px-6 py-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[0.65rem] tracking-[0.2em] uppercase text-grove-muted font-medium mb-2">
          Your collection
        </p>
        <h1
          className="text-[2.2rem] font-light tracking-[-0.04em] text-grove-text"
          style={{ fontFamily: "var(--font-display)" }}
        >
          My Designs
        </h1>
      </div>

      {fetching ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-56 rounded-2xl bg-grove-border/30 animate-pulse" />
          ))}
        </div>
      ) : designs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <span className="text-5xl opacity-20">🌿</span>
          <p className="text-grove-muted text-[0.85rem]">No saved designs yet.</p>
          <button
            onClick={() => router.push("/builder")}
            className="h-10 px-6 rounded-xl border border-grove-border text-grove-muted text-[0.78rem] font-medium hover:text-grove-text hover:border-grove-muted/40 transition-all"
          >
            Start building
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {designs.map((d) => (
            <DesignCard
              key={d.id}
              design={d}
              onOpen={() => handleOpen(d)}
              onDelete={() => handleDelete(d.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
