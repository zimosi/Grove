"use client";
import { useState } from "react";
import { PLANTS, DECORATIONS } from "@/data/catalog";
import type { CatalogItem, ToolMode } from "@/types";
import type { TerrainPreset } from "@/lib/heightmap";

interface StepCustomizeProps {
  selectedItemId: string | null;
  toolMode: ToolMode;
  placedCount: number;
  totalPrice: number;
  foamBrushSize: number;
  onSelectItem: (id: string | null) => void;
  onSetTool: (mode: ToolMode) => void;
  onFoamBrushChange: (size: number) => void;
  onFoamUndo: () => void;
  onUndo: () => void;
  onBack: () => void;
  onAddToCart: () => void;
  onApplyPreset: (preset: TerrainPreset) => void;
  onSaveDesign?: () => void;
  isSaving?: boolean;
}

type Tab = "plants" | "decorations";

const TERRAIN_PRESETS: { id: TerrainPreset; label: string; icon: string }[] = [
  { id: "flat",  label: "Flat",  icon: "▬" },
  { id: "ridge", label: "Ridge", icon: "▲" },
  { id: "hills", label: "Hills", icon: "∿" },
  { id: "basin", label: "Basin", icon: "◡" },
];

const BRUSH_SIZES: [number, string][] = [
  [0.06, "XS"], [0.10, "S"], [0.14, "M"], [0.20, "L"], [0.28, "XL"],
];

// ── Tool mode config ────────────────────────────────────────────────────────
const TOOLS: { mode: ToolMode; label: string; groupFoam?: boolean }[] = [
  { mode: "place",  label: "Place"  },
  { mode: "sculpt", label: "Sculpt" },
  { mode: "foam",   label: "Foam"   },
  { mode: "remove", label: "Remove" },
];

function ItemCard({ item, isSelected, onSelect }: { item: CatalogItem; isSelected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="group w-full text-left rounded-xl flex items-center gap-3 px-3.5 py-3 transition-all duration-150"
      style={{
        border: isSelected ? "1px solid rgba(92,191,117,0.3)" : "1px solid rgba(255,255,255,0.06)",
        background: isSelected ? "rgba(92,191,117,0.08)" : "rgba(255,255,255,0.03)",
        boxShadow: isSelected ? "0 0 0 1px rgba(92,191,117,0.1)" : "none",
      }}
      onMouseEnter={e => { if (!isSelected) { (e.currentTarget.style.borderColor = "rgba(255,255,255,0.11)"); (e.currentTarget.style.background = "rgba(255,255,255,0.05)"); } }}
      onMouseLeave={e => { if (!isSelected) { (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"); (e.currentTarget.style.background = "rgba(255,255,255,0.03)"); } }}
    >
      {/* Icon swatch */}
      <div
        className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
        style={{ background: item.color + "18", border: `1px solid ${item.color}28` }}
      >
        {item.iconUrl
          ? <img src={item.iconUrl} alt={item.name} className="w-7 h-7 object-contain" draggable={false} />
          : <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: item.color }} />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[0.79rem] font-semibold leading-tight truncate transition-colors"
          style={{ color: isSelected ? "#d8e8dc" : "rgba(216,232,220,0.65)" }}>
          {item.name}
        </div>
        {item.clusterCount && (
          <div className="text-[0.6rem] mt-0.5" style={{ color: "rgba(190,220,200,0.35)" }}>
            Cluster of {item.clusterCount}
          </div>
        )}
      </div>

      <div className="text-[0.76rem] tabular-nums font-medium shrink-0"
        style={{ color: isSelected ? "#5cbf75" : "rgba(216,232,220,0.3)" }}>
        ${item.price}
      </div>

      {isSelected && (
        <div className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse" style={{ background: "#5cbf75" }} />
      )}
    </button>
  );
}

export default function StepCustomize({
  selectedItemId, toolMode, placedCount, totalPrice, foamBrushSize,
  onSelectItem, onSetTool, onFoamBrushChange, onFoamUndo, onUndo,
  onBack, onAddToCart, onApplyPreset, onSaveDesign, isSaving = false,
}: StepCustomizeProps) {
  const [tab, setTab] = useState<Tab>("plants");
  const items   = tab === "plants" ? PLANTS : DECORATIONS;
  const isSculpt = toolMode === "sculpt";
  const isFoam   = toolMode === "foam" || toolMode === "smooth" || toolMode === "paint";
  const hideItems = isSculpt || isFoam;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-5">
        <p className="grove-step-label mb-2">Step 3 — Customize</p>
        <h2 className="grove-heading text-[1.65rem]" style={{ fontFamily: "var(--font-display)" }}>
          Build your world
        </h2>
      </div>

      {/* ── Tool toggle ── */}
      <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
        {TOOLS.map(({ mode, label }) => {
          const isActive = toolMode === mode || (mode === "foam" && (toolMode === "smooth" || toolMode === "paint"));
          return (
            <button
              key={mode}
              onClick={() => onSetTool(mode)}
              className="flex-1 h-8 rounded-lg text-[0.62rem] tracking-[0.06em] uppercase font-semibold transition-all duration-150"
              style={isActive ? {
                background: mode === "remove"
                  ? "rgba(239,68,68,0.15)"
                  : mode === "sculpt"
                  ? "rgba(245,158,11,0.15)"
                  : mode === "foam"
                  ? "rgba(56,189,248,0.15)"
                  : "rgba(255,255,255,0.1)",
                color: mode === "remove"
                  ? "#f87171"
                  : mode === "sculpt"
                  ? "#fbbf24"
                  : mode === "foam"
                  ? "#7dd3fc"
                  : "#d8e8dc",
                border: "1px solid " + (mode === "remove" ? "rgba(239,68,68,0.25)" : mode === "sculpt" ? "rgba(245,158,11,0.25)" : mode === "foam" ? "rgba(56,189,248,0.25)" : "rgba(255,255,255,0.12)"),
              } : {
                color: "rgba(216,232,220,0.35)",
                border: "1px solid transparent",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ── Foam panel ── */}
      {isFoam && (
        <div className="mb-4 p-3.5 rounded-xl space-y-3"
          style={{ background: "rgba(56,189,248,0.06)", border: "1px solid rgba(56,189,248,0.15)" }}>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: "#7dd3fc" }} />
            <span className="text-[0.62rem] font-bold tracking-[0.1em] uppercase" style={{ color: "rgba(125,211,252,0.7)" }}>
              Foam Tools
            </span>
          </div>

          {/* Sub-mode */}
          <div className="flex gap-1.5 p-1 rounded-lg" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(56,189,248,0.12)" }}>
            {([["foam", "🫧 Build"], ["smooth", "◌ Smooth"], ["paint", "🎨 Color"]] as [ToolMode, string][]).map(([m, lbl]) => (
              <button key={m} onClick={() => onSetTool(m)}
                className="flex-1 h-7 rounded-md text-[0.6rem] tracking-[0.04em] uppercase font-bold transition-all duration-150"
                style={toolMode === m ? {
                  background: "rgba(56,189,248,0.2)",
                  color: "#7dd3fc",
                  border: "1px solid rgba(56,189,248,0.3)",
                } : {
                  color: "rgba(125,211,252,0.45)",
                  border: "1px solid transparent",
                }}
              >
                {lbl}
              </button>
            ))}
          </div>

          {/* Brush size */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.58rem] tracking-[0.12em] uppercase font-semibold" style={{ color: "rgba(125,211,252,0.5)" }}>Brush size</span>
              <span className="text-[0.62rem] font-semibold" style={{ color: "rgba(125,211,252,0.7)" }}>
                {BRUSH_SIZES.find(([v]) => v === foamBrushSize)?.[1] ?? "—"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {BRUSH_SIZES.map(([size, label], idx) => {
                const active = foamBrushSize === size;
                return (
                  <button key={label} onClick={() => onFoamBrushChange(size)}
                    className="flex-1 flex flex-col items-center gap-1.5 py-2 rounded-xl transition-all duration-150"
                    style={{
                      border: active ? "1px solid rgba(56,189,248,0.35)" : "1px solid rgba(255,255,255,0.07)",
                      background: active ? "rgba(56,189,248,0.12)" : "rgba(255,255,255,0.03)",
                    }}>
                    <div className="rounded-full transition-colors"
                      style={{
                        width: 6 + idx * 4, height: 6 + idx * 4,
                        background: active ? "#7dd3fc" : "rgba(125,211,252,0.2)",
                      }} />
                    <span className="text-[0.56rem] font-bold" style={{ color: active ? "#7dd3fc" : "rgba(125,211,252,0.35)" }}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <button onClick={onFoamUndo}
            className="w-full h-7 rounded-lg text-[0.62rem] tracking-[0.06em] uppercase font-semibold transition-all duration-150"
            style={{
              border: "1px solid rgba(56,189,248,0.15)",
              background: "rgba(0,0,0,0.2)",
              color: "rgba(125,211,252,0.55)",
            }}
            onMouseEnter={e => { (e.currentTarget.style.background = "rgba(56,189,248,0.08)"); (e.currentTarget.style.color = "#7dd3fc"); }}
            onMouseLeave={e => { (e.currentTarget.style.background = "rgba(0,0,0,0.2)"); (e.currentTarget.style.color = "rgba(125,211,252,0.55)"); }}
          >
            ↩ Undo stroke
          </button>

          <p className="text-[0.6rem] leading-relaxed" style={{ color: "rgba(125,211,252,0.45)" }}>
            {toolMode === "smooth"
              ? "Hold & drag to blend and flatten bumpy areas."
              : toolMode === "paint"
              ? "Hold & drag on foam to paint it with substrate color."
              : "Hold & drag on any surface to extrude foam."}
          </p>
        </div>
      )}

      {/* ── Terrain presets ── */}
      {isSculpt && (
        <div className="mb-4 p-3.5 rounded-xl space-y-3"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: "#fbbf24" }} />
            <span className="text-[0.62rem] font-bold tracking-[0.1em] uppercase" style={{ color: "rgba(251,191,36,0.7)" }}>
              Terrain Preset
            </span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {TERRAIN_PRESETS.map(({ id, label, icon }) => (
              <button key={id} onClick={() => onApplyPreset(id)}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl transition-all duration-150"
                style={{
                  border: "1px solid rgba(245,158,11,0.15)",
                  background: "rgba(255,255,255,0.03)",
                  color: "rgba(251,191,36,0.5)",
                }}
                onMouseEnter={e => { (e.currentTarget.style.background = "rgba(245,158,11,0.08)"); (e.currentTarget.style.color = "#fbbf24"); (e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)"); }}
                onMouseLeave={e => { (e.currentTarget.style.background = "rgba(255,255,255,0.03)"); (e.currentTarget.style.color = "rgba(251,191,36,0.5)"); (e.currentTarget.style.borderColor = "rgba(245,158,11,0.15)"); }}
              >
                <span className="text-[0.9rem]">{icon}</span>
                <span className="text-[0.58rem] tracking-[0.06em] font-semibold uppercase">{label}</span>
              </button>
            ))}
          </div>
          <p className="text-[0.6rem] leading-relaxed" style={{ color: "rgba(251,191,36,0.4)" }}>
            Hold &amp; drag on terrain to raise. Presets reset the landscape.
          </p>
        </div>
      )}

      {/* ── Tab switch ── */}
      {!hideItems && (
        <div className="flex gap-1.5 mb-3">
          {(["plants", "decorations"] as Tab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 h-8 rounded-xl text-[0.66rem] tracking-[0.08em] uppercase font-semibold transition-all duration-150"
              style={tab === t ? {
                background: "rgba(92,191,117,0.12)",
                color: "#5cbf75",
                border: "1px solid rgba(92,191,117,0.25)",
              } : {
                color: "rgba(216,232,220,0.35)",
                border: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
              }}
              onMouseEnter={e => { if (tab !== t) { (e.currentTarget.style.color = "rgba(216,232,220,0.6)"); (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"); } }}
              onMouseLeave={e => { if (tab !== t) { (e.currentTarget.style.color = "rgba(216,232,220,0.35)"); (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"); } }}
            >
              {t === "plants" ? "🌿 Plants" : "🪨 Decor"}
            </button>
          ))}
        </div>
      )}

      {/* ── Item list ── */}
      <div className={["flex-1 overflow-y-auto space-y-1 scrollbar-thin -mr-1 pr-1", hideItems ? "hidden" : ""].join(" ")}>
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            isSelected={selectedItemId === item.id}
            onSelect={() => onSelectItem(selectedItemId === item.id ? null : item.id)}
          />
        ))}
      </div>

      {hideItems && <div className="flex-1" />}

      {/* ── Price + CTA ── */}
      <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="grove-step-label mb-1">Total</p>
            <div className="text-[2.2rem] font-light leading-none tracking-[-0.04em]"
              style={{ fontFamily: "var(--font-display)", color: "#d8e8dc" }}>
              ${totalPrice.toFixed(2)}
            </div>
          </div>
          {placedCount > 0 && (
            <div className="text-right pb-0.5">
              <div className="text-[0.66rem]" style={{ color: "rgba(216,232,220,0.35)" }}>
                {placedCount} item{placedCount !== 1 ? "s" : ""}
              </div>
              <button onClick={onUndo}
                className="text-[0.64rem] font-medium hover:underline transition-colors mt-0.5 underline-offset-2"
                style={{ color: "#5cbf75" }}>
                Undo last
              </button>
            </div>
          )}
        </div>

        <button onClick={onAddToCart}
          className="w-full h-12 rounded-2xl text-[0.78rem] tracking-[0.08em] uppercase font-bold transition-all duration-200 mb-2 active:scale-[0.98]"
          style={{
            background: "linear-gradient(135deg, #5cbf75 0%, #3d9156 100%)",
            color: "#fff",
            boxShadow: "0 4px 24px rgba(92,191,117,0.3)",
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 6px 32px rgba(92,191,117,0.45)")}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = "0 4px 24px rgba(92,191,117,0.3)")}
        >
          Order This Terrarium
        </button>

        {onSaveDesign && (
          <button onClick={onSaveDesign} disabled={isSaving}
            className="w-full h-10 rounded-xl text-[0.71rem] tracking-[0.06em] uppercase font-semibold transition-all duration-150 mb-2 disabled:opacity-40"
            style={{
              border: "1px solid rgba(92,191,117,0.25)",
              color: "#5cbf75",
              background: "rgba(92,191,117,0.06)",
            }}
            onMouseEnter={e => { if (!isSaving) { (e.currentTarget.style.background = "rgba(92,191,117,0.12)"); (e.currentTarget.style.borderColor = "rgba(92,191,117,0.4)"); } }}
            onMouseLeave={e => { (e.currentTarget.style.background = "rgba(92,191,117,0.06)"); (e.currentTarget.style.borderColor = "rgba(92,191,117,0.25)"); }}
          >
            {isSaving ? "Saving…" : "Save Design"}
          </button>
        )}

        <button onClick={onBack}
          className="w-full h-9 rounded-xl text-[0.69rem] tracking-[0.08em] uppercase font-medium transition-all duration-150"
          style={{
            border: "1px solid rgba(255,255,255,0.07)",
            color: "rgba(216,232,220,0.3)",
            background: "transparent",
          }}
          onMouseEnter={e => { (e.currentTarget.style.borderColor = "rgba(255,255,255,0.13)"); (e.currentTarget.style.color = "rgba(216,232,220,0.6)"); }}
          onMouseLeave={e => { (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)"); (e.currentTarget.style.color = "rgba(216,232,220,0.3)"); }}
        >
          ← Change Base
        </button>
      </div>
    </div>
  );
}
