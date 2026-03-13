"use client";
import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ContainerShape } from "@/types";

interface GlassContainerProps {
  shape: ContainerShape;
  autoRotate?: boolean;
  children?: React.ReactNode;
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
function JarGeometry() {
  const bodyGeo = useMemo(
    () => new THREE.CylinderGeometry(0.48, 0.52, 1.1, 72, 1, true),
    []
  );

  return (
    <group>
      <mesh geometry={bodyGeo} material={glassMaterial} />
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

function TankGeometry() {
  const hw = TW / 2;
  const hh = TH / 2;
  const hd = TD / 2;

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

  return (
    <group>
      {/* Bottom */}
      <mesh material={glassMaterial} position={[0, -hh, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[TW, TD]} />
      </mesh>
      {/* Front wall */}
      <mesh material={glassMaterial} position={[0, 0, hd]}>
        <planeGeometry args={[TW, TH]} />
      </mesh>
      {/* Back wall */}
      <mesh material={glassMaterial} position={[0, 0, -hd]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[TW, TH]} />
      </mesh>
      {/* Left wall */}
      <mesh material={glassMaterial} position={[-hw, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[TD, TH]} />
      </mesh>
      {/* Right wall */}
      <mesh material={glassMaterial} position={[hw, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
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
      {shape === "jar" && <JarGeometry />}
      {shape === "tank" && <TankGeometry />}
      {children}
    </group>
  );
}
