"use client";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  ContactShadows,
  useGLTF,
} from "@react-three/drei";
import * as THREE from "three";
import GlassContainer from "./GlassContainer";
import TerrainMesh from "./TerrainMesh";
import FoamMesh from "./FoamMesh";
import type { FoamBrushRefs } from "./FoamMesh";
import SceneItem from "./SceneItem";
import type { BuilderState, ContainerShape } from "@/types";
import { getCatalogItem, ALL_ITEMS } from "@/data/catalog";
import { createHeightmap } from "@/lib/heightmap";
import type { TerrainPreset } from "@/lib/heightmap";

// Preload all models upfront
ALL_ITEMS.forEach((item) => {
  if (item.modelUrl) useGLTF.preload(item.modelUrl);
});

// Subtle orbiting specular highlight — dimmed so it doesn't wash out shadows
function OrbitingLight() {
  const ref = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * 0.4;
    ref.current.position.set(Math.cos(t) * 2.2, 1.8, Math.sin(t) * 2.2);
  });
  return <pointLight ref={ref} intensity={0.6} color="#ffffff" distance={5} />;
}

function SceneLights() {
  const sunRef = useRef<THREE.DirectionalLight>(null);

  // Shadow camera MUST be configured imperatively — JSX dash-props don't call
  // updateProjectionMatrix(), so the camera stays at its default ±5 m frustum.
  useEffect(() => {
    const light = sunRef.current;
    if (!light) return;

    // Tight orthographic frustum around the terrarium (≈1.4 × 0.85 × 0.75 m)
    const cam = light.shadow.camera as THREE.OrthographicCamera;
    cam.left   = -1.6;
    cam.right  =  1.6;
    cam.top    =  1.6;
    cam.bottom = -1.6;
    cam.near   =  1;
    cam.far    =  25;
    cam.updateProjectionMatrix(); // required — otherwise frustum is ignored

    light.shadow.mapSize.set(2048, 2048);
    light.shadow.bias       = -0.001;
    light.shadow.normalBias =  0.01;
  }, []);

  return (
    <>
      {/* Lower ambient so shadows have enough contrast to be visible */}
      <ambientLight intensity={0.35} color="#fff8ec" />
      {/* Main sun — upper-left, shadows fall to the right */}
      <directionalLight
        ref={sunRef}
        position={[-5, 9, 1]}
        intensity={0.75}
        color="#fff8f0"
        castShadow
      />
      {/* Soft fill from right — no shadows, just prevents pure black */}
      <directionalLight position={[4, 2, -3]} intensity={0.15} color="#ffe8d0" />
      <pointLight position={[0, 2, -2.5]} intensity={0.4} color="#b0d8ff" distance={6} />
      <OrbitingLight />
    </>
  );
}

interface TerrariumCanvasProps {
  state: BuilderState;
  onPlace: (position: [number, number, number], normal: [number, number, number]) => void;
  onRemoveItem: (id: string) => void;
  onSelectPlaced: (id: string) => void;
  onRotatePlaced: (id: string, rotationY: number) => void;
  autoRotate?: boolean;
  terrainPreset?: TerrainPreset | null;
  presetTrigger?: number;
  foamBrushSize?: number;
  foamUndoTrigger?: number;
}

function SceneContent({
  state,
  onPlace,
  onRemoveItem,
  onSelectPlaced,
  onRotatePlaced,
  autoRotate,
  terrainPreset,
  presetTrigger,
  foamBrushSize = 0.13,
  foamUndoTrigger = 0,
}: TerrariumCanvasProps & { terrainPreset: TerrainPreset | null; presetTrigger: number }) {
  // Heightmap lives here — 3D state, not React state
  const heightmapRef = useRef<Float32Array>(createHeightmap());

  // Shared foam brush refs, updated by TerrainMesh or FoamMesh depending on what ray hits
  const foamBrushRefs: FoamBrushRefs = {
    pos: useRef(new THREE.Vector3()),
    norm: useRef(new THREE.Vector3(0, 1, 0)),
    holding: useRef(false),
  };

  // Reset heightmap when container shape changes
  const prevShapeRef = useRef<ContainerShape | null>(null);
  if (state.container && state.container !== prevShapeRef.current) {
    heightmapRef.current = createHeightmap();
    prevShapeRef.current = state.container;
  }

  const isSculpting = state.toolMode === "sculpt";

  return (
    <>
      <SceneLights />
      <OrbitControls
        enabled={true}
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        minDistance={1.8}
        maxDistance={6}
        minPolarAngle={Math.PI / 8}
        maxPolarAngle={Math.PI / 2.1}
        makeDefault
      />
      <Suspense fallback={null}>
        {state.container && (
          <GlassContainer shape={state.container} autoRotate={autoRotate}>
            {state.substrate && (
              <TerrainMesh
                shape={state.container}
                substrate={state.substrate}
                heightmapRef={heightmapRef}
                updateTrigger={0}
                toolMode={state.toolMode}
                selectedItemId={state.selectedItemId}
                onPlace={onPlace}
                terrainPreset={terrainPreset}
                presetTrigger={presetTrigger}
                foamBrushRefs={foamBrushRefs}
              />
            )}
            <FoamMesh
              brushRefs={foamBrushRefs}
              toolMode={state.toolMode}
              brushSize={foamBrushSize}
              undoTrigger={foamUndoTrigger}
              selectedItemId={state.selectedItemId}
              onPlace={onPlace}
            />
            {state.placedItems.map((placed) => {
              const item = getCatalogItem(placed.itemId);
              if (!item) return null;
              return (
                <SceneItem
                  key={placed.id}
                  placed={placed}
                  catalogItem={item}
                  onRemove={onRemoveItem}
                  onSelectPlaced={onSelectPlaced}
                  onRotatePlaced={onRotatePlaced}
                  isSelected={state.selectedPlacedId === placed.id}
                  toolMode={state.toolMode}
                />
              );
            })}
          </GlassContainer>
        )}
        <ContactShadows
          position={[0, -1.0, 0]}
          opacity={0.3}
          scale={4}
          blur={2.5}
          far={2}
          color="#0a1a0f"
        />
        <Environment preset="apartment" background={false} environmentIntensity={0.2} />
      </Suspense>
    </>
  );
}

export default function TerrariumCanvas({
  state,
  onPlace,
  onRemoveItem,
  onSelectPlaced,
  onRotatePlaced,
  autoRotate = false,
  terrainPreset = null,
  presetTrigger = 0,
  foamBrushSize = 0.13,
  foamUndoTrigger = 0,
}: TerrariumCanvasProps) {
  return (
    <Canvas
      frameloop="always"
      camera={{ position: [0, 0.4, 3.2], fov: 38 }}
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        alpha: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.85,
      }}
      style={{ background: "transparent" }}
      shadows="soft"
    >
      <SceneContent
        state={state}
        onPlace={onPlace}
        onRemoveItem={onRemoveItem}
        onSelectPlaced={onSelectPlaced}
        onRotatePlaced={onRotatePlaced}
        autoRotate={autoRotate}
        terrainPreset={terrainPreset}
        presetTrigger={presetTrigger}
        foamBrushSize={foamBrushSize}
        foamUndoTrigger={foamUndoTrigger}
      />
    </Canvas>
  );
}
