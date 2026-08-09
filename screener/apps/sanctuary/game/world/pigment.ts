import { Color, DoubleSide, MeshStandardMaterial } from 'three';

import { grainTexture } from './textures';

/**
 * Every colour and every material in the ranch, in one place.
 *
 * MOVED OUT OF `Buildings.tsx` because it is no longer only that file's business: the windows and the
 * barn's interior are their own modules now and all three have to draw from the same palette or the
 * building stops being one building. Extracting it also breaks what would otherwise be a circular import
 * — `Buildings` renders `Windows`, so `Windows` cannot reach back into `Buildings` for its materials.
 *
 * PIGMENT, NOT COLOUR, and this is the rule that keeps the ranch from clipping to white. A value picked
 * to look right on a flat 2D page already has its light baked into it, and handing that to a
 * 4.6-intensity sun blows it out. Everything below is the pigment that RESOLVES to the palette's intent
 * once the golden sun in `Lighting.tsx` is on it. Per the world's palette there is no black and no
 * neutral grey in the list — even the stone is a warm brown.
 *
 * WHITE MEANS "COLOURED PER INSTANCE". Several materials below are `#ffffff`, which is not a colour
 * decision but a mechanism: an `InstancedMesh` with `setColorAt` multiplies its instance colour into the
 * material's, so a white base lets one draw call carry forty different greens. Wherever a material is
 * white, look for the pigment in whatever builds its placements.
 */

export const PIG = {
  // Warmer and paler than a midday green on purpose. A flat meadow under a 20° sun receives only
  // `sin(20°)` of it, so a deep saturated green resolves to cold olive no matter how strong the sun is.
  grass: '#9dbd63',
  grassDeep: '#6c9052',
  grassPale: '#c6cd7b',
  // Pale dust, not damp soil. A dry track in a dry field is the LIGHTER of the two; the first pass used
  // a mid brown and every path read as a shadow lying on the meadow.
  earth: '#bb9a6c',
  earthPale: '#d2b485',
  stone: '#b09c81',
  stoneDeep: '#8a7659',
  timber: '#8a6a49',
  timberDeep: '#684d34',
  barnRed: '#9a4030',
  cream: '#ece5d2',
  creamDeep: '#d8c4a0',
  shingle: '#6a5340',
  thatch: '#c9964f',
  canopy: '#568644',
  canopyLit: '#7ea653',
  water: '#3d708a',
  honey: '#dda43d',
  hay: '#d6b060',
  burlap: '#c9ad80',

  /* ---- the homey window's own palette ---------------------------------- *\
     Chosen as a family rather than one at a time. The five shutter paints are all the same value and
     roughly the same chroma, a quarter turn of hue apart, so no window is louder than its neighbour and
     the row still reads as painted by the same hand on five different afternoons. That is what makes
     variety read as a lived-in place instead of as a colour test card.
  \* ---------------------------------------------------------------------- */
  shutterSage: '#7d9367',
  shutterSky: '#7d98ad',
  shutterClay: '#b0714f',
  shutterButter: '#d8b263',
  shutterRose: '#b0707c',
  /** Behind the glass. The room, not the lamp: a lamp is a point and a room is a warm haze. */
  roomGlow: '#ffbe63',
  /** Damp earth in a planter, which is darker and cooler than the dry track outside. */
  soil: '#6b5138',
  /** Blooms. Small, saturated, and warm-biased so they survive a gold sun without going pastel. */
  bloomPoppy: '#d9524a',
  bloomButter: '#f0c04e',
  bloomLilac: '#a681bd',
  bloomSnow: '#f6ecd9',
  bloomBlush: '#e58fa2',
  /** The bushes under a window: greener and fresher than the wild scrub, because somebody waters them. */
  gardenLeaf: '#4e8a47',
  gardenLeafLit: '#84b25c',
  /** The barn's threshing floor: swept dust with straw trodden into it. */
  barnFloor: '#b09468',
  /**
   * The inside of the barn's walls, which is the back of the boards rather than the painted face.
   *
   * A warm mid timber, and a little lighter than `timber` so it lifts under lamplight instead of
   * disappearing. Nobody paints the inside of a barn — the first pass left the interior faces showing the
   * exterior's barn red and the room read as a cellar.
   */
  barnLining: '#8f6f4c',
  straw: '#e0bd71',
  /**
   * Door furniture. The one metal on the ranch, and it is brass rather than iron for the palette's reason:
   * there is no black and no neutral grey in this world, so a dark handle would be the only cold thing on a
   * warm building. Brass is a warm yellow that still reads as metal once it is given a low roughness, and
   * against the dark timber of the hut's door it is the brightest 5cm on the wall — which is exactly what a
   * doorknob is for.
   */
  brass: '#c08a3e',
} as const;

export type MatName =
  | 'ground'
  | 'decal'
  | 'track'
  | 'barnWall'
  | 'trim'
  | 'shingle'
  | 'thatch'
  | 'plaster'
  | 'timber'
  | 'timberDeep'
  | 'stone'
  | 'stoneDeep'
  | 'hay'
  | 'burlap'
  | 'water'
  | 'lamplight'
  | 'canopy'
  | 'painted'
  | 'shutter'
  | 'glass'
  | 'roomGlow'
  | 'soil'
  | 'bloom'
  | 'barnFloor'
  | 'barnLining'
  | 'straw'
  | 'brass'
  | 'twine'
  | 'stones';

let MATS: Record<MatName, MeshStandardMaterial> | null = null;

/**
 * Shared instances rather than one per mesh, so three can batch state changes, and module-memoised so
 * remounting the ranch does not rebuild them.
 *
 * The grain map from `textures.ts` does quiet but load-bearing work: the same seamless map on every
 * surface at ~6% contrast, driving both albedo and roughness, which is the difference between a wall and
 * a coloured rectangle.
 */
export function materials(): Record<MatName, MeshStandardMaterial> {
  if (MATS) return MATS;
  const grain = grainTexture();
  const make = (
    color: string,
    roughness: number,
    repeat: number,
    vertexColors = false,
  ): MeshStandardMaterial => {
    const m = new MeshStandardMaterial({ color, roughness, metalness: 0, vertexColors });
    if (grain) {
      // Cloned so each surface picks its own repeat; the clone shares the source image, so this is still
      // one texture on the GPU.
      const t = grain.clone();
      t.repeat.set(repeat, repeat);
      t.needsUpdate = true;
      m.map = t;
      m.roughnessMap = t;
    }
    return m;
  };

  MATS = {
    // Repeat 1: the ground's UVs are already in units of metres-per-tile, so the tiling is set there.
    ground: make('#ffffff', 0.98, 1, true),
    decal: new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      transparent: true,
      depthWrite: false,
      /**
       * The decal is a flat triangle soup in the XZ plane with an explicit `(0, 1, 0)` normal attribute,
       * and back-face culling does not consult that attribute — it consults winding. The first pass wound
       * these quads for a downward normal and the entire path network was culled away invisibly, which is
       * a silent failure worth naming: the geometry was correct, the lighting was correct, and nothing
       * was on screen.
       */
      side: DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
    /**
     * The worn tracks, which are no longer a decal and no longer share the decal's material.
     *
     * THREE DIFFERENCES FROM `decal`, AND EACH ONE IS FORCED BY THE TRACK HAVING RELIEF.
     *
     * `depthWrite` is ON. A flat decal cannot occlude itself, so switching depth writes off was free and
     * bought a clean overlap where two paths crossed. A track with 9cm banks absolutely can: with writes
     * off, whichever bank happens to come later in the index buffer wins, so a far shoulder paints over a
     * near one and the gully turns inside out from half the angles you can look along it from.
     *
     * `side` is the default front-only. `DoubleSide` was there because the flat quads had been wound for a
     * downward normal, which is the silent failure the note on `decal` records. The strip is wound and
     * indexed for an upward normal and its normals are computed, not asserted, so there is nothing to
     * rescue and back faces are triangles nobody can see.
     *
     * It keeps a grain map, unlike `decal`, because it is now a surface a child stands on and looks along
     * rather than a stain seen from above.
     */
    track: (() => {
      const t = make('#ffffff', 0.97, 2.2, true);
      t.transparent = true;
      // The outermost lane fades to nothing so the mesh never ends on a cut line; everything inboard of it
      // is fully opaque, which is what makes writing depth safe.
      t.polygonOffset = true;
      t.polygonOffsetFactor = -2;
      t.polygonOffsetUnits = -2;
      return t;
    })(),
    barnWall: make(PIG.barnRed, 0.82, 0.6),
    trim: make(PIG.cream, 0.8, 0.9),
    shingle: make(PIG.shingle, 0.74, 1.4),
    thatch: make(PIG.thatch, 0.95, 2.2),
    plaster: make(PIG.cream, 0.88, 0.7),
    timber: make(PIG.timber, 0.78, 1.6),
    timberDeep: make(PIG.timberDeep, 0.74, 1.6),
    stone: make(PIG.stone, 0.92, 0.8),
    stoneDeep: make(PIG.stoneDeep, 0.9, 0.9),
    hay: make(PIG.hay, 0.96, 1.8),
    burlap: make(PIG.burlap, 0.95, 2.0),
    water: new MeshStandardMaterial({ color: PIG.water, roughness: 0.16, metalness: 0.12 }),
    lamplight: new MeshStandardMaterial({
      color: '#6b4a2c',
      emissive: new Color(PIG.honey),
      emissiveIntensity: 2.8,
      roughness: 0.5,
    }),
    canopy: make('#ffffff', 0.9, 0.5),
    painted: make(PIG.creamDeep, 0.62, 1.2),

    /**
     * Shutter paint. White base, per-instance colour, and slightly glossier than the walls it hangs on —
     * paint on joinery is the one surface on a farm building that has actually been maintained, and a
     * shutter that shares the wall's roughness stops reading as a separate object made of a different
     * material.
     */
    shutter: make('#ffffff', 0.55, 1.1),

    /**
     * GLASS, and the two materials it takes.
     *
     * `roomGlow` is an opaque emissive panel set back in the frame: it is the ROOM, not a lamp, which is
     * why it is a broad warm wash rather than a point. `glass` is a thin transparent pane in front of it
     * at a roughness of 0.09, so it catches a hard reflection of the sky and the sun.
     *
     * TWO SURFACES, NOT ONE, and the reason is the owner's phrase "so a lit window reads as a home rather
     * than a hole". A single emissive pane is exactly a hole — a flat glowing rectangle with no surface,
     * which is how a window looks when it has been cut out of a wall rather than fitted into it. What
     * says "glazed" is a specular highlight sitting IN FRONT of the glow, and that needs a second
     * surface to sit on.
     */
    glass: new MeshStandardMaterial({
      color: '#dceaf2',
      roughness: 0.09,
      /**
       * OPACITY 0.16, DOWN FROM 0.34, AND METALNESS UP TO 0.4.
       *
       * A screenshot settled this one. At 0.34 the pane's own pale blue diffuse was washing a third of the
       * way over the warm room behind it, and every window came out milky cream — a blank panel, which is
       * the "hole in the wall" failure this material exists to avoid, arrived at from the opposite
       * direction. What sells glass is the SPECULAR, not the diffuse: so the diffuse is pulled back to
       * almost nothing and the metalness raised, which strengthens the sun's reflection in the pane without
       * putting any more haze over what is behind it.
       */
      metalness: 0.4,
      transparent: true,
      opacity: 0.16,
      // Off, so the glow behind is never sorted away in front of the pane.
      depthWrite: false,
    }),
    roomGlow: (() => {
      const m = new MeshStandardMaterial({
        color: '#4a3320',
        emissive: new Color(PIG.roomGlow),
        emissiveIntensity: 1.5,
        roughness: 0.85,
      });
      // Per-instance colour multiplies the DIFFUSE, not the emissive, so it cannot be used to vary
      // brightness here. Variation between windows is done with per-window emissive materials instead;
      // see `windows.tsx`.
      return m;
    })(),

    soil: make(PIG.soil, 0.98, 2.4),
    bloom: make('#ffffff', 0.72, 1),
    barnFloor: make(PIG.barnFloor, 0.96, 1),
    barnLining: make(PIG.barnLining, 0.88, 2.4),
    straw: make('#ffffff', 0.95, 1),

    /** Door furniture. Metal, so unlike everything else on the ranch it is allowed a specular. */
    brass: (() => {
      const b = make(PIG.brass, 0.33, 1);
      b.metalness = 0.62;
      return b;
    })(),
    /**
     * Baler twine. Paler and shinier than the hay it holds, which is the point: two bands of a DIFFERENT
     * material are what turn a rounded box of hay into a bale, and if they share the hay's roughness they
     * disappear into it and the bale is a box again.
     */
    twine: make('#efe0b4', 0.6, 1),
    /** Stones half-sunk in the worn track. Per-instance colour, warm, and rougher than the buildings. */
    stones: make('#ffffff', 0.94, 1.2),
  };
  return MATS;
}
