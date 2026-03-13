"use client";
import { Suspense, useRef, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { PlacedItem, CatalogItem } from "@/types";
import type { ThreeEvent } from "@react-three/fiber";

const _up = new THREE.Vector3(0, 1, 0);

/**
 * Compute a quaternion that tilts the item to stand perpendicular to the
 * surface normal, then applies the random yaw rotation around that normal.
 * The tilt is clamped to ≤60° from vertical so plants on steep foam faces
 * stay upright enough to look natural.
 */
function surfaceQuaternion(
  normal: [number, number, number] | undefined,
  rotationY: number
): THREE.Quaternion {
  const n = normal
    ? new THREE.Vector3(...normal).normalize()
    : _up.clone();

  // Clamp tilt: if the normal is more than 60° from up, lerp back towards up
  const dot = _up.dot(n);
  const MAX_TILT_DOT = Math.cos((60 * Math.PI) / 180); // cos(60°) = 0.5
  if (dot < MAX_TILT_DOT) {
    const t = 1 - dot / MAX_TILT_DOT; // 0 at limit, 1 at fully horizontal
    n.lerp(_up, t).normalize();
  }

  // Quaternion aligning Y-up → surface normal
  const alignQ =
    dot > 0.9999
      ? new THREE.Quaternion() // already vertical, identity
      : new THREE.Quaternion().setFromUnitVectors(_up, n);

  // Yaw rotation around the (clamped) normal axis
  const yQ = new THREE.Quaternion().setFromAxisAngle(n, rotationY);

  return yQ.multiply(alignQ);
}

interface SceneItemProps {
  placed: PlacedItem;
  catalogItem: CatalogItem;
  onRemove?: (id: string) => void;
  onSelectPlaced?: (id: string) => void;
  onRotatePlaced?: (id: string, rotationY: number) => void;
  isSelected?: boolean;
  toolMode?: "place" | "remove" | "sculpt" | "foam" | "smooth";
}

function GLBModel({
  modelUrl,
  scale,
  yOffset,
  isPlant,
}: {
  modelUrl: string;
  scale: number;
  yOffset: number;
  isPlant?: boolean;
}) {
  const { scene } = useGLTF(modelUrl);
  const cloned = useRef<THREE.Group | null>(null);
  if (cloned.current === null) {
    const clone = scene.clone(true);
    // Set shadows and material properties synchronously before first render
    clone.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (child.material) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((m) => {
            const mat = m as THREE.MeshStandardMaterial;
            if (!mat) return;
            mat.envMapIntensity = 0;
            if (isPlant) {
              mat.roughness = Math.max(mat.roughness, 0.85);
              mat.metalness = 0;
            }
          });
        }
      }
    });
    cloned.current = clone;
  }

  return (
    <primitive
      object={cloned.current}
      scale={scale}
      position={[0, yOffset, 0]}
    />
  );
}

function ProceduralRock() {
  return (
    <mesh castShadow>
      <dodecahedronGeometry args={[0.06, 0]} />
      <meshStandardMaterial color="#888880" roughness={0.9} metalness={0.1} envMapIntensity={0} />
    </mesh>
  );
}

export default function SceneItem({
  placed,
  catalogItem,
  onRemove,
  onSelectPlaced,
  onRotatePlaced,
  isSelected = false,
  toolMode,
}: SceneItemProps) {
  const { gl, controls } = useThree();

  // Drag-rotation state
  const dragRef = useRef<{ active: boolean; startX: number; startRotY: number }>({
    active: false,
    startX: 0,
    startRotY: 0,
  });

  // Listen on the canvas DOM element so drag works even when pointer leaves the ring
  useEffect(() => {
    if (!isSelected) return;

    const onMove = (e: PointerEvent) => {
      if (!dragRef.current.active) return;
      const dx = e.clientX - dragRef.current.startX;
      const newRot = dragRef.current.startRotY + dx * 0.022;
      onRotatePlaced?.(placed.id, newRot);
    };

    const onUp = () => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      // Re-enable orbit controls after drag
      if (controls && "enabled" in controls) (controls as { enabled: boolean }).enabled = true;
    };

    gl.domElement.addEventListener("pointermove", onMove);
    gl.domElement.addEventListener("pointerup", onUp);
    return () => {
      gl.domElement.removeEventListener("pointermove", onMove);
      gl.domElement.removeEventListener("pointerup", onUp);
    };
  }, [isSelected, gl.domElement, controls, onRotatePlaced, placed.id]);

  const isDecoration = catalogItem.category === "decoration";
  const isPlant = catalogItem.category === "plant";

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    if (toolMode === "remove" && onRemove) {
      e.stopPropagation();
      onRemove(placed.id);
    } else if (toolMode === "place" && onSelectPlaced && isDecoration) {
      // Only decorations (rocks etc.) support click-to-rotate
      e.stopPropagation();
      onSelectPlaced(placed.id);
    }
  };

  // Plants tilt with terrain normal; decorations stay upright
  const quaternion = useMemo(
    () => surfaceQuaternion(isPlant ? placed.normal : undefined, placed.rotationY),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPlant, placed.normal?.[0], placed.normal?.[1], placed.normal?.[2], placed.rotationY]
  );

  return (
    <group
      position={placed.position}
      quaternion={quaternion}
      scale={placed.scale}
      onClick={handleClick}
    >
      {/* Selection ring — only for decorations, drag to rotate */}
      {isSelected && isDecoration && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.002, 0]}
          onPointerDown={(e) => {
            e.stopPropagation();
            dragRef.current = { active: true, startX: e.clientX, startRotY: placed.rotationY };
            if (controls && "enabled" in controls) (controls as { enabled: boolean }).enabled = false;
          }}
        >
          <torusGeometry args={[0.1, 0.007, 8, 64]} />
          <meshBasicMaterial color="#4a7c59" transparent opacity={0.85} />
        </mesh>
      )}
      {isSelected && isDecoration && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
          <torusGeometry args={[0.1, 0.018, 8, 64]} />
          <meshBasicMaterial color="#4a7c59" transparent opacity={0.15} />
        </mesh>
      )}
      {catalogItem.modelUrl ? (
        <Suspense fallback={null}>
          <GLBModel
            modelUrl={catalogItem.modelUrl}
            scale={catalogItem.scale}
            yOffset={catalogItem.yOffset}
            isPlant={catalogItem.category === "plant"}
          />
        </Suspense>
      ) : (
        <ProceduralRock />
      )}
    </group>
  );
}

// Preload all models that have URLs
export function preloadModels(items: CatalogItem[]) {
  items.forEach((item) => {
    if (item.modelUrl) useGLTF.preload(item.modelUrl);
  });
}
