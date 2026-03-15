"use client";
import { useRef, useMemo, useCallback, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import type { ToolMode } from "@/types";
import { paintFoam, smoothFoam, FOAM_HX, FOAM_HY, FOAM_HZ, FOAM_Y_CENTER, FOAM_RES } from "@/lib/foam";

const FOAM_COLOR = "#2a2a2a";
/** Minimum ms between growth ticks while holding */
const PAINT_INTERVAL_MS = 90;
/** Base offset along surface normal so first blob appears on the surface, not inside */
const STACK_OFFSET_FACTOR = 0.35;
/** How far the growing tip advances per tick, in brushSize units */
const GROW_STEP = 0.18;
/** Maximum extension from click point, in brushSize units — prevents infinite growth */
const GROW_MAX = 4.0;
/** Cursor movement (in brushSize units) that resets the growing tip back to the surface */
const MOVE_RESET_THRESHOLD = 0.55;

export interface FoamBrushRefs {
  pos: React.MutableRefObject<THREE.Vector3>;
  norm: React.MutableRefObject<THREE.Vector3>;
  holding: React.MutableRefObject<boolean>;
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
}

export default function FoamMesh({ brushRefs, toolMode, brushSize = 0.13, undoTrigger = 0, selectedItemId, onPlace }: FoamMeshProps) {
  const isFoam = toolMode === "foam";
  const isSmooth = toolMode === "smooth";
  const isFoamActive = isFoam || isSmooth;
  const isPlace = toolMode === "place";
  const lastPaintTime = useRef(0);
  const historyRef = useRef<Float32Array[]>([]);
  // Growing-tip state: how far along the normal the current stroke has extended
  const growOffsetRef = useRef(0);
  // Last painted position — used to detect cursor movement and reset the tip
  const lastPaintPosRef = useRef(new THREE.Vector3());
  // Whether the previous frame was also holding — detects new hold sessions
  const wasHoldingRef = useRef(false);

  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: FOAM_COLOR,
        roughness: 0.35,
        metalness: 0.25,
        transparent: false,
        side: THREE.DoubleSide,
        depthWrite: true,
        envMapIntensity: 0.9,
      }),
    []
  );

  // MarchingCubes is the foam's geometry and data store in one.
  // Its field persists between frames — painting just stamps values in.
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

  // ── Per-frame: directional foam growth + continuous smoothing ────────────
  useFrame(() => {
    if (!isFoamActive || !brushRefs.holding.current) {
      wasHoldingRef.current = false;
      return;
    }

    // Detect new hold session (first frame of this click/drag)
    const isNewSession = !wasHoldingRef.current;
    if (isNewSession) {
      growOffsetRef.current = 0;
      lastPaintPosRef.current.copy(brushRefs.pos.current);
      // Reset timer so the first tick fires immediately regardless of how
      // recently the previous session ended — fixes the "can't stack" issue
      // where a quick re-click missed the interval window and painted nothing.
      lastPaintTime.current = 0;
    }
    wasHoldingRef.current = true;

    const now = performance.now();
    if (now - lastPaintTime.current < PAINT_INTERVAL_MS) return;
    lastPaintTime.current = now;

    const pos = brushRefs.pos.current;
    const norm = brushRefs.norm.current;

    if (isFoam) {
      // Reset growing tip if cursor moved significantly (new surface area)
      const moved = pos.distanceTo(lastPaintPosRef.current);
      if (moved > brushSize * MOVE_RESET_THRESHOLD) {
        growOffsetRef.current = 0;
      }
      lastPaintPosRef.current.copy(pos);

      // Paint at the current growing tip along the surface normal
      const off = STACK_OFFSET_FACTOR * brushSize + growOffsetRef.current;
      paintFoam(mc, pos.x + norm.x * off, pos.y + norm.y * off, pos.z + norm.z * off, brushSize);
      mc.update();
      mc.geometry.computeBoundingSphere();

      // Advance tip for next tick — stops when cap is reached
      growOffsetRef.current = Math.min(
        growOffsetRef.current + brushSize * GROW_STEP,
        brushSize * GROW_MAX
      );
      return;
    }

    // Smooth: continuous while held
    smoothFoam(mc, pos.x, pos.y, pos.z, brushSize);
    mc.update();
    mc.geometry.computeBoundingSphere();
  });

  // ── Release brush when tool changes away from foam/smooth ─────────────
  useEffect(() => {
    if (!isFoamActive) brushRefs.holding.current = false;
  }, [toolMode, brushRefs, isFoamActive]);

  // ── Undo: restore last snapshot ────────────────────────────────────────
  useEffect(() => {
    if (undoTrigger === 0) return;
    const history = historyRef.current;
    if (history.length === 0) return;
    const snapshot = history.pop()!;
    mc.field.set(snapshot);
    mc.normal_cache.fill(0);
    mc.update();
    mc.geometry.computeBoundingSphere();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoTrigger]);

  // ── Snapshot helpers ───────────────────────────────────────────────────
  const saveSnapshot = useCallback(() => {
    historyRef.current.push(mc.field.slice());
    if (historyRef.current.length > MAX_HISTORY) historyRef.current.shift();
  }, [mc]);

  // ── Helpers ────────────────────────────────────────────────────────────
  const updateBrushPos = useCallback(
    (e: ThreeEvent<PointerEvent | MouseEvent>) => {
      brushRefs.pos.current.copy(e.point);
      if (e.face) {
        // Transform face normal from local mesh space to world space
        brushRefs.norm.current
          .copy(e.face.normal)
          .transformDirection(e.object.matrixWorld)
          .normalize();
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
      // Snapshot before this stroke so it can be undone as one unit
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
      // Transform face normal to world space so placed items tilt with the foam surface
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
}
