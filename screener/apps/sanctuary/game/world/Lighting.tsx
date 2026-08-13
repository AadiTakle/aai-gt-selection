import { Sky } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useLayoutEffect, useMemo, useRef, type JSX } from 'react';
import {
  AdditiveBlending,
  Color,
  FogExp2,
  type DirectionalLight,
  type Group,
  type Sprite,
  Vector3,
} from 'three';

import { useShadowCadence } from '../perf/cadence';
import { usePrefersReducedMotion } from './motion';
import { glowTexture, puffTexture } from './textures';

/**
 * Perpetual golden hour.
 *
 * WHAT WAS WRONG. The scene was lit by a hemisphere light at 0.75 and one directional at 2.1 from
 * `[18, 26, 12]` — 55° up. A light that high has nothing to say about form: every horizontal surface
 * gets the same value, shadows are stubs directly beneath the thing casting them, and the fill was so
 * strong that the shadow sides were the same colour as the lit sides, only slightly darker. The result
 * reads as an overcast noon, which is the one time of day with no mood in it.
 *
 * THE FIX, in one sentence: a single low warm sun, a cool sky, and a big gap between them.
 *
 *  - ONE sun at 17.8° elevation. Below about 20° a shadow is roughly three times as long as the thing
 *    casting it, so a 5-metre barn throws 16 metres of shadow across the meadow. Long shadows are the
 *    whole of what "golden hour" means visually; the colour is only the confirmation.
 *  - The sun sits behind the child's right shoulder as they arrive, not in front of them. That is the
 *    difference between a scene where every wall a child can see is in shadow and one where every wall
 *    is gold. It also, usefully, throws light onto the front of the pod wall, which is the surface the
 *    screener actually needs legible.
 *  - Fill is COOL and LOW: a blue-sky hemisphere plus one weak blue bounce, together about a third of
 *    the sun. Shadow sides therefore land blue-grey against gold lit sides, and that opposition is what
 *    the eye reads as late light. Warm shadows would read as an indoor lamp; equal-strength fill would
 *    read as the flat noon we are replacing.
 *  - Fog is warm and exponential, so distance dissolves into the horizon band instead of ending at a
 *    visible line.
 *
 * DELIBERATELY NOT HERE: a postprocessing stack. Bloom and god rays are the obvious next move and both
 * cost a full-screen pass on hardware where the frame budget is already the binding constraint. The
 * glow is a single additive billboard on the sun instead — one draw call, no render target, and at this
 * sun elevation it does most of the work a bloom would.
 */

/**
 * Direction *toward* the sun, unit length. Elevation 20°, azimuth 122° off north.
 *
 * 20° rather than the 18° the first pass used, and the two degrees were bought with a screenshot: a flat
 * meadow takes `sin(elevation)` of the sun, so going from 18° to 20° is an 11% brightening of the largest
 * surface in the frame, while a shadow at 20° is still 2.7 times the height of the thing casting it. Any
 * lower and the ground has to be faked bright with fill, which flattens everything else.
 *
 * The azimuth is the one number in this file that was tuned by looking rather than by reasoning, and it
 * is a compromise between two things that pull opposite ways. Put the sun directly behind the arriving
 * child and every wall is gold but the shadows recede into the distance, foreshortened into smears. Put
 * it out to the side and the shadows rake beautifully across the frame but every wall the child can see
 * is a terminator. At roughly 58° off the arrival sightline the shadows still fall left-and-away at a
 * strong diagonal — which is how you read their length in first person — while the two visible faces of
 * the barn land at 0.76 and 0.57 of full sun, both unmistakably gold and different enough from each other
 * to give the building volume.
 */
export const SUN_DIR: readonly [number, number, number] = (() => {
  const v = new Vector3(0.8, 0.345, 0.51).normalize();
  return [v.x, v.y, v.z] as const;
})();

/** How far out the sun light is parked. Only affects the shadow camera's depth range. */
const SUN_DISTANCE = 62;

export const SUN_POSITION: readonly [number, number, number] = [
  SUN_DIR[0] * SUN_DISTANCE,
  SUN_DIR[1] * SUN_DISTANCE,
  SUN_DIR[2] * SUN_DISTANCE,
];

/** Radius of the ground the player can reach. */
const PLAY_RADIUS = 34;
/**
 * Radius the shadow map covers.
 *
 * Generously past the play area, and the reason is a visible artifact rather than a principle: outside the
 * map three shades nothing, so the frustum edge draws a hard line across the ground where shadowed
 * meadow meets unshadowed meadow. At 52m that line sits behind the treeline and under about half the fog,
 * where it cannot be seen. The cost is texel size — 104m over 2048 is 5.1cm, still four times finer than
 * the smallest thing that casts.
 */
const SHADOW_RADIUS = 52;
/** Tallest thing that casts: the windmill's vane tip. */
const TALLEST = 12;

const SUN_COLOR = '#ffc477';
const SUN_INTENSITY = 4.6;
const SKY_FILL = '#9cc2ee';
const GROUND_BOUNCE = '#b08a63';
const HEMI_INTENSITY = 0.72;
/**
 * The blue bounce, and why it earns its intensity.
 *
 * At 0.3 the shadow sides of the buildings came out a dead neutral grey, which is what a cream wall does
 * when its only light is a hemisphere overhead plus a warm ambient — the two cancel to no hue at all. At
 * 0.55 and a full step bluer, the same wall reads as a plane turned away from a gold sun and into a blue
 * sky. That opposition is the whole trick of golden hour and it is worth more than the extra 7% of fill.
 */
const BOUNCE_COLOR = '#7fadf2';
const BOUNCE_INTENSITY = 0.85;

/**
 * A warm omnidirectional floor under everything.
 *
 * Needed for a reason specific to a low sun, and it took a screenshot to see it. A hemisphere light lights
 * an upward-facing surface with its SKY colour, so the flat meadow — every normal pointing straight up —
 * was being filled with blue while receiving only `sin(20°) = 0.34` of the sun. The result was a cold dark
 * olive floor under a gold world, which is nobody's idea of a summer evening.
 *
 * Kept deliberately small, at 3% of the sun, because an omnidirectional light is the one thing that cannot
 * tell a lit face from a shadowed one. The first attempt at 0.30 fixed the meadow and ruined the shadow
 * sides: a warm ambient plus a cool sky cancel to no hue at all, and every wall out of the sun came back
 * a dead neutral grey. Most of the meadow's warmth now comes from its own pigment and from the sun being
 * two degrees higher; this only removes the last of the blue cast.
 */
const WARM_AMBIENT = '#ffd6a2';
const WARM_AMBIENT_INTENSITY = 0.15;

/**
 * Warm haze. `FogExp2` falls off with the *square* of distance, so this is nearly absent at 15m, a light
 * veil by 30m and most of the way to the fog colour on the far hills — which is the profile late light
 * actually has, and it is what puts a warm band along the horizon in every direction rather than only in
 * the sun's.
 */
const FOG_COLOR = '#eec89a';
const FOG_DENSITY = 0.0163;

/**
 * The shadow frustum, fitted rather than guessed.
 *
 * A directional shadow camera looks down `-SUN_DIR`, so the play area does not project onto it as a
 * circle. Its horizontal axis sees the full `PLAY_RADIUS`; its vertical axis sees the disc foreshortened
 * by `sin(elevation)` plus the height of whatever is standing on it, foreshortened by `cos(elevation)`.
 * Fitting both axes separately rather than using one square is worth roughly a 1.6x gain in texel
 * density for free, and depth is clipped to the slab the world actually occupies so precision is not
 * spent on empty sky. At 2048 this comes out near 3.5cm per texel, which is why the shadows read as
 * shadows rather than as staircases.
 */
const SHADOW = (() => {
  const sinEl = SUN_DIR[1];
  const cosEl = Math.hypot(SUN_DIR[0], SUN_DIR[2]);
  // Wide enough to take in the near treeline as well as the play area: trees at 40m are the things whose
  // shadows stretch across the middle distance, and clipping them was leaving the meadow oddly bare.
  const halfWidth = SHADOW_RADIUS + 2;
  const halfHeight = SHADOW_RADIUS * sinEl + TALLEST * cosEl + 2;
  const halfDepth = SHADOW_RADIUS * cosEl + TALLEST * sinEl + 3;
  return {
    halfWidth,
    halfHeight,
    near: Math.max(0.5, SUN_DISTANCE - halfDepth),
    far: SUN_DISTANCE + halfDepth,
    mapSize: 2048,
    /** VSM does not want a depth offset; its moments already tolerate the grazing case. */
    bias: 0,
    /**
     * The acne fix that actually matters at this sun angle. Light arriving at 18° grazes every
     * horizontal surface, so depth changes by a lot across one shadow texel and a constant bias either
     * fails or detaches the shadow (peter-panning). `normalBias` offsets the sample along the surface
     * normal by roughly a texel, which is scale-correct everywhere.
     */
    // 0.06 rather than the textbook 0.02: the instanced leaf spheres were self-shadowing into thin dark
    // arcs across every canopy, which is what acne looks like on a curved surface under a grazing light.
    normalBias: 0.09,
  };
})();

/** Six horizon-hugging puffs. Low and far, where a low sun would actually underlight them. */
const CLOUDS: readonly { at: readonly [number, number, number]; size: number; tint: string }[] = [
  { at: [58, 26, 62], size: 46, tint: '#ffd9a6' },
  { at: [-46, 31, 70], size: 54, tint: '#f6cfa8' },
  { at: [82, 22, -34], size: 40, tint: '#ffe0b4' },
  { at: [-74, 27, -46], size: 50, tint: '#e6d2c4' },
  { at: [8, 35, 96], size: 58, tint: '#ffcf98' },
  { at: [-96, 24, 14], size: 42, tint: '#eed3bc' },
];

export function Lighting(): JSX.Element {
  const scene = useThree((s) => s.scene);
  const gl = useThree((s) => s.gl);
  const sun = useRef<DirectionalLight>(null);
  const clouds = useRef<Group>(null);
  const reduced = usePrefersReducedMotion();

  const glow = useMemo(() => glowTexture(), []);
  const puff = useMemo(() => puffTexture(), []);

  /**
   * Fog and exposure are scene- and renderer-wide, so they are set imperatively with a restore on
   * unmount. Declaring `<fog attach="fog"/>` would work only while this component happens to be a
   * direct child of `<Canvas>`; wrapped in one `<group>` by a future edit to the game shell it would
   * silently attach to that group and do nothing. The lights below are ordinary scene objects and stay
   * declarative.
   */
  useLayoutEffect(() => {
    const previousFog = scene.fog;
    const previousExposure = gl.toneMappingExposure;
    scene.fog = new FogExp2(new Color(FOG_COLOR).getHex(), FOG_DENSITY);
    // A hair over 1: the sun is warm and low, and ACES pulls warm highlights down. This buys the gold
    // back without letting the cream walls clip.
    gl.toneMappingExposure = 1.06;
    /**
     * Variance shadow mapping is NOT set here any more. It is `shadows="variance"` on the `<Canvas>`
     * in `Game.tsx`, and the move was forced by a bug rather than by taste.
     *
     * The reasoning for VSM itself is unchanged and still worth keeping: `PCFSoftShadowMap` is
     * deprecated in three 0.185 and silently falls back to plain `PCFShadowMap`, which is hard-edged;
     * drei's `<SoftShadows>` PCSS patch fails to link against 0.185's shadow chunks and floods the
     * console with `useProgram: program not valid`. VSM blurs the depth moments in the shadow pass
     * itself, so the softness costs one small separable blur rather than a per-pixel sample loop.
     *
     * WHY IT CANNOT BE SET FROM HERE. r3f's `configure()` writes `gl.shadowMap.type` on EVERY render
     * of the `<Canvas>` component — its layout effect has no dependency array — and for a bare
     * `shadows` prop it writes `PCFSoftShadowMap`. This effect ran once, with deps `[scene, gl]` that
     * never change again. Children's layout effects run before their parent's, so on the first mount
     * this won and on every re-render after it r3f won.
     *
     * Measured: one window resize, or one hot update, permanently downgraded the game to hard PCF
     * shadows, and every word of the paragraph above stopped applying without anything saying so.
     * Each flip also recompiled every material in the scene — `gl.info.programs` climbed 53 → 92 →
     * 118 without the old variants being released.
     *
     * It was also the trigger for a white screen. Once the map has been rebuilt in PCF's format, any
     * later write of VSM on a frame `perf/cadence.ts` skips leaves VSM shaders sampling a PCF-packed
     * map: the moments are garbage, the Chebyshev bound exceeds 1, and the light is MULTIPLIED rather
     * than attenuated. Every lit surface goes white while unlit props and the sun render correctly.
     * Reproduced 3 times in 6 forced trials at scene luminance 227.6 against a healthy 123.
     *
     * One writer, asserted every render, and the mid-session type change simply stops existing.
     */
    return () => {
      scene.fog = previousFog;
      gl.toneMappingExposure = previousExposure;
    };
  }, [scene, gl]);

  /**
   * The shadow camera, set through the object rather than through JSX props.
   *
   * `shadow-camera-left` and friends assign the field but nothing calls
   * `updateProjectionMatrix()` afterwards, so an orthographic shadow camera keeps whatever frustum it
   * was constructed with (three's default is ±5, which would put the entire ranch outside the shadow
   * map). Doing it here makes the update explicit.
   */
  useLayoutEffect(() => {
    const light = sun.current;
    if (!light) return;
    const cam = light.shadow.camera;
    cam.left = -SHADOW.halfWidth;
    cam.right = SHADOW.halfWidth;
    cam.top = SHADOW.halfHeight;
    cam.bottom = -SHADOW.halfHeight;
    cam.near = SHADOW.near;
    cam.far = SHADOW.far;
    cam.updateProjectionMatrix();
    light.shadow.mapSize.set(SHADOW.mapSize, SHADOW.mapSize);
    light.shadow.bias = SHADOW.bias;
    light.shadow.normalBias = SHADOW.normalBias;
    // VSM softness, in shadow-map texels. 3.5 at ~4.3cm/texel is a penumbra of about 15cm, which is what
    // a sun this low and this hazy actually throws.
    light.shadow.radius = 4;
    light.shadow.blurSamples = 10;
    light.shadow.needsUpdate = true;
  }, []);

  /* The sun is a constant, so its shadow map is rebuilt at half the frame rate rather than every
     frame — 44% of the frame's draw calls were the shadow pass. See `perf/cadence.ts`. */
  useShadowCadence(sun);

  // The one piece of ambient motion in the sky. Slow enough to be noticed only on a second look, and
  // off entirely for a child who asked for less movement.
  useFrame((_, dt) => {
    if (reduced || !clouds.current) return;
    clouds.current.rotation.y += dt * 0.0022;
  });

  return (
    <>
      {/*
        Preetham sky, driven by the same sun vector as the light so the bright part of the gradient and
        the direction the shadows fall can never disagree. High rayleigh pushes the blue overhead and the
        red into the horizon band, which is the gradient a low sun makes.
      */}
      <Sky
        distance={4000}
        sunPosition={SUN_POSITION as unknown as [number, number, number]}
        // Turbidity is the haze knob and it is turned up: it is what reddens the whole horizon rather
        // than only the sun's quarter of it, which matters because a child arriving has their back to the
        // sun. Rayleigh keeps the blue overhead deep so the gradient still has somewhere to travel.
        turbidity={8.5}
        rayleigh={2.9}
        mieCoefficient={0.009}
        mieDirectionalG={0.86}
      />

      {/* The sun. The only light in the world that casts. */}
      <directionalLight
        ref={sun}
        position={SUN_POSITION as unknown as [number, number, number]}
        color={SUN_COLOR}
        intensity={SUN_INTENSITY}
        castShadow
      />

      {/* Sky above, warm ground bounce below. This is the cool half of the contrast. */}
      <hemisphereLight args={[SKY_FILL, GROUND_BOUNCE, HEMI_INTENSITY]} />
      <ambientLight color={WARM_AMBIENT} intensity={WARM_AMBIENT_INTENSITY} />

      {/*
        One weak blue bounce from the anti-sun side, no shadow. Without it the shadow sides are lit only
        from straight up and go shapeless; with it they keep a gradient and read as turned away from the
        light rather than as painted a darker colour.
      */}
      <directionalLight
        position={[-SUN_DIR[0] * 40, 22, -SUN_DIR[2] * 40]}
        color={BOUNCE_COLOR}
        intensity={BOUNCE_INTENSITY}
      />

      {/* Sun bloom, standing in for a postprocess pass. Occluded by the hills, which is correct. */}
      {glow ? (
        <mesh
          position={[SUN_DIR[0] * 300, SUN_DIR[1] * 300, SUN_DIR[2] * 300]}
          scale={[132, 132, 1]}
          onUpdate={(m) => m.lookAt(0, 0, 0)}
        >
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={glow}
            color="#fff0cc"
            transparent
            depthWrite={false}
            blending={AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ) : null}

      {puff ? (
        <group ref={clouds}>
          {CLOUDS.map((c, i) => (
            <CloudPuff key={i} at={c.at} size={c.size} tint={c.tint} texture={puff} />
          ))}
        </group>
      ) : null}
    </>
  );
}

function CloudPuff({
  at,
  size,
  tint,
  texture,
}: {
  at: readonly [number, number, number];
  size: number;
  tint: string;
  texture: NonNullable<ReturnType<typeof puffTexture>>;
}): JSX.Element {
  const ref = useRef<Sprite>(null);
  return (
    <sprite ref={ref} position={at as unknown as [number, number, number]} scale={[size, size * 0.5, 1]}>
      <spriteMaterial
        map={texture}
        color={tint}
        transparent
        opacity={0.72}
        depthWrite={false}
        fog={false}
      />
    </sprite>
  );
}
