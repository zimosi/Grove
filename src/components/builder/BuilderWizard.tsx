"use client";
import { useReducer, useCallback, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { builderReducer, initialState } from "@/lib/builderReducer";
import StepContainer from "./StepContainer";
import StepSubstrate from "./StepSubstrate";
import StepCustomize from "./StepCustomize";
import type { ContainerShape, SubstrateType, PlacedItem, ToolMode } from "@/types";
import { getCatalogItem } from "@/data/catalog";
import type { TerrainPreset } from "@/lib/heightmap";

const TerrariumCanvas = dynamic(
  () => import("@/components/three/TerrariumCanvas"),
  { ssr: false, loading: () => <CanvasLoader /> }
);

function CanvasLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-grove-bg">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full border-2 border-grove-border animate-pulse" />
        <span className="text-[0.65rem] tracking-[0.15em] uppercase text-grove-muted font-medium">
          Loading scene…
        </span>
      </div>
    </div>
  );
}

// Hint text per step
const HINTS: Record<number, string> = {
  1: "Drag to rotate · Scroll to zoom",
  2: "Drag to rotate · Preview your substrate",
  3: "Select an item then click to place · Use Sculpt mode to shape terrain",
};

export default function BuilderWizard() {
  const [state, dispatch] = useReducer(builderReducer, initialState);
  const instanceId = useId();
  const instanceCounter = useRef(0);
  const [terrainPreset, setTerrainPreset] = useState<TerrainPreset | null>(null);
  const [presetTrigger, setPresetTrigger] = useState(0);
  const [foamBrushSize, setFoamBrushSize] = useState(0.13);
  const [foamUndoTrigger, setFoamUndoTrigger] = useState(0);
  const handleFoamUndo = useCallback(() => setFoamUndoTrigger((n) => n + 1), []);

  const handleApplyPreset = useCallback((preset: TerrainPreset) => {
    setTerrainPreset(preset);
    setPresetTrigger((n) => n + 1);
  }, []);

  const handlePlace = useCallback(
    (position: [number, number, number], normal: [number, number, number] = [0, 1, 0]) => {
      if (!state.selectedItemId) return;
      const catalogItem = getCatalogItem(state.selectedItemId);
      if (!catalogItem) return;

      if (catalogItem.clusterCount && catalogItem.clusterCount > 1) {
        // Place a cluster — each member shares the same surface normal
        for (let i = 0; i < catalogItem.clusterCount; i++) {
          const angle = (i / catalogItem.clusterCount) * Math.PI * 2;
          const r = 0.04 + Math.random() * 0.06;
          const px = position[0] + Math.cos(angle) * r;
          const pz = position[2] + Math.sin(angle) * r;
          const item: PlacedItem = {
            id: `${instanceId}-${++instanceCounter.current}`,
            itemId: state.selectedItemId,
            position: [px, position[1], pz],
            normal,
            rotationY: Math.random() * Math.PI * 2,
            scale: 0.85 + Math.random() * 0.3,
          };
          dispatch({ type: "PLACE_ITEM", item });
        }
      } else {
        const item: PlacedItem = {
          id: `${instanceId}-${++instanceCounter.current}`,
          itemId: state.selectedItemId,
          position,
          normal,
          rotationY: Math.random() * Math.PI * 2,
          scale: 1,
        };
        dispatch({ type: "PLACE_ITEM", item });
      }
    },
    [state.selectedItemId, instanceId, instanceCounter]
  );

  const handleRemoveItem = useCallback((id: string) => {
    dispatch({ type: "REMOVE_ITEM", id });
  }, []);

  const handleSelectPlaced = useCallback((id: string) => {
    dispatch({ type: "SELECT_PLACED", id });
  }, []);

  const handleRotatePlaced = useCallback((id: string, rotationY: number) => {
    dispatch({ type: "UPDATE_ITEM_ROTATION", id, rotationY });
  }, []);

  const handleDeselectPlaced = useCallback(() => {
    dispatch({ type: "SELECT_PLACED", id: null });
  }, []);

  const isStep1Complete = state.container !== null;
  const isStep2Complete = state.substrate !== null;
  const showCanvas = state.step >= 1 && state.container !== null;

  return (
    <div className="h-[calc(100vh-3.5rem)] mt-14 flex overflow-hidden bg-grove-bg">
      {/* Left sidebar — wizard steps */}
      <aside className="w-[360px] shrink-0 flex flex-col bg-grove-panel border-r border-grove-border shadow-sm overflow-hidden">
        {/* Section label */}
        <div className="px-8 pt-5 pb-4 border-b border-grove-border">
          <p className="text-[0.65rem] tracking-[0.2em] uppercase text-grove-muted font-medium">
            Terrarium Builder
          </p>
        </div>

        {/* Step progress */}
        <div className="px-8 py-5 border-b border-grove-border">
          <div className="flex items-center gap-3">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div
                  className={[
                    "w-2.5 h-2.5 rounded-full transition-all duration-300",
                    state.step === s
                      ? "bg-grove-sage scale-100 ring-2 ring-grove-sage/30"
                      : state.step > s
                      ? "bg-grove-sage/60"
                      : "bg-grove-muted/20",
                  ].join(" ")}
                />
                {s < 3 && <div className="w-10 h-px bg-grove-border" />}
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {state.step === 1 && (
            <StepContainer
              selected={state.container}
              onSelect={(shape: ContainerShape) =>
                dispatch({ type: "SET_CONTAINER", shape })
              }
              onNext={() => {
                if (isStep1Complete) dispatch({ type: "NEXT_STEP" });
              }}
            />
          )}
          {state.step === 2 && (
            <StepSubstrate
              selected={state.substrate}
              onSelect={(substrate: SubstrateType) =>
                dispatch({ type: "SET_SUBSTRATE", substrate })
              }
              onNext={() => {
                if (isStep2Complete) dispatch({ type: "NEXT_STEP" });
              }}
              onBack={() => dispatch({ type: "PREV_STEP" })}
            />
          )}
          {state.step === 3 && (
            <StepCustomize
              selectedItemId={state.selectedItemId}
              toolMode={state.toolMode}
              placedCount={state.placedItems.length}
              totalPrice={state.totalPrice}
              foamBrushSize={foamBrushSize}
              onSelectItem={(id) => dispatch({ type: "SELECT_ITEM", itemId: id })}
              onSetTool={(mode: ToolMode) => dispatch({ type: "SET_TOOL", mode })}
              onFoamBrushChange={setFoamBrushSize}
              onFoamUndo={handleFoamUndo}
              onUndo={() => dispatch({ type: "UNDO" })}
              onBack={() => dispatch({ type: "PREV_STEP" })}
              onAddToCart={() => alert(`Order placed! Total: $${state.totalPrice.toFixed(2)}`)}
              onApplyPreset={handleApplyPreset}
            />
          )}
        </div>
      </aside>

      {/* Right: 3D canvas */}
      <main className="flex-1 relative overflow-hidden bg-grove-bg">
        <div className="absolute inset-0 bg-gradient-to-b from-[#f7f6f3] via-[#f2f1ed] to-[#eceae4]" />
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className="absolute w-px h-px rounded-full bg-grove-sage/25"
              style={{
                left: `${10 + i * 8}%`,
                top: `${20 + (i % 4) * 20}%`,
                animation: `float ${3 + i * 0.4}s ease-in-out infinite`,
                animationDelay: `${i * 0.3}s`,
              }}
            />
          ))}
        </div>

        {/* 3D Scene */}
        {showCanvas ? (
          <TerrariumCanvas
            state={state}
            onPlace={handlePlace}
            onRemoveItem={handleRemoveItem}
            onSelectPlaced={handleSelectPlaced}
            onRotatePlaced={handleRotatePlaced}
            autoRotate={state.step === 1}
            terrainPreset={terrainPreset}
            presetTrigger={presetTrigger}
            foamBrushSize={foamBrushSize}
            foamUndoTrigger={foamUndoTrigger}
          />
        ) : (
          /* Step 1 before any container selected */
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div
                className="text-5xl font-serif text-grove-text/20 mb-3 tracking-[-0.02em]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Grove
              </div>
              <p className="text-[0.7rem] tracking-[0.2em] uppercase text-grove-muted font-medium">
                Your terrarium awaits
              </p>
            </div>
          </div>
        )}

        {/* Hint overlay */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none">
          <span className="text-[0.6rem] tracking-[0.12em] uppercase text-grove-muted font-medium">
            {HINTS[state.step]}
          </span>
        </div>

        {/* Rotation controls — shown when a placed item is selected */}
        {state.step === 3 && state.selectedPlacedId && (() => {
          const placed = state.placedItems.find(p => p.id === state.selectedPlacedId);
          const item = placed ? getCatalogItem(placed.itemId) : null;
          const deg = placed ? Math.round(((placed.rotationY % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) * 180 / Math.PI) : 0;
          return (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
              <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-grove-panel/97 border border-grove-border shadow-lg backdrop-blur-sm">
                <span className="text-[0.65rem] font-semibold text-grove-text/70 tracking-wide">
                  {item?.name ?? "Item"}
                </span>
                <div className="w-px h-4 bg-grove-border" />
                {/* Rotate left */}
                <button
                  onClick={() => handleRotatePlaced(state.selectedPlacedId!, (placed?.rotationY ?? 0) - Math.PI / 6)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-grove-sage font-bold text-sm hover:bg-grove-sage/10 transition-colors"
                  title="Rotate left 30°"
                >
                  ↺
                </button>
                {/* Degree display */}
                <span className="text-[0.65rem] tabular-nums text-grove-muted w-8 text-center">
                  {deg}°
                </span>
                {/* Rotate right */}
                <button
                  onClick={() => handleRotatePlaced(state.selectedPlacedId!, (placed?.rotationY ?? 0) + Math.PI / 6)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-grove-sage font-bold text-sm hover:bg-grove-sage/10 transition-colors"
                  title="Rotate right 30°"
                >
                  ↻
                </button>
                <div className="w-px h-4 bg-grove-border" />
                {/* Deselect */}
                <button
                  onClick={handleDeselectPlaced}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-grove-muted hover:text-grove-text hover:bg-grove-bg transition-colors text-xs"
                  title="Deselect"
                >
                  ✕
                </button>
              </div>
              <p className="text-center text-[0.58rem] text-grove-muted mt-1.5 tracking-wide">
                Drag the green ring to rotate freely
              </p>
            </div>
          );
        })()}

        {/* Place hint — only when no placed item is selected */}
        {state.step === 3 && state.selectedItemId && !state.selectedPlacedId && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="px-4 py-2.5 rounded-full bg-grove-panel/95 border border-grove-border shadow-sm backdrop-blur-sm">
              <span className="text-[0.68rem] tracking-[0.08em] text-grove-accent font-medium">
                Click inside the container to place
              </span>
            </div>
          </div>
        )}

        {/* Remove mode indicator */}
        {state.step === 3 && state.toolMode === "remove" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="px-4 py-2.5 rounded-full bg-red-50 border border-red-200 shadow-sm backdrop-blur-sm">
              <span className="text-[0.68rem] tracking-[0.08em] text-red-700 font-medium">
                Click an item to remove it
              </span>
            </div>
          </div>
        )}

        {/* Smooth mode indicator */}
        {state.step === 3 && state.toolMode === "smooth" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="px-4 py-2.5 rounded-full bg-sky-50 border border-sky-200 shadow-sm backdrop-blur-sm">
              <span className="text-[0.68rem] tracking-[0.08em] text-sky-800 font-medium">
                Hold &amp; drag over bumps to smooth foam
              </span>
            </div>
          </div>
        )}

        {/* Foam mode indicator */}
        {state.step === 3 && state.toolMode === "foam" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="px-4 py-2.5 rounded-full bg-sky-50 border border-sky-200 shadow-sm backdrop-blur-sm">
              <span className="text-[0.68rem] tracking-[0.08em] text-sky-800 font-medium">
                Hold &amp; drag on any surface to extrude foam
              </span>
            </div>
          </div>
        )}

        {/* Sculpt mode indicator */}
        {state.step === 3 && state.toolMode === "sculpt" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="px-4 py-2.5 rounded-full bg-amber-50 border border-amber-200 shadow-sm backdrop-blur-sm">
              <span className="text-[0.68rem] tracking-[0.08em] text-amber-800 font-medium">
                Hold &amp; drag on terrain to sculpt
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
