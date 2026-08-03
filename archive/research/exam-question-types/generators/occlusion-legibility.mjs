// Occlusion legibility for the voxel-pile types (SPA-HIDDENCUBE-01).
//
// WHY THIS EXISTS
//
// SPA-HIDDENCUBE-01 asks for the total cube count including the cubes that cannot be seen. That
// only measures spatial reasoning if the unseen cubes are logically FORCED by what is visible.
// Every pile is a height-map, so a column is filled from the floor up: if the child can see where
// a column ends, the cubes underneath are forced. The count is therefore deducible exactly when
// every column's top surface is observable -- including an empty cell's floor, because a child who
// cannot see the floor cannot tell an empty cell from a one-cube column.
//
// The generator's own occlusion rule asks whether a cube's three camera-facing faces are covered
// by the IMMEDIATELY adjacent cells. Under that rule a column's top face is never covered (there
// is by definition no cube above it), so every configuration looks deducible. The demo renders a
// real orthographic projection instead, where a tall column near the camera hides the tops of
// shorter columns behind it along the view ray. The two models disagree, and the reviewer saw the
// disagreement: "some of the x-ray cubes are ambiguous in the back."
//
// THE VIEW RAY
//
// The demo projects a world point p with (yaw, pitch) as
//     x' =  p.x cos(yaw) + p.z sin(yaw)
//     z' = -p.x sin(yaw) + p.z cos(yaw)
//     screen = (x', -(p.y cos(pitch) - z' sin(pitch))),  depth = p.y sin(pitch) + z' cos(pitch)
// and sorts faces by increasing depth, so larger depth is nearer the camera. Solving for the
// direction that leaves both screen coordinates fixed while increasing depth gives
//     D = (-sin(yaw), tan(pitch), cos(yaw))
// pointing from the scene toward the camera. `buildScene` maps a cube at (row r, col c, height y)
// to world (x, y, z) = (c, y, r), so voxel (c, y, r) occupies [c,c+1] x [y,y+1] x [r,r+1].
//
// WHAT COUNTS AS OBSERVABLE
//
// A column top is observable when at least one point of its top surface has an unobstructed ray to
// the camera, evaluated over every viewpoint the child can actually reach: the served yaw, plus the
// turntable steps when `inspection.rotate` is true. This is deliberately the most permissive
// reading -- a configuration rejected here is one where a correctly reasoning child has no way to
// determine the count from any angle, which makes the item worse than hard: it is unanswerable.
//
// A partially visible top (a thin sliver) still passes. Whether a sliver is legible enough to
// count from is a rendering-legibility judgement, not a logical one, so `worstTopFraction` reports
// it and leaves the threshold to a human.

const DEFAULT_SAMPLES = 9;
const MARCH_STEP = 0.02;

/** Column heights as H[row][col] from a `content.stack` block. */
export function heightsOfStack(stack) {
  const H = Array.from({ length: stack.rows }, () => new Array(stack.cols).fill(0));
  stack.layers.forEach((cells, y) => {
    cells.forEach(([r, c]) => {
      H[r][c] = Math.max(H[r][c], y + 1);
    });
  });
  return H;
}

function occupied(H, c, y, r) {
  return r >= 0 && r < H.length && c >= 0 && c < H[0].length && y >= 0 && H[r][c] > y;
}

/** Does the ray from p toward the camera leave the pile without entering a cube? */
function rayEscapes(H, p, D, maxHeight) {
  const rows = H.length;
  const cols = H[0].length;
  let t = 1e-6;
  // The ray always rises (tan(pitch) > 0), so it terminates once it clears the tallest column.
  for (let guard = 0; guard < 20000; guard++) {
    t += MARCH_STEP;
    const x = p[0] + D[0] * t;
    const y = p[1] + D[1] * t;
    const z = p[2] + D[2] * t;
    if (y > maxHeight) return true;
    if (x < 0 || x > cols || z < 0 || z > rows) return true;
    if (occupied(H, Math.floor(x), Math.floor(y), Math.floor(z))) return false;
  }
  return true;
}

/** Fraction of cell (r,c)'s top surface with a clear line to the camera at one viewpoint. */
function topFractionAt(H, r, c, yawDeg, pitchDeg, samples) {
  const yaw = (yawDeg * Math.PI) / 180;
  const pit = (pitchDeg * Math.PI) / 180;
  const D = [-Math.sin(yaw), Math.tan(pit), Math.cos(yaw)];
  let maxHeight = 0;
  for (const row of H) for (const h of row) if (h > maxHeight) maxHeight = h;
  const h = H[r][c];
  let seen = 0;
  for (let i = 0; i < samples; i++) {
    for (let j = 0; j < samples; j++) {
      const p = [c + (i + 0.5) / samples, h, r + (j + 0.5) / samples];
      if (rayEscapes(H, p, D, maxHeight)) seen++;
    }
  }
  return seen / (samples * samples);
}

/** Every yaw the child can reach: the served one plus the turntable steps when rotation is on. */
export function reachableYaws(yawDeg, inspection) {
  const yaws = [yawDeg];
  if (inspection && inspection.rotate) {
    const range = inspection.yawRangeDeg || [-40, 40];
    const step = inspection.yawStepDeg || 15;
    for (let d = range[0]; d <= range[1]; d += step) yaws.push(yawDeg + d);
  }
  return yaws;
}

/** Best visible fraction of cell (r,c)'s top over every reachable viewpoint. */
function bestTopFraction(H, r, c, yawDeg, pitchDeg, inspection, samples) {
  let best = 0;
  for (const y of reachableYaws(yawDeg, inspection)) {
    best = Math.max(best, topFractionAt(H, r, c, y, pitchDeg, samples));
    if (best >= 0.999) break;
  }
  return best;
}

/**
 * Is every column top observable, so the total cube count is deducible?
 *
 * Returns `{ deducible, blindCells, worstTopFraction }`. `blindCells` lists the [row, col] cells
 * whose top surface cannot be seen from any reachable viewpoint; a non-empty list means a child
 * reasoning correctly still cannot determine the count, so the configuration must not be served.
 */
export function assessCountLegibility(stack, view, inspection, opts = {}) {
  const samples = opts.samples || DEFAULT_SAMPLES;
  const H = heightsOfStack(stack);
  const blindCells = [];
  let worst = 1;
  for (let r = 0; r < H.length; r++) {
    for (let c = 0; c < H[0].length; c++) {
      const f = bestTopFraction(H, r, c, view.yawDeg, view.pitchDeg, inspection, samples);
      if (f < worst) worst = f;
      if (f <= 0) blindCells.push([r, c]);
    }
  }
  return { deducible: blindCells.length === 0, blindCells, worstTopFraction: worst };
}

/** Convenience wrapper for a whole bank item. */
export function assessItem(item, opts) {
  const c = item.content;
  return assessCountLegibility(c.stack, c.view, c.inspection, opts);
}
