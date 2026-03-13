/**
 * Foam field utilities — works directly on a Three.js MarchingCubes field.
 * Foam is represented as a 3D density field; the isosurface at `isolation`
 * defines the visible surface. Adjacent brush strokes accumulate and merge.
 */

// ── Domain ─────────────────────────────────────────────────────────────────

/** Grid resolution. 28^3 ≈ 22K cells — enough detail without killing perf */
export const FOAM_RES = 28;

/**
 * Per-axis half-sizes of the foam domain (rectangular, matching container).
 * Tank interior: X ±0.695, Z ±0.420. Jar radius ≈ 0.475.
 * Domain covers [-FOAM_HX, FOAM_HX] in X, [FOAM_Y_CENTER ± FOAM_HY] in Y,
 * and [-FOAM_HZ, FOAM_HZ] in Z.
 */
export const FOAM_HX = 0.78;   // slightly beyond TW/2=0.70 so MC boundary voxels reach the wall
export const FOAM_HY = 0.42;
export const FOAM_HZ = 0.50;   // slightly beyond TD/2=0.425

/**
 * Vertical centre of the foam domain. Chosen so the domain comfortably
 * covers both jar (-0.54) and tank (-0.375) floors up to reasonable height.
 */
export const FOAM_Y_CENTER = -0.10;

/** Default brush radius in world units */
export const FOAM_BRUSH_R = 0.13;

/**
 * Field value written at the brush centre. The isosurface is extracted at
 * `isolation = 80`, so the visible foam surface sits at ~88% of brush radius.
 */
export const FOAM_MAX_FIELD = 350;

// ── Minimal interface so foam.ts doesn't import the heavy MC class ──────────

interface MCField {
  size: number;
  isolation: number;
  field: Float32Array;
  normal_cache: Float32Array;
  setCell(x: number, y: number, z: number, value: number): void;
  getCell(x: number, y: number, z: number): number;
}

// ── Core paint operation ────────────────────────────────────────────────────

/**
 * Stamp foam density into the MC field at world position (wx, wy, wz).
 * Uses a smooth quadratic falloff so the isosurface rounds off naturally.
 * Call `mc.update()` after this to regenerate the mesh.
 */
export function paintFoam(
  mc: MCField,
  wx: number,
  wy: number,
  wz: number,
  brushRadius = FOAM_BRUSH_R
): void {
  const S = mc.size; // == FOAM_RES

  // Per-axis cell sizes (world units per voxel step) — rectangular domain
  const csX = (2 * FOAM_HX) / S;
  const csY = (2 * FOAM_HY) / S;
  const csZ = (2 * FOAM_HZ) / S;

  // Centre in fractional cell space [0, S]
  const fx = (wx + FOAM_HX) / (2 * FOAM_HX) * S;
  const fy = (wy - FOAM_Y_CENTER + FOAM_HY) / (2 * FOAM_HY) * S;
  const fz = (wz + FOAM_HZ) / (2 * FOAM_HZ) * S;

  // Brush radius in cells — use smallest cell size (densest axis) for ceiling
  const minCs = Math.min(csX, csY, csZ);
  const ceil_r = Math.ceil(brushRadius / minCs) + 1;
  const r2 = brushRadius * brushRadius;

  const cx = Math.round(fx);
  const cy = Math.round(fy);
  const cz = Math.round(fz);

  for (let dz = -ceil_r; dz <= ceil_r; dz++) {
    for (let dy = -ceil_r; dy <= ceil_r; dy++) {
      for (let dx = -ceil_r; dx <= ceil_r; dx++) {
        const ix = cx + dx;
        const iy = cy + dy;
        const iz = cz + dz;

        if (ix < 0 || ix > S - 1 || iy < 0 || iy > S - 1 || iz < 0 || iz > S - 1) continue;

        // World-space distance using per-axis cell sizes
        const wdx = dx * csX;
        const wdy = dy * csY;
        const wdz = dz * csZ;
        const wd2 = wdx * wdx + wdy * wdy + wdz * wdz;
        if (wd2 >= r2) continue;

        // Smooth quadratic falloff: 1 at centre → 0 at edge
        const t = 1 - wd2 / r2;
        const val = FOAM_MAX_FIELD * t;

        const current = mc.getCell(ix, iy, iz);
        if (val > current) {
          mc.setCell(ix, iy, iz, val);
          const q3 = (iz * S * S + iy * S + ix) * 3;
          mc.normal_cache[q3] = 0;
        }
      }
    }
  }
}

/**
 * Smooth foam density at world position (wx, wy, wz).
 * Each voxel inside the brush is lerped toward the average of its 6 neighbours,
 * using a quadratic falloff so edges of the brush aren't affected.
 * Call `mc.update()` after this to regenerate the mesh.
 */
export function smoothFoam(
  mc: MCField,
  wx: number,
  wy: number,
  wz: number,
  brushRadius = FOAM_BRUSH_R,
  strength = 0.35
): void {
  const S = mc.size;

  const csX = (2 * FOAM_HX) / S;
  const csY = (2 * FOAM_HY) / S;
  const csZ = (2 * FOAM_HZ) / S;

  const fx = (wx + FOAM_HX) / (2 * FOAM_HX) * S;
  const fy = (wy - FOAM_Y_CENTER + FOAM_HY) / (2 * FOAM_HY) * S;
  const fz = (wz + FOAM_HZ) / (2 * FOAM_HZ) * S;

  const minCs = Math.min(csX, csY, csZ);
  const ceil_r = Math.ceil(brushRadius / minCs) + 1;
  const r2 = brushRadius * brushRadius;

  const cx = Math.round(fx);
  const cy = Math.round(fy);
  const cz = Math.round(fz);

  // First pass — collect new values (read-before-write to avoid order dependency)
  const updates: { ix: number; iy: number; iz: number; val: number }[] = [];

  for (let dz = -ceil_r; dz <= ceil_r; dz++) {
    for (let dy = -ceil_r; dy <= ceil_r; dy++) {
      for (let dx = -ceil_r; dx <= ceil_r; dx++) {
        const ix = cx + dx;
        const iy = cy + dy;
        const iz = cz + dz;

        // Keep 1-cell border so neighbour reads are always in-bounds
        if (ix < 1 || ix >= S - 1 || iy < 1 || iy >= S - 1 || iz < 1 || iz >= S - 1) continue;

        const wdx = dx * csX;
        const wdy = dy * csY;
        const wdz = dz * csZ;
        const wd2 = wdx * wdx + wdy * wdy + wdz * wdz;
        if (wd2 >= r2) continue;

        const t = 1 - wd2 / r2; // 1 at centre → 0 at edge

        const avg =
          (mc.getCell(ix - 1, iy, iz) +
            mc.getCell(ix + 1, iy, iz) +
            mc.getCell(ix, iy - 1, iz) +
            mc.getCell(ix, iy + 1, iz) +
            mc.getCell(ix, iy, iz - 1) +
            mc.getCell(ix, iy, iz + 1)) /
          6;

        const current = mc.getCell(ix, iy, iz);
        const smoothed = current + (avg - current) * strength * t;
        updates.push({ ix, iy, iz, val: Math.max(0, smoothed) });
      }
    }
  }

  // Second pass — write
  for (const { ix, iy, iz, val } of updates) {
    mc.setCell(ix, iy, iz, val);
    const q3 = (iz * S * S + iy * S + ix) * 3;
    mc.normal_cache[q3] = 0;
  }
}

/** Clear all foam. Call `mc.update()` after to show the empty mesh. */
export function clearFoam(mc: { reset(): void; update(): void }): void {
  mc.reset();
  mc.update();
}
