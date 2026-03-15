"use client";
import { useRef, useMemo, useEffect, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import type { ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import type { ContainerShape, ToolMode } from "@/types";
import type { FoamBrushRefs } from "./FoamMesh";

interface WallFoamProps {
  toolMode?: ToolMode;
  foamBrushRefs?: FoamBrushRefs;
}

interface GlassContainerProps {
  shape: ContainerShape;
  autoRotate?: boolean;
  children?: React.ReactNode;
  toolMode?: ToolMode;
  foamBrushRefs?: FoamBrushRefs;
}

// Physical glass: keep it clear (high transmission), but avoid "white slab" look.
// Reflections come from Environment HDR; we keep them subtle.
const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: "#ffffff",
  transmission: 1,
  transparent: true,
  opacity: 1,
  roughness: 0,
  metalness: 0,
  thickness: 0,
  ior: 1.05,
  side: THREE.DoubleSide,
  depthWrite: false,
});

// Dark outline line material
const lineMaterial = new THREE.LineBasicMaterial({
  color: new THREE.Color(0.05, 0.08, 0.06),
  transparent: true,
  opacity: 0.65,
});

// Build a circle of points for LineLoop
function makeCirclePoints(radius: number, segments = 96): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
  }
  return pts;
}

// A single circle outline at a given Y
function RimLine({ radius, y }: { radius: number; y: number }) {
  const geo = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(makeCirclePoints(radius));
  }, [radius]);
  return <lineLoop geometry={geo} material={lineMaterial} position={[0, y, 0]} />;
}

// ── Jar ────────────────────────────────────────────────────────────────────
function JarGeometry({ toolMode, foamBrushRefs }: WallFoamProps) {
  const isFoam = toolMode === "foam";

  const bodyGeo = useMemo(
    () => new THREE.CylinderGeometry(0.48, 0.52, 1.1, 72, 1, true),
    []
  );

  const handleWallPointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!isFoam || !foamBrushRefs) return;
      // Outward normal for cylinder = radial direction from axis at hit point.
      // Inner face: ray (camPos → hitPoint) traveling WITH outward normal (dot > 0).
      // Outer face: dot ≤ 0 → reject.
      const outward = new THREE.Vector3(e.point.x, 0, e.point.z).normalize();
      const rayDir = e.point.clone().sub(e.camera.position).normalize();
      if (rayDir.dot(outward) <= 0) return;
      e.stopPropagation();
      foamBrushRefs.pos.current.copy(e.point);
      // Inward direction = toward axis = -outward
      foamBrushRefs.norm.current.copy(outward).negate();
      foamBrushRefs.holding.current = true;
    },
    [isFoam, foamBrushRefs]
  );

  const handleWallPointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (foamBrushRefs) foamBrushRefs.holding.current = false;
    },
    [foamBrushRefs]
  );

  const handleWallPointerLeave = useCallback(() => {
    if (foamBrushRefs) foamBrushRefs.holding.current = false;
  }, [foamBrushRefs]);

  return (
    <group>
      <mesh
        geometry={bodyGeo}
        material={glassMaterial}
        onPointerDown={isFoam ? handleWallPointerDown : undefined}
        onPointerUp={isFoam ? handleWallPointerUp : undefined}
        onPointerLeave={isFoam ? handleWallPointerLeave : undefined}
      />
      <RimLine radius={0.47} y={0.55} />
      <RimLine radius={0.51} y={-0.55} />
    </group>
  );
}

// ── Tank ───────────────────────────────────────────────────────────────────
// Open-top rectangular glass tank referencing terrarium-mvp style.
// Dimensions: width=1.4, height=0.75, depth=0.85. Centered at y=0.
const TW = 1.4;   // width (X)
const TH = 0.75;  // height (Y)
const TD = 0.85;  // depth (Z)

function TankGeometry({ toolMode, foamBrushRefs }: WallFoamProps) {
  const hw = TW / 2;
  const hh = TH / 2;
  const hd = TD / 2;
  const isFoam = toolMode === "foam";

  // Edge outline: all 12 edges of the box EXCEPT the 4 top edges (open top)
  const edgeGeo = useMemo(() => {
    const pts = new Float32Array([
      // Bottom rectangle
      -hw, -hh, -hd,  hw, -hh, -hd,
       hw, -hh, -hd,  hw, -hh,  hd,
       hw, -hh,  hd, -hw, -hh,  hd,
      -hw, -hh,  hd, -hw, -hh, -hd,
      // 4 vertical edges
      -hw, -hh, -hd, -hw,  hh, -hd,
       hw, -hh, -hd,  hw,  hh, -hd,
       hw, -hh,  hd,  hw,  hh,  hd,
      -hw, -hh,  hd, -hw,  hh,  hd,
      // Top rectangle (open top — just the rim outline)
      -hw,  hh, -hd,  hw,  hh, -hd,
       hw,  hh, -hd,  hw,  hh,  hd,
       hw,  hh,  hd, -hw,  hh,  hd,
      -hw,  hh,  hd, -hw,  hh, -hd,
    ]);
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pts, 3));
    return g;
  }, []);

  /**
   * Factory for a wall pointer-down handler.
   * outward: the wall's outward-facing world normal (points away from container interior).
   * inward:  the opposite — direction toward the container interior (used for foam offset).
   *
   * Inner face check: ray direction · outward > 0
   *   → ray is travelling WITH the outward normal = it entered from the opposite side
   *   = it hit the wall from INSIDE the container → allow.
   * Outer face: ray direction · outward ≤ 0 → reject.
   */
  const makeWallHandler = useCallback(
    (outward: THREE.Vector3, inward: THREE.Vector3) =>
      (e: ThreeEvent<PointerEvent>) => {
        if (!isFoam || !foamBrushRefs) return;
        const rayDir = e.point.clone().sub(e.camera.position).normalize();
        if (rayDir.dot(outward) <= 0) return; // outer face
        e.stopPropagation();
        foamBrushRefs.pos.current.copy(e.point);
        foamBrushRefs.norm.current.copy(inward);
        foamBrushRefs.holding.current = true;
      },
    [isFoam, foamBrushRefs]
  );

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (foamBrushRefs) foamBrushRefs.holding.current = false;
    },
    [foamBrushRefs]
  );

  const handlePointerLeave = useCallback(() => {
    if (foamBrushRefs) foamBrushRefs.holding.current = false;
  }, [foamBrushRefs]);

  // Pre-build outward/inward normal pairs for each wall
  const frontOut  = useMemo(() => new THREE.Vector3( 0, 0,  1), []);
  const frontIn   = useMemo(() => new THREE.Vector3( 0, 0, -1), []);
  const backOut   = useMemo(() => new THREE.Vector3( 0, 0, -1), []);
  const backIn    = useMemo(() => new THREE.Vector3( 0, 0,  1), []);
  const leftOut   = useMemo(() => new THREE.Vector3(-1, 0,  0), []);
  const leftIn    = useMemo(() => new THREE.Vector3( 1, 0,  0), []);
  const rightOut  = useMemo(() => new THREE.Vector3( 1, 0,  0), []);
  const rightIn   = useMemo(() => new THREE.Vector3(-1, 0,  0), []);

  return (
    <group>
      {/* Bottom — no foam placement on floor (TerrainMesh handles it) */}
      <mesh material={glassMaterial} position={[0, -hh, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TW, TD]} />
      </mesh>
      {/* Front wall (faces +Z, outward = +Z) */}
      <mesh
        material={glassMaterial}
        position={[0, 0, hd]}
        onPointerDown={isFoam ? makeWallHandler(frontOut, frontIn) : undefined}
        onPointerUp={isFoam ? handlePointerUp : undefined}
        onPointerLeave={isFoam ? handlePointerLeave : undefined}
      >
        <planeGeometry args={[TW, TH]} />
      </mesh>
      {/* Back wall (faces -Z, outward = -Z) */}
      <mesh
        material={glassMaterial}
        position={[0, 0, -hd]}
        rotation={[0, Math.PI, 0]}
        onPointerDown={isFoam ? makeWallHandler(backOut, backIn) : undefined}
        onPointerUp={isFoam ? handlePointerUp : undefined}
        onPointerLeave={isFoam ? handlePointerLeave : undefined}
      >
        <planeGeometry args={[TW, TH]} />
      </mesh>
      {/* Left wall (faces -X, outward = -X) */}
      <mesh
        material={glassMaterial}
        position={[-hw, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        onPointerDown={isFoam ? makeWallHandler(leftOut, leftIn) : undefined}
        onPointerUp={isFoam ? handlePointerUp : undefined}
        onPointerLeave={isFoam ? handlePointerLeave : undefined}
      >
        <planeGeometry args={[TD, TH]} />
      </mesh>
      {/* Right wall (faces +X, outward = +X) */}
      <mesh
        material={glassMaterial}
        position={[hw, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        onPointerDown={isFoam ? makeWallHandler(rightOut, rightIn) : undefined}
        onPointerUp={isFoam ? handlePointerUp : undefined}
        onPointerLeave={isFoam ? handlePointerLeave : undefined}
      >
        <planeGeometry args={[TD, TH]} />
      </mesh>
      {/* Edge outlines */}
      <lineSegments geometry={edgeGeo} material={lineMaterial} />
    </group>
  );
}

export default function GlassContainer({
  shape,
  autoRotate = false,
  children,
  toolMode,
  foamBrushRefs,
}: GlassContainerProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Reset rotation when autoRotate stops so item placement stays aligned
  useEffect(() => {
    if (!autoRotate && groupRef.current) {
      groupRef.current.rotation.y = 0;
    }
  }, [autoRotate]);

  useFrame((_, delta) => {
    if (autoRotate && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.28;
    }
  });

  return (
    <group ref={groupRef}>
      {shape === "jar" && <JarGeometry toolMode={toolMode} foamBrushRefs={foamBrushRefs} />}
      {shape === "tank" && <TankGeometry toolMode={toolMode} foamBrushRefs={foamBrushRefs} />}
      {children}
    </group>
  );
}
