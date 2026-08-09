import type { Rand } from './variation';

/**
 * THE WET PRIMITIVES. What `voices.ts` and `vacuum.ts` are both built out of, and the answer to the note
 * the owner sent: "it should be closer to a SQUELCH. it's a slime. it is inherent wet, slimy, sticky."
 *
 * ══ WHY THE OLD SOUNDS READ AS MACHINES ═══════════════════════════════════════════════════════════
 *
 * Two causes, and both were tonal:
 *
 *   · The vacuum's "motor" was two TRIANGLE OSCILLATORS at 68 and 102 Hz. A motor is the wrong metaphor
 *     from the first line — nothing about a slime being drawn up a tube is a rotor turning — and a pair of
 *     oscillators a perfect fifth apart is, quite literally, a chord. It was tuned.
 *   · Each squelch had a SINE BODY gliding in pitch. A sine that bends is the sound of a synthesiser, and
 *     no amount of noise layered over it removes the tone underneath.
 *
 * ══ WHAT REPLACES THEM, AND WHY EACH ONE IS HERE ══════════════════════════════════════════════════
 *
 * IRREGULARITY IS THE WHOLE EFFECT. This is the part that is easy to agree with and hard to actually do,
 * because every convenient tool in Web Audio is smooth: an envelope is smooth, a ramp is smooth, an LFO is
 * a sine. A real squelch is nothing like that. It is a CROWD of small collapses at uneven sizes and uneven
 * spacings — bubbles giving way, pockets of air escaping, a surface unsticking in fits. One smooth gesture,
 * however carefully filtered, cannot be made to sound like a crowd. So the crowd is built explicitly:
 *
 *   `resonantGrains`  a cluster of dozens of micro-events, each a short noise excitation ringing through
 *                     its own resonator at its own frequency, placed at gaps drawn from a shifted
 *                     exponential distribution so the spacing SCATTERS (CV around 0.7) instead of ticking.
 *   `wetComb`         short delays with feedback, 2–15 ms. This is the gurgle, and per the brief it is the
 *                     highest-value single addition: it is what makes the sound liquid IN A SPACE rather
 *                     than a filter sweep in the open.
 *   `wobbleRamp`      a resonance that travels but never glides cleanly, in unevenly-sized steps with a
 *                     random deviation on each. A clean exponential sweep is a filter sweep and the ear
 *                     hears the filter; a wobbling one is a cavity changing shape.
 *   `controlBuffer`   a slow RANDOM control signal, for the vacuum's flutter, because the thing that makes
 *                     a held sound bearable and alive is that its unsteadiness is unpredictable. A sine LFO
 *                     is a steady wobble, which is just a slower machine.
 *
 * ══ WHY GRAINS ARE BAKED INTO A BUFFER RATHER THAN BUILT AS NODES ═════════════════════════════════
 *
 * Thirty micro-events as thirty `BufferSource → BiquadFilter → Gain` chains is ninety nodes per squelch, and
 * a child catching slimes fires these several times a second. Synthesising the cluster into one buffer with
 * arithmetic costs about a tenth of a millisecond, plays through ONE source node, and — the real reason —
 * gives exact control over the timing distribution, which is the property the whole redesign turns on. You
 * cannot schedule a shifted-exponential gap sequence out of `AudioParam` automation; you can just write it.
 *
 * It is still synthesis. Nothing here is a recording, nothing is fetched, and `noise.ts` has always filled
 * its buffers by hand in exactly the same way.
 */

/* ------------------------------------------------------------------ *\
   Micro-event clusters — the bubbles
\* ------------------------------------------------------------------ */

/**
 * One two-pole resonator's coefficients. `bw` is the −3 dB bandwidth in Hz, so a small bandwidth rings for
 * a long time and reads as a distinct bubble, and a large one barely rings and reads as a wet click.
 *
 * Bandwidth rather than Q on purpose: a bubble's ring time is roughly independent of its size, so holding
 * bandwidth constant while the centre frequency varies is what makes a cluster sound like one substance at
 * many sizes rather than like a scale being played.
 */
function resonator(sr: number, f: number, bw: number): [number, number, number] {
  const r = Math.exp((-Math.PI * bw) / sr);
  const theta = (2 * Math.PI * Math.min(Math.max(f, 20), sr * 0.45)) / sr;
  return [1 - r, -2 * r * Math.cos(theta), r * r];
}

export interface GrainSpec {
  /** The span the cluster occupies. Grains are fitted into it; nothing runs past the end. */
  seconds: number;
  /** How many micro-events. This is the number the texture measurement counts. */
  count: number;
  /** Resonances are drawn uniformly from this band. Wide = a mix of sizes; narrow = one size of bubble. */
  fLo: number;
  fHi: number;
  /** Resonator bandwidth, Hz. Small (40) rings and gloops; large (600) is a wet tick. */
  bw: number;
  /**
   * Amplitude of grain i scales as (1 − i/count) ^ ampTilt.
   * 0 is flat, 2 dies away (bubbles settling), −1.2 swells (adhesion building to a tear).
   */
  ampTilt: number;
  /**
   * Mean gap scales as (1 − i/count) ^ gapTilt.
   * 0 is even-on-average, positive ACCELERATES (gaps shrink — something tearing loose),
   * negative DECELERATES (gaps open out — bubbles thinning after an impact).
   */
  gapTilt: number;
  grainLoMs: number;
  grainHiMs: number;
  /** Where a grain's resonance ends as a fraction of where it started. <1 collapses, >1 opens. */
  glide: number;
  /** How fast a grain's ring dies, in e-folds across its own length. 4 is round, 12 is a tick. */
  damp: number;
}

/**
 * A cluster of resonant micro-events, peak-normalised, in a mono buffer.
 *
 * THE GAP DISTRIBUTION IS THE POINT. Gaps are a shifted exponential: `0.22 + 0.78 · Exp(1)`. A plain uniform
 * jitter has a coefficient of variation of about 0.3, which still reads as a regular pattern that has been
 * nudged. A pure exponential has CV 1.0 and clusters so hard that a third of the grains land on top of one
 * another and are wasted. The shift is the compromise: CV lands near 0.7, so gaps genuinely scatter over an
 * order of magnitude while most grains stay far enough apart to be heard as separate events.
 *
 * Peak-normalised at the end, so the caller's gain means the same thing whatever the grain count — which is
 * what lets the count be changed for character without also changing the mix.
 */
export function resonantGrains(ctx: BaseAudioContext, spec: GrainSpec, rand: Rand): AudioBuffer {
  const sr = ctx.sampleRate;
  const length = Math.max(2, Math.ceil(sr * spec.seconds));
  const buffer = ctx.createBuffer(1, length, sr);
  const data = buffer.getChannelData(0);
  const n = Math.max(1, Math.floor(spec.count));

  /* --- where the grains go, as a shape first and a time second -------------------------------- */

  // Raw gaps, then rescaled to fit the span. Building the shape first and scaling after is what keeps the
  // count exact: fitting grains to a clock instead drops however many happen not to fit.
  const raw: number[] = [];
  let acc = 0;
  for (let i = 0; i < n; i += 1) {
    const u = i / n;
    const tilt = Math.pow(Math.max(0.06, 1 - u), spec.gapTilt);
    const draw = -Math.log(1 - Math.min(0.9999, rand()));
    raw.push(acc);
    acc += tilt * (0.22 + 0.78 * draw);
  }
  // The last grain starts at 82 % of the span, leaving its own ring room to finish inside the buffer.
  const span = acc > 1e-9 ? (spec.seconds * 0.82) / acc : 0;

  /* --- and what each one is ------------------------------------------------------------------- */

  for (let i = 0; i < n; i += 1) {
    const u = i / n;
    const start = Math.floor((raw[i] as number) * span * sr);
    if (start >= length - 4) break;

    const durMs = spec.grainLoMs + rand() * (spec.grainHiMs - spec.grainLoMs);
    const dur = Math.max(12, Math.floor((durMs / 1000) * sr));
    // Two amplitude terms: the trend across the cluster, and a wide per-grain scatter. The scatter matters
    // as much as the timing — a crowd of identically loud events is a rattle.
    const amp = Math.pow(Math.max(0.03, 1 - u), spec.ampTilt) * (0.25 + 0.75 * rand());
    const f0 = spec.fLo + rand() * (spec.fHi - spec.fLo);
    const f1 = Math.max(25, f0 * spec.glide);

    let y1 = 0;
    let y2 = 0;
    for (let s = 0; s < dur; s += 1) {
      const idx = start + s;
      if (idx >= length) break;
      const v = s / dur;
      const [a0, b1, b2] = resonator(sr, f0 + (f1 - f0) * v, spec.bw);
      // The resonator is excited only at the very front. Everything after that is its own ring, which is
      // what a bubble collapsing actually is: one impulse of pressure and then a cavity sounding.
      const x = v < 0.12 ? rand() * 2 - 1 : 0;
      const y = a0 * x - b1 * y1 - b2 * y2;
      y2 = y1;
      y1 = y;
      // THE ENVELOPE IS ON THE OUTPUT, not on the excitation, and it reaches exactly zero at v = 1. Applied
      // to the excitation instead, the resonator would still be ringing when the loop ended and the buffer
      // would hold a step — which is a click, per grain, thirty times over.
      const env = Math.exp(-spec.damp * v) * (1 - v ** 4) * Math.min(1, s / 10);
      data[idx] = (data[idx] as number) + y * env * amp;
    }
  }

  let peak = 0;
  for (let i = 0; i < length; i += 1) {
    const a = Math.abs(data[i] as number);
    if (a > peak) peak = a;
  }
  if (peak > 1e-9) {
    const k = 1 / peak;
    for (let i = 0; i < length; i += 1) data[i] = (data[i] as number) * k;
  }
  return buffer;
}

/* ------------------------------------------------------------------ *\
   The gurgle — short delays with feedback
\* ------------------------------------------------------------------ */

export interface Comb {
  readonly input: GainNode;
  readonly output: GainNode;
  /** Exposed so a caller can wander the delay times. Leaving them fixed is what makes a comb a pitch. */
  readonly delays: DelayNode[];
  readonly nodes: AudioNode[];
}

export interface CombSpec {
  /** 2–15 ms. Deliberately mutually inharmonic — see the note below. */
  delaysMs: readonly number[];
  /** Per-tap feedback. Kept well under 0.5: this is a gurgle, not a plucked string. */
  feedback: number;
  /** Lowpass inside each feedback path, Hz. What stops the comb ringing metallically. */
  damp: number;
  /** How much combed signal reaches the output against the dry. */
  wet: number;
  dry: number;
}

/**
 * A small bank of feedback comb filters: liquid in a container.
 *
 * WHY THE DELAY TIMES MUST NOT BE RELATED. A comb filter with a 6 ms delay has peaks at 167 Hz and every
 * multiple of it, which is a harmonic series, which is a PITCH — and with enough feedback it is a plucked
 * string. Two combs at 6 and 12 ms share every other peak and reinforce that pitch. So the delays here are
 * chosen to be mutually irrational-ish (no small-integer ratios), the feedback is low, and each feedback
 * path is lowpassed so the high peaks die first. The result has the hollowness and the gurgle without ever
 * settling onto a note — which is the whole requirement, since a slime is not tuned.
 *
 * The caller is expected to wander `delays[i].delayTime` a little. A fixed comb is a fixed formant set, and
 * over a held sound the ear finds it and starts hearing a tone.
 */
export function wetComb(ctx: BaseAudioContext, spec: CombSpec): Comb {
  const input = ctx.createGain();
  input.gain.value = 1;
  const output = ctx.createGain();
  output.gain.value = 1;

  const dry = ctx.createGain();
  dry.gain.value = spec.dry;
  input.connect(dry);
  dry.connect(output);

  const delays: DelayNode[] = [];
  const nodes: AudioNode[] = [input, output, dry];

  for (const ms of spec.delaysMs) {
    const delay = ctx.createDelay(0.08);
    delay.delayTime.value = Math.max(0.0005, ms / 1000);

    const damp = ctx.createBiquadFilter();
    damp.type = 'lowpass';
    damp.frequency.value = spec.damp;
    damp.Q.value = 0.4;

    const fb = ctx.createGain();
    fb.gain.value = Math.min(0.55, Math.max(0, spec.feedback));

    const tap = ctx.createGain();
    // Split the wet level across the taps, so adding a tap does not make the effect louder.
    tap.gain.value = spec.wet / spec.delaysMs.length;

    input.connect(delay);
    delay.connect(damp);
    damp.connect(fb);
    fb.connect(delay);
    damp.connect(tap);
    tap.connect(output);

    delays.push(delay);
    nodes.push(delay, damp, fb, tap);
  }

  return { input, output, delays, nodes };
}

/* ------------------------------------------------------------------ *\
   Motion that is not a glide
\* ------------------------------------------------------------------ */

/**
 * Move a frequency param from `f0` to `f1` in uneven steps with a random deviation on each.
 *
 * WHY NOT `exponentialRampToValueAtTime` ONCE. A single ramp is a continuous monotonic function, and the
 * measurable consequence is that the spectral centroid moves by a few Hz per frame and never jumps. That is
 * exactly the signature of a synthesiser sweep, and it is what the previous version measured. Breaking the
 * same overall motion into a dozen unevenly-sized segments that each overshoot or undershoot gives the same
 * gesture — the resonance still travels from f0 to f1 — while the moment-to-moment behaviour stops being
 * predictable. It reads as a cavity being deformed by something that is not in control of itself.
 *
 * The segment BOUNDARIES are jittered as well as the targets. Even boundaries with random targets is a
 * sample-and-hold LFO, which has a rate, and a rate is a rhythm.
 */
export function wobbleRamp(
  param: AudioParam,
  at: number,
  f0: number,
  f1: number,
  seconds: number,
  segments: number,
  depth: number,
  rand: Rand,
): void {
  const n = Math.max(1, Math.floor(segments));
  const from = Math.max(20, f0);
  const to = Math.max(20, f1);
  param.setValueAtTime(from, at);
  let last = at;
  for (let i = 1; i <= n; i += 1) {
    const u = i / n;
    // Geometric interpolation of the trend, because pitch and resonance are heard logarithmically.
    const base = from * Math.pow(to / from, u);
    const target = Math.max(20, base * (1 + (rand() * 2 - 1) * depth));
    const nominal = at + seconds * u;
    const wiggle = (seconds / n) * 0.45 * (rand() * 2 - 1);
    // Monotonic by construction: a ramp scheduled before the previous one is a jump, and a jump is a click.
    const when = Math.max(last + 0.0015, nominal + wiggle);
    param.exponentialRampToValueAtTime(target, when);
    last = when;
  }
}

/* ------------------------------------------------------------------ *\
   Slow random control signals
\* ------------------------------------------------------------------ */

/**
 * A buffer of smooth random values in −1..1, built to LOOP WITHOUT A STEP.
 *
 * Used as a control signal: played at a low `playbackRate` it becomes an irregular LFO, which is what the
 * vacuum's flutter is made of. The reason it is not an `OscillatorNode` is the brief's — a sine LFO is a
 * steady wobble, and a steady wobble on a held sound is just a slower machine.
 *
 * THE DETREND IS NOT COSMETIC. A looping buffer whose last sample differs from its first has a step at the
 * loop point, once per lap, forever. On a control signal feeding a gain that is a click in the audio, and it
 * would arrive every few minutes — the worst possible bug to be told about and not be able to reproduce. So
 * a linear ramp is subtracted to force `data[last] === data[0]`, after which the signal is continuous across
 * the join. The noise is heavily smoothed, so its slope is small everywhere and the join is smooth in slope
 * as well as in value.
 *
 * `corner` IS THE MODULATION BAND, IN Hz, AND IT IS THE ONLY DIAL THAT MATTERS. A one-pole lowpass on white
 * noise is flat from DC up to its corner and rolls off above it, so `corner` says directly what band the
 * modulation lives in: 0.7 Hz is breathing, 6 Hz is wandering, 14 Hz is flutter. The first version of this
 * function had a fixed smoothing coefficient and was retimed by `playbackRate` instead, which was a mistake
 * worth recording — it made the effective band a function of two numbers in two different files, and the
 * vacuum ended up modulated almost entirely below 0.5 Hz, i.e. not audibly modulated at all. Buffers are
 * played at rate 1.0 now and the band is stated where it is chosen.
 */
export function controlBuffer(ctx: BaseAudioContext, seconds: number, corner: number, rand: Rand): AudioBuffer {
  const sr = ctx.sampleRate;
  const length = Math.max(2, Math.ceil(sr * seconds));
  const buffer = ctx.createBuffer(1, length, sr);
  const data = buffer.getChannelData(0);

  // One-pole coefficient for the requested corner frequency.
  const p = Math.exp((-2 * Math.PI * Math.max(0.01, corner)) / sr);
  const a = 1 - p;
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const w = rand() * 2 - 1;
    last = last * p + w * a;
    data[i] = last;
  }

  const first = data[0] as number;
  const final = data[length - 1] as number;
  for (let i = 0; i < length; i += 1) {
    data[i] = (data[i] as number) - (final - first) * (i / (length - 1));
  }

  let mean = 0;
  for (let i = 0; i < length; i += 1) mean += data[i] as number;
  mean /= length;
  let peak = 0;
  for (let i = 0; i < length; i += 1) {
    const v = (data[i] as number) - mean;
    data[i] = v;
    const a = Math.abs(v);
    if (a > peak) peak = a;
  }
  if (peak > 1e-9) {
    const k = 1 / peak;
    for (let i = 0; i < length; i += 1) data[i] = (data[i] as number) * k;
  }
  return buffer;
}
