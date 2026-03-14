"use client";
import { useRef, useMemo, useCallback, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { MarchingCubes } from "three/examples/jsm/objects/MarchingCubes.js";
import type { ToolMode } from "@/types";
import { paintFoam, smoothFoam, FOAM_HX, FOAM_HY, FOAM_HZ, FOAM_Y_CENTER, FOAM_RES } from "@/lib/foam";

const FOAM_COLOR = "#2a2a2a";
/** Minimum ms between continuous paint ticks while holding */
const PAINT_INTERVAL_MS = 30;
/** Offset along surface normal when painting so foam stacks upward on existing foam */
const STACK_OFFSET_FACTOR = 0.35;

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
  // Accumulated offset along the surface normal while holding in one spot.
  // Resets on each new pointer-down or pointer-move so dragging works normally.
  const stackAccumRef = useRef(0);

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

  // ── Continuous painting / smoothing while pointer is held ─────────────
  useFrame(() => {
    if (!isFoamActive || !brushRefs.holding.current) return;
    const now = performance.now();
    if (now - lastPaintTime.current < PAINT_INTERVAL_MS) return;
    lastPaintTime.current = now;

    const pos = brushRefs.pos.current;
    const norm = brushRefs.norm.current;
    if (isFoam) {
      // Each tick push the paint centre further along the normal so it stays
      // ahead of the growing foam surface rather than getting buried inside it.
      stackAccumRef.current += brushSize * 0.18;
      const offset = STACK_OFFSET_FACTOR * brushSize + stackAccumRef.current;
      paintFoam(mc, pos.x + norm.x * offset, pos.y + norm.y * offset, pos.z + norm.z * offset, brushSize);
    } else {
      smoothFoam(mc, pos.x, pos.y, pos.z, brushSize);
    }
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

  const doPaint = useCallback(
    (wx: number, wy: number, wz: number) => {
      if (isFoam) {
        const norm = brushRefs.norm.current;
        const offset = STACK_OFFSET_FACTOR * brushSize;
        paintFoam(mc, wx + norm.x * offset, wy + norm.y * offset, wz + norm.z * offset, brushSize);
      } else {
        smoothFoam(mc, wx, wy, wz, brushSize);
      }
      mc.update();
      mc.geometry.computeBoundingSphere();
    },
    [mc, brushSize, brushRefs, isFoam]
  );

  // ── Pointer handlers ───────────────────────────────────────────────────
  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isFoamActive) return;
      e.stopPropagation();
      updateBrushPos(e);
      // User moved to a new surface point — reset stack so the next paint
      // starts fresh from the actual hit position, not an accumulated offset.
      stackAccumRef.current = 0;
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
      stackAccumRef.current = 0; // fresh stroke — start accumulation from zero
      // Immediate first stroke
      doPaint(e.point.x, e.point.y, e.point.z);
    },
    [isFoamActive, brushRefs, updateBrushPos, doPaint, saveSnapshot]
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
