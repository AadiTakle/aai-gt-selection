import { GENTLE_LEVEL, createBus, type Bus } from './bus';
import { createPad } from './pad';
import { createVacuum } from './vacuum';
import { createVoices } from './voices';
import { seededRand } from './variation';

/**
 * TEMPORARY — the substitute for listening.
 *
 * Every graph in this directory is built from a `BaseAudioContext` handed to it, never from a global, which
 * means the identical graph can be built inside an `OfflineAudioContext` and rendered to a buffer faster
 * than real time. So the questions that would otherwise need ears get numeric answers:
 *
 *   · IS THERE ANY SOUND AT ALL? A disconnected node, a filter whose frequency was never scheduled, an
 *     envelope that never opens — every one of those produces a graph that looks right, throws nothing, and
 *     renders pure silence. `peak` and `rms` catch all of them at once, and nothing else does.
 *   · IS IT TOO LOUD? `peak` against full scale, per sound and for everything firing at once.
 *   · DOES THE SUCTION CLICK? See `popTest` below, which is the interesting one.
 *
 * Called from `preview.tsx` (a button, prints a table to the console and the page) and from `verify.mjs`
 * (real Chrome, headless, prints the table to a terminal). Not imported by the game.
 */

const SR = 44100;

export interface Measurement {
  name: string;
  seconds: number;
  /** Largest absolute sample across both channels. 1.0 is full scale. */
  peak: number;
  /** Root mean square across the whole render, both channels. */
  rms: number;
  peakDb: number;
  rmsDb: number;
  /** RMS of the first and last 512 samples: the render must begin and end in silence. */
  headRms: number;
  tailRms: number;
  ok: boolean;
  note: string;
}

export interface PopTest {
  name: string;
  /** Largest sample-to-sample change while the sound is in steady state. The signal's own slew rate. */
  steadyDelta: number;
  /** The same, measured across the start ramp and the stop ramp. */
  startDelta: number;
  stopDelta: number;
  headRms: number;
  tailRms: number;
  ok: boolean;
  note: string;
}

function db(x: number): number {
  return x <= 0 ? -Infinity : Math.round(20 * Math.log10(x) * 10) / 10;
}

function round(x: number, places = 4): number {
  const k = 10 ** places;
  return Math.round(x * k) / k;
}

/** Interleave-agnostic: all channels are treated as one long list of samples. */
function channels(buffer: AudioBuffer): Float32Array[] {
  const out: Float32Array[] = [];
  for (let c = 0; c < buffer.numberOfChannels; c += 1) out.push(buffer.getChannelData(c));
  return out;
}

function windowRms(data: Float32Array[], from: number, to: number): number {
  let sum = 0;
  let n = 0;
  for (const ch of data) {
    const lo = Math.max(0, from);
    const hi = Math.min(ch.length, to);
    for (let i = lo; i < hi; i += 1) {
      const v = ch[i] as number;
      sum += v * v;
      n += 1;
    }
  }
  return n === 0 ? 0 : Math.sqrt(sum / n);
}

/** The largest single-sample jump in a span. A click IS a large single-sample jump; nothing else is. */
function maxDelta(data: Float32Array[], from: number, to: number): number {
  let worst = 0;
  for (const ch of data) {
    const lo = Math.max(1, from);
    const hi = Math.min(ch.length, to);
    for (let i = lo; i < hi; i += 1) {
      const d = Math.abs((ch[i] as number) - (ch[i - 1] as number));
      if (d > worst) worst = d;
    }
  }
  return worst;
}

/**
 * Render a graph built exactly as the game builds it.
 *
 * The master gain is set to the real playing level rather than being faded in, because what is wanted is
 * the level the child hears, not the level of the first 400 ms of the session.
 */
async function render(
  seconds: number,
  build: (ctx: OfflineAudioContext, bus: Bus) => void,
): Promise<AudioBuffer> {
  // Two channels because the room in `bus.ts` is a stereo convolution, and a mono render would fold its
  // decorrelated tail back together and measure a peak the game never produces.
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * seconds), SR);
  const bus = createBus(ctx, GENTLE_LEVEL);
  build(ctx, bus);
  return await ctx.startRendering();
}

function analyse(name: string, buffer: AudioBuffer, seconds: number, ceiling: number): Measurement {
  const data = channels(buffer);
  let peak = 0;
  let sum = 0;
  let n = 0;
  for (const ch of data) {
    for (let i = 0; i < ch.length; i += 1) {
      const v = ch[i] as number;
      const a = Math.abs(v);
      if (a > peak) peak = a;
      sum += v * v;
      n += 1;
    }
  }
  const rms = n === 0 ? 0 : Math.sqrt(sum / n);
  const headRms = windowRms(data, 0, 512);
  const tailRms = windowRms(data, buffer.length - 512, buffer.length);

  const problems: string[] = [];
  // 1e-4 is about −80 dBFS. Below that a "sound" is a rounding error, not a sound.
  if (peak < 1e-4) problems.push('SILENT — something is not connected');
  if (peak > ceiling) problems.push(`too loud (over ${ceiling})`);
  if (peak >= 1) problems.push('CLIPPING');
  if (headRms > 1e-4) problems.push('starts mid-sound');
  if (tailRms > 1e-4) problems.push('does not return to silence');

  return {
    name,
    seconds,
    peak: round(peak),
    rms: round(rms, 5),
    peakDb: db(peak),
    rmsDb: db(rms),
    headRms: round(headRms, 6),
    tailRms: round(tailRms, 6),
    ok: problems.length === 0,
    note: problems.length === 0 ? 'ok' : problems.join('; '),
  };
}

/* ------------------------------------------------------------------ *\
   The one-shots
\* ------------------------------------------------------------------ */

/**
 * Each one-shot is rendered starting at 0.05 s, so the head window proves the graph is quiet before it is
 * asked for anything, and long enough that the tail window proves it goes quiet again afterwards.
 *
 * The random source is seeded, so these numbers are reproducible and a change in them means a change in the
 * synthesis rather than a different roll of the dice.
 */
const AT = 0.05;

export async function measureOneShots(): Promise<Measurement[]> {
  const shots: { name: string; seconds: number; play: (v: ReturnType<typeof createVoices>, ctx: OfflineAudioContext, bus: Bus) => void }[] = [
    { name: 'squish', seconds: 2.2, play: (v, ctx, bus) => v.squish(ctx, bus.voices, AT) },
    { name: 'land', seconds: 2.2, play: (v, ctx, bus) => v.land(ctx, bus.voices, AT) },
    { name: 'plop', seconds: 2.2, play: (v, ctx, bus) => v.plop(ctx, bus.voices, AT) },
    { name: 'coin', seconds: 2.8, play: (v, ctx, bus) => v.coin(ctx, bus.voices, AT) },
    { name: 'hatch', seconds: 3.6, play: (v, ctx, bus) => v.hatch(ctx, bus.voices, AT) },
  ];

  const out: Measurement[] = [];
  for (const shot of shots) {
    const buffer = await render(shot.seconds, (ctx, bus) => {
      shot.play(createVoices(seededRand(0x5eed)), ctx, bus);
    });
    out.push(analyse(shot.name, buffer, shot.seconds, 0.8));
  }
  return out;
}

/**
 * All three timbre variants of one sound, so a variant with a typo in it cannot hide behind the other two.
 * Fires the sound four times in a row and checks each burst separately.
 */
export async function measureVariants(name: 'squish' | 'land' | 'plop'): Promise<Measurement[]> {
  const gap = 0.6;
  const shots = 4;
  const buffer = await render(gap * shots + 1, (ctx, bus) => {
    const voices = createVoices(seededRand(0xbeef));
    for (let i = 0; i < shots; i += 1) voices[name](ctx, bus.voices, AT + i * gap);
  });
  const data = channels(buffer);
  const out: Measurement[] = [];
  for (let i = 0; i < shots; i += 1) {
    const from = Math.floor((AT + i * gap) * SR);
    const to = Math.floor((AT + i * gap + gap) * SR);
    let peak = 0;
    for (const ch of data) {
      for (let s = from; s < Math.min(to, ch.length); s += 1) {
        const a = Math.abs(ch[s] as number);
        if (a > peak) peak = a;
      }
    }
    const rms = windowRms(data, from, to);
    out.push({
      name: `${name} #${i + 1}`,
      seconds: gap,
      peak: round(peak),
      rms: round(rms, 5),
      peakDb: db(peak),
      rmsDb: db(rms),
      headRms: 0,
      tailRms: 0,
      ok: peak > 1e-4 && peak < 0.8,
      note: peak <= 1e-4 ? 'SILENT' : peak >= 0.8 ? 'too loud' : 'ok',
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *\
   The vacuum, and whether it clicks
\* ------------------------------------------------------------------ */

const SUCK_ON = 0.25;
const SUCK_OFF = 2.0;

export async function measureVacuum(): Promise<Measurement> {
  const seconds = 3.0;
  const buffer = await render(seconds, (ctx, bus) => {
    const vacuum = createVacuum(ctx, bus.voices);
    vacuum.start(SUCK_ON);
    vacuum.stop(SUCK_OFF);
  });
  return analyse('vacuum (0.25 s on, 2.0 s off)', buffer, seconds, 0.5);
}

/**
 * THE POP TEST, and why it is written this way.
 *
 * The naive version compares the first and last few samples against zero. That catches a graph that starts
 * mid-waveform, and it is necessary, but it says nothing about the transition in the middle of the render —
 * and a stop that jumps from 0.19 to 0 in one sample lands nowhere near the ends of the buffer.
 *
 * What a click actually is, physically, is a step: one adjacent pair of samples that differ by far more
 * than the signal's bandwidth allows. So the measurement is SELF-CALIBRATING. It reads the largest
 * sample-to-sample change while the vacuum is in steady state — that is the sound's own natural slew rate,
 * whatever the filters happen to be doing — and then reads the same figure across the start ramp and across
 * the stop ramp. If either transition's largest step is no bigger than the sound's own, there is no
 * discontinuity there, and no threshold had to be invented for it to be true.
 *
 * The 1.6× allowance is for the fact that the ramps are also where the lowpass is opening, so the transition
 * spans are legitimately a little livelier than the middle.
 */
export async function measureVacuumPop(): Promise<PopTest> {
  const seconds = 3.0;
  const buffer = await render(seconds, (ctx, bus) => {
    const vacuum = createVacuum(ctx, bus.voices);
    vacuum.start(SUCK_ON);
    vacuum.stop(SUCK_OFF);
  });
  const data = channels(buffer);
  const s = (t: number) => Math.floor(t * SR);

  const steadyDelta = maxDelta(data, s(1.0), s(1.9));
  const startDelta = maxDelta(data, s(SUCK_ON - 0.02), s(SUCK_ON + 0.14));
  const stopDelta = maxDelta(data, s(SUCK_OFF - 0.02), s(SUCK_OFF + 0.3));
  const headRms = windowRms(data, 0, 512);
  const tailRms = windowRms(data, buffer.length - 512, buffer.length);

  const allowance = steadyDelta * 1.6;
  const problems: string[] = [];
  if (headRms > 1e-4) problems.push('not silent before the start');
  if (tailRms > 1e-4) problems.push('not silent after the stop');
  if (startDelta > allowance) problems.push(`step at start (${round(startDelta)} vs ${round(allowance)})`);
  if (stopDelta > allowance) problems.push(`step at stop (${round(stopDelta)} vs ${round(allowance)})`);

  return {
    name: 'vacuum start/stop',
    steadyDelta: round(steadyDelta, 5),
    startDelta: round(startDelta, 5),
    stopDelta: round(stopDelta, 5),
    headRms: round(headRms, 6),
    tailRms: round(tailRms, 6),
    ok: problems.length === 0,
    note: problems.length === 0 ? 'no discontinuity at either end' : problems.join('; '),
  };
}

/**
 * An interrupted start: stopped 40 ms in, while the level is still rising and the lowpass is still opening.
 * This is the case a child produces constantly — a tap rather than a hold — and it is the one that a naive
 * `cancelScheduledValues` implementation clicks on, because cancelling a running ramp drops the parameter
 * back to where the ramp began.
 */
export async function measureVacuumTap(): Promise<PopTest> {
  const seconds = 1.2;
  const on = 0.2;
  const off = 0.24;
  const buffer = await render(seconds, (ctx, bus) => {
    const vacuum = createVacuum(ctx, bus.voices);
    vacuum.start(on);
    vacuum.stop(off);
  });
  const data = channels(buffer);
  const s = (t: number) => Math.floor(t * SR);
  // "Steady" for a 40 ms tap is the moment it is loudest, just after the stop begins.
  const steadyDelta = maxDelta(data, s(off), s(off + 0.05));
  const startDelta = maxDelta(data, s(on - 0.02), s(on + 0.02));
  const stopDelta = maxDelta(data, s(off - 0.005), s(off + 0.25));
  const headRms = windowRms(data, 0, 512);
  const tailRms = windowRms(data, buffer.length - 512, buffer.length);

  const allowance = Math.max(steadyDelta * 1.6, 1e-4);
  const problems: string[] = [];
  if (tailRms > 1e-4) problems.push('not silent afterwards');
  if (startDelta > allowance) problems.push(`step at start (${round(startDelta)})`);
  if (stopDelta > allowance) problems.push(`step at stop (${round(stopDelta)})`);

  return {
    name: 'vacuum 40 ms tap',
    steadyDelta: round(steadyDelta, 5),
    startDelta: round(startDelta, 5),
    stopDelta: round(stopDelta, 5),
    headRms: round(headRms, 6),
    tailRms: round(tailRms, 6),
    ok: problems.length === 0,
    note: problems.length === 0 ? 'no discontinuity when interrupted mid-ramp' : problems.join('; '),
  };
}

/* ------------------------------------------------------------------ *\
   TEXTURE — the measurement that can tell mechanical from wet
\* ------------------------------------------------------------------ */

/**
 * WHY THIS EXISTS, and it is the only part of this file that measures CHARACTER rather than safety.
 *
 * Peak and RMS prove a sound is present and is not too loud. They cannot tell you it sounds like a machine.
 * But the difference between mechanical and wet is not a matter of taste — it is four numbers, and all four
 * are measurable from a render:
 *
 *   · HOW MANY DISCRETE EVENTS there are. One smooth gesture is one onset. A squelch is a collapsing crowd
 *     of bubbles and pockets of air, which is dozens. This is the single biggest discriminator.
 *   · HOW IRREGULARLY THEY ARE SPACED, as the coefficient of variation of the inter-onset gaps. A machine
 *     is periodic, so its CV tends to zero; anything organic scatters, so its CV approaches and passes 0.5.
 *     A high event count with a LOW CV is a buzz or a rattle, which would be worse than what we started
 *     with — so the count alone is not enough and the two must be read together.
 *   · WHETHER THE SPECTRUM JUMPS OR GLIDES, as the median frame-to-frame movement of the spectral centroid.
 *     A filter sweep, however steep, moves the centroid a few Hz per 1.5 ms frame and no more: it is a
 *     continuous function. Independent bursts at different sizes relocate it by hundreds of Hz per frame.
 *     This is what catches "I replaced the oscillator with a filter but it is still one smooth gesture".
 *   · CREST FACTOR over the active region. Sharp uneven micro-transients sit further above their own mean
 *     than a smoothly enveloped burst does.
 *   · HOW FAST THE SOUND ARRIVES, as the 10 %–90 % rise time of its onset. Added last and after three passes
 *     had been rejected by ear, because it is the only one of the five that measures HARDNESS rather than
 *     mechanicalness — see `attackMs`.
 *
 * The onset detector is spectral flux with an adaptive median threshold and a refractory period, which is
 * the standard construction and is deliberately not tuned per sound: the same detector reads every one of
 * them, so the before/after comparison is a comparison and not two different measurements.
 *
 * A WARNING ABOUT THE FIRST TWO, EARNED. `events` and `gapCv` were introduced to catch "mechanical", and for
 * that they worked. They were then treated as goals — a brief asked for the event count to go UP — and the
 * result was a sound the owner called hard, because a discrete detectable event and a sharp edge are the same
 * physical thing. A high event count is EVIDENCE AGAINST a swish. Read them as descriptions of what changed,
 * never as scores to raise.
 */
export interface Texture {
  name: string;
  /** Discrete micro-events found by spectral-flux onset detection over the active region. */
  events: number;
  /** Inter-onset gaps, milliseconds. */
  gapMean: number;
  gapMin: number;
  gapMax: number;
  /** std/mean of the gaps. THE irregularity number: 0 is a metronome, >0.5 is scattered. */
  gapCv: number;
  /** Mean spectral centroid over the active region, Hz. */
  centroid: number;
  /** Median absolute frame-to-frame centroid movement, Hz/frame. Glide is small; jumping is large. */
  centroidJump: number;
  /** 5th and 95th percentile of the centroid, Hz — how much ground it covers at all. */
  centroidLo: number;
  centroidHi: number;
  /** peak/rms over the active region only, dB. */
  crestDb: number;
  /** How long the sound is actually above the gate, ms. */
  activeMs: number;
  /** Events per second of active sound — density, independent of length. */
  density: number;
  /**
   * p90 − p10 of the frame energy in dB over the active region: how UNEVEN the sound is moment to moment,
   * with no thresholding anywhere in it. Included because it cannot be gamed by detector tuning the way an
   * onset count can, so it is the honest cross-check on the event numbers.
   */
  envSpreadDb: number;
  /**
   * THE 10 %–90 % RISE TIME OF THE SOUND'S OWN ONSET, in milliseconds, and the metric that was missing while
   * three passes were rejected by ear.
   *
   * "Hard" is a property of the first few milliseconds and nothing this file measured could see it. Crest
   * factor is close but it is an amplitude RATIO and says nothing about how fast the amplitude got there — a
   * slow swell to a tall peak and an instant snap to the same peak score identically. Onset COUNT is worse
   * than useless here: it rewards exactly the sharp edges that make a sound hard, which is how a brief asking
   * for "more discrete micro-events" produced something the owner called hard while every number improved.
   *
   * Measured on a smoothed 1.5 ms sliding-RMS envelope as the SHORTEST 10 %–90 % rise at any prominent peak,
   * each rise taken against the trough it started from — the sharpest edge anywhere in the sound, not the
   * shape of its overall onset. 5–15 ms is a soft onset and a swish is at the top of that range; the metric's
   * own floor is about 2.2 ms, so a reading of 2–3 ms means a click too fast to resolve. It is calibrated
   * against known signals in the implementation, which is also where the two-times error in the first version
   * of it is recorded.
   *
   * ZERO MEANS NOT APPLICABLE, not instantaneous. A rise time needs silence to rise out of, so it is only
   * computed when the analysed region actually begins below the gate — which the held vacuum, sliced out of
   * the middle of a hold, does not.
   */
  attackMs: number;
  /**
   * THE VACUUM'S DELIVERABLE, and the direct measurement of the owner's actual complaint.
   *
   * "Mechanical" for a HELD sound means a steady audible pitch, and a pitch is not a matter of opinion: it is a
   * narrow, persistent peak in the long-term average spectrum. Onset counting is the wrong tool for it — a
   * continuous noise bed has a stochastic onset floor of roughly sixteen per second whatever is done to it,
   * which swamps any designed event and makes the count say almost nothing. This says it directly.
   *
   * How far the strongest single bin stands above the median of its own neighbourhood, in dB, in a spectrum
   * averaged over the whole region. Two triangles a fifth apart are sharp lines and score 20 dB and up;
   * turbulent air is a broad flat hump and scores a few dB, which is just the variance of the estimate.
   */
  tonalPeakDb: number;
  /** Where that peak is, in Hz. 68 or 102 would be the old motor's two triangles. */
  tonalHz: number;
  /**
   * Spectral flatness: the geometric mean over the arithmetic mean of the power spectrum, in dB. Zero is
   * perfectly flat (pure noise); a strong tone drags it tens of dB negative.
   */
  flatnessDb: number;
  /**
   * The fraction of frames in which the tonal bin is STILL a local maximum. An oscillator is present in every
   * single frame and scores near 1.0; a noise bin that merely happened to win the average wanders around and
   * scores low. This is the "does any bin hold a stable peak across the loop" half of the question.
   */
  tonalPersist: number;
}

/** Long window for the tonality analysis: 4096 at 44.1 kHz is 10.8 Hz per bin, which resolves 68 from 102. */
const TONE_FRAME = 4096;

const FRAME = 512;
const HOP = 64;
/** Frames quieter than this far below the loudest frame are not part of the sound. */
const GATE_DB = 35;

/** In-place iterative radix-2 FFT. Sixteen lines, and the only DSP in this directory we write ourselves. */
function fft(re: Float32Array, im: Float32Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; (j & bit) !== 0; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i] as number;
      re[i] = re[j] as number;
      re[j] = tr;
      const ti = im[i] as number;
      im[i] = im[j] as number;
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    const half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < half; k += 1) {
        const ar = re[i + k] as number;
        const ai = im[i + k] as number;
        const br = re[i + k + half] as number;
        const bi = im[i + k + half] as number;
        const vr = br * cr - bi * ci;
        const vi = br * ci + bi * cr;
        re[i + k] = ar + vr;
        im[i + k] = ai + vi;
        re[i + k + half] = ar - vr;
        im[i + k + half] = ai - vi;
        const ncr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = ncr;
      }
    }
  }
}

function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 === 1 ? (s[mid] as number) : (((s[mid - 1] as number) + (s[mid] as number)) / 2);
}

function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)));
  return s[i] as number;
}

export interface Tonality {
  tonalPeakDb: number;
  tonalHz: number;
  flatnessDb: number;
  tonalPersist: number;
}

/**
 * IS THERE A STEADY PITCH IN THIS SOUND? The measurement the vacuum is actually judged by.
 *
 * Welch's method — average the power spectra of overlapping long windows — because a single window of noise is
 * wildly spiky and would produce a "tone" everywhere. Averaging twenty of them beats the variance down to about
 * a decibel, and anything genuinely periodic survives averaging untouched while noise does not. That asymmetry
 * IS the measurement.
 *
 * Three numbers come out, and they fail differently on purpose:
 *
 *   · `tonalPeakDb` — how far the best bin stands above the median of its neighbours, skipping the two bins
 *     either side so a peak is not compared against its own skirt. Local median rather than the global mean, so
 *     a broad spectral tilt (which every one of these sounds has) does not read as tonality.
 *   · `flatnessDb` — geometric over arithmetic mean. A single global number with no peak-picking in it at all,
 *     so it cannot be fooled by whatever the peak search happens to land on.
 *   · `tonalPersist` — how often that bin is a local maximum frame by frame. This is the one that separates a
 *     real oscillator from a lucky noise bin, and it is why the metric cannot be passed by accident: an
 *     oscillator is in every frame, so it scores ~1.0, and nothing else does.
 */
export function analyseTonality(mono: Float32Array, sr: number): Tonality {
  const N = TONE_FRAME;
  if (mono.length < N) return { tonalPeakDb: 0, tonalHz: 0, flatnessDb: 0, tonalPersist: 0 };

  // 75 % overlap rather than 50 %. A one-shot's active region is only a few hundred milliseconds, which is a
  // handful of 93 ms windows, and `tonalPersist` is a fraction over those windows — too few and it quantises
  // into uselessly coarse steps.
  const hop = N >> 2;
  const bins = N >> 1;
  const win = new Float32Array(N);
  for (let i = 0; i < N; i += 1) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (N - 1));

  const avg = new Float64Array(bins);
  const perFrame: Float32Array[] = [];
  const re = new Float32Array(N);
  const im = new Float32Array(N);
  let frames = 0;
  for (let off = 0; off + N <= mono.length; off += hop) {
    for (let i = 0; i < N; i += 1) {
      re[i] = (mono[off + i] as number) * (win[i] as number);
      im[i] = 0;
    }
    fft(re, im);
    const p = new Float32Array(bins);
    for (let k = 0; k < bins; k += 1) {
      const v = (re[k] as number) ** 2 + (im[k] as number) ** 2;
      p[k] = v;
      avg[k] = (avg[k] as number) + v;
    }
    perFrame.push(p);
    frames += 1;
  }
  if (frames === 0) return { tonalPeakDb: 0, tonalHz: 0, flatnessDb: 0, tonalPersist: 0 };
  for (let k = 0; k < bins; k += 1) avg[k] = (avg[k] as number) / frames;

  // 40 Hz to 5 kHz: below 40 there is nothing but the highpass, and above 5 k a "tone" would be a whistle this
  // design has never been at risk of.
  const lo = Math.max(4, Math.ceil((60 * N) / sr));
  const hi = Math.min(bins - 16, Math.floor((5000 * N) / sr));

  let bestDb = 0;
  let bestBin = -1;
  for (let k = lo; k < hi; k += 1) {
    const neighbours: number[] = [];
    for (let d = -16; d <= 16; d += 1) {
      // Skip the peak's own skirt: a Hann window spreads a pure tone across about three bins, so comparing a
      // tone against its immediate neighbours would hide exactly what is being looked for.
      if (Math.abs(d) <= 2) continue;
      const u = k + d;
      if (u < lo || u >= hi) continue;
      neighbours.push(avg[u] as number);
    }
    const m = median(neighbours);
    if (m <= 0) continue;
    const ratio = 10 * Math.log10((avg[k] as number) / m);
    if (ratio > bestDb) {
      bestDb = ratio;
      bestBin = k;
    }
  }

  /* --- flatness, over the same band, with no peak-picking in it -------------------------------- */

  let logSum = 0;
  let linSum = 0;
  let count = 0;
  for (let k = lo; k < hi; k += 1) {
    const v = Math.max(1e-30, avg[k] as number);
    logSum += Math.log(v);
    linSum += v;
    count += 1;
  }
  const flatnessDb =
    count > 0 && linSum > 0 ? 10 * Math.log10(Math.exp(logSum / count) / (linSum / count)) : 0;

  /* --- persistence of the winning bin --------------------------------------------------------- */

  let persist = 0;
  if (bestBin >= 0) {
    for (const p of perFrame) {
      const v = p[bestBin] as number;
      let isLocalMax = true;
      for (let d = -3; d <= 3; d += 1) {
        if (d === 0) continue;
        const u = bestBin + d;
        if (u < 0 || u >= bins) continue;
        if ((p[u] as number) > v) { isLocalMax = false; break; }
      }
      if (isLocalMax) persist += 1;
    }
    persist /= perFrame.length;
  }

  return {
    tonalPeakDb: Math.round(bestDb * 10) / 10,
    tonalHz: bestBin >= 0 ? Math.round((bestBin * sr) / N) : 0,
    flatnessDb: Math.round(flatnessDb * 10) / 10,
    tonalPersist: Math.round(persist * 100) / 100,
  };
}

/**
 * Analyse the texture of one render between two times.
 *
 * `minIoiMs` is the refractory period: two bubbles closer together than this are one event, and 6 ms is
 * about where the ear stops hearing two things anyway.
 */
export function analyseTexture(
  name: string,
  buffer: AudioBuffer,
  fromSec = 0,
  toSec = Number.POSITIVE_INFINITY,
  minIoiMs = 6,
): Texture {
  const data = channels(buffer);
  const n = Math.min(buffer.length, Math.floor(toSec * SR));
  const start = Math.max(0, Math.floor(fromSec * SR));

  // Mono, because an onset is an event in the sound and not in a channel.
  const mono = new Float32Array(Math.max(0, n - start));
  for (const ch of data) {
    for (let i = start; i < n; i += 1) mono[i - start] = (mono[i - start] as number) + (ch[i] as number) / data.length;
  }

  const frames = Math.max(0, Math.floor((mono.length - FRAME) / HOP) + 1);
  if (frames < 4) {
    return {
      name, events: 0, gapMean: 0, gapMin: 0, gapMax: 0, gapCv: 0,
      centroid: 0, centroidJump: 0, centroidLo: 0, centroidHi: 0, crestDb: 0, activeMs: 0, density: 0, envSpreadDb: 0,
      tonalPeakDb: 0, tonalHz: 0, flatnessDb: 0, tonalPersist: 0, attackMs: 0,
    };
  }

  const bins = FRAME >> 1;
  const window = new Float32Array(FRAME);
  for (let i = 0; i < FRAME; i += 1) window[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (FRAME - 1));

  const energyDb = new Float32Array(frames);
  const centroids = new Float32Array(frames);
  const flux = new Float32Array(frames);
  let prevMag = new Float32Array(bins);
  const re = new Float32Array(FRAME);
  const im = new Float32Array(FRAME);

  for (let t = 0; t < frames; t += 1) {
    const off = t * HOP;
    for (let i = 0; i < FRAME; i += 1) {
      re[i] = (mono[off + i] as number) * (window[i] as number);
      im[i] = 0;
    }
    fft(re, im);
    const mag = new Float32Array(bins);
    let energy = 0;
    let wsum = 0;
    let msum = 0;
    for (let k = 0; k < bins; k += 1) {
      const m = Math.hypot(re[k] as number, im[k] as number);
      mag[k] = m;
      energy += m * m;
      wsum += ((k * SR) / FRAME) * m;
      msum += m;
    }
    energyDb[t] = energy > 0 ? 10 * Math.log10(energy) : -300;
    centroids[t] = msum > 1e-12 ? wsum / msum : 0;
    let f = 0;
    for (let k = 0; k < bins; k += 1) {
      const d = (mag[k] as number) - (prevMag[k] as number);
      if (d > 0) f += d;
    }
    flux[t] = t === 0 ? 0 : f;
    prevMag = mag;
  }

  // The active region: everything within GATE_DB of the loudest frame.
  let loudest = -300;
  for (let t = 0; t < frames; t += 1) if ((energyDb[t] as number) > loudest) loudest = energyDb[t] as number;
  const floor = loudest - GATE_DB;
  const active: boolean[] = [];
  let firstActive = -1;
  let lastActive = -1;
  for (let t = 0; t < frames; t += 1) {
    const on = (energyDb[t] as number) > floor;
    active.push(on);
    if (on) {
      if (firstActive < 0) firstActive = t;
      lastActive = t;
    }
  }
  if (firstActive < 0) {
    return {
      name, events: 0, gapMean: 0, gapMin: 0, gapMax: 0, gapCv: 0,
      centroid: 0, centroidJump: 0, centroidLo: 0, centroidHi: 0, crestDb: 0, activeMs: 0, density: 0, envSpreadDb: 0,
      tonalPeakDb: 0, tonalHz: 0, flatnessDb: 0, tonalPersist: 0, attackMs: 0,
    };
  }

  /* --- onsets: local flux maxima over an adaptive median, with a refractory period ------------- */

  /**
   * TWO GUARDS AGAINST COUNTING NOISE AS EVENTS, both learned from the first run of this harness, which
   * reported 37 onsets in a second of deliberately steady vacuum. Both were wrong readings, and a metric
   * that fires on stationary noise cannot be used to argue anything about texture.
   *
   *   · THE FLUX IS SMOOTHED over 5 frames (~7 ms). Spectral flux on broadband noise is itself a noisy
   *     signal, and single-frame spikes in it are the noise's own variance, not arrivals. A real burst is
   *     broad enough to survive the smoothing; a stochastic spike is not.
   *   · THE THRESHOLD HAS A FLOOR PROPORTIONAL TO THE LOUDEST FLUX IN THE RENDER, not only a local median.
   *     A purely local threshold is a relative measure, so in any stretch where nothing is happening it
   *     adapts down until the noise clears it — which is precisely how a steady bed scored 37. An absolute
   *     component means "quiet wobble is not an event" is expressible at all.
   *
   * Narrow-band noise fluctuates several dB by nature (a 150 Hz-wide bed has only one or two independent
   * samples per frame), so a floor is not fussiness here, it is the difference between measuring the design
   * and measuring the dice.
   */
  const smooth = new Float32Array(frames);
  for (let t = 0; t < frames; t += 1) {
    let acc = 0;
    let cnt = 0;
    for (let d = -2; d <= 2; d += 1) {
      const u = t + d;
      if (u < 0 || u >= frames) continue;
      acc += flux[u] as number;
      cnt += 1;
    }
    smooth[t] = cnt > 0 ? acc / cnt : 0;
  }
  let peakFlux = 0;
  for (let t = firstActive; t <= lastActive; t += 1) if ((smooth[t] as number) > peakFlux) peakFlux = smooth[t] as number;

  const minGapFrames = Math.max(1, Math.ceil(((minIoiMs / 1000) * SR) / HOP));
  const half = 64;
  const onsets: number[] = [];
  let last = -1e9;
  for (let t = 1; t < frames - 1; t += 1) {
    if (!active[t]) continue;
    const f = smooth[t] as number;
    // Local maximum over ±2 frames, so one broad rise is one onset rather than three.
    let isPeak = true;
    for (let d = -2; d <= 2; d += 1) {
      const u = t + d;
      if (u < 0 || u >= frames || d === 0) continue;
      if ((smooth[u] as number) > f) { isPeak = false; break; }
    }
    if (!isPeak) continue;
    const localWindow: number[] = [];
    for (let u = Math.max(0, t - half); u < Math.min(frames, t + half); u += 1) localWindow.push(smooth[u] as number);
    /**
     * THE THRESHOLD IS LOCAL BASELINE PLUS A LOCAL SPREAD, and the previous formulation — a plain multiple of
     * the local median — was broken in a way that took instrumenting to see rather than reasoning.
     *
     * A multiplicative threshold assumes the flux returns to near zero between events. That is true of a
     * one-shot surrounded by silence and FALSE OF EVERY CONTINUOUS SOUND, because broadband noise generates a
     * constant floor of spectral flux simply by being noise. Measured on the held vacuum, the flux ran a
     * median of 2.88 with a maximum of 5.76 — a peak only 2.0× the baseline — so a threshold of 2.5× the
     * median sat permanently ABOVE the loudest event in the signal and the detector was structurally incapable
     * of returning anything but zero. It was reporting a property of its own arithmetic, not of the sound.
     *
     * `median + 0.6 · (p90 − median)` is the standard adaptive-threshold shape instead: a baseline plus a
     * margin scaled to how much the signal actually varies in this neighbourhood. It is scale-free, so it
     * behaves the same on a decaying squelch and on a steady bed, and it can always be exceeded by a
     * sufficiently prominent event. The small multiplicative term keeps it clear of the baseline itself.
     */
    const localBase = median(localWindow);
    const localSpread = Math.max(0, percentile(localWindow, 0.9) - localBase);
    const threshold = localBase * 1.15 + localSpread * 0.6 + peakFlux * 0.02;
    if (f < threshold) continue;
    if (t - last < minGapFrames) continue;
    onsets.push(t);
    last = t;
  }

  const gaps: number[] = [];
  for (let i = 1; i < onsets.length; i += 1) {
    gaps.push((((onsets[i] as number) - (onsets[i - 1] as number)) * HOP * 1000) / SR);
  }
  const gapMean = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  const gapVar = gaps.length > 0 ? gaps.reduce((a, b) => a + (b - gapMean) ** 2, 0) / gaps.length : 0;
  const gapCv = gapMean > 0 ? Math.sqrt(gapVar) / gapMean : 0;

  /* --- centroid: where it sits, and whether it glides or jumps --------------------------------- */

  const activeCentroids: number[] = [];
  const jumps: number[] = [];
  for (let t = firstActive; t <= lastActive; t += 1) {
    const c = centroids[t] as number;
    if (c <= 0) continue;
    activeCentroids.push(c);
    if (t > firstActive) {
      const p = centroids[t - 1] as number;
      if (p > 0) jumps.push(Math.abs(c - p));
    }
  }
  const centroid = activeCentroids.length > 0
    ? activeCentroids.reduce((a, b) => a + b, 0) / activeCentroids.length
    : 0;

  /* --- crest over the active samples only ------------------------------------------------------ */

  const lo = firstActive * HOP;
  const hi = Math.min(mono.length, lastActive * HOP + FRAME);
  let peak = 0;
  let sum = 0;
  let count = 0;
  for (let i = lo; i < hi; i += 1) {
    const v = mono[i] as number;
    const a = Math.abs(v);
    if (a > peak) peak = a;
    sum += v * v;
    count += 1;
  }
  const rms = count > 0 ? Math.sqrt(sum / count) : 0;
  const activeMs = ((hi - lo) / SR) * 1000;

  /* --- the onset's rise time, which is what "hard" actually means ------------------------------ */

  /**
   * THE SHARPEST ARRIVAL IN THE SOUND: the shortest 10 %–90 % rise found at any prominent peak of a 1.5 ms
   * sliding-RMS envelope. See the note on `Texture.attackMs`.
   *
   * WHY THE SHARPEST AND NOT THE FIRST. The obvious definition — time from silence to the sound's loudest
   * moment — was written first and it is worse than useless, because it reports the shape of the whole sound
   * rather than the edge inside it. Measured that way `land` scored 44 ms, a slow gentle swell, while its
   * envelope in fact contained a 2.5 ms spike at 8 ms reaching 63 % of full level with its neighbours at 20 %.
   * That spike is the tap the owner was hearing, and the number that was supposed to find hardness was
   * averaging directly over it. Hardness is a property of the WORST edge, not of the average gesture, so the
   * statistic has to be a minimum and not a mean.
   *
   * The analysis window is short on purpose. The 512-sample frame used everywhere else in this function is
   * 11.6 ms long — longer than the entire attack being measured — so it would report its own rise, identically,
   * for every sound in the file. This measurement has to be done on the samples, not on the spectrogram.
   *
   * ══ CALIBRATED, BECAUSE THE FIRST VERSION OF THIS WAS WRONG BY A FACTOR OF TWO ═══════════════════
   *
   * Every number in this directory should have been checked against a signal whose answer is known, and this
   * is the one that was. Fed a pure raised-cosine attack of exactly 10 ms — true 10 %–90 % rise 5.9 ms — the
   * first implementation reported 3.06 ms, and 5.31 ms for a true 11.8. It peak-picked on the raw RMS and
   * measured each rise against an ABSOLUTE tenth of the peak, so the carrier's own ripple in the RMS put false
   * local maxima part of the way up every rise and the climb was timed to those instead. It under-read
   * everything, and it under-read long attacks worst — which is exactly the direction that would make a
   * softening pass look like it had failed when it had worked.
   *
   * Two corrections. The RMS is SMOOTHED before peaks are picked, which removes the ripple; and each rise is
   * measured against THE TROUGH IT STARTED FROM rather than against zero, which is what makes the figure mean
   * the same thing for an arrival out of silence and an arrival on top of a decaying tail. Re-calibrated:
   *
   *     true 0.6 ms → 2.24    true 1.8 ms → 3.06    true 5.9 ms → 6.12    true 11.8 ms → 11.63
   *
   * So it is accurate above about 5 ms and has a FLOOR near 2.2 ms imposed by the two 1.5 ms windows. Anything
   * reported at 2–3 ms is a click whose true rise is shorter than the instrument can resolve; the useful
   * reading is "at the floor" versus "clear of it". That is enough, because the distinction the ear cares
   * about is exactly that one.
   *
   * Three adversarial cases are in the calibration set as well, because a metric that only ever sees the
   * signals it was designed against is an opinion:
   *
   *     two tones 200 Hz apart, beating, no tap anywhere    → 6.53 ms   (must NOT read as an edge)
   *     a 0.5 ms click on top of a quiet sustained tone     → 2.45 ms   (must be caught: it is the worst case)
   *     a 12 ms swell on top of the same tone               → 6.33 ms   (must read as soft)
   *
   * The middle one is the reason for the bounded trough search below; before that fix it read 142 ms.
   *
   * Only computed when the region begins in silence (`firstActive > 0`); a held loop sliced out of its own
   * middle has no onset to time and gets 0, meaning not applicable.
   */
  let attackMs = 0;
  if (firstActive > 0) {
    const win = Math.max(8, Math.round(SR * 0.0015));
    const step = Math.max(1, Math.round(SR * 0.0002));
    // Start a little before the gate opens, so the true foot of the first rise is inside the search.
    const from = Math.max(0, lo - win * 2);
    const to = Math.min(mono.length, lo + Math.round(SR * 0.15));

    const raw: number[] = [];
    const times: number[] = [];
    let acc = 0;
    for (let i = from; i < Math.min(mono.length, to + win); i += 1) {
      const v = mono[i] as number;
      acc += v * v;
      if (i - win >= from) {
        const old = mono[i - win] as number;
        acc -= old * old;
      }
      if ((i - from) % step === 0) {
        raw.push(Math.sqrt(Math.max(0, acc) / win));
        times.push(i);
      }
    }

    // Smooth the envelope itself. This is the fix for the ripple that made v1 under-read by half.
    const sm = Math.max(1, Math.round(0.0015 / (step / SR)));
    const env: number[] = raw.map((_, i) => {
      let s = 0;
      let c = 0;
      for (let d = -sm; d <= sm; d += 1) {
        const u = i + d;
        if (u < 0 || u >= raw.length) continue;
        s += raw[u] as number;
        c += 1;
      }
      return c > 0 ? s / c : 0;
    });

    let envPeak = 0;
    for (const v of env) if (v > envPeak) envPeak = v;

    if (envPeak > 0) {
      // A peak has to stand out to count. Below about a third of full level an envelope wiggle is texture.
      const prominent = envPeak * 0.3;
      // "Local" means the largest point within 2.5 ms either side: one arrival is one maximum.
      const half = Math.max(1, Math.round(0.0025 / (step / SR)));
      // How far back an arrival's own foot can be. See the trough search below.
      const maxBack = Math.max(1, Math.round(0.04 / (step / SR)));
      let best = Infinity;

      for (let i = 1; i < env.length - 1; i += 1) {
        const p = env[i] as number;
        if (p < prominent) continue;
        let isMax = true;
        for (let d = -half; d <= half && isMax; d += 1) {
          const u = i + d;
          if (u < 0 || u >= env.length || u === i) continue;
          if ((env[u] as number) > p) isMax = false;
        }
        if (!isMax) continue;

        /**
         * The trough this rise actually started from — the NEAREST local minimum, not the lowest point in
         * the render, and the difference between those two is a bug that made the metric miss the loudest
         * class of tap there is.
         *
         * Walking back to the global minimum means that for any peak louder than everything before it, the
         * search runs all the way to the silence at the start and reports the time from there. Fed a 0.5 ms
         * click sitting on top of a quiet sustained tone — the sharpest thing in this test set — it returned
         * 142 ms and called it the softest sound ever measured. Exactly inverted.
         *
         * So: stop at 40 ms of look-back, and stop as soon as the envelope has climbed 35 % back out of the
         * running minimum, which means we have left this arrival's own foot and started up the back of an
         * earlier one.
         */
        let troughAt = i;
        let trough = p;
        for (let j = i - 1; j >= 0 && i - j <= maxBack; j -= 1) {
          const q = env[j] as number;
          if (q < trough) {
            trough = q;
            troughAt = j;
          } else if (q > trough * 1.35) {
            break;
          }
          if (q > p) break;
        }
        // An arrival has to come out of a dip. Under 8 dB of range this is a ripple on a continuous sound,
        // and a ripple has no attack — timing it would report the smoothing window's own response.
        if (trough >= p * 0.4) continue;

        const loLevel = trough + (p - trough) * 0.1;
        const hiLevel = trough + (p - trough) * 0.9;
        let a = -1;
        let b = -1;
        for (let j = troughAt; j <= i; j += 1) {
          const q = env[j] as number;
          if (a < 0 && q >= loLevel) a = j;
          if (q >= hiLevel) {
            b = j;
            break;
          }
        }
        if (a < 0 || b < 0) continue;
        const rise = (((times[b] as number) - (times[a] as number)) / SR) * 1000;
        if (rise > 0 && rise < best) best = rise;
      }
      if (best < Infinity) attackMs = best;
    }
  }

  /* --- unevenness, with no threshold in it at all ---------------------------------------------- */

  /**
   * The dB envelope MINUS A LONG MOVING AVERAGE OF ITSELF, which is the detrending step that makes this
   * comparable between a decaying one-shot and a held loop. Without it the figure would just be reporting
   * how steep the decay is: a 300 ms exponential falls 60 dB, which would swamp any actual unevenness.
   * Against the local mean, what is left is only the short-term wobble — bursts and gaps — which is the
   * thing being claimed.
   */
  const residuals: number[] = [];
  for (let t = firstActive; t <= lastActive; t += 1) {
    let acc = 0;
    let cnt = 0;
    for (let d = -20; d <= 20; d += 1) {
      const u = t + d;
      if (u < firstActive || u > lastActive) continue;
      acc += energyDb[u] as number;
      cnt += 1;
    }
    if (cnt > 0) residuals.push((energyDb[t] as number) - acc / cnt);
  }
  const envSpreadDb = percentile(residuals, 0.9) - percentile(residuals, 0.1);

  return {
    envSpreadDb: round(envSpreadDb, 2),
    attackMs: round(attackMs, 2),
    /**
     * Tonality, over THE ACTIVE REGION ONLY and with its own much longer window. This is the number the held
     * vacuum is judged by, and for the transients it is the check that no sine body is left in them.
     *
     * The slice matters. Run over the whole render, a one-shot is nine parts silence, and since `tonalPersist`
     * is a fraction of frames it gets divided by all the frames in which there is nothing to be tonal — an
     * unmistakable 20 dB sine body at 151 Hz scored 0.45 and was reported as "no steady pitch". Restricting to
     * the region the gate says is sounding is the difference between measuring the sound and measuring how much
     * padding the render has around it.
     */
    ...analyseTonality(mono.subarray(lo, hi), SR),
    name,
    events: onsets.length,
    gapMean: round(gapMean, 2),
    gapMin: round(gaps.length > 0 ? Math.min(...gaps) : 0, 2),
    gapMax: round(gaps.length > 0 ? Math.max(...gaps) : 0, 2),
    gapCv: round(gapCv, 3),
    centroid: Math.round(centroid),
    centroidJump: Math.round(median(jumps)),
    centroidLo: Math.round(percentile(activeCentroids, 0.05)),
    centroidHi: Math.round(percentile(activeCentroids, 0.95)),
    crestDb: rms > 0 ? db(peak / rms) : 0,
    activeMs: round(activeMs, 1),
    density: round(activeMs > 0 ? onsets.length / (activeMs / 1000) : 0, 1),
  };
}

/**
 * The texture of each slime sound, and of the vacuum's held middle.
 *
 * The one-shots are rendered ONE PER RENDER with a fixed seed, exactly as `measureOneShots` does, so the
 * numbers move only when the synthesis moves. The vacuum is measured across a second of steady hold, which
 * is the part a child is actually living inside.
 */
export async function measureTextures(): Promise<Texture[]> {
  const out: Texture[] = [];

  const shots: ('squish' | 'land' | 'plop')[] = ['squish', 'land', 'plop'];
  for (const name of shots) {
    const buffer = await render(1.6, (ctx, bus) => {
      createVoices(seededRand(0x5eed))[name](ctx, bus.voices, AT);
    });
    out.push(analyseTexture(name, buffer, 0, 1.6));
  }

  const vac = await render(3.0, (ctx, bus) => {
    const vacuum = createVacuum(ctx, bus.voices);
    vacuum.start(SUCK_ON);
    vacuum.stop(SUCK_OFF);
  });
  // 0.9–1.9 s: past the start ramp and the hold creep, before the release. The same 6 ms refractory period
  // as the one-shots, so the four rows in the table are one measurement and not four.
  out.push(analyseTexture('vacuum (held)', vac, 0.9, 1.9));

  return out;
}

/* ------------------------------------------------------------------ *\
   The pad, and everything at once
\* ------------------------------------------------------------------ */

/**
 * Thirty-six seconds, which is long enough for the drone to have faded in and for two or three swells to
 * have come and gone. The interesting figure is not the peak — it is how far BELOW the effects it sits.
 */
export async function measurePad(): Promise<Measurement> {
  const seconds = 36;
  const buffer = await render(seconds, (ctx, bus) => {
    const pad = createPad(ctx, bus.pad, seededRand(0xf00d));
    pad.start(0);
    pad.scheduleUntil(0, seconds);
  });
  const m = analyse('ambient pad (36 s)', buffer, seconds, 0.2);
  // A pad that is still swelling at the end of the render has not failed to return to silence, so that one
  // complaint is dropped for this measurement only.
  const problems = m.note
    .split('; ')
    .filter((p) => p !== 'ok' && p !== 'does not return to silence');
  return { ...m, ok: problems.length === 0, note: problems.length === 0 ? 'ok' : problems.join('; ') };
}

/**
 * EVERYTHING AT ONCE, which is the measurement the mix exists for. The vacuum running, the pad swelling, and
 * a squish, a plop and a land all inside 400 ms — a plausible half-second of play, and the case where four
 * individually soft sounds could add up to something that startles a child.
 */
export async function measureTogether(): Promise<Measurement> {
  const seconds = 14;
  const buffer = await render(seconds, (ctx, bus) => {
    const voices = createVoices(seededRand(0xc0ffee));
    const pad = createPad(ctx, bus.pad, seededRand(0xf00d));
    pad.start(0);
    pad.scheduleUntil(0, seconds);
    const vacuum = createVacuum(ctx, bus.voices);
    vacuum.start(6.0);
    vacuum.stop(9.0);
    voices.squish(ctx, bus.voices, 7.0);
    voices.plop(ctx, bus.voices, 7.15);
    voices.land(ctx, bus.voices, 7.3);
    voices.coin(ctx, bus.voices, 7.35);
    voices.hatch(ctx, bus.voices, 7.4);
  });
  const m = analyse('everything at once', buffer, seconds, 0.95);
  const problems = m.note.split('; ').filter((p) => p !== 'ok' && p !== 'does not return to silence');
  return { ...m, ok: problems.length === 0, note: problems.length === 0 ? 'ok' : problems.join('; ') };
}

/* ------------------------------------------------------------------ *\
   The whole run
\* ------------------------------------------------------------------ */

export interface Report {
  measurements: Measurement[];
  pops: PopTest[];
  textures: Texture[];
  ok: boolean;
}

export async function measureAll(): Promise<Report> {
  const measurements: Measurement[] = [
    ...(await measureOneShots()),
    await measureVacuum(),
    await measurePad(),
    await measureTogether(),
    ...(await measureVariants('squish')),
    ...(await measureVariants('land')),
    ...(await measureVariants('plop')),
  ];
  const pops: PopTest[] = [await measureVacuumPop(), await measureVacuumTap()];
  const textures = await measureTextures();
  return {
    measurements,
    pops,
    textures,
    // Texture is reported, not gated: it is a description of character, and a threshold on it would be an
    // opinion pretending to be a test. Peak, RMS and the discontinuity checks remain the pass/fail.
    ok: measurements.every((m) => m.ok) && pops.every((p) => p.ok),
  };
}

/** A fixed-width table, for a terminal or a `<pre>`. */
export function formatReport(report: Report): string {
  const lines: string[] = [];
  const pad = (s: string, n: number) => (s.length >= n ? s : s + ' '.repeat(n - s.length));
  const padLeft = (s: string, n: number) => (s.length >= n ? s : ' '.repeat(n - s.length) + s);

  lines.push(pad('sound', 30) + padLeft('peak', 8) + padLeft('dBFS', 8) + padLeft('rms', 10) + padLeft('dBFS', 8) + '  note');
  lines.push('-'.repeat(94));
  for (const m of report.measurements) {
    lines.push(
      pad(m.name, 30) +
        padLeft(m.peak.toFixed(4), 8) +
        padLeft(m.peakDb.toFixed(1), 8) +
        padLeft(m.rms.toFixed(5), 10) +
        padLeft(m.rmsDb.toFixed(1), 8) +
        '  ' +
        (m.ok ? 'ok' : `FAIL: ${m.note}`),
    );
  }
  lines.push('');
  lines.push(pad('discontinuity check', 30) + padLeft('steady', 10) + padLeft('start', 10) + padLeft('stop', 10) + '  note');
  lines.push('-'.repeat(94));
  for (const p of report.pops) {
    lines.push(
      pad(p.name, 30) +
        padLeft(p.steadyDelta.toFixed(5), 10) +
        padLeft(p.startDelta.toFixed(5), 10) +
        padLeft(p.stopDelta.toFixed(5), 10) +
        '  ' +
        (p.ok ? p.note : `FAIL: ${p.note}`),
    );
    lines.push(pad('', 30) + `head rms ${p.headRms.toExponential(2)} · tail rms ${p.tailRms.toExponential(2)}`);
  }
  lines.push('');
  lines.push(
    pad('texture', 16) +
      padLeft('events', 8) +
      padLeft('dens/s', 8) +
      padLeft('gap ms', 8) +
      padLeft('min', 7) +
      padLeft('max', 8) +
      padLeft('gapCV', 7) +
      padLeft('centr', 7) +
      padLeft('jump', 7) +
      padLeft('c5-c95', 12) +
      padLeft('crest', 7) +
      padLeft('unev', 7) +
      padLeft('atk ms', 8) +
      padLeft('act ms', 8),
  );
  lines.push('-'.repeat(120));
  for (const t of report.textures) {
    lines.push(
      pad(t.name, 16) +
        padLeft(String(t.events), 8) +
        padLeft(t.density.toFixed(1), 8) +
        padLeft(t.gapMean.toFixed(1), 8) +
        padLeft(t.gapMin.toFixed(1), 7) +
        padLeft(t.gapMax.toFixed(1), 8) +
        padLeft(t.gapCv.toFixed(3), 7) +
        padLeft(String(t.centroid), 7) +
        padLeft(String(t.centroidJump), 7) +
        padLeft(`${t.centroidLo}-${t.centroidHi}`, 12) +
        padLeft(t.crestDb.toFixed(1), 7) +
        padLeft(t.envSpreadDb.toFixed(1), 7) +
        padLeft(t.attackMs > 0 ? t.attackMs.toFixed(1) : '—', 8) +
        padLeft(t.activeMs.toFixed(0), 8),
    );
  }
  lines.push('');
  lines.push(
    pad('is there a pitch', 16) +
      padLeft('peak dB', 10) +
      padLeft('at Hz', 8) +
      padLeft('flatness', 10) +
      padLeft('persist', 9) +
      '  verdict',
  );
  lines.push('-'.repeat(112));
  for (const t of report.textures) {
    /**
     * 15 dB of prominence is the line, and `tonalPersist` is reported beside it rather than folded into the
     * verdict. Requiring both was the first attempt and it was wrong: a DECAYING sine is only present for the
     * part of the region it has not yet decayed through, so the old squish's unmistakable 22 dB body at 151 Hz
     * persisted in just 36 % of frames and was waved through as untonal. Prominence answers "is there a line
     * here"; persistence answers "is it a continuous one", and for a 140 ms sine body inside a 340 ms transient
     * the honest answer to the second is no while the first is still damning.
     */
    const tonal = t.tonalPeakDb >= 15;
    lines.push(
      pad(t.name, 16) +
        padLeft(t.tonalPeakDb.toFixed(1), 10) +
        padLeft(String(t.tonalHz), 8) +
        padLeft(t.flatnessDb.toFixed(1), 10) +
        padLeft(t.tonalPersist.toFixed(2), 9) +
        '  ' +
        (tonal ? 'STEADY PITCH PRESENT' : 'no steady pitch'),
    );
  }
  lines.push('');
  lines.push('  events/gapCV: few + regular = mechanical, many + scattered (CV > 0.5) = wet.');
  lines.push('  jump = median Hz the spectral centroid moves per 1.45 ms frame. A glide is small; bubbles are large.');
  lines.push('  unev = p90-p10 of the detrended dB envelope. Threshold-free cross-check on the event count.');
  lines.push('  atk  = sharpest 10-90% rise anywhere in the sound, ms. 5-15 is a soft onset. THIS is "hard".');
  lines.push('         Floor is ~2.2 ms (calibrated): a reading of 2-3 ms is a click too fast to resolve.');
  lines.push('         "—" means the region has no onset in it (a held loop sliced out of its own middle).');
  lines.push('');
  lines.push(report.ok ? 'ALL OK' : 'PROBLEMS ABOVE');
  return lines.join('\n');
}
