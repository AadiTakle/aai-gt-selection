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
  return {
    measurements,
    pops,
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
  lines.push(report.ok ? 'ALL OK' : 'PROBLEMS ABOVE');
  return lines.join('\n');
}
