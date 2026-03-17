"use client";
import { useRef, useMemo, useCallback, useEffect, forwardRef, useImperativeHandle } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import type { ToolMode } from "@/types";
import { paintFoam, smoothFoam, stampPaint, FOAM_HX, FOAM_HY, FOAM_HZ, FOAM_Y_CENTER, FOAM_RES } from "@/lib/foam";

const FOAM_COLOR_HEX = "#8a8a7a";
const SUBSTRATE_COLORS: Record<string, string> = {
  soil: "#7a5c2e",
  sand: "#c8a96e",
};

/** Minimum ms between growth ticks while holding */
const PAINT_INTERVAL_MS = 90;
/** Base offset along surface normal so first blob appears on the surface, not inside */
const STACK_OFFSET_FACTOR = 0.5;
/** How far the growing tip advances per tick, in brushSize units */
const GROW_STEP = 0.18;
/** Maximum extension from click point, in brushSize units — prevents infinite growth */
const GROW_MAX = 4.0;
/** Cursor movement (in brushSize units) that resets the growing tip back to the surface */
const MOVE_RESET_THRESHOLD = 0.55;

export interface FoamHandle {
  getField: () => Float32Array;
  setField: (data: ArrayLike<number>) => void;
  getPaintField: () => Float32Array;
  setPaintField: (data: ArrayLike<number>) => void;
}

export interface FoamBrushRefs {
  pos: React.MutableRefObject<THREE.Vector3>;
  norm: React.MutableRefObject<THREE.Vector3>;
  holding: React.MutableRefObject<boolean>;
}

interface Snapshot {
  field: Float32Array;
  paint: Float32Array;
}

const MAX_HISTORY = 20;

interface FoamMeshProps {
  brushRefs: FoamBrushRefs;
  toolMode: ToolMode;
  brushSize?: number;
  undoTrigger?: number;
  /** When in place mode, allow placing plants/decorations on foam surface */
  selectedItemId?: string | null;
  onPlace?: (position: [number, number, number], normal: [number, number, number]) => void;
  substrate?: string | null;
}

/**
 * Map each MC vertex (local coords in [-1,1]) to its paint field cell and
 * write a lerped color between foamCol and substrateCol.
 */
function applyVertexColors(
  mc: MarchingCubes,
  paintField: Float32Array,
  foamCol: THREE.Color,
  subCol: THREE.Color
) {
  const geo = mc.geometry;
  const posAttr = geo.attributes.position as THREE.BufferAttribute | undefined;
  if (!posAttr || posAttr.count === 0) return;
  const count = posAttr.count;
  const pos = posAttr.array as Float32Array;

  let attr = geo.attributes.color as THREE.BufferAttribute | undefined;
  if (!attr || attr.count !== count) {
    attr = new THREE.BufferAttribute(new Float32Array(count * 3), 3);
    geo.setAttribute("color", attr);
  }
  const col = attr.array as Float32Array;
  const S = FOAM_RES;

  for (let i = 0; i < count; i++) {
    // MC local coords are in [-1, 1]; map to [0, S] paint field indices
    const ix = Math.min(S - 1, Math.max(0, Math.round((pos[i * 3]     + 1) * 0.5 * S)));
    const iy = Math.min(S - 1, Math.max(0, Math.round((pos[i * 3 + 1] + 1) * 0.5 * S)));
    const iz = Math.min(S - 1, Math.max(0, Math.round((pos[i * 3 + 2] + 1) * 0.5 * S)));

    const p = paintField[ix + iy * S + iz * S * S];
    col[i * 3]     = foamCol.r + (subCol.r - foamCol.r) * p;
    col[i * 3 + 1] = foamCol.g + (subCol.g - foamCol.g) * p;
    col[i * 3 + 2] = foamCol.b + (subCol.b - foamCol.b) * p;
  }
  attr.needsUpdate = true;
}

const FoamMesh = forwardRef<FoamHandle, FoamMeshProps>(function FoamMesh(
  { brushRefs, toolMode, brushSize = 0.13, undoTrigger = 0, selectedItemId, onPlace, substrate }: FoamMeshProps,
  ref
) {
  const isFoam   = toolMode === "foam";
  const isSmooth = toolMode === "smooth";
  const isPaint  = toolMode === "paint";
  const isFoamActive = isFoam || isSmooth || isPaint;
  const isPlace  = toolMode === "place";

  const lastPaintTime  = useRef(0);
  const historyRef     = useRef<Snapshot[]>([]);
  const growOffsetRef  = useRef(0);
  const lastPaintPosRef = useRef(new THREE.Vector3());
  const wasHoldingRef  = useRef(false);

  // Separate 3-D paint field — same grid as the foam field
  const paintFieldRef = useRef(new Float32Array(FOAM_RES * FOAM_RES * FOAM_RES));

  const foamColor = useMemo(() => new THREE.Color(FOAM_COLOR_HEX), []);
  const substrateColor = useMemo(
    () => new THREE.Color(SUBSTRATE_COLORS[substrate ?? "soil"] ?? FOAM_COLOR_HEX),
    [substrate]
  );

  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.6,
        metalness: 0.1,
        transparent: false,
        side: THREE.DoubleSide,
        depthWrite: true,
        envMapIntensity: 0.6,
      }),
    []
  );

  const mc = useMemo(() => {
    const m = new MarchingCubes(FOAM_RES, mat, false, false, 60000);
    m.isolation = 80;
    m.scale.set(FOAM_HX, FOAM_HY, FOAM_HZ);
    m.position.set(0, FOAM_Y_CENTER, 0);
    m.castShadow = true;
    m.receiveShadow = true;
    m.frustumCulled = false;
    return m;
  }, [mat]);

  // ── Helper: update + recolor ─────────────────────────────────────────────
  const mcUpdate = useCallback(() => {
    mc.update();
    mc.geometry.computeBoundingSphere();
    applyVertexColors(mc, paintFieldRef.current, foamColor, substrateColor);
  }, [mc, foamColor, substrateColor]);

  // ── Expose get/set for save & load ─────────────────────────────────────
  useImperativeHandle(ref, () => ({
    getField: () => mc.field.slice(),
    setField: (data) => {
      mc.field.set(data);
      mc.normal_cache.fill(0);
      mcUpdate();
    },
    getPaintField: () => paintFieldRef.current.slice(),
    setPaintField: (data) => {
      paintFieldRef.current.set(data);
      applyVertexColors(mc, paintFieldRef.current, foamColor, substrateColor);
    },
  }), [mc, mcUpdate, foamColor, substrateColor]);

  // ── Per-frame: foam growth, smoothing, or paint ──────────────────────────
  useFrame(() => {
    if (!isFoamActive || !brushRefs.holding.current) {
      wasHoldingRef.current = false;
      return;
    }

    const isNewSession = !wasHoldingRef.current;
    if (isNewSession) {
      growOffsetRef.current = 0;
      lastPaintPosRef.current.copy(brushRefs.pos.current);
      lastPaintTime.current = 0;
    }
    wasHoldingRef.current = true;

    const now = performance.now();
    if (now - lastPaintTime.current < PAINT_INTERVAL_MS) return;
    lastPaintTime.current = now;

    const pos  = brushRefs.pos.current;
    const norm = brushRefs.norm.current;

    if (isFoam) {
      const moved = pos.distanceTo(lastPaintPosRef.current);
      if (moved > brushSize * MOVE_RESET_THRESHOLD) growOffsetRef.current = 0;
      lastPaintPosRef.current.copy(pos);

      const off = STACK_OFFSET_FACTOR * brushSize + growOffsetRef.current;
      paintFoam(mc, pos.x + norm.x * off, pos.y + norm.y * off, pos.z + norm.z * off, brushSize);
      mcUpdate();
      growOffsetRef.current = Math.min(
        growOffsetRef.current + brushSize * GROW_STEP,
        brushSize * GROW_MAX
      );
      return;
    }

    if (isSmooth) {
      smoothFoam(mc, pos.x, pos.y, pos.z, brushSize);
      mcUpdate();
      return;
    }

    // Paint mode — only update vertex colors, not the MC field
    if (isPaint) {
      stampPaint(paintFieldRef.current, pos.x, pos.y, pos.z, brushSize);
      applyVertexColors(mc, paintFieldRef.current, foamColor, substrateColor);
    }
  });

  // ── Release brush when tool changes away from foam/smooth/paint ──────────
  useEffect(() => {
    if (!isFoamActive) brushRefs.holding.current = false;
  }, [toolMode, brushRefs, isFoamActive]);

  // ── Undo: restore last snapshot ────────────────────────────────────────
  useEffect(() => {
    if (undoTrigger === 0) return;
    const snap = historyRef.current.pop();
    if (!snap) return;
    mc.field.set(snap.field);
    paintFieldRef.current.set(snap.paint);
    mc.normal_cache.fill(0);
    mcUpdate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoTrigger]);

  // ── Snapshot helpers ───────────────────────────────────────────────────
  const saveSnapshot = useCallback(() => {
    historyRef.current.push({ field: mc.field.slice(), paint: paintFieldRef.current.slice() });
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
  }, [mc]);

  // ── Helpers ────────────────────────────────────────────────────────────
  const updateBrushPos = useCallback(
    (e: ThreeEvent<PointerEvent | MouseEvent>) => {
      brushRefs.pos.current.copy(e.point);
      if (e.face) {
        const n = e.face.normal.clone()
          .transformDirection(e.object.matrixWorld)
          .normalize();
        if (e.ray.direction.dot(n) > 0) n.negate();
        brushRefs.norm.current.copy(n);
      }
    },
    [brushRefs]
  );

  // ── Pointer handlers ───────────────────────────────────────────────────
  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isFoamActive) return;
      e.stopPropagation();
      updateBrushPos(e);
    },
    [isFoamActive, updateBrushPos]
  );

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isFoamActive) return;
      e.stopPropagation();
      saveSnapshot();
      updateBrushPos(e);
      brushRefs.holding.current = true;
    },
    [isFoamActive, brushRefs, updateBrushPos, saveSnapshot]
  );

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      brushRefs.holding.current = false;
    },
    [brushRefs]
  );

  const handlePointerLeave = useCallback(() => {
    brushRefs.holding.current = false;
  }, [brushRefs]);

  // ── Place mode: click on foam to place plant/decoration ──────────────────
  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      if (!isPlace || !selectedItemId || !onPlace) return;
      e.stopPropagation();
      const { x, y, z } = e.point;
      let normal: [number, number, number] = [0, 1, 0];
      if (e.face) {
        const n = e.face.normal.clone().transformDirection(e.object.matrixWorld).normalize();
        normal = [n.x, n.y, n.z];
      }
      onPlace([x, y, z], normal);
    },
    [isPlace, selectedItemId, onPlace]
  );

  return (
    <primitive
      object={mc}
      onPointerMove={handlePointerMove}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
    />
  );
});

export default FoamMesh;
