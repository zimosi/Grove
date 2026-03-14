"use client";
import { useMemo } from "react";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { ContainerShape, SubstrateType } from "@/types";

// ── Jar substrate (cylinder) ───────────────────────────────────────────────
const JAR_HEIGHT = 0.20;   // thinned down
const JAR_RADIUS = 0.465;
const JAR_YBASE  = -0.54;  // bottom of jar cylinder

// ── Tank substrate (box) ──────────────────────────────────────────────────
const TANK_HEIGHT = 0.20;
const TANK_WIDTH  = 1.32;  // inner width
const TANK_DEPTH  = 0.78;  // inner depth
const TANK_YBASE  = -0.375; // half of tank height (centered at y=0)

// ── Procedural soil texture (canvas) ──────────────────────────────────────
let _soilTex: THREE.CanvasTexture | null = null;
function getSoilTexture(): THREE.CanvasTexture {
  if (_soilTex) return _soilTex;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#3a2010";
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 2.8 + 0.3;
    const v = (Math.random() - 0.5) * 40;
    const rr = Math.max(8,  Math.min(120, 60  + v));
    const gg = Math.max(4,  Math.min(70,  32  + v * 0.6));
    const bb = Math.max(2,  Math.min(35,  14  + v * 0.3));
    ctx.fillStyle = `rgb(${rr},${gg},${bb})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 4 + 1.5;
    const bright = Math.random() * 30;
    ctx.fillStyle = `rgb(${80 + bright},${50 + bright},${28 + bright})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  _soilTex = new THREE.CanvasTexture(canvas);
  _soilTex.repeat.set(4, 4);
  _soilTex.wrapS = _soilTex.wrapT = THREE.RepeatWrapping;
  return _soilTex;
}

// ── Sand substrates ────────────────────────────────────────────────────────
function JarSandSubstrate() {
  const [colorMap, roughMap] = useTexture([
    "/textures/sand_color.png",
    "/textures/sand_roughness.png",
  ]);
  const material = useMemo(() => {
    [colorMap, roughMap].forEach((t) => {
      t.repeat.set(3, 3);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.needsUpdate = true;
    });
    return new THREE.MeshStandardMaterial({ map: colorMap, roughnessMap: roughMap, color: "#e8dbb8", roughness: 0.95, metalness: 0, envMapIntensity: 0 });
  }, [colorMap, roughMap]);
  const geo = useMemo(() => new THREE.CylinderGeometry(JAR_RADIUS, JAR_RADIUS, JAR_HEIGHT, 72), []);
  return <mesh geometry={geo} material={material} position={[0, JAR_YBASE + JAR_HEIGHT / 2, 0]} receiveShadow />;
}

function TankSandSubstrate() {
  const [colorMap, roughMap] = useTexture([
    "/textures/sand_color.png",
    "/textures/sand_roughness.png",
  ]);
  const material = useMemo(() => {
    [colorMap, roughMap].forEach((t) => {
      t.repeat.set(4, 3);
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.needsUpdate = true;
    });
    return new THREE.MeshStandardMaterial({ map: colorMap, roughnessMap: roughMap, color: "#e8dbb8", roughness: 0.95, metalness: 0, envMapIntensity: 0 });
  }, [colorMap, roughMap]);
  const geo = useMemo(() => new THREE.BoxGeometry(TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH), []);
  return <mesh geometry={geo} material={material} position={[0, TANK_YBASE + TANK_HEIGHT / 2, 0]} receiveShadow />;
}

// ── Soil substrates ────────────────────────────────────────────────────────
function JarSoilSubstrate() {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: getSoilTexture(),
        roughness: 1.0,
        metalness: 0,
        envMapIntensity: 0,
      }),
    []
  );

  const geo = useMemo(
    () => new THREE.CylinderGeometry(JAR_RADIUS, JAR_RADIUS, JAR_HEIGHT, 72),
    []
  );

  return (
    <mesh
      geometry={geo}
      material={material}
      position={[0, JAR_YBASE + JAR_HEIGHT / 2, 0]}
      receiveShadow
    />
  );
}

function TankSoilSubstrate() {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: getSoilTexture(),
        roughness: 1.0,
        metalness: 0,
        envMapIntensity: 0,
      }),
    []
  );

  const geo = useMemo(
    () => new THREE.BoxGeometry(TANK_WIDTH, TANK_HEIGHT, TANK_DEPTH),
    []
  );

  return (
    <mesh
      geometry={geo}
      material={material}
      position={[0, TANK_YBASE + TANK_HEIGHT / 2, 0]}
      receiveShadow
    />
  );
}

// ── Public component ──────────────────────────────────────────────────────
export default function SubstrateMesh({
  shape,
  substrate,
}: {
  shape: ContainerShape;
  substrate: SubstrateType;
}) {
  if (shape === "tank") {
    return substrate === "sand" ? <TankSandSubstrate /> : <TankSoilSubstrate />;
  }
  // jar
  return substrate === "sand" ? <JarSandSubstrate /> : <JarSoilSubstrate />;
}

// Surface Y used for item placement
export function getSubstrateY(shape: ContainerShape): number {
  if (shape === "tank") return TANK_YBASE + TANK_HEIGHT;
  return JAR_YBASE + JAR_HEIGHT;
}
