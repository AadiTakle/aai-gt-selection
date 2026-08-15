import { seededRand } from './variation';

/**
 * THE ONLY RAW MATERIAL IN THIS DIRECTORY, and the reason it ships no audio files.
 *
 * A squelch is filtered noise. A vacuum is filtered noise. A room is filtered noise with a decay on it.
 * So the whole sound design comes down to three buffers we fill ourselves, once per audio context, and
 * then push through filters whose parameters move.
 *
 * WHY EACH COLOUR EXISTS, because "just use white noise" is the mistake that makes browser game audio
 * sound like a hiss:
 *
 *   white   flat. Only used for the fast squelch transients, where it is bandpassed hard enough that its
 *           spectrum barely matters and its density is what gives the burst body.
 *   pink    −3 dB/octave. The vacuum's air. Pink is what rushing air actually is, and the reason the
 *           suction can be held for ten seconds without becoming fatiguing: the energy is weighted to
 *           where the ear is forgiving instead of piled up at 8 kHz where it is not.
 *   brown   −6 dB/octave. The vacuum's low rumble, under the air, so the machine has mass without a tone.
 *
 * BUFFERS ARE CACHED PER CONTEXT, keyed by colour and length, because filling four seconds of pink noise
 * is a few hundred thousand multiplies and the vacuum must be able to appear on a mouse-down without a
 * frame hitch. A `WeakMap` on the context means a closed context's buffers go with it.
 *
 * THE FILL IS SEEDED. Nothing about the sound needs it, but the offline measurements in `measure.ts` do:
 * with `Math.random` the measured peak of a squelch wanders by a decibel or two between renders, and a
 * verification whose numbers move on their own cannot tell you that a node came unplugged.
 */

export type NoiseColour = 'white' | 'pink' | 'brown';

const CACHE = new WeakMap<BaseAudioContext, Map<string, AudioBuffer>>();

/** Peak-normalise in place, so a gain of 0.5 means the same thing whatever colour it is applied to. */
function normalise(data: Float32Array): void {
  let peak = 0;
  for (let i = 0; i < data.length; i += 1) {
    const a = Math.abs(data[i] as number);
    if (a > peak) peak = a;
  }
  if (peak < 1e-9) return;
  const k = 1 / peak;
  for (let i = 0; i < data.length; i += 1) data[i] = (data[i] as number) * k;
}

function fill(data: Float32Array, colour: NoiseColour, seed: number): void {
  const rand = seededRand(seed);
  if (colour === 'white') {
    for (let i = 0; i < data.length; i += 1) data[i] = rand() * 2 - 1;
  } else if (colour === 'brown') {
    // A leaky integrator on white. The leak is what stops it wandering off into DC over four seconds.
    let last = 0;
    for (let i = 0; i < data.length; i += 1) {
      const w = rand() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last;
    }
  } else {
    // Paul Kellet's economy pink filter: six one-poles in parallel. Accurate to about ±0.3 dB across the
    // audible band, which is far beyond what a vacuum cleaner needs.
    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;
    for (let i = 0; i < data.length; i += 1) {
      const w = rand() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856;
      b4 = 0.55 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.016898;
      data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
      b6 = w * 0.115926;
    }
  }
  normalise(data);
}

/**
 * A mono noise buffer of `seconds`, cached.
 *
 * Mono on purpose. These are point sources in a first-person world — the vacuum is on the child's own
 * back and a squelch happens at arm's length — so stereo width here would be width the scene has not
 * asked for. The only stereo buffer in the directory is the reverb tail, where width IS the effect.
 */
export function noiseBuffer(ctx: BaseAudioContext, colour: NoiseColour, seconds: number): AudioBuffer {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const key = `${colour}:${length}`;
  let per = CACHE.get(ctx);
  if (!per) {
    per = new Map();
    CACHE.set(ctx, per);
  }
  const hit = per.get(key);
  if (hit) return hit;

  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const seed = colour === 'white' ? 0x51ed270b : colour === 'pink' ? 0x2f6a88c1 : 0x7d3ab19f;
  fill(buffer.getChannelData(0), colour, seed);
  per.set(key, buffer);
  return buffer;
}

/**
 * THE ROOM. A hand-built impulse response, because a convolver needs an IR and we are not allowed a file.
 *
 * What it is trying to be: a warm outdoor hollow at the end of the afternoon. Not a hall, not a plate,
 * nothing with a metallic ring — those all read as "indoors" or "effect", and this ranch is a field.
 *
 * Three deliberate choices:
 *
 *   · SHORT (1.6 s) and DARK. The tail is one-pole lowpassed as it is written, which is the cheap way to
 *     get the high frequencies dying faster than the low ones, exactly as they do outdoors over grass. A
 *     bright tail on a squelch sounds like a bathroom.
 *   · TWO EARLY REFLECTIONS at 19 and 31 ms, uneven on purpose. They are what makes the ear place the
 *     sound somewhere rather than hear a wash. Even spacing would comb-filter into a pitch.
 *   · DECORRELATED CHANNELS. Left and right are filled from different seeds, so the tail is wide while
 *     the dry sound stays centred. This is the only width in the mix and it is what stops the pad from
 *     sounding like it is coming out of a phone.
 *
 * `ConvolverNode.normalize` is left at its default `true`, so the loudness of the send does not depend on
 * how energetic this buffer happens to be. Level is set by the send gains in `bus.ts`, in one place.
 */
export function warmImpulse(ctx: BaseAudioContext): AudioBuffer {
  const key = 'ir:warm';
  let per = CACHE.get(ctx);
  if (!per) {
    per = new Map();
    CACHE.set(ctx, per);
  }
  const hit = per.get(key);
  if (hit) return hit;

  const seconds = 1.6;
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

  for (let ch = 0; ch < 2; ch += 1) {
    const data = buffer.getChannelData(ch);
    const rand = seededRand(ch === 0 ? 0x1a2b3c4d : 0x5e6f7a8b);
    let lp = 0;
    for (let i = 0; i < length; i += 1) {
      const t = i / ctx.sampleRate;
      // Two envelopes multiplied: a power curve that guarantees the tail reaches exactly zero at the end
      // of the buffer (no truncation click) and an exponential that gives it a natural early decay.
      const shape = Math.pow(1 - i / length, 2.6) * Math.exp(-t * 2.1);
      const w = (rand() * 2 - 1) * shape;
      // One-pole lowpass, written into the tail rather than applied after, so the darkening tracks the
      // decay: the further into the tail, the fewer highs are left in it.
      lp += (w - lp) * 0.34;
      data[i] = lp;
    }
    // The early reflections, added after the diffuse tail so they are distinct arrivals rather than part
    // of the wash. Slightly different per channel, which is where the width comes from.
    const first = Math.floor(ctx.sampleRate * (ch === 0 ? 0.019 : 0.023));
    const second = Math.floor(ctx.sampleRate * (ch === 0 ? 0.031 : 0.037));
    if (first < length) data[first] = (data[first] as number) + 0.42;
    if (second < length) data[second] = (data[second] as number) + 0.26;
  }

  per.set(key, buffer);
  return buffer;
}
