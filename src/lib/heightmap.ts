/**
 * Heightmap utilities for terrarium terrain sculpting.
 * 64×64 grid, values represent Y height above the container floor.
 */

export const GRID_SIZE = 64;
export const BASE_HEIGHT = 0.02; // flat terrain starts just above container floor

export const JAR_R    = 0.475;  // jar inner circle radius
export const TANK_HX  = 0.695;  // tank inner half-width (X)  — matches TW/2=0.7 with 5mm clearance
export const TANK_HZ  = 0.420;  // tank inner half-depth (Z)  — matches TD/2=0.425 with 5mm clearance

type Shape = "jar" | "tank";

// ── Coordinate mapping ────────────────────────────────────────────────────

function worldToNorm(shape: Shape, x: number, z: number): { nx: number; nz: number; oob: boolean } {
  if (shape === "jar") {
    if (Math.sqrt(x * x + z * z) > JAR_R) return { nx: 0, nz: 0, oob: true };
    return { nx: (x + JAR_R) / (2 * JAR_R), nz: (z + JAR_R) / (2 * JAR_R), oob: false };
  }
  if (Math.abs(x) > TANK_HX || Math.abs(z) > TANK_HZ) return { nx: 0, nz: 0, oob: true };
  return { nx: (x + TANK_HX) / (2 * TANK_HX), nz: (z + TANK_HZ) / (2 * TANK_HZ), oob: false };
}

function normToWorld(shape: Shape, nx: number, nz: number): { x: number; z: number } {
  if (shape === "jar") return { x: -JAR_R + nx * 2 * JAR_R, z: -JAR_R + nz * 2 * JAR_R };
  return { x: -TANK_HX + nx * 2 * TANK_HX, z: -TANK_HZ + nz * 2 * TANK_HZ };
}

// ── Core operations ───────────────────────────────────────────────────────

export function createHeightmap(): Float32Array {
  const hm = new Float32Array(GRID_SIZE * GRID_SIZE);
  hm.fill(BASE_HEIGHT);
  return hm;
}

/**
 * Raise terrain at (x,z) with a smooth-step falloff.
 * Uses (1 - t²)² which gives a flat-topped, wide mound — much gentler than
 * a peaked Gaussian.  The "spreading to sides" comes from relaxSlope runs
 * that follow every addAt call.
 */
export function addAt(
  hm: Float32Array,
  shape: Shape,
  x: number, z: number,
  amount: number,
  radius: number
): void {
  const G = GRID_SIZE;
  const r2 = radius * radius;
  for (let j = 0; j < G; j++) {
    for (let i = 0; i < G; i++) {
      const { x: wx, z: wz } = normToWorld(shape, i / (G - 1), j / (G - 1));
      if (shape === "jar" && Math.sqrt(wx * wx + wz * wz) > JAR_R) continue;
      const dx = wx - x, dz = wz - z;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r2) continue;
      // Smooth-step: flat top, tapers to zero at edge → wide, even deposit
      const t = d2 / r2;           // 0 at centre, 1 at edge
      const w = (1 - t) * (1 - t); // quartic falloff: 1 → 0, but flatter than Gaussian
      hm[i + j * G] += amount * w;
    }
  }
}

/**
 * Angle-of-repose relaxation — flattens slopes steeper than maxSlope.
 *
 * Key tuning insight: maxSlope must be in the same world-unit scale as
 * the HEIGHT values.  With cells ~0.02 world units wide, a 30° repose
 * angle → maxSlope ≈ tan(30°) × cellWidth ≈ 0.012.
 *
 * Run 12–20 iterations per brush tick so material flows several cells
 * outward, producing the "spreading to sides" behaviour.
 *
 * @param cx, cz    brush centre in world space
 * @param radius    brush radius (relax region = 5× radius for wide spreading)
 * @param iterations  passes per call — 12 continuous, 20 on click
 * @param maxSlope  max stable Δheight per adjacent cell (≈ 0.012 ↔ 30°)
 * @param strength  fraction of excess transferred per pass
 */
export function relaxSlope(
  hm: Float32Array,
  shape: Shape,
  cx: number,
  cz: number,
  radius: number,
  iterations = 12,
  maxSlope = 0.012,
  strength = 0.50
): void {
  const G = GRID_SIZE;

  // Map brush centre + radius to cell index range
  const spanX = shape === "jar" ? 2 * JAR_R : 2 * TANK_HX;
  const spanZ = shape === "jar" ? 2 * JAR_R : 2 * TANK_HZ;
  const originX = shape === "jar" ? JAR_R : TANK_HX;
  const originZ = shape === "jar" ? JAR_R : TANK_HZ;

  const icx = (cx + originX) / spanX * (G - 1);
  const icz = (cz + originZ) / spanZ * (G - 1);
  // 5× radius so soil can flow far enough to create natural spreading
  const iRad = (radius * 5.0 / spanX) * (G - 1);
  const jRad = (radius * 5.0 / spanZ) * (G - 1);

  const i0 = Math.max(1, Math.floor(icx - iRad));
  const i1 = Math.min(G - 2, Math.ceil(icx + iRad));
  const j0 = Math.max(1, Math.floor(icz - jRad));
  const j1 = Math.min(G - 2, Math.ceil(icz + jRad));

  for (let iter = 0; iter < iterations; iter++) {
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        const idx = i + j * G;
        const h = hm[idx];

        // 4-connected neighbours
        const neighbours = [i + 1 + j * G, i - 1 + j * G, i + (j + 1) * G, i + (j - 1) * G];
        for (const nidx of neighbours) {
          const diff = h - hm[nidx];
          if (diff > maxSlope) {
            const transfer = (diff - maxSlope) * strength;
            hm[idx] -= transfer;
            hm[nidx] += transfer;
          }
        }
      }
    }
  }
}

/** Bilinear height sample at world (x,z). */
export function getHeightAt(hm: Float32Array, shape: Shape, x: number, z: number): number {
  const G = GRID_SIZE - 1;
  const { nx, nz, oob } = worldToNorm(shape, x, z);
  if (oob) return BASE_HEIGHT;
  const u = Math.max(0, Math.min(1, nx)) * G;
  const v = Math.max(0, Math.min(1, nz)) * G;
  const i0 = Math.floor(u), j0 = Math.floor(v);
  const i1 = Math.min(i0 + 1, G), j1 = Math.min(j0 + 1, G);
  const fu = u - i0, fv = v - j0;
  const S = GRID_SIZE;
  const h00 = hm[i0 + j0 * S] ?? BASE_HEIGHT;
  const h10 = hm[i1 + j0 * S] ?? BASE_HEIGHT;
  const h01 = hm[i0 + j1 * S] ?? BASE_HEIGHT;
  const h11 = hm[i1 + j1 * S] ?? BASE_HEIGHT;
  return (h00 * (1 - fu) + h10 * fu) * (1 - fv) + (h01 * (1 - fu) + h11 * fu) * fv;
}

/** Surface normal at (x,z) for placing items upright on slopes. */
export function getNormalAt(hm: Float32Array, shape: Shape, x: number, z: number): [number, number, number] {
  const eps = 0.012;
  const h  = getHeightAt(hm, shape, x, z);
  const hx = getHeightAt(hm, shape, x + eps, z);
  const hz = getHeightAt(hm, shape, x, z + eps);
  const nx = -(hx - h) / eps, ny = 1, nz = -(hz - h) / eps;
  const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
  return [nx / len, ny / len, nz / len];
}

// ── Presets ───────────────────────────────────────────────────────────────

export type TerrainPreset = "flat" | "ridge" | "hills" | "basin";

export function applyPreset(hm: Float32Array, shape: Shape, preset: TerrainPreset): void {
  const G = GRID_SIZE;

  for (let j = 0; j < G; j++) {
    for (let i = 0; i < G; i++) {
      const { x, z } = normToWorld(shape, i / (G - 1), j / (G - 1));
      if (shape === "jar" && Math.sqrt(x * x + z * z) > JAR_R) continue;

      const idx = i + j * G;

      if (preset === "flat") {
        hm[idx] = BASE_HEIGHT;
        continue;
      }

      // Normalize to [-1,1] range within container
      const nx = shape === "jar" ? x / JAR_R : x / TANK_HX;
      const nz = shape === "jar" ? z / JAR_R : z / TANK_HZ;
      const r = Math.sqrt(nx * nx + nz * nz);

      if (preset === "ridge") {
        // Smooth central mound, slopes to zero at edges
        const t = Math.max(0, 1 - r);
        hm[idx] = BASE_HEIGHT + 0.28 * t * t;
      } else if (preset === "hills") {
        // Two offset hills
        const h1 = 0.22 * Math.exp(-((nx + 0.42) ** 2 + (nz - 0.18) ** 2) / 0.28);
        const h2 = 0.18 * Math.exp(-((nx - 0.38) ** 2 + (nz + 0.38) ** 2) / 0.22);
        hm[idx] = BASE_HEIGHT + h1 + h2;
      } else if (preset === "basin") {
        // Raised rim, lower center
        hm[idx] = BASE_HEIGHT + 0.22 * Math.min(1, r * 1.15);
      }
    }
  }
}
