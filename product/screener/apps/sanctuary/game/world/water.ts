import { useFrame } from '@react-three/fiber';
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  DoubleSide,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RingGeometry,
  ShaderMaterial,
  type IUniform,
  Vector2,
  Vector4,
} from 'three';

import { grainTexture, rippleTexture } from './textures';

/**
 * Running water.
 *
 * THE COMPLAINT THIS MODULE ANSWERS, verbatim: the spring "just looks like a static, semi-transparent
 * object which technically it is but it needs to look more real than that". That diagnosis is exactly
 * right and it names the failure precisely. A pane of tinted glass laid flat in a stone box is
 * *geometrically* a pool of water and reads as a lid, because every cue the eye actually uses to decide
 * "water" is a cue about MOTION, and there was none:
 *
 *   1. The surface normal has to change over time, or nothing on the surface moves.
 *   2. It has to change at more than one rate and in more than one direction, or the whole sheet slides
 *      as one object — which reads as a sliding texture, which is worse than static.
 *   3. Something has to be BRIGHT and that bright thing has to travel. A specular highlight sitting
 *      still is a varnish; a highlight crawling across a crest is water.
 *   4. Where the falling stream hits, the surface has to be disturbed, and the disturbance has to leave
 *      and not come back.
 *   5. You have to be able to see INTO it, at least a little, and less so at a grazing angle.
 *
 * All five are one shader on the pool surface, and it is a patched `MeshStandardMaterial` rather than a
 * from-scratch `ShaderMaterial` on purpose: the brief's hard constraint is that the water still reads as
 * water under one low warm sun rather than going grey, and the only way to guarantee that is to let
 * three's own lighting chain light it. So the sun, the cool sky fill, the warm ambient, the fog and the
 * tone mapping all apply to the pool exactly as they apply to the stone beside it. What is injected is
 * the surface normal, the albedo and the opacity — never the lighting.
 *
 * WHAT IT COSTS. The pool is one draw call. Two texture fetches of the existing 256px ripple normal from
 * `textures.ts` (no new texture is uploaded), plus about twenty scalar ops for the rings, the foam and
 * the caustics. The falling stream is two thin cylinders and the splash is two rings and one billboard:
 * six draw calls for the whole spring, up from three, and no render target anywhere — a real refraction
 * pass costs a full scene re-render, which is not affordable on the integrated GPU this has to hold 60fps
 * on. The refraction here is faked twice over instead, and both fakes are honest: the surface really is
 * transparent, so the dark basin bed really does show through it, and the bed is then displaced and
 * lensed by the same normal that drives the specular, which is what refraction looks like.
 *
 * REDUCED MOTION. The brief is explicit that water may still flow gently, so it does — at 45% rate. What
 * stops is everything that OSCILLATES: the surface no longer bobs, and the splash rings park at a
 * resting radius instead of pulsing outward. `reducedRate()` is the single place that decision lives.
 */

/* ------------------------------------------------------------------ *\
   The clock

   One shared time uniform for every water material in the world, ticked once per frame by whichever
   component happens to own a `useFrame`. Sharing it is not a micro-optimisation: two clocks drifting
   apart would slide the falling stream out of phase with the rings it is supposed to be causing, and
   the causal link between the fall and the ripples is most of what sells the whole thing.
\* ------------------------------------------------------------------ */

const CLOCK: IUniform<number> = { value: 0 };

/** 0.45, and the number is the brief's: flow stays, oscillation goes. */
export function reducedRate(reduced: boolean): number {
  return reduced ? 0.45 : 1;
}

/**
 * The frame the clock was last advanced on, so it advances ONCE however many callers there are.
 *
 * There is more than one piece of water in the world now — the spring in `stations/carpentry.tsx` and the
 * troughs in `world/Buildings.tsx` — and the old contract, "call from exactly one `useFrame` per scene",
 * cannot be kept by either of them alone: the spring is not mounted in the `world/` preview, and a scene
 * with no spring in it would leave every trough frozen. Nor can it be kept by *both* of them, because two
 * tickers advance the shared clock twice a frame and every surface in the world runs at double speed.
 *
 * So the rule moves from the caller to here: every water component may tick, and only the first one each
 * frame does anything. `state.clock.elapsedTime` is the stamp because R3F reads it once per loop and hands
 * the same value to every subscriber in that loop, so it identifies a frame exactly.
 */
let TICKED_AT = -1;

/**
 * Advances the shared water clock. Safe to call from every component that owns water; see `TICKED_AT`.
 *
 * Returns the clock so a caller can read it for anything it wants to drive in step — the splash rings
 * do, which is how they stay married to the fall.
 */
export function useWaterClock(reduced: boolean): IUniform<number> {
  useFrame((state, dt) => {
    const stamp = state.clock.elapsedTime;
    if (stamp === TICKED_AT) return;
    TICKED_AT = stamp;
    // Clamped, so a tab that was in the background for a minute does not resume with the surface
    // teleported half a metre downstream.
    CLOCK.value += Math.min(dt, 0.05) * reducedRate(reduced);
  });
  return CLOCK;
}

/** The clock, for tests and for callers that only need to read it. */
export function waterClock(): IUniform<number> {
  return CLOCK;
}

/* ------------------------------------------------------------------ *\
   Pigment

   Same discipline as `pigment.ts`: unlit albedo chosen so a 4.6-intensity gold sun at 20° resolves it to
   the intended colour, not a value that already looks right on a flat page.
\* ------------------------------------------------------------------ */

const WATER = {
  /** The body colour, seen through the surface. Deliberately a green-lean teal: a pure blue goes grey
   *  the moment a warm light hits it, which is the exact failure the brief warns about twice. */
  deep: '#2c6a80',
  /** Where the water is thin — the rim, and the lensed bright cells. */
  shallow: '#69a8ae',
  /** Foam. Warm-white, not white: white foam under a gold sun reads as a bald spot in the texture. */
  foam: '#fff2dc',
  /** The falling stream, lit side and shadow side. */
  fallLit: '#eaf7fb',
  fallCool: '#9fc8d8',
} as const;

/* ------------------------------------------------------------------ *\
   Shader plumbing
\* ------------------------------------------------------------------ */

/**
 * String surgery on three's own shader, with the failure made loud.
 *
 * The whole technique rests on an `#include <name>` line still being present in the shader three hands
 * over, and that is a version-sensitive assumption. If it silently stopped matching, the water would
 * come back STATIC — which is the original defect, reintroduced invisibly, and no test that renders a
 * frame would catch it because a static pool still renders. So a missing marker throws.
 */
function inject(source: string, marker: string, replacement: string): string {
  if (!source.includes(marker)) {
    throw new Error(
      `water: cannot patch shader, marker "${marker}" is missing. three's shader chunks have moved; ` +
        'the pool would render static.',
    );
  }
  return source.replace(marker, replacement);
}

/**
 * The surface, as GLSL, injected in place of `<normal_fragment_maps>`.
 *
 * That is the one injection point where everything needed is already in scope and nothing has been
 * consumed yet: `diffuseColor` was declared at the top of `main`, `roughnessFactor` and `metalnessFactor`
 * by the two chunks immediately above, `tbn` by `<normal_fragment_begin>`, and the lighting chain does not
 * start until three lines below. So one block can set the normal, tint the albedo, lay foam on it, sharpen
 * the roughness on the crests and open the alpha — and every one of those decisions is then lit by the
 * scene's real lights rather than by anything invented here.
 *
 * The normal is the sum of four things, and the reason there are four is the brief's "so it does not read
 * as a single sliding sheet":
 *
 *   - a broad slow layer drifting downstream, which is the body of the current;
 *   - a finer, faster layer at 2.3x the frequency running across it at about 40° off, which is what
 *     breaks the first layer's own direction up;
 *   - a chop term at right angles, half a wavelength, which keeps the two from ever beating into a
 *     visible moiré;
 *   - travelling rings centred on where the stream lands.
 *
 * The rings are the piece worth arguing for. They cost one `length`, one `cos` and one `exp`, and they
 * buy three separate things the brief asks for as if they were separate features: the ripple ring at the
 * spout, a foam crest that travels outward, and — because they perturb the same normal the sun reflects
 * off — a bright specular arc that races away from the impact point. One term, three cues, and they are
 * automatically consistent with each other because they are literally the same wave.
 */
const SURFACE_GLSL = /* glsl */ `
  // ---- the flow field -------------------------------------------------------
  // vUv is in METRES: the pool is a ShapeGeometry, whose UVs are the shape's own x/y. So every
  // frequency and speed below is in real units and can be reasoned about rather than tuned blind.
  vec2 pos = vUv;

  vec2 uvA = ( pos + uFlowA * uTime ) * uScaleA;
  vec2 uvB = ( pos * mat2( 0.77, -0.64, 0.64, 0.77 ) + uFlowB * uTime ) * uScaleB;

  vec3 nA = texture2D( normalMap, uvA ).xyz * 2.0 - 1.0;
  vec3 nB = texture2D( normalMap, uvB ).xyz * 2.0 - 1.0;

  // Weighted sum of the tangent slopes rather than a blend of the normals. Blending normals averages two
  // bumps into one flatter bump; summing slopes lets a small fast wave sit ON a large slow one, which is
  // what a real surface does and is the difference between two layers reading as depth and reading as
  // cross-fade.
  vec2 slope = nA.xy * 1.0 + nB.xy * 0.62;

  // Cross-chop. Cheap, and it is what stops the two texture layers ever settling into a beat pattern.
  slope += vec2(
    sin( pos.y * 9.3 - uTime * 1.7 ) * 0.05,
    sin( pos.x * 7.1 + uTime * 1.3 ) * 0.05
  );

  // ---- rings from where the stream lands ------------------------------------
  //
  // uDisturb IS "IS THERE A SOURCE AT ALL". Everything in this block — the ring slope, the churn patch
  // and the travelling foam crest — is a consequence of water arriving from somewhere, and the file's own
  // rule about the impact point is that a feature implying a source that is not there is worse than no
  // feature. A trough standing in a yard has no inflow, so it passes 0 and gets only the drift layers and
  // the wet line at its rim; the spring passes 1 and is unchanged to the bit.
  vec2 fromImpact = pos - uImpact;
  float d = length( fromImpact );
  vec2 outward = fromImpact / max( d, 1e-4 );
  // uRing = ( spatial frequency, radians/sec, falloff per metre, amplitude )
  float phase = d * uRing.x - uTime * uRing.y;
  float decay = exp( -d * uRing.z ) * uDisturb;
  slope += outward * cos( phase ) * uRing.w * decay;

  // ---- the normal -----------------------------------------------------------
  vec3 mapN = normalize( vec3( slope, 1.6 ) );
  mapN.xy *= normalScale;
  normal = normalize( tbn * mapN );

  // ---- how much of the surface is turned away from us ----------------------
  // Grazing water is a mirror and vertical water is a window. Everything below is graded on this.
  vec3 viewDir = normalize( vViewPosition );
  float facing = saturate( dot( viewDir, normal ) );
  float fresnel = pow( 1.0 - facing, 4.0 );

  // ---- faked refraction, part one: lensing ---------------------------------
  // A wave crest is a lens. Where the surface is locally flat it passes light straight down to the bed
  // and the bed looks bright; where it is steep the light is thrown sideways and the bed goes dark. That
  // is the entire visual content of "caustics", and it is one dot product of the slope we already have.
  //
  // The exponent is 7 and the first pass had it at 3, which is worth writing down because the difference
  // was the whole look. Caustics are RARE and BRIGHT — thin bright cells on a dark body. At 3 the bright
  // term covered most of the pool, so the default state of the water was the pale shallow colour and the
  // deep colour only appeared in the steepest troughs. The result was milky, which is what an unlit sheet
  // of glass also looks like, so the shader was working perfectly and buying nothing.
  float lens = saturate( 1.0 - dot( slope, slope ) * 0.55 );
  float caustic = pow( lens, 7.0 );

  // ---- faked refraction, part two: displacing what is under the surface ----
  // The bed really is visible through this material — the basin's dark stone slab is a real mesh below
  // it and the alpha below really does let it through. What the alpha cannot do is BEND it, so the body
  // colour is displaced by the same slope instead, sampled off the grain map at a low frequency. The eye
  // reads a displaced pattern under a transparent surface as depth, and it never checks whether the
  // pattern belongs to the thing beneath.
  vec2 bedUv = pos * 0.42 + slope * 0.075;
  float bed = texture2D( map, bedUv ).g;
  vec3 body = mix( uDeep, uShallow, saturate( caustic * 0.6 + ( bed - 0.9 ) * 1.7 + 0.05 ) );

  // ---- foam ----------------------------------------------------------------
  // Three sources, all of them consequences of something visible rather than decoration.
  // 1. Where the stream lands: a churn patch, held off a clean circle by the wave field itself.
  float churn = smoothstep( uImpactRadius, uImpactRadius * 0.35, d + ( nA.x + nB.y ) * 0.09 ) * uDisturb;
  // 2. The crest of each travelling ring, thin and outward-running. decay already carries uDisturb.
  float crest = smoothstep( 0.45, 0.95, cos( phase ) ) * decay * 0.85;
  // 3. The wet line where the water meets the kerb, wobbled so it is never a drawn outline.
  // 6cm and weighted 0.3: this basin is only 93cm across inside, so the 8.5cm band the first pass used
  // covered a fifth of the whole surface and read as a painted border rather than as a waterline. It is a
  // uniform because that argument is about the band as a FRACTION of the vessel, and a trough is 65cm
  // across inside — the same 6cm there is the painted border this number was lowered to avoid.
  vec2 toRim = uHalf - abs( pos );
  float rim = 1.0 - smoothstep( 0.0, uRimBand, min( toRim.x, toRim.y ) + slope.x * 0.02 );
  float foam = saturate( churn * 0.9 + crest + rim * 0.3 );

  // ---- put it together -----------------------------------------------------
  diffuseColor.rgb *= body;
  diffuseColor.rgb = mix( diffuseColor.rgb, uFoam, foam * 0.88 );

  // Foam is a mat of bubbles, so it is rough and it is opaque. Open water is neither.
  roughnessFactor = mix( mix( 0.055, 0.16, 1.0 - lens ), 0.72, foam );
  metalnessFactor *= 1.0 - foam * 0.9;

  // Look down and you see the bed; look along the surface and you see the sky in it.
  diffuseColor.a = clamp( mix( uAlpha.x, uAlpha.y, fresnel ) + foam * 0.55, 0.0, 1.0 );
`;

export interface SurfaceSpec {
  /**
   * Where the falling stream lands, in the pool mesh's own UV frame — which, because the pool is a
   * `ShapeGeometry`, is metres in the mesh's local X/Y. Passed in rather than assumed: the caller is the
   * only thing that knows where it put the flume, and a ring centred on the wrong spot is worse than no
   * ring at all because it implies a source that is not there.
   *
   * Optional only because `disturbance: 0` water has no source to point at, and a required field whose
   * value is meaningless is a field that gets filled in with a lie.
   */
  impact?: readonly [number, number];
  /** Half extents of the pool in the same frame, for the wet line at the kerb. */
  half: readonly [number, number];
  /** Radius of the churn patch under the stream. */
  impactRadius?: number;
  /** Downstream direction, unit-ish. The broad layer drifts this way, away from the impact. */
  flow?: readonly [number, number];
  /**
   * How fast the two drift layers run, as a multiple of the spring's own rate.
   *
   * A fed basin turns over; a trough does not. The trough passes 0.3, which is slow enough that what a
   * child sees is the sun's highlight crawling across the surface rather than a current — and that
   * crawling highlight is the single cue that says "water" rather than "a blue lid", which is the whole
   * complaint this module was written to answer.
   */
  speed?: number;
  /**
   * 1 for water with a source, 0 for water without one. Scales the impact rings, the churn patch and the
   * travelling foam crest together, because all three are the same wave. See the note in `SURFACE_GLSL`.
   */
  disturbance?: number;
  /** Width of the wet line at the rim, in metres. Scale it with the vessel, not with the spring. */
  rimBand?: number;
}

export interface FlowingWater {
  material: MeshStandardMaterial;
  /** Mutable, so a caller can move the impact point if the flume ever moves. */
  uniforms: Record<string, IUniform>;
}

/**
 * The pool surface.
 *
 * Two texture layers, both of them the ripple normal already in `textures.ts`, at 0.55 and 1.28 tiles per
 * metre and moving in different directions at different speeds. The scales are not arbitrary: they are a
 * ratio of 2.33, which is irrational enough over the size of this basin that the two never line up into a
 * repeat a child could notice.
 */
export function flowingWater(spec: SurfaceSpec): FlowingWater {
  const ripple = rippleTexture();
  const grain = grainTexture();
  const flow = spec.flow ?? [1, 0.18];
  const flowLen = Math.hypot(flow[0], flow[1]) || 1;

  const speed = spec.speed ?? 1;

  const uniforms: Record<string, IUniform> = {
    uTime: CLOCK,
    // Metres per second, and slow. Fast water is a river; a fed spring basin turns over gently, and the
    // first pass of this at 0.4 m/s read as a conveyor belt.
    uFlowA: {
      value: new Vector2((flow[0] / flowLen) * 0.115 * speed, (flow[1] / flowLen) * 0.115 * speed),
    },
    uFlowB: { value: new Vector2(0.052 * speed, -0.086 * speed) },
    uScaleA: { value: 0.55 },
    uScaleB: { value: 1.28 },
    uImpact: { value: new Vector2(spec.impact?.[0] ?? 0, spec.impact?.[1] ?? 0) },
    uImpactRadius: { value: spec.impactRadius ?? 0.34 },
    uHalf: { value: new Vector2(spec.half[0], spec.half[1]) },
    /** frequency (rad/m), speed (rad/s), falloff (1/m), amplitude. 9.2 rad/m is a 68cm wavelength. */
    uRing: { value: new Vector4(9.2, 5.6, 1.45, 0.5) },
    uDeep: { value: new Color(WATER.deep) },
    uShallow: { value: new Color(WATER.shallow) },
    uFoam: { value: new Color(WATER.foam) },
    /** Opacity looking straight down, and at a grazing angle. */
    uAlpha: { value: new Vector2(0.68, 0.97) },
    uDisturb: { value: spec.disturbance ?? 1 },
    uRimBand: { value: spec.rimBand ?? 0.06 },
  };

  const material = new MeshStandardMaterial({
    // White, because the body colour is applied in the shader from `uDeep`/`uShallow`. Left tinted here
    // it would multiply in twice and the pool would go nearly black.
    color: '#ffffff',
    roughness: 0.1,
    metalness: 0.14,
    transparent: true,
    normalMap: ripple ?? null,
    // Sampled only as the displaced bed pattern. It is also what defines `USE_MAP`, which is what makes
    // `vMapUv` and the `map` uniform exist at all — the alternative is a second normal map fetch for a
    // job a grain map does better.
    map: grain ?? null,
    normalScale: new Vector2(0.85, 0.85),
  });
  material.name = 'ranch-spring-surface';

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = inject(
      shader.vertexShader,
      '#include <common>',
      '#define USE_UV\n#include <common>',
    );
    shader.fragmentShader = inject(
      shader.fragmentShader,
      '#include <common>',
      [
        '#define USE_UV',
        'uniform float uTime;',
        'uniform vec2 uFlowA;',
        'uniform vec2 uFlowB;',
        'uniform float uScaleA;',
        'uniform float uScaleB;',
        'uniform vec2 uImpact;',
        'uniform float uImpactRadius;',
        'uniform vec2 uHalf;',
        'uniform vec4 uRing;',
        'uniform vec3 uDeep;',
        'uniform vec3 uShallow;',
        'uniform vec3 uFoam;',
        'uniform vec2 uAlpha;',
        'uniform float uDisturb;',
        'uniform float uRimBand;',
        '#include <common>',
      ].join('\n'),
    );
    shader.fragmentShader = inject(
      shader.fragmentShader,
      '#include <normal_fragment_maps>',
      SURFACE_GLSL,
    );
  };
  // One variant, one key. Without this three would treat the patched material as sharing the stock
  // program cache entry, which is how a patched shader ends up silently unpatched.
  material.customProgramCacheKey = () => 'ranch-spring-surface';

  return { material, uniforms };
}

/* ------------------------------------------------------------------ *\
   The fall
\* ------------------------------------------------------------------ */

/**
 * Where "the lip" ends, in V — the top 14% of the fall.
 *
 * The vertex shader damps the bulge to nothing across this band and the fragment shader thickens the
 * water across the same band, for the same physical reason: at the mouth the stream is still coherent,
 * and it comes apart on the way down. One constant in one place, so the two cannot drift.
 */
const FALL_LIP = 0.86;

/**
 * The falling stream.
 *
 * A THIN OPEN CYLINDER IS THE RIGHT SHAPE and the wrong material, which is what was there before: a
 * flat 60%-opacity tube reads as a plastic straw, because a real fall of water has no interior — you see
 * its front surface, its back surface and, most of all, its EDGES, where the line of sight travels
 * through the most water. So the silhouette is the brightest part of it, and that is one dot product.
 *
 * On top of that, the two things that say "falling" rather than "hanging":
 *
 *   - stripes scrolling DOWN fast, at two frequencies whose speeds differ by 1.6x, so no single band can
 *     be tracked by eye and the whole thing reads as continuous rather than as a looping belt;
 *   - a taper and a widening wobble toward the bottom, because a fall accelerates, thins, and starts to
 *     come apart before it lands.
 *
 * `ShaderMaterial` rather than a patched standard one, and this is the exception that proves the rule
 * used for the pool: the pool needed the scene's lighting because a pool is a surface whose whole job is
 * to reflect its surroundings, and a fall of white water is dominated by internal scattering — it is
 * nearly as bright on its shaded side as on its lit one. Lighting it correctly would make it darker and
 * less true. It is still tone-mapped and still fogged, so it belongs to the same world.
 */
export function fallingStream(): { material: ShaderMaterial; uniforms: Record<string, IUniform> } {
  const uniforms: Record<string, IUniform> = {
    uTime: CLOCK,
    uLit: { value: new Color(WATER.fallLit) },
    uCool: { value: new Color(WATER.fallCool) },
    /**
     * Lengths of the fall per second. 2.0 against a real 90cm drop's mean of about 2.3 m/s, held a
     * little under true because past roughly 2.5 the slugs advance far enough between frames to strobe.
     */
    uSpeed: { value: 2.0 },
    uOpacity: { value: 0.93 },
  };

  const material = new ShaderMaterial({
    uniforms,
    transparent: true,
    // Off, so the two nested tubes and the pool surface behind them all show through each other. A fall
    // that occludes itself has a visible seam down the middle of it.
    depthWrite: false,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      #define LIP ${FALL_LIP.toFixed(2)}
      uniform float uTime;
      uniform float uSpeed;
      varying vec2 vUvw;
      varying vec3 vN;
      varying vec3 vView;

      /**
       * THE SILHOUETTE HAS TO MOVE, and this is the cue that finally sold it.
       *
       * With the shading alone the column was better but still read as glassware, and a screenshot said
       * why in one glance: both edges were dead straight vertical lines for the whole 90cm. Nothing in
       * water is a straight line for 90cm. So the same travelling slugs the fragment shader brightens are
       * also used here to swell the tube's radius, which makes the OUTLINE undulate — and the outline is
       * what the eye actually uses to identify a shape.
       *
       * Note this is translation of a pattern along the fall, not an oscillation in place, so it is flow
       * in the sense prefers-reduced-motion cares about: under that setting the shared clock simply
       * advances more slowly and the water keeps running.
       */
      void main() {
        vUvw = uv;
        float travel = ( 1.0 - uv.y ) * 30.0 + uTime * uSpeed * 30.0;
        /**
         * DAMPED TO NOTHING AT THE LIP, and this is the half of the fix that placement cannot do.
         *
         * The top of the tube is tucked up inside an opaque nozzle so its cut rim is hidden — but a
         * radius that swells by 38% up there shoves the tube's flank back out through the nozzle's wall
         * and sucks it in again at uSpeed * 30 / 2pi, about nine and a half times a second. That
         * flicker is what reads as a stitched seam at the spout, and no amount of tucking absorbs it:
         * at full bulge the tube is 79mm across and the nozzle's bore is 78mm, so the water is wider
         * than the mouth it leaves.
         *
         * It is also the truer read, and the fragment shader already says so across the same band:
         * coherent at the lip, coming apart on the way down. Only the top 10cm of an 86cm fall loses
         * its wobble, and 2cm of that is inside the nozzle.
         */
        float bulge = 1.0 + smoothstep( 1.0, LIP, uv.y ) *
          ( 0.26 * sin( travel ) + 0.12 * sin( travel * 2.6 ) );
        vec3 p = position;
        // Radially only. The parent scales this mesh in Y to reach from the nozzle to the surface, so
        // touching p.y here would fight that scale and detach the fall from its own lip.
        p.xz *= bulge;
        vec4 mv = modelViewMatrix * vec4( p, 1.0 );
        vN = normalize( normalMatrix * normal );
        vView = -mv.xyz;
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      // For saturate(), which common defines as a macro, so it costs nothing.
      #define LIP ${FALL_LIP.toFixed(2)}
      #include <common>
      uniform float uTime;
      uniform vec3 uLit;
      uniform vec3 uCool;
      uniform float uSpeed;
      uniform float uOpacity;
      varying vec2 vUvw;
      varying vec3 vN;
      varying vec3 vView;

      void main() {
        // V runs 0 at the bottom to 1 at the nozzle, so distance fallen is 1 - V and everything in the
        // water travels toward V = 0.
        float v = vUvw.y;
        // 30 radians over the length of the fall is about five slugs in the air at once, which is what a
        // 90cm drop from a flume lip actually shows. At the 8 the first pass used there were under two,
        // and two lumps read as a wobble rather than as flow.
        float travel = ( 1.0 - v ) * 30.0 + uTime * uSpeed * 30.0;

        /**
         * SLUGS OF WATER RUNNING DOWN THE COLUMN, and this is the term that fixed the whole thing.
         *
         * The first pass had fine scrolling stripes and a strong edge highlight, and it read
         * unmistakably as a glass test tube — which is a useful failure, because it says exactly what
         * was missing. A tube of glass has constant thickness. A fall of water does not: it necks and
         * bulges as it goes, at a scale you can see, and those bulges TRAVEL. Two travelling rates at
         * 11 and 27 per unit length give the column a varying apparent thickness that moves, and that
         * alone is the difference between glassware and water.
         */
        float lumps = 0.52 + 0.32 * sin( travel ) + 0.16 * sin( travel * 2.6 + vUvw.x * 4.0 );

        // Filaments around the circumference. Fixed in place rather than scrolling sideways, because a
        // fall's threads are set by the lip it left and stay where they are all the way down.
        float thread = sin( vUvw.x * 25.0 + sin( travel * 0.11 ) * 0.6 );
        float threads = 0.5 + 0.5 * pow( saturate( thread * 0.5 + 0.5 ), 0.65 );

        /**
         * Thickness along the view ray. At the silhouette of a round column the ray travels the long way
         * through the water, so the edges are the brightest and the most opaque part of it.
         *
         * Weighted 0.45 base to 0.55 rim, not the 0.34/0.9 of the first pass. Pushing the rim that hard
         * left the middle of the column nearly clear, which is precisely how you draw a glass tube: two
         * bright lines with a window between them.
         */
        float rim = 1.0 - abs( dot( normalize( vN ), normalize( vView ) ) );
        float thickness = 0.45 + pow( rim, 1.2 ) * 0.55;

        // Leaves the nozzle coherent, arrives coming apart, and hands over to the churn on the surface
        // rather than ending on a cut edge.
        float fall = 1.0 - v;
        float fray = 1.0 - fall * fall * 0.34;

        float bright = saturate( threads * lumps * 1.45 );
        vec3 col = mix( uCool, uLit, bright );
        float alpha = clamp( uOpacity * thickness * ( 0.5 + bright * 0.65 ) * fray, 0.0, 1.0 );
        // A hair of extra presence right at the lip, where the water is thickest and slowest.
        alpha = min( 1.0, alpha + smoothstep( LIP, 1.0, v ) * 0.3 );

        gl_FragColor = vec4( col, alpha );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    /**
     * No fog, and the arithmetic is the argument. `Lighting.tsx` runs `FogExp2` at 0.0163, so at the four
     * metres a child stands from this station the fog factor is `1 - exp(-(0.0163 * 4)^2)`, which is four
     * tenths of one percent. Wiring `UniformsLib.fog` into a raw uniform set to buy that would be
     * plumbing for nothing, and the cloud sprites in `Lighting.tsx` opt out for the same reason.
     *
     * Tone mapping is NOT opted out of. These are the brightest surfaces in the frame and ACES is what
     * keeps them from clipping to a flat white blob, which is precisely what "looks like a real thing"
     * depends on here.
     */
    fog: false,
  });
  material.name = 'ranch-spring-fall';
  return { material, uniforms };
}

/**
 * Geometry for the fall: an open, tapering tube.
 *
 * Open-ended because a cap at the bottom is a visible disc floating in the pool.
 *
 * TAPERED, and the taper is arithmetic rather than taste. Water leaving the lip at roughly 0.5 m/s
 * arrives 90cm lower at `sqrt(2gh)` plus its initial speed, about 4.4 m/s. Volume per second is
 * conserved, so the cross-section has to shrink by that same ratio and the radius by its square root —
 * which is why 6cm at the lip becomes under 3cm at the surface. Getting this backwards is what makes a
 * fall look like a funnel of spray instead of a stream.
 *
 * `radialSegments` is 7 rather than a round number so the silhouette's facets never line up with the
 * screen's pixel grid into a visible flat side.
 */
export function fallGeometry(topRadius = 0.06, bottomRadius = 0.028): CylinderGeometry {
  // three's signature is ( radiusTop, radiusBottom, ... ) and the argument order here is the one place
  // this can silently invert: swapped, the fall trumpets outward on its way down and reads as a funnel.
  //
  // FOURTEEN HEIGHT SEGMENTS, and the number is load-bearing rather than a default nudged upward. With
  // the 1 that was here the tube had TWO vertex rings, so the vertex shader's whole stated purpose —
  // swelling the radius so the OUTLINE undulates, "and the outline is what the eye actually uses to
  // identify a shape" — could not do anything along the length: there was nothing between top and
  // bottom to displace, and the silhouette was two straight lines by construction.
  //
  // It also silently broke the lip damping below. `smoothstep( 1.0, LIP, uv.y )` only ever saw
  // uv.y in { 0, 1 }, so it pinned the top ring and left the bottom at full bulge — which converts a
  // flicker at the mouth into the whole column pumping width as a cone. Fourteen rings over an 86cm
  // fall is ~6cm each against an ~18cm wobble, so the wave resolves. 196 triangles instead of 14.
  return new CylinderGeometry(topRadius, bottomRadius, 1, 7, 14, true);
}

/**
 * The churn where the stream lands, as one additive disc lying on the water.
 *
 * Standing in for particles, and the trade is the one `Lighting.tsx` makes for the sun's bloom: a spray
 * of forty sprites is forty depth-sorted quads a frame, and at this size nobody can count them anyway.
 * One soft breathing disc reads as churn and costs one draw call.
 *
 * HORIZONTAL rather than a vertical billboard, which is a decision and not a shortcut. A vertical plume
 * of mist has to face the camera or it vanishes edge-on, and facing the camera means a per-frame `lookAt`
 * on a mesh inside a station that already owns its transform. Lying flat it is correct from every angle
 * with no bookkeeping, and it is also the truer read: what you actually see where a small fall meets a
 * fed basin is a bright churning patch ON the water, not a cloud above it.
 */
export function churnMaterial(bounds: RingBounds): {
  material: ShaderMaterial;
  uniforms: Record<string, IUniform>;
} {
  const uniforms: Record<string, IUniform> = {
    uTime: CLOCK,
    uTint: { value: new Color(WATER.foam) },
    /* The same bounds the foam rings take, for the same reason: a 27cm disc centred 11.25cm from the
       trough's end overruns the pool by 13.6cm and is drawn flat on the kerb, so the stream reads as
       landing on the stone rather than in the water. */
    uChurnHalf: { value: new Vector2(bounds.half[0], bounds.half[1]) },
    uChurnCentre: { value: new Vector2(bounds.centre[0], bounds.centre[1]) },
  };
  const material = new ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    side: DoubleSide,
    vertexShader: /* glsl */ `
      varying vec2 vUvw;
      varying vec2 vChurn;
      void main() {
        vUvw = uv;
        // Offset from the disc's centre in metres, so the fragment stage can tell how near the
        // waterline it is. Column length is the world scale, as in the foam ring material.
        vChurn = position.xy * length( modelMatrix[ 0 ].xyz );
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
      }
    `,
    fragmentShader: /* glsl */ `
      #define RING_FADE_GLSL ${RING_FADE.toFixed(2)}
      uniform float uTime;
      uniform vec3 uTint;
      uniform vec2 uChurnHalf;
      uniform vec2 uChurnCentre;
      varying vec2 vUvw;
      varying vec2 vChurn;
      void main() {
        vec2 p = vUvw - 0.5;
        float r = length( p ) * 2.0;
        float ang = atan( p.y, p.x );
        // Lobed rather than round. A perfect additive circle reads as a spotlight shining on the water,
        // which is what the first pass looked like; three lobes turning slowly reads as churn.
        r *= 1.0 - 0.16 * sin( ang * 3.0 + uTime * 1.1 ) - 0.09 * sin( ang * 5.0 - uTime * 0.7 );
        // Two out-of-phase breaths, so the spray swells unevenly rather than pulsing like a metronome.
        float swell = 0.72 + 0.18 * sin( uTime * 2.3 ) + 0.1 * sin( uTime * 3.7 + 1.1 );
        float a = smoothstep( 1.0, 0.15, r / swell ) * 0.26;
        // Out at the waterline, exactly as the foam rings do. See foamRingMaterial below.
        vec2 churnRim = uChurnHalf - abs( uChurnCentre + vChurn );
        a *= smoothstep( 0.0, RING_FADE_GLSL, min( churnRim.x, churnRim.y ) );
        gl_FragColor = vec4( uTint, a );
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    fog: false,
  });
  material.name = 'ranch-spring-churn';
  return { material, uniforms };
}

/** The churn disc. Unit radius, so the caller scales it to the patch it wants. */
export function churnGeometry(): PlaneGeometry {
  return new PlaneGeometry(2, 2);
}

/**
 * One expanding foam ring, as a flat annulus of unit outer radius.
 *
 * A flat ring rather than the torus that was here before, and the reason is what a torus does when you
 * scale it: its tube scales with its radius, so a ring that starts 2cm thick arrives 11cm thick and reads
 * as a doughnut sitting in the basin. An annulus keeps a constant PROPORTION instead, which is what a
 * real ripple ring does as it spreads and thins out of existence.
 */
export function splashRingGeometry(): RingGeometry {
  return new RingGeometry(0.9, 1, 30, 1);
}

/**
 * The foam rings' material. Deliberately unlit and warm.
 *
 * Foam is the one part of water that is not a mirror: it is a mat of air bubbles that scatters everything
 * that enters it, so it is nearly as bright facing away from the sun as facing into it. Lighting it would
 * make it grey on the shadow side, which is the failure the brief calls out by name.
 */
/**
 * Where the water ENDS, so a ring can be told to stop at it.
 *
 * Both in the pool surface's own local metres — the frame `flowingWater`'s `impact` is already expressed
 * in, so a caller that has one has the other for free and the two cannot disagree about where the water
 * is.
 */
export interface RingBounds {
  /** Half-extents of the water. */
  half: readonly [number, number];
  /** Where this ring's centre sits in that frame. */
  centre: readonly [number, number];
}

/** How wide the fade at the waterline is. Wide enough to read as foam thinning, not as a cut edge. */
const RING_FADE = 0.09;

/**
 * The foam rings' material. Deliberately unlit and warm, and it stops at the water's edge.
 *
 * UNLIT: foam is the one part of water that is not a mirror — it is a mat of air bubbles that scatters
 * everything entering it, so it is nearly as bright facing away from the sun as into it. Lighting it
 * would make it grey on the shadow side, which is the failure the brief calls out by name.
 *
 * FADED AT THE RIM, and this is why the material is patched rather than plain. A ring is round and a
 * vessel is not. The tide ledge's stream lands 11.25cm from the end of a 4.14m trough, so a ring that
 * grows to the 51cm a ripple in open water wants is outside the pool for 99.7% of its life and finishes
 * 16.75cm past the OUTER face of the kerb, hanging over the grass — the owner's "make sure the circle
 * doesn't leave the pool".
 *
 * Scaling the ring down to fit was tried and rejected on sight: the smallest clearance is 11.25cm, which
 * makes the largest ring smaller than the 27cm churn patch it sits inside, so the containment is perfect
 * and the effect is gone. Fading each fragment as it nears the waterline keeps the ring its full size and
 * is the truer read anyway — a ripple reaching a wall does not stop being a ripple, it stops being foam.
 *
 * The scale is read from the model matrix rather than passed as a uniform, because the mesh is already
 * scaled every frame and a second copy of that number is a second thing to keep in step.
 */
export function foamRingMaterial(bounds: RingBounds): MeshBasicMaterial {
  const material = new MeshBasicMaterial({
    color: WATER.foam,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    side: DoubleSide,
  });
  material.name = 'ranch-spring-foam-ring';

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uRingHalf = { value: new Vector2(bounds.half[0], bounds.half[1]) };
    shader.uniforms.uRingCentre = { value: new Vector2(bounds.centre[0], bounds.centre[1]) };

    shader.vertexShader = inject(
      shader.vertexShader,
      '#include <common>',
      `#include <common>
       varying vec2 vRing;`,
    );
    shader.vertexShader = inject(
      shader.vertexShader,
      '#include <begin_vertex>',
      `#include <begin_vertex>
       // The ring's own offset from its centre, in metres. Column length is the world scale, which is
       // what the frame loop writes to the mesh scale, so this tracks the growth without a uniform.
       vRing = position.xy * length( modelMatrix[ 0 ].xyz );`,
    );

    shader.fragmentShader = inject(
      shader.fragmentShader,
      '#include <common>',
      `#include <common>
       varying vec2 vRing;
       uniform vec2 uRingHalf;
       uniform vec2 uRingCentre;`,
    );
    shader.fragmentShader = inject(
      shader.fragmentShader,
      '#include <dithering_fragment>',
      `#include <dithering_fragment>
       // Distance from this fragment to the nearest waterline, and out at zero.
       vec2 toRim = uRingHalf - abs( uRingCentre + vRing );
       gl_FragColor.a *= smoothstep( 0.0, ${RING_FADE.toFixed(2)}, min( toRim.x, toRim.y ) );`,
    );
  };
  /* Two rings, two materials, one program. Without a stable key three compiles a variant per material
     because `onBeforeCompile` makes them look different to its cache. */
  material.customProgramCacheKey = () => 'ranch-spring-foam-ring';
  return material;
}

/**
 * Where the two splash rings sit at time `t`, as a radius and an opacity.
 *
 * Exported as arithmetic rather than buried in a component so the ring can be driven from the SAME clock
 * as the shader's rings and therefore stay in step with them — a ring expanding at a rate the surface
 * disagrees with is worse than no ring, because the eye sees two different pieces of water.
 *
 * `reduced` parks them at their mid radius, which is a resting state rather than an absence: under
 * reduced motion the ring is still there, telling a child the water is fed, it simply does not pulse.
 */
/**
 * The radius envelope of a splash ring: where it starts, and the largest it ever asks to be.
 *
 * Exported because THE CALLER IS THE ONLY THING THAT KNOWS HOW MUCH ROOM THERE IS, and the radius below
 * is a wish rather than a licence. A ring is round; a vessel is not. This curve was sized for a splash
 * in the middle of a trough 99cm across, where the water allows 49.5cm — almost exactly what it wants.
 * But the tide ledge's stream lands 11.25cm from the trough's -X end, so an unbounded 51cm ring leaves
 * the water three milliseconds into a 1150ms pulse and finishes 16.75cm PAST the outer face of a 26cm
 * kerb, hanging in the air over the grass.
 *
 * So a caller divides by `SPLASH_RING_MAX` to get the ring's progress in 0..1 and multiplies by a limit
 * it derives from its own vessel — see `ringRoom` in the tide ledge. The envelope stays here, beside the
 * curve it belongs to, so the two cannot drift apart.
 */
export const SPLASH_RING_MIN = 0.09;
const SPLASH_RING_GROWTH = 0.42;
export const SPLASH_RING_MAX = SPLASH_RING_MIN + SPLASH_RING_GROWTH;

export function splashRing(t: number, index: number, reduced: boolean): { radius: number; opacity: number } {
  const period = 1.15;
  if (reduced) return { radius: 0.2 + index * 0.14, opacity: 0.3 };
  const phase = ((t / period + index * 0.5) % 1 + 1) % 1;
  return {
    // Decelerating outward, the way a real ring does as it loses energy to the surface.
    radius: SPLASH_RING_MIN + Math.sqrt(phase) * SPLASH_RING_GROWTH,
    // Up fast, out slowly.
    opacity: Math.min(1, phase * 6) * (1 - phase) * 0.75,
  };
}
