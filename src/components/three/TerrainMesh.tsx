"use client";
import { useRef, useMemo, useEffect, useCallback, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { ContainerShape, SubstrateType, ToolMode } from "@/types";
import {
  GRID_SIZE, BASE_HEIGHT, JAR_R, TANK_HX, TANK_HZ,
  addAt, getHeightAt, getNormalAt,
  applyPreset, relaxSlope, type TerrainPreset,
} from "@/lib/heightmap";
import type { FoamBrushRefs } from "./FoamMesh";

const JAR_YBASE    = -0.54;
const TANK_YBASE   = -0.375;

// Tank container inner dimensions (from GlassContainer: TW=1.4, TD=0.85)
const TANK_FILL_W  = 1.394;   // slightly inside glass walls to avoid Z-fight
const TANK_FILL_D  = 0.844;
// Jar inner radius ≈ 0.48 (cylinder radius 0.48 top, 0.52 bottom)
const JAR_FILL_R   = 0.476;
const RAISE_SPEED  = 0.0015;  // slow accumulation — spreading does the heavy lifting
const BRUSH_RADIUS = 0.16;    // wide deposit area


// ── Soil texture (procedural canvas) ──────────────────────────────────────
let _soilTex: THREE.CanvasTexture | null = null;
function getSoilTexture(): THREE.CanvasTexture {
  if (_soilTex) return _soilTex;
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#3a2010";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 14000; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = Math.random() * 2.8 + 0.3;
    const v = (Math.random() - 0.5) * 40;
    ctx.fillStyle = `rgb(${Math.max(8, Math.min(120, 60 + v))},${Math.max(4, Math.min(70, 32 + v * .6))},${Math.max(2, Math.min(35, 14 + v * .3))})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  for (let i = 0; i < 400; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const r = Math.random() * 4 + 1.5, b = Math.random() * 30;
    ctx.fillStyle = `rgb(${80 + b},${50 + b},${28 + b})`;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  }
  _soilTex = new THREE.CanvasTexture(canvas);
  _soilTex.repeat.set(4, 4);
  _soilTex.wrapS = _soilTex.wrapT = THREE.RepeatWrapping;
  return _soilTex;
}

// ── Jar: polar circle grid geometry in XZ plane ───────────────────────────
const JAR_RADIAL   = 28;
const JAR_ANGULAR  = 56;

function createJarGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[]       = [];
  const indices: number[]   = [];

  // Center vertex
  positions.push(0, BASE_HEIGHT, 0);
  uvs.push(0.5, 0.5);

  const vertsPerRing = JAR_ANGULAR + 1;
  for (let ri = 1; ri <= JAR_RADIAL; ri++) {
    const r = (ri / JAR_RADIAL) * JAR_R;
    for (let ai = 0; ai <= JAR_ANGULAR; ai++) {
      const a = (ai / JAR_ANGULAR) * Math.PI * 2;
      const x = r * Math.cos(a), z = r * Math.sin(a);
      positions.push(x, BASE_HEIGHT, z);
      uvs.push(x / (2 * JAR_R) + 0.5, z / (2 * JAR_R) + 0.5);
    }
  }

  // Center → first ring
  for (let ai = 0; ai < JAR_ANGULAR; ai++) {
    indices.push(0, 1 + ai, 1 + ai + 1);
  }
  // Ring → ring
  for (let ri = 0; ri < JAR_RADIAL - 1; ri++) {
    for (let ai = 0; ai < JAR_ANGULAR; ai++) {
      const a = 1 + ri * vertsPerRing + ai;
      const b = 1 + (ri + 1) * vertsPerRing + ai;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute("uv",       new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

// ── Tank: regular grid geometry in XZ plane ───────────────────────────────
function createTankGeometry(): THREE.BufferGeometry {
  const G    = GRID_SIZE;
  const seg  = G - 1;
  const pos  = new Float32Array(G * G * 3);
  const uv   = new Float32Array(G * G * 2);
  const idx: number[] = [];

  for (let j = 0; j < G; j++) {
    for (let i = 0; i < G; i++) {
      const vidx = i + j * G;
      const x = -TANK_HX + (i / seg) * TANK_HX * 2;
      const z = -TANK_HZ + (j / seg) * TANK_HZ * 2;
      pos[vidx * 3]     = x;
      pos[vidx * 3 + 1] = BASE_HEIGHT;
      pos[vidx * 3 + 2] = z;
      uv[vidx * 2]     = i / seg;
      uv[vidx * 2 + 1] = j / seg;
    }
  }

  for (let j = 0; j < seg; j++) {
    for (let i = 0; i < seg; i++) {
      const a = i + j * G, b = (i + 1) + j * G;
      const c = i + (j + 1) * G, d = (i + 1) + (j + 1) * G;
      idx.push(a, c, b, c, d, b);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("uv",       new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  return geo;
}

// ── Wall fill strip geometry ──────────────────────────────────────────────
// G bottom+top vertex pairs; vertex positions are updated in updateMesh.
function makeWallStripGeo(G: number): THREE.BufferGeometry {
  const positions = new Float32Array(G * 2 * 3);
  const uvs       = new Float32Array(G * 2 * 2);
  const indices: number[] = [];

  for (let i = 0; i < G; i++) {
    const u = i / (G - 1);
    uvs[(2 * i) * 2]     = u; uvs[(2 * i) * 2 + 1]     = 0; // bottom UV
    uvs[(2 * i + 1) * 2] = u; uvs[(2 * i + 1) * 2 + 1] = 1; // top UV
    if (i < G - 1) {
      const b0 = 2 * i, t0 = 2 * i + 1, b1 = 2 * (i + 1), t1 = 2 * (i + 1) + 1;
      // Two triangles per quad — winding so front-face faces inside container
      indices.push(b0, t0, b1, b1, t0, t1);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geo.setAttribute("uv",       new THREE.BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  return geo;
}

// ── Brush ring ────────────────────────────────────────────────────────────
function BrushRing({ position }: { position: THREE.Vector3 }) {
  const lineObj = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      pts.push(new THREE.Vector3(BRUSH_RADIUS * Math.cos(a), 0, BRUSH_RADIUS * Math.sin(a)));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 });
    return new THREE.Line(geo, mat);
  }, []);
  return <primitive object={lineObj} position={position} />;
}

// ── Main component ────────────────────────────────────────────────────────
export interface TerrainMeshProps {
  shape: ContainerShape;
  substrate: SubstrateType;
  heightmapRef: React.MutableRefObject<Float32Array>;
  updateTrigger: number;
  toolMode: ToolMode;
  selectedItemId: string | null;
  onPlace: (pos: [number, number, number], normal: [number, number, number]) => void;
  terrainPreset: TerrainPreset | null;
  presetTrigger: number;
  foamBrushRefs?: FoamBrushRefs;
}

export default function TerrainMesh({
  shape, substrate, heightmapRef, updateTrigger,
  toolMode, selectedItemId, onPlace,
  terrainPreset, presetTrigger,
  foamBrushRefs,
}: TerrainMeshProps) {
  const meshRef  = useRef<THREE.Mesh>(null);
  const jarFillRef = useRef<THREE.Mesh>(null);
  const holdingRef  = useRef(false);
  const brushPosRef = useRef(new THREE.Vector3());
  const [brushVisible, setBrushVisible] = useState(false);

  const yBase = shape === "jar" ? JAR_YBASE : TANK_YBASE;
  const isSculpt = toolMode === "sculpt";
  const isPlace  = toolMode === "place";
  const isFoam   = toolMode === "foam";

  // ── Geometry ──────────────────────────────────────────────────────────
  const geometry = useMemo(
    () => shape === "jar" ? createJarGeometry() : createTankGeometry(),
    [shape]
  );

  // Tank: 4 wall strips + flat floor panel (geometries updated per updateMesh call)
  const tankWallGeos = useMemo(() => {
    if (shape !== "tank") return null;
    return {
      front: makeWallStripGeo(GRID_SIZE),
      back:  makeWallStripGeo(GRID_SIZE),
      left:  makeWallStripGeo(GRID_SIZE),
      right: makeWallStripGeo(GRID_SIZE),
    };
  }, [shape]);

  // Jar: unit-height cylinder, scaled dynamically via jarFillRef
  const jarFillGeo = useMemo(() => {
    if (shape !== "jar") return null;
    return new THREE.CylinderGeometry(JAR_FILL_R, JAR_FILL_R, 1, 48);
  }, [shape]);

  // ── Material ──────────────────────────────────────────────────────────
  const [sandColor, sandRough] = useTexture([
    "/textures/sand_color.png",
    "/textures/sand_roughness.png",
  ]);

  const material = useMemo(() => {
    if (substrate === "sand") {
      [sandColor, sandRough].forEach((t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(shape === "tank" ? 4 : 3, shape === "tank" ? 3 : 3);
        t.needsUpdate = true;
      });
      return new THREE.MeshStandardMaterial({ map: sandColor, roughnessMap: sandRough, roughness: 0.95, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0 });
    }
    return new THREE.MeshStandardMaterial({ map: getSoilTexture(), roughness: 1, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0 });
  }, [substrate, shape, sandColor, sandRough]);

  // ── Vertex update ─────────────────────────────────────────────────────
  const updateMesh = useCallback(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const pos = geometry.attributes.position as THREE.BufferAttribute;
    const hm  = heightmapRef.current;

    if (shape === "jar") {
      const vertsPerRing = JAR_ANGULAR + 1;
      pos.setY(0, getHeightAt(hm, "jar", 0, 0));
      for (let ri = 1; ri <= JAR_RADIAL; ri++) {
        const r = (ri / JAR_RADIAL) * JAR_R;
        for (let ai = 0; ai <= JAR_ANGULAR; ai++) {
          const a = (ai / JAR_ANGULAR) * Math.PI * 2;
          const x = r * Math.cos(a), z = r * Math.sin(a);
          const idx = 1 + (ri - 1) * vertsPerRing + ai;
          pos.setY(idx, getHeightAt(hm, "jar", x, z));
        }
      }
    } else {
      const G = GRID_SIZE;
      for (let j = 0; j < G; j++) {
        for (let i = 0; i < G; i++) {
          pos.setY(i + j * G, hm[i + j * G]);
        }
      }
    }

    pos.needsUpdate = true;
    geometry.computeVertexNormals();

    // ── Tank: update 4 variable-height wall strips ─────────────────────────
    if (shape === "tank" && tankWallGeos) {
      const G   = GRID_SIZE;
      const HW  = TANK_FILL_W / 2;   // half wall width (X)
      const HD  = TANK_FILL_D / 2;   // half wall depth (Z)

      // Helper: write bottom+top vertex pair for one horizontal sample
      const setVert = (
        buf: THREE.BufferAttribute,
        idx: number,
        x: number,
        z: number,
        h: number
      ) => {
        buf.setXYZ(2 * idx,     x, -0.002, z); // bottom — extends below floor so floor overlaps seam
        buf.setXYZ(2 * idx + 1, x, h,      z); // top at terrain height
      };

      // Front wall strip — heightmap row j=G-1 → z = +HD inside front glass
      // Span x across full wall width (±HW) so bottom aligns with floor plane edge
      const fPos = tankWallGeos.front.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < G; i++) {
        const x = -HW + (i / (G - 1)) * HW * 2;
        setVert(fPos, i, x, HD, hm[i + (G - 1) * G]);
      }
      fPos.needsUpdate = true;
      tankWallGeos.front.computeVertexNormals();

      // Back wall strip — heightmap row j=0 → z = -HD
      const bPos = tankWallGeos.back.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < G; i++) {
        const x = -HW + (i / (G - 1)) * HW * 2;
        setVert(bPos, i, x, -HD, hm[i]);
      }
      bPos.needsUpdate = true;
      tankWallGeos.back.computeVertexNormals();

      // Left wall strip — heightmap column i=0 → x = -HW
      // Span z across full wall depth (±HD)
      const lPos = tankWallGeos.left.attributes.position as THREE.BufferAttribute;
      for (let j = 0; j < G; j++) {
        const z = -HD + (j / (G - 1)) * HD * 2;
        setVert(lPos, j, -HW, z, hm[j * G]);
      }
      lPos.needsUpdate = true;
      tankWallGeos.left.computeVertexNormals();

      // Right wall strip — heightmap column i=G-1 → x = +HW
      const rPos = tankWallGeos.right.attributes.position as THREE.BufferAttribute;
      for (let j = 0; j < G; j++) {
        const z = -HD + (j / (G - 1)) * HD * 2;
        setVert(rPos, j, HW, z, hm[(G - 1) + j * G]);
      }
      rPos.needsUpdate = true;
      tankWallGeos.right.computeVertexNormals();
    }

    // ── Jar: uniform cylinder fill — use max border height ─────────────────
    if (shape === "jar") {
      const fill = jarFillRef.current;
      if (fill) {
        const G = GRID_SIZE;
        let maxEdgeH = BASE_HEIGHT;
        for (let k = 0; k < G; k++) {
          maxEdgeH = Math.max(maxEdgeH, hm[k], hm[k + (G - 1) * G], hm[k * G], hm[k * G + G - 1]);
        }
        fill.scale.y = maxEdgeH;
        fill.position.y = yBase + maxEdgeH * 0.5;
      }
    }
  }, [geometry, shape, heightmapRef, yBase, tankWallGeos]);

  // ── Apply preset ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!terrainPreset || presetTrigger === 0) return;
    applyPreset(heightmapRef.current, shape, terrainPreset);
    updateMesh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetTrigger]);

  // ── Sync from external trigger ─────────────────────────────────────────
  useEffect(() => { updateMesh(); }, [updateMesh, updateTrigger]);

  // ── Reset holding when mode changes ───────────────────────────────────
  useEffect(() => {
    holdingRef.current = false;
    setBrushVisible(false);
  }, [toolMode]);

  // ── Sculpt brush continuous raise + angle-of-repose spreading ────────
  useFrame(() => {
    if (!holdingRef.current || !isSculpt) return;
    const { x, z } = brushPosRef.current;
    addAt(heightmapRef.current, shape, x, z, RAISE_SPEED, BRUSH_RADIUS);
    // 12 relaxation passes per frame — soil flows 6–8 cells outward,
    // creating the natural wide-spreading mound effect
    relaxSlope(heightmapRef.current, shape, x, z, BRUSH_RADIUS, 12);
    updateMesh();
  });

  // ── Pointer handlers ──────────────────────────────────────────────────
  const handlePointerMove = useCallback((e: import("@react-three/fiber").ThreeEvent<PointerEvent>) => {
    if (isSculpt) {
      e.stopPropagation();
      brushPosRef.current.copy(e.point);
      setBrushVisible(true);
    } else if (isFoam && foamBrushRefs) {
      e.stopPropagation();
      foamBrushRefs.pos.current.copy(e.point);
      // Terrain normal points up
      foamBrushRefs.norm.current.set(0, 1, 0);
    }
  }, [isSculpt, isFoam, foamBrushRefs]);

  const handlePointerDown = useCallback((e: import("@react-three/fiber").ThreeEvent<PointerEvent>) => {
    if (isSculpt) {
      e.stopPropagation();
      holdingRef.current = true;
      brushPosRef.current.copy(e.point);
      addAt(heightmapRef.current, shape, e.point.x, e.point.z, RAISE_SPEED * 4, BRUSH_RADIUS);
      relaxSlope(heightmapRef.current, shape, e.point.x, e.point.z, BRUSH_RADIUS, 20);
      updateMesh();
    } else if (isFoam && foamBrushRefs) {
      e.stopPropagation();
      foamBrushRefs.pos.current.copy(e.point);
      foamBrushRefs.norm.current.set(0, 1, 0);
      foamBrushRefs.holding.current = true;
    }
  }, [isSculpt, isFoam, foamBrushRefs, shape, heightmapRef, updateMesh]);

  const handlePointerUp = useCallback((e: import("@react-three/fiber").ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    holdingRef.current = false;
    if (foamBrushRefs) foamBrushRefs.holding.current = false;
  }, [foamBrushRefs]);

  const handlePointerLeave = useCallback(() => {
    holdingRef.current = false;
    setBrushVisible(false);
    if (foamBrushRefs) foamBrushRefs.holding.current = false;
  }, [foamBrushRefs]);

  const handleClick = useCallback((e: import("@react-three/fiber").ThreeEvent<MouseEvent>) => {
    if (!isPlace || !selectedItemId) return;
    e.stopPropagation();
    const { x, z } = e.point;
    const y = getHeightAt(heightmapRef.current, shape, x, z) + yBase;
    // Transform face normal from local mesh space to world space
    let normal: [number, number, number] = [0, 1, 0];
    if (e.face) {
      const n = e.face.normal.clone().transformDirection(e.object.matrixWorld).normalize();
      normal = [n.x, n.y, n.z];
    }
    onPlace([x, y, z], normal);
  }, [isPlace, selectedItemId, shape, heightmapRef, yBase, onPlace]);

  return (
    <>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        position={[0, yBase, 0]}
        receiveShadow
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        onClick={handleClick}
      />
      {/* Tank: flat floor panel + 4 variable-height wall strips */}
      {shape === "tank" && tankWallGeos && (
        <>
          {/* Flat floor — extends to glass wall faces so no gap is visible at edges */}
          <mesh material={material} position={[0, yBase + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[1.4, 0.85]} />
          </mesh>
          {/* Each wall strip is positioned at yBase; vertices are in local-Y space */}
          <mesh geometry={tankWallGeos.front} material={material} position={[0, yBase, 0]} receiveShadow />
          <mesh geometry={tankWallGeos.back}  material={material} position={[0, yBase, 0]} receiveShadow />
          <mesh geometry={tankWallGeos.left}  material={material} position={[0, yBase, 0]} receiveShadow />
          <mesh geometry={tankWallGeos.right} material={material} position={[0, yBase, 0]} receiveShadow />
        </>
      )}
      {/* Jar: cylindrical fill, dynamically scaled to border max height */}
      {shape === "jar" && jarFillGeo && (
        <mesh
          ref={jarFillRef}
          geometry={jarFillGeo}
          material={material}
          position={[0, yBase + BASE_HEIGHT / 2, 0]}
          scale={[1, BASE_HEIGHT, 1]}
          receiveShadow
        />
      )}
      {brushVisible && isSculpt && (
        <BrushRing
          position={new THREE.Vector3(
            brushPosRef.current.x,
            brushPosRef.current.y + 0.003,
            brushPosRef.current.z
          )}
        />
      )}
    </>
  );
}
