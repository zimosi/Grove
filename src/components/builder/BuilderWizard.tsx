"use client";
import { useReducer, useCallback, useId, useRef, useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { builderReducer, initialState } from "@/lib/builderReducer";
import StepContainer from "./StepContainer";
import StepSubstrate from "./StepSubstrate";
import StepCustomize from "./StepCustomize";
import type { ContainerShape, SubstrateType, PlacedItem, ToolMode } from "@/types";
import { getCatalogItem } from "@/data/catalog";
import type { TerrainPreset } from "@/lib/heightmap";
import { createHeightmap } from "@/lib/heightmap";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/auth/AuthModal";
import { getSupabase } from "@/lib/supabase";
import type { FoamHandle } from "@/components/three/FoamMesh";
import SurveyModal from "@/components/survey/SurveyModal";
import type { BuilderSnapshot } from "@/components/survey/SurveyModal";

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

// Module-level slot: loadInitialState runs synchronously during useReducer init,
// before any hooks or effects fire. We capture heightmap data here so heightmapRef
// can be initialised with the correct array before TerrariumCanvas ever mounts.
let _pendingHeightmap: number[] | null = null;
let _hadPendingHeightmap = false;

function loadInitialState() {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = sessionStorage.getItem("grove_load_state");
    if (raw) {
      sessionStorage.removeItem("grove_load_state");
      const parsed = JSON.parse(raw);
      // Stash foam/paint so we can restore after FoamMesh mounts
      if (parsed.foamField) {
        sessionStorage.setItem("grove_load_foam", JSON.stringify(parsed.foamField));
        delete parsed.foamField;
      }
      if (parsed.paintField) {
        sessionStorage.setItem("grove_load_paint", JSON.stringify(parsed.paintField));
        delete parsed.paintField;
      }
      // Heightmap: capture directly into module variable — no sessionStorage round-trip
      if (parsed.heightmapField) {
        _pendingHeightmap = parsed.heightmapField as number[];
        _hadPendingHeightmap = true;
        delete parsed.heightmapField;
      }
      return parsed;
    }
  } catch { /* ignore */ }
  return initialState;
}

export default function BuilderWizard() {
  const [state, dispatch] = useReducer(builderReducer, undefined, loadInitialState);
  const instanceId = useId();
  const instanceCounter = useRef(0);
  const [terrainPreset, setTerrainPreset] = useState<TerrainPreset | null>(null);
  const [presetTrigger, setPresetTrigger] = useState(0);
  const [foamBrushSize, setFoamBrushSize] = useState(0.13);
  const [foamUndoTrigger, setFoamUndoTrigger] = useState(0);
  const handleFoamUndo = useCallback(() => setFoamUndoTrigger((n) => n + 1), []);
  const [terrainUpdateTrigger, setTerrainUpdateTrigger] = useState(0);

  const { user } = useAuth();
  const [authOpen,     setAuthOpen]     = useState(false);
  const [isSaving,     setIsSaving]     = useState(false);
  const [saveMessage,  setSaveMessage]  = useState<string | null>(null);
  const foamRef = useRef<FoamHandle | null>(null);
  // Consume _pendingHeightmap synchronously — useReducer (which calls loadInitialState)
  // runs before useRef, so _pendingHeightmap is already set when this line executes.
  const heightmapRef = useRef<Float32Array>(
    _pendingHeightmap ? new Float32Array(_pendingHeightmap) : createHeightmap()
  );
  const _hadHeightmap = _hadPendingHeightmap;
  _pendingHeightmap = null;     // clear so it isn't reused on hot-reload
  _hadPendingHeightmap = false;

  // When a saved design is loaded, fire terrainUpdateTrigger once after the canvas
  // has had time to mount, so TerrainMesh picks up the pre-populated heightmapRef.
  useEffect(() => {
    if (!_hadHeightmap) return;
    // Poll until TerrariumCanvas is mounted (dynamic import may take a moment)
    const t = setTimeout(() => setTerrainUpdateTrigger((n) => n + 1), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Survey state
  const [surveyOpen,    setSurveyOpen]    = useState(false);
  const [surveyTrigger, setSurveyTrigger] = useState<"order_click" | "save_design">("order_click");
  const [surveyDesignId, setSurveyDesignId] = useState<string | null>(null);

  // Restore foam + paint after FoamMesh mounts (canvas loads asynchronously via dynamic()).
  // Heightmap is already restored synchronously into heightmapRef above — no effect needed.
  useEffect(() => {
    const rawFoam  = sessionStorage.getItem("grove_load_foam");
    const rawPaint = sessionStorage.getItem("grove_load_paint");
    if (!rawFoam && !rawPaint) return;
    const interval = setInterval(() => {
      if (!foamRef.current) return;
      try {
        if (rawFoam)  { foamRef.current.setField(JSON.parse(rawFoam));      sessionStorage.removeItem("grove_load_foam"); }
        if (rawPaint) { foamRef.current.setPaintField(JSON.parse(rawPaint)); sessionStorage.removeItem("grove_load_paint"); }
      } catch { /* ignore */ }
      clearInterval(interval);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  /** Compact summary of current design — stored alongside survey responses */
  const buildSnapshot = useCallback(() => ({
    container:  state.container,
    substrate:  state.substrate,
    itemCount:  state.placedItems.length,
    totalPrice: state.totalPrice,
  }), [state]);

  const doSave = useCallback(async () => {
    if (!user) { setAuthOpen(true); return; }
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const sb = getSupabase();
      if (!sb) throw new Error("not configured");
      const foamField      = foamRef.current ? Array.from(foamRef.current.getField())      : null;
      const paintField     = foamRef.current ? Array.from(foamRef.current.getPaintField()) : null;
      const heightmapField = Array.from(heightmapRef.current);
      const { data, error } = await sb.from("terrariums").insert({
        user_id: user.id,
        name: `Terrarium — ${new Date().toLocaleDateString()}`,
        state: { ...state, foamField, paintField, heightmapField } as unknown as Record<string, unknown>,
      }).select("id").single();
      if (error) throw error;
      setSaveMessage("Design saved!");
      // Open survey after successful save
      setSurveyDesignId(data?.id ?? null);
      setSurveyTrigger("save_design");
      setSurveyOpen(true);
    } catch {
      setSaveMessage("Save failed. Please try again.");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  }, [user, state]);

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

  // Dark glass pill style for canvas overlays
  const pillStyle = (color: string) => ({
    background: "rgba(0,0,0,0.55)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: `1px solid ${color}`,
    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
  });

  return (
    <div className="h-[calc(100vh-3.5rem)] flex overflow-hidden" style={{ background: "#0b0f0d" }}>
      {/* Left sidebar */}
      <aside className="w-[340px] shrink-0 flex flex-col overflow-hidden"
        style={{
          background: "rgba(17,25,20,0.95)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRight: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Header */}
        <div className="px-7 pt-5 pb-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <p className="text-[0.58rem] tracking-[0.25em] uppercase font-semibold" style={{ color: "rgba(92,191,117,0.5)" }}>
            Terrarium Builder
          </p>
        </div>

        {/* Step progress */}
        <div className="px-7 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className="relative flex items-center justify-center transition-all duration-300">
                  {state.step === s ? (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[0.6rem] font-bold"
                      style={{ background: "rgba(92,191,117,0.2)", border: "1.5px solid rgba(92,191,117,0.6)", color: "#5cbf75", boxShadow: "0 0 12px rgba(92,191,117,0.2)" }}>
                      {s}
                    </div>
                  ) : state.step > s ? (
                    <div className="w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(92,191,117,0.12)", border: "1.5px solid rgba(92,191,117,0.3)" }}>
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="#5cbf75" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full"
                      style={{ border: "1.5px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.03)" }} />
                  )}
                </div>
                {s < 3 && (
                  <div className="w-8 h-px rounded-full"
                    style={{ background: state.step > s ? "rgba(92,191,117,0.3)" : "rgba(255,255,255,0.07)" }} />
                )}
              </div>
            ))}
            <span className="ml-2 text-[0.65rem] font-medium" style={{ color: "rgba(216,232,220,0.35)" }}>
              {state.step === 1 ? "Container" : state.step === 2 ? "Base Material" : "Customize"}
            </span>
          </div>
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-7 py-6 scrollbar-thin">
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
              onAddToCart={() => {
                setSurveyDesignId(null);
                setSurveyTrigger("order_click");
                setSurveyOpen(true);
              }}
              onApplyPreset={handleApplyPreset}
              onSaveDesign={doSave}
              isSaving={isSaving}
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
            foamRef={foamRef}
            heightmapRef={heightmapRef}
            terrainUpdateTrigger={terrainUpdateTrigger}
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

        {/* Paint mode indicator */}
        {state.step === 3 && state.toolMode === "paint" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
            <div className="px-4 py-2.5 rounded-full bg-sky-50 border border-sky-200 shadow-sm backdrop-blur-sm">
              <span className="text-[0.68rem] tracking-[0.08em] text-sky-800 font-medium">
                Hold &amp; drag on foam to paint substrate color
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

      {/* Auth modal — opened when guest tries to save */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />

      {/* Survey modal — triggered after Order or Save Design */}
      <SurveyModal
        open={surveyOpen}
        onClose={() => setSurveyOpen(false)}
        triggerAction={surveyTrigger}
        builderSnapshot={buildSnapshot()}
        designId={surveyDesignId}
        userId={user?.id ?? null}
      />

      {/* Save feedback toast */}
      {saveMessage && (
        <div className={[
          "fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-[0.78rem] font-medium shadow-xl border backdrop-blur-sm transition-all",
          saveMessage.includes("failed")
            ? "bg-red-50 border-red-200 text-red-700"
            : "bg-grove-panel border-grove-sage/30 text-grove-sage",
        ].join(" ")}>
          {saveMessage}
        </div>
      )}
    </div>
  );
}
