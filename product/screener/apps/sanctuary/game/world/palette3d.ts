import { Color } from 'three';
import type { Vector3Tuple } from 'three';

import { HUE, SEASONS, SEASON_LOOK, shade, type Season, type SeasonLook } from '../../world/palette';
import { clamp, lerp, smoothstep } from './noise';

export type { Season, SeasonLook };
export { SEASONS, SEASON_LOOK, HUE, shade };

/**
 * The hollow's light, in three dimensions.
 *
 * `world/palette.ts` already decides what a season looks like, and the 2D and 3D halves of this game
 * must not disagree about what month it is. So the season *identity*, its sky pair, its accent and
 * its lamp all come from there unchanged.
 *
 * What is added here is albedo. A flat-art ground of `#d8dda3` is a finished pixel — it already has
 * its light baked in. Hand that same value to a lit renderer under a 2.4-intensity sun and it clips
 * to white. So every surface colour below is the *unlit* pigment that resolves to the palette's
 * intent once the sun is on it, which is roughly a third of the way down toward bark. The rule from
 * palette.ts still holds and is the reason this looks like a picture book rather than a tech demo:
 * there is no black here, and no neutral grey. Even the stone is a warm brown-grey.
 */

export interface GroundPigment {
  /** Sunlit meadow, the dominant colour of the valley floor. */
  grass: Color;
  /** Grass in the folds, where light does not reach. Not a darker grey — a deeper, bluer green. */
  grassDeep: Color;
  /** Sun-bleached tops of the rolls. */
  grassPale: Color;
  /** Worn path and pen floors. */
  earth: Color;
  /** Tilled soil in the garden beds. */
  soil: Color;
  /** Boulders, walls, the hut's footing. */
  stone: Color;
  /** Timber: posts, gates, the hut's frame. */
  timber: Color;
  /** Tree canopy, deep side. */
  canopy: Color;
  /** Tree canopy, sunlit side. */
  canopyLit: Color;
  /** Fern and reed fronds. */
  frond: Color;
  /** Whatever the season wants to be cheerful with: flowers, bunting, fruit. */
  accent: Color;
  /** Still water. */
  water: Color;
}

/**
 * Per-season pigment. Derived from `SEASON_LOOK` through `shade` wherever the palette has an opinion,
 * hand-set only where three dimensions need a value flat art never had (soil, timber, water depth).
 */
function pigmentFor(season: Season): GroundPigment {
  const look = SEASON_LOOK[season];
  return {
    grass: new Color(shade(look.ground, -0.34)),
    grassDeep: new Color(shade(look.ridge, -0.12)),
    grassPale: new Color(shade(look.ground, -0.12)),
    earth: new Color(shade(HUE.stone, -0.24)),
    soil: new Color(shade(HUE.bark, 0.14)),
    stone: new Color(HUE.stone),
    timber: new Color(shade(HUE.bark, 0.2)),
    canopy: new Color(shade(look.ridge, -0.06)),
    canopyLit: new Color(shade(look.canopy, -0.14)),
    frond: new Color(shade(look.canopy, -0.02)),
    accent: new Color(look.accent),
    water: new Color(shade(HUE.river, -0.1)),
  };
}

const PIGMENT: Record<Season, GroundPigment> = {
  greening: pigmentFor('greening'),
  high: pigmentFor('high'),
  ember: pigmentFor('ember'),
  hush: pigmentFor('hush'),
};

/** How many real days a season lasts. Four seasons, so the hollow turns over in a lunar month. */
export const SEASON_LENGTH_DAYS = 7;

/** Wall-clock day index. The whole point: this advances whether or not anybody is playing. */
export function currentSeasonDay(now = Date.now()): number {
  return Math.floor(now / 86_400_000);
}

export function seasonForDay(seasonDay: number): Season {
  const i = Math.floor(seasonDay / SEASON_LENGTH_DAYS);
  const wrapped = ((i % SEASONS.length) + SEASONS.length) % SEASONS.length;
  return SEASONS[wrapped] ?? 'high';
}

function nextSeason(season: Season): Season {
  const i = SEASONS.indexOf(season);
  return SEASONS[(i + 1) % SEASONS.length] ?? season;
}

function mixPigment(a: GroundPigment, b: GroundPigment, t: number): GroundPigment {
  const out = {} as GroundPigment;
  for (const key of Object.keys(a) as (keyof GroundPigment)[]) {
    out[key] = a[key].clone().lerp(b[key], t);
  }
  return out;
}

export interface SkyLook {
  season: Season;
  /** 0..1 through the current season. */
  progress: number;
  pigment: GroundPigment;
  skyTop: Color;
  skyHorizon: Color;
  /** Direction *toward* the sun, unit length. */
  sunDir: Vector3Tuple;
  sunColor: Color;
  /** Sky-side and ground-side of the hemisphere fill. */
  ambientSky: Color;
  ambientGround: Color;
  fogColor: Color;
  fogDensity: number;
  sunIntensity: number;
  ambientIntensity: number;
}

/**
 * Resolve a day index into everything the renderer needs.
 *
 * Two drifts are layered on purpose. The season steps every seven days and re-pigments the world, but
 * a step that size is invisible to a child who plays two days running — so the last third of each
 * season also bleeds up to 45% of the way into the next one, and the sun's azimuth walks 80° across a
 * 28-day cycle. The result is that the shadows fall differently and the greens sit differently after
 * *any* gap, including a one-day gap, which is the promise the brief makes: come back and something
 * has changed.
 */
export function resolveSky(seasonDay: number): SkyLook {
  const season = seasonForDay(seasonDay);
  const dayInSeason = ((seasonDay % SEASON_LENGTH_DAYS) + SEASON_LENGTH_DAYS) % SEASON_LENGTH_DAYS;
  const progress = dayInSeason / SEASON_LENGTH_DAYS;

  const bleed = smoothstep(0.55, 1, progress) * 0.45;
  const from = PIGMENT[season];
  const to = PIGMENT[nextSeason(season)];
  const pigment = bleed > 0.001 ? mixPigment(from, to, bleed) : from;

  const look = SEASON_LOOK[season];
  const lookNext = SEASON_LOOK[nextSeason(season)];
  const skyTop = new Color(look.sky[1]).lerp(new Color(lookNext.sky[1]), bleed);
  const skyHorizon = new Color(look.sky[0]).lerp(new Color(lookNext.sky[0]), bleed);
  const sunColor = new Color(look.lamp).lerp(new Color(lookNext.lamp), bleed);

  // Azimuth walks a four-week circle; elevation stays inside golden hour, 16°-29°, so shadows are
  // always long and warm and the world is never lit from overhead like a car park.
  const azimuthCycle = (((seasonDay % 28) + 28) % 28) / 28;
  const azimuth = (34 + azimuthCycle * 82) * (Math.PI / 180);
  const elevation = (16 + (0.5 + 0.5 * Math.sin(progress * Math.PI * 2 - 1.1)) * 13) * (Math.PI / 180);
  const cosEl = Math.cos(elevation);
  const sunDir: Vector3Tuple = [Math.sin(azimuth) * cosEl, Math.sin(elevation), Math.cos(azimuth) * cosEl];

  // Hush is the overcast season, so it loses the hard sun and gains fill. Nothing gloomy, just softer.
  const overcast = season === 'hush' ? lerp(1, 0, bleed) : season === 'ember' ? bleed : 0;
  const sunIntensity = lerp(2.5, 1.35, overcast);
  const ambientIntensity = lerp(0.85, 1.35, overcast);

  return {
    season,
    progress,
    pigment,
    skyTop,
    skyHorizon,
    sunDir,
    sunColor,
    ambientSky: skyHorizon.clone().lerp(new Color(HUE.mist), 0.25),
    ambientGround: pigment.grass.clone().lerp(new Color(HUE.honey), 0.22),
    fogColor: skyHorizon.clone().lerp(sunColor, 0.28),
    fogDensity: lerp(0.0092, 0.0135, overcast),
    sunIntensity,
    ambientIntensity,
  };
}

/** A warm-sided random-ish tint jitter, so no two instanced props are exactly the same colour. */
export function jitterColor(base: Color, amount: number, r1: number, r2: number): Color {
  const c = base.clone();
  // Toward honey or toward the deep end, never toward grey: keeps a scatter warm as it varies.
  const warm = new Color(HUE.honey);
  const deep = new Color(HUE.bark);
  c.lerp(warm, clamp(r1, 0, 1) * amount);
  c.lerp(deep, clamp(r2, 0, 1) * amount * 0.7);
  return c;
}
