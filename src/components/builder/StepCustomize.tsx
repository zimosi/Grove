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
}

type Tab = "plants" | "decorations";

// Category color dots
const CATEGORY_COLORS: Record<string, string> = {
  plant: "#6daa7a",
  decoration: "#a89060",
};

function ItemCard({
  item,
  isSelected,
  onSelect,
}: {
  item: CatalogItem;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={[
        "group w-full text-left rounded-xl border transition-all duration-200",
        "flex items-center gap-3.5 px-4 py-3.5",
        isSelected
          ? "border-grove-sage/50 bg-grove-sage/10 shadow-[0_0_0_1px_rgba(74,124,89,0.2)]"
          : "border-grove-border bg-white/60 hover:border-grove-muted/30 hover:bg-white/80",
      ].join(" ")}
    >
      {/* Icon or color swatch */}
      <div
        className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center overflow-hidden"
        style={{
          backgroundColor: item.color + "18",
          border: `1px solid ${item.color}30`,
        }}
      >
        {item.iconUrl ? (
          <img
            src={item.iconUrl}
            alt={item.name}
            className="w-8 h-8 object-contain"
            draggable={false}
          />
        ) : (
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color }} />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className={[
          "text-[0.82rem] font-semibold leading-tight transition-colors",
          isSelected ? "text-grove-text" : "text-grove-text/80 group-hover:text-grove-text",
        ].join(" ")}>
          {item.name}
        </div>
        {item.clusterCount && (
          <div className="text-[0.62rem] grove-body mt-0.5">
            Places as cluster of {item.clusterCount}
          </div>
        )}
      </div>

      {/* Price */}
      <div className={[
        "text-[0.8rem] tabular-nums font-medium shrink-0 transition-colors",
        isSelected ? "text-grove-sage" : "text-grove-muted",
      ].join(" ")}>
        ${item.price}
      </div>

      {/* Active indicator */}
      {isSelected && (
        <div className="w-1.5 h-1.5 rounded-full bg-grove-sage shrink-0 animate-pulse" />
      )}
    </button>
  );
}

const TERRAIN_PRESETS: { id: TerrainPreset; label: string; icon: string }[] = [
  { id: "flat",  label: "Flat",  icon: "▬" },
  { id: "ridge", label: "Ridge", icon: "▲" },
  { id: "hills", label: "Hills", icon: "∿" },
  { id: "basin", label: "Basin", icon: "◡" },
];

// Brush size presets: [world-unit radius, display label]
const BRUSH_SIZES: [number, string][] = [
  [0.06, "XS"],
  [0.10, "S"],
  [0.14, "M"],
  [0.20, "L"],
  [0.28, "XL"],
];

export default function StepCustomize({
  selectedItemId,
  toolMode,
  placedCount,
  totalPrice,
  foamBrushSize,
  onSelectItem,
  onSetTool,
  onFoamBrushChange,
  onFoamUndo,
  onUndo,
  onBack,
  onAddToCart,
  onApplyPreset,
}: StepCustomizeProps) {
  const [tab, setTab] = useState<Tab>("plants");
  const items = tab === "plants" ? PLANTS : DECORATIONS;
  const isSculpt = toolMode === "sculpt";
  const isFoam   = toolMode === "foam" || toolMode === "smooth";
  const hideItems = isSculpt || isFoam;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-5">
        <p className="grove-step-label mb-2">Step 3 — Customize</p>
        <h2 className="grove-heading text-[1.75rem]" style={{ fontFamily: "var(--font-display)" }}>
          Build your world
        </h2>
      </div>

      {/* Tool toggle */}
      <div className="flex gap-1.5 mb-4 p-1.5 bg-grove-bg/80 rounded-xl border border-grove-border">
        {(["place", "sculpt", "foam", "remove"] as ToolMode[]).map((mode) => {
          const isActive = toolMode === mode || (mode === "foam" && toolMode === "smooth");
          return (
            <button
              key={mode}
              onClick={() => onSetTool(mode)}
              className={[
                "flex-1 h-9 rounded-lg text-[0.62rem] tracking-[0.06em] uppercase font-semibold transition-all",
                isActive
                  ? mode === "remove"
                    ? "bg-red-100 text-red-700 border border-red-200"
                    : mode === "sculpt"
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : mode === "foam"
                    ? "bg-sky-100 text-sky-800 border border-sky-200"
                    : "bg-white text-grove-text border border-grove-border shadow-sm"
                  : "text-grove-muted hover:text-grove-text border border-transparent",
              ].join(" ")}
            >
              {mode === "place" ? "Place" : mode === "sculpt" ? "⛰ Sculpt" : mode === "foam" ? "🫧 Foam" : "✕ Remove"}
            </button>
          );
        })}
      </div>

      {/* Foam panel — shown in foam or smooth mode */}
      {(toolMode === "foam" || toolMode === "smooth") && (
        <div className="mb-4 p-3 rounded-xl border border-sky-200 bg-sky-50/80 space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-sky-500" />
            <span className="text-[0.68rem] font-semibold text-sky-800 tracking-[0.06em] uppercase">
              Foam Tools
            </span>
          </div>

          {/* Paint / Smooth sub-mode toggle */}
          <div className="flex gap-1.5 p-1 bg-white/70 rounded-lg border border-sky-200">
            <button
              onClick={() => onSetTool("foam")}
              className={[
                "flex-1 h-8 rounded-md text-[0.62rem] tracking-[0.06em] uppercase font-semibold transition-all",
                toolMode === "foam"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-sky-600 hover:bg-sky-100",
              ].join(" ")}
            >
              🫧 Paint
            </button>
            <button
              onClick={() => onSetTool("smooth")}
              className={[
                "flex-1 h-8 rounded-md text-[0.62rem] tracking-[0.06em] uppercase font-semibold transition-all",
                toolMode === "smooth"
                  ? "bg-sky-500 text-white shadow-sm"
                  : "text-sky-600 hover:bg-sky-100",
              ].join(" ")}
            >
              ◌ Smooth
            </button>
          </div>

          {/* Brush size */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[0.6rem] tracking-[0.14em] uppercase text-sky-600 font-medium">
                Brush size
              </span>
              <span className="text-[0.62rem] text-sky-800 tabular-nums font-medium">
                {BRUSH_SIZES.find(([v]) => v === foamBrushSize)?.[1] ?? "—"}
              </span>
            </div>
            {/* Size presets as circles */}
            <div className="flex items-center justify-between gap-1.5">
              {BRUSH_SIZES.map(([size, label]) => {
                const active = foamBrushSize === size;
                return (
                  <button
                    key={label}
                    onClick={() => onFoamBrushChange(size)}
                    title={label}
                    className={[
                      "flex-1 flex flex-col items-center gap-1.5 py-2 rounded-xl border transition-all",
                      active
                        ? "border-sky-400 bg-sky-100"
                        : "border-grove-border bg-white/60 hover:border-sky-300 hover:bg-sky-50",
                    ].join(" ")}
                  >
                    <div
                      className={["rounded-full transition-colors", active ? "bg-sky-500" : "bg-sky-300/50"].join(" ")}
                      style={{ width: 6 + BRUSH_SIZES.findIndex(([v]) => v === size) * 4, height: 6 + BRUSH_SIZES.findIndex(([v]) => v === size) * 4 }}
                    />
                    <span className={["text-[0.58rem] font-semibold", active ? "text-sky-800" : "text-sky-600/70"].join(" ")}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Undo last stroke */}
          <button
            onClick={onFoamUndo}
            className="w-full h-8 rounded-xl border border-sky-200 bg-white text-[0.65rem] tracking-[0.08em] uppercase font-medium text-sky-700 hover:bg-sky-50 hover:border-sky-300 transition-all"
          >
            ↩ Undo stroke
          </button>

          <p className="text-[0.6rem] text-sky-600/90 leading-relaxed">
            {toolMode === "smooth"
              ? "Hold & drag over bumpy areas to blend and flatten the surface."
              : "Hold & drag on any surface to extrude foam. Rotate to build from any angle."}
          </p>
        </div>
      )}

      {/* Terrain presets — only shown in sculpt mode */}
      {isSculpt && (
        <div className="mb-4">
          <div className="grove-step-label mb-2">Terrain preset</div>
          <div className="grid grid-cols-4 gap-1.5">
            {TERRAIN_PRESETS.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => onApplyPreset(id)}
                className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-grove-border bg-white/60 hover:border-grove-sage/40 hover:bg-grove-sage/10 transition-all text-grove-muted hover:text-grove-sage font-medium"
              >
                <span className="text-[0.9rem]">{icon}</span>
                <span className="text-[0.6rem] tracking-[0.06em]">{label}</span>
              </button>
            ))}
          </div>
          <p className="text-[0.62rem] grove-body mt-2">
            Hold &amp; drag on terrain to raise. Presets reset the landscape shape.
          </p>
        </div>
      )}

      {/* Tab switch — hidden during sculpt/foam */}
      {!hideItems && (
        <div className="flex gap-2 mb-3">
          {(["plants", "decorations"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={[
                "flex-1 h-9 rounded-xl text-[0.68rem] tracking-[0.1em] uppercase font-semibold transition-all",
                tab === t
                  ? "bg-grove-sage/15 text-grove-sage border border-grove-sage/40"
                  : "text-grove-muted border border-grove-border hover:text-grove-text hover:border-grove-muted/40",
              ].join(" ")}
            >
              {t === "plants" ? "🌿 Plants" : "🪨 Decor"}
            </button>
          ))}
        </div>
      )}

      {/* Item list — hidden during sculpt */}
      <div className={["flex-1 overflow-y-auto space-y-1.5 scrollbar-thin -mr-1 pr-1", hideItems ? "hidden" : ""].join(" ")}>
        {items.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            isSelected={selectedItemId === item.id}
            onSelect={() => onSelectItem(selectedItemId === item.id ? null : item.id)}
          />
        ))}
      </div>

      {/* Spacer when no item list */}
      {hideItems && <div className="flex-1" />}

      {/* Price strip + CTA */}
      <div className="mt-4 pt-4 border-t border-grove-border">
        {/* Price row */}
        <div className="flex items-end justify-between mb-4">
          <div>
            <p className="grove-step-label mb-1">Total price</p>
            <div
              className="grove-heading text-[2.4rem] leading-none"
              style={{ fontFamily: "var(--font-display)" }}
            >
              ${totalPrice.toFixed(2)}
            </div>
          </div>

          {placedCount > 0 && (
            <div className="text-right pb-1">
              <div className="text-[0.68rem] grove-body">
                {placedCount} item{placedCount !== 1 ? "s" : ""}
              </div>
              <button
                onClick={onUndo}
                className="text-[0.65rem] text-grove-sage font-medium hover:underline transition-colors mt-0.5 underline-offset-2"
              >
                Undo last
              </button>
            </div>
          )}
        </div>

        {/* Add to cart */}
        <button
          onClick={onAddToCart}
          className="w-full h-13 rounded-2xl bg-grove-sage text-white text-[0.8rem] tracking-[0.1em] uppercase font-semibold hover:bg-grove-moss shadow-md active:scale-[0.98] transition-all duration-300 mb-2.5"
        >
          Order This Terrarium
        </button>

        <button
          onClick={onBack}
          className="w-full h-10 rounded-xl border border-grove-border text-grove-muted text-[0.7rem] tracking-[0.1em] uppercase font-medium hover:border-grove-muted/40 hover:text-grove-text transition-all"
        >
          ← Change Base
        </button>
      </div>
    </div>
  );
}
