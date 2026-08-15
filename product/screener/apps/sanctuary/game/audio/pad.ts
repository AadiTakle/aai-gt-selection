import { rampTo } from './bus';
import { between, createChooser, type Rand } from './variation';

/**
 * THE AMBIENCE. A small music box playing in the next room, over a warm chord that changes under it.
 *
 * ══ WHY THIS WAS REWRITTEN ═══════════════════════════════════════════════════════════════════════
 *
 * The previous version was a drone plus randomly-spaced swells, and it was reported as CREEPY. That is
 * not a matter of taste, it is a matter of vocabulary: sustained tones with no pulse, four-second
 * attacks so nothing has an onset, and no tune, is the exact sound design language of ambient horror.
 * Three specific faults, all measurable, all fixed here:
 *
 *   · NO PULSE. The old bed's amplitude autocorrelation fell smoothly away from zero lag and never came
 *     back — there was no periodicity anywhere in it to find. Nothing marked the passing of time, and a
 *     sound that does not move in time reads as a held breath.
 *   · AN UNRESOLVED MAJOR SEVENTH. The swells drew from F major pentatonic, which is safe, but a quarter
 *     of them ALSO played a perfect fifth above the drawn note — and a fifth above A is E, which is not
 *     in that scale and is a major seventh against the F drone underneath. Six times in fifteen minutes a
 *     note a semitone below the tonic was held for ten seconds against the tonic and then simply faded
 *     out. Nothing resolved, because there was no harmony there to resolve to.
 *   · NO TOP AND NO TUNE. Everything lived below 700 Hz behind a filter drifting on a 40-second cycle.
 *     Dark, slow, and impossible to hum.
 *
 * ══ WHAT IT IS NOW ═══════════════════════════════════════════════════════════════════════════════
 *
 * F major, a slow waltz at 100 bpm — three beats of 0.6 s, so a bar is 1.8 s. Three layers:
 *
 *   · THE CHORD. Twelve sine and triangle oscillators, one per pitch the harmony can ever need, started
 *     once and never stopped. A chord change is nothing but their gains crossfading, which is why the
 *     harmony can move every bar without a single source starting, stopping or being retuned.
 *   · THE BREATH. One gain on the chord path that rises on the downbeat and settles across the bar. It
 *     is the pulse: gentle, in time, and the single biggest difference from a drone.
 *   · THE MELODY. Music-box notes — a 6 ms strike, exponential decay, a fundamental with three partials
 *     over it — placed on the beat grid in short phrases with bars of silence between them.
 *
 * ══ WHY IT RESOLVES ══════════════════════════════════════════════════════════════════════════════
 *
 * The harmony is drawn as whole PROGRESSIONS, never chord by chord, and every progression in the table
 * ends on F. So the music is always on its way home and always gets there, and the joins between one
 * draw and the next can only ever be I→I or I→vi. No chord in this file is left hanging, because there
 * is no path through the table that ends anywhere but the tonic.
 *
 * Every melody note is drawn from the CURRENT CHORD'S OWN NOTE BAG — chord tones plus the sixth or the
 * ninth, which are the two additions that sweeten a triad without souring it. A wrong note is therefore
 * not something that has to be avoided at the moment of choosing; it is not in the bag to be drawn.
 *
 * F major contains exactly one tritone, B♭ against E, and a melody in the key can always stumble into it
 * across a IV→V bar line. `avoidTritone` is the one explicit guard in the file, and it is a guard rather
 * than a smaller note table because removing either pitch would cost the key its fourth or its leading
 * tone. That interval is worth naming: it is the one sound left in this scale that would undo the job.
 *
 * ══ WHY IT CANNOT LOOP AUDIBLY ═══════════════════════════════════════════════════════════════════
 *
 * The pulse is periodic — it has to be, that is what a pulse is — but nothing above the bar is. The
 * progression, the phrase and the number of bars of rest after it are three independent draws, two of
 * them through `createChooser`, which cannot return the same item twice running. Phrase shapes are
 * transposed to meet the previous note wherever it left off, so one phrase is a different line every time
 * it appears. Measured over fifteen minutes the pitch sequence has no repeating period at all.
 *
 * ══ WHY IT STAYS BEHIND EVERYTHING ═══════════════════════════════════════════════════════════════
 *
 * The melody sits between F4 and E6, which is ABOVE the chord and BELOW the squelches (whose energy is
 * 1.8–4 kHz), so it occupies a band nothing else in the game is using and needs no level to be heard in.
 * It is roughly two thirds silence by time. Silence is what keeps a small tune from becoming a nag: a
 * phrase a child does not hear the end of is a phrase they never get tired of.
 *
 * ══ WHY NOTHING CLICKS ═══════════════════════════════════════════════════════════════════════════
 *
 * The chord layer never starts or stops a source at all after construction; only gains move, and every
 * chord crossfade is a `setValueAtTime` onto the value the previous ramp already reached, followed by a
 * ramp — continuous by construction, with no cancellation anywhere on the scheduled path. The melody
 * does start an oscillator per note, but its gain is exactly zero for the sample the oscillator starts on
 * and exactly zero for 20 ms before it is stopped, so there is no edge to hear at either end.
 *
 * The only cancellations in the file are in `start` and `stop`, which happen at "now" in response to a
 * mute, and both go through `rampTo` — which holds the live value before it moves. `start` deliberately
 * glides every chord voice to zero before the first bar is planned, so that a child hammering the M key
 * cannot catch a voice mid-fade and have the next chord change snap it somewhere else.
 *
 * ══ HOW IT IS SCHEDULED ══════════════════════════════════════════════════════════════════════════
 *
 * `scheduleUntil(now, horizon)` is a lookahead: the engine calls it every couple of seconds and it plans
 * whole bars until the next `horizon` seconds are full. Timing comes entirely from the audio clock, so a
 * late or coalesced `setInterval` — a backgrounded tab, a long frame — cannot put a beat in the wrong
 * place. The same call is what lets `measure.ts` render the pad offline in a few milliseconds.
 */

export interface Pad {
  /** Fade the chord in. Bars come from `scheduleUntil`. */
  start(at: number): void;
  /** Fade out and stop planning. Anything already scheduled plays out. */
  stop(at: number): void;
  /** Plan every bar that begins before `now + horizon`. Idempotent with respect to time. */
  scheduleUntil(now: number, horizon: number): void;
  dispose(): void;
}

/* ------------------------------------------------------------------ *\
   Tempo
\* ------------------------------------------------------------------ */

/** 100 bpm in three. A waltz, because a music box nearly always is one, and slow because it is furniture. */
const BEAT = 0.6;
const BAR = BEAT * 3;
/** A chord crossfade. Comfortably shorter than a bar, which is what makes each change land settled. */
const XFADE = 0.55;

/* ------------------------------------------------------------------ *\
   Pitches — F major throughout, twelve-tone equal temperament, exact
\* ------------------------------------------------------------------ */

/**
 * NOTHING IS DETUNED ANYWHERE IN THIS FILE, and that is a decision rather than an omission. The old bed
 * put two oscillators a third of a hertz apart so they would not sum into one synthetic tone. Slow
 * beating is also one of the things that reads as "wrong" to a child who cannot say why, so the life in
 * this bed comes from the breath and from the harmony moving instead.
 */
const P = {
  D2: 73.42,
  F2: 87.31,
  Bb2: 116.54,
  C3: 130.81,

  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  Bb3: 233.08,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,

  G4: 392.0,
  A4: 440.0,
  Bb4: 466.16,
  C5: 523.25,
  D5: 587.33,
  E5: 659.26,
  F5: 698.46,
  G5: 783.99,
  A5: 880.0,
  Bb5: 932.33,
  C6: 1046.5,
  D6: 1174.66,
  E6: 1318.51,
} as const;

type BedName = 'D2' | 'F2' | 'Bb2' | 'C3' | 'F3' | 'G3' | 'A3' | 'Bb3' | 'C4' | 'D4' | 'E4' | 'F4';

/**
 * The twelve sustained voices: four roots in the bass, and the whole F major scale above them, which is
 * every pitch the four chords below can ask for. Weights fall as they rise, so the chord is bottom-heavy
 * and warm rather than a stack of equal sines, which is the sound of a test tone.
 */
const BED: readonly { readonly name: BedName; readonly type: OscillatorType; readonly weight: number }[] = [
  { name: 'D2', type: 'triangle', weight: 0.8 },
  { name: 'F2', type: 'triangle', weight: 0.8 },
  { name: 'Bb2', type: 'triangle', weight: 0.75 },
  { name: 'C3', type: 'triangle', weight: 0.7 },

  { name: 'F3', type: 'sine', weight: 0.5 },
  { name: 'G3', type: 'sine', weight: 0.46 },
  { name: 'A3', type: 'sine', weight: 0.44 },
  { name: 'Bb3', type: 'sine', weight: 0.44 },
  { name: 'C4', type: 'sine', weight: 0.4 },
  { name: 'D4', type: 'sine', weight: 0.38 },
  { name: 'E4', type: 'sine', weight: 0.36 },
  { name: 'F4', type: 'sine', weight: 0.34 },
];

/* ------------------------------------------------------------------ *\
   Harmony
\* ------------------------------------------------------------------ */

interface Chord {
  readonly bass: BedName;
  /** Which sustained voices sound. Chosen for common tones, so the least possible moves between chords. */
  readonly voices: readonly BedName[];
  /**
   * The bag the melody draws from over this chord: the triad plus its sixth or ninth, ascending, eight
   * deep. Adjacent entries are a tone or a third apart and never a semitone, which is what makes a phrase
   * built by stepping through it come out dainty rather than angular.
   */
  readonly melody: readonly number[];
}

type ChordName = 'F' | 'Dm' | 'Bb' | 'C';

const CHORDS: Readonly<Record<ChordName, Chord>> = {
  // I. Root position, doubled at the octave above.
  F: {
    bass: 'F2',
    voices: ['F3', 'A3', 'C4', 'F4'],
    melody: [P.F4, P.A4, P.C5, P.D5, P.F5, P.G5, P.A5, P.C6],
  },
  // vi. Keeps F3 and A3 exactly where the tonic left them; only the top voice moves.
  Dm: {
    bass: 'D2',
    voices: ['F3', 'A3', 'D4'],
    melody: [P.F4, P.A4, P.C5, P.D5, P.F5, P.A5, P.C6, P.D6],
  },
  // IV, second inversion, so F3 is again a common tone and the bass alone carries the change.
  Bb: {
    bass: 'Bb2',
    voices: ['F3', 'Bb3', 'D4', 'F4'],
    melody: [P.F4, P.Bb4, P.C5, P.D5, P.F5, P.G5, P.Bb5, P.D6],
  },
  // V. E4 is the leading tone; it is the reason the chord after this one sounds like an arrival.
  C: {
    bass: 'C3',
    voices: ['G3', 'C4', 'E4'],
    melody: [P.G4, P.C5, P.D5, P.E5, P.G5, P.A5, P.C6, P.E6],
  },
};

/**
 * EVERY ONE OF THESE ENDS ON F. That is the whole of the "does it resolve" guarantee, and it is enforced
 * by the shape of the data rather than by a rule applied on top of it: there is no sequence of draws from
 * this table that leaves the music anywhere but home, and the only joins that can occur between one draw
 * and the next are I→I and I→vi.
 */
const PROGRESSIONS: readonly (readonly ChordName[])[] = [
  ['F', 'Bb', 'C', 'F'], //        I  IV V  I
  ['F', 'Dm', 'Bb', 'C', 'F'], //  I  vi IV V  I
  ['F', 'C', 'Dm', 'Bb', 'F'], //  I  V  vi IV I
  ['Dm', 'Bb', 'C', 'F'], //       vi IV V  I
  ['F', 'Bb', 'Dm', 'C', 'F'], //  I  IV vi V  I
  ['F', 'Dm', 'C', 'F'], //        I  vi V  I
];

/* ------------------------------------------------------------------ *\
   Melody
\* ------------------------------------------------------------------ */

/**
 * A phrase is [beat within the bar, step within the chord's note bag]. Steps, not pitches: the same shape
 * played over a different chord is a different line in the same key, which is most of where the variation
 * comes from without any of it sounding random.
 *
 * They are short on purpose. The longest is five notes and most are three, because "dainty" is a small
 * number of small intervals with air after them, and because a phrase that fits inside one bar leaves the
 * next bar free to be silence.
 */
type Phrase = readonly (readonly [number, number])[];

const PHRASES: readonly Phrase[] = [
  [
    [0, 2],
    [1, 4],
    [2, 5],
  ], // up three, stepping
  [
    [0, 3],
    [0.5, 4],
    [1, 5],
    [2, 4],
  ], // an arch that comes back down
  [
    [0, 5],
    [1.5, 3],
  ], // two notes, a sigh
  [
    [0, 6],
    [1, 4],
    [2, 2],
  ], // down three
  [
    [0, 2],
    [1, 3],
    [1.5, 4],
    [2, 3],
  ], // a lilt around one note
  [[0, 5]], // one bell, on its own
  [
    [0, 1],
    [0.5, 2],
    [1, 3],
    [1.5, 4],
    [2.5, 6],
  ], // a little run
  [
    [0, 4],
    [1, 4],
    [2, 6],
  ], // the same note twice, then up
];

/* ------------------------------------------------------------------ *\
   Levels
\* ------------------------------------------------------------------ */

/**
 * The whole chord layer. The bus already trims the pad to a fifth and darkens it; this is the level at
 * which the harmony is a warmth under the room rather than a thing being played.
 */
const BED_LEVEL = 0.03;
/** The bar breath, as a fraction of full. About 3 dB — felt as time passing rather than heard as a throb. */
const BREATH_LOW = 0.72;
/** One music-box note at full velocity. Deliberately about a ninth of one squelch. */
const NOTE_LEVEL = 0.085;

/* ------------------------------------------------------------------ *\
\* ------------------------------------------------------------------ */

function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

/** Semitones between two frequencies, reduced to one octave. For the tritone guard. */
function interval(a: number, b: number): number {
  return Math.abs(Math.round(12 * Math.log2(a / b))) % 12;
}

export function createPad(ctx: BaseAudioContext, out: AudioNode, rand: Rand = Math.random): Pad {
  /* --- the chord ----------------------------------------------------------------------------- */

  const bedLevel = ctx.createGain();
  bedLevel.gain.value = 0;
  bedLevel.connect(out);

  // The pulse. Everything sustained goes through it; the melody does not, so a note is never ducked by
  // the bar it happens to land on.
  const breath = ctx.createGain();
  breath.gain.value = BREATH_LOW;
  breath.connect(bedLevel);

  // One gentle shelf for the whole bed. STATIC, because a filter that moves on its own is the effect the
  // old version used in place of having any harmony, and it is half of why it sounded like weather.
  const bedTone = ctx.createBiquadFilter();
  bedTone.type = 'lowpass';
  bedTone.frequency.value = 900;
  bedTone.Q.value = 0.5;
  bedTone.connect(breath);

  interface Voice {
    readonly level: GainNode;
    readonly osc: OscillatorNode;
    readonly weight: number;
    /** What the last scheduled ramp is heading for. Read when anchoring the next one. */
    target: number;
  }

  const voices = new Map<BedName, Voice>();
  const started = ctx.currentTime;
  for (const spec of BED) {
    const level = ctx.createGain();
    level.gain.value = 0;
    level.connect(bedTone);

    const osc = ctx.createOscillator();
    osc.type = spec.type;
    osc.frequency.value = P[spec.name];
    osc.connect(level);
    osc.start(started);

    voices.set(spec.name, { level, osc, weight: spec.weight, target: 0 });
  }

  /* --- state --------------------------------------------------------------------------------- */

  const progressionPick = createChooser(PROGRESSIONS.length, rand);
  const phrasePick = createChooser(PHRASES.length, rand);

  let progression: readonly ChordName[] = PROGRESSIONS[0] as readonly ChordName[];
  let progressionAt = PROGRESSIONS.length + 1;
  /** The downbeat of the next bar to plan, on the audio clock. Negative until the first `scheduleUntil`. */
  let nextBar = -1;
  /** Bars of rest still owed before the next phrase. */
  let resting = 0;
  /** Consecutive bars that have had a phrase in them, so a run can be capped at two. */
  let run = 0;
  /** Where the melody left off, as a step in the previous chord's bag, so phrases join up. */
  let lastStep = -1;
  let lastHz = 0;
  let accepting = false;
  let disposed = false;

  /* --- one music-box note -------------------------------------------------------------------- */

  /**
   * A struck bell: a 6 ms rise and then nothing but decay, with three partials over the fundamental that
   * each die faster than the one below them. That ordering is the whole trick — the top of the note is
   * gone in a fifth of a second and leaves a soft hum behind it, which is what a music-box comb does, and
   * what separates "cute" from "chime".
   *
   * The third partial is at 3.01× rather than 3× for a touch of the inharmonicity a struck metal tine
   * has. It cannot beat against anything: there is no 3× partial for it to beat with.
   */
  function bell(at: number, hz: number, level: number): void {
    // High notes ring shorter, as they do on any real struck instrument, and it keeps the top of the
    // melody from smearing into the next bar.
    const decay = clamp(2.1 * (440 / hz) ** 0.55, 0.55, 2.1);

    const g = ctx.createGain();
    g.gain.value = 1;
    g.connect(out);

    // ratio, level, decay scale, attack
    const partials: readonly (readonly [number, number, number, number])[] = [
      [1, 1, 1, 0.006],
      [2, 0.3, 0.42, 0.004],
      [3.01, 0.1, 0.26, 0.004],
      [5.4, 0.05, 0.11, 0.003],
    ];

    let last: OscillatorNode | null = null;
    let lastEnd = 0;
    for (const [ratio, amp, scale, attack] of partials) {
      const peak = level * amp;
      const end = at + attack + decay * scale;

      const pg = ctx.createGain();
      // Exactly zero for the sample the oscillator starts on, so there is no step into the note.
      pg.gain.setValueAtTime(0, at);
      pg.gain.linearRampToValueAtTime(peak, at + attack);
      // Exponential, because that is what a struck thing does, and because it puts the note's whole
      // second half below hearing without ever arriving at a corner.
      pg.gain.exponentialRampToValueAtTime(Math.max(1e-7, peak * 0.0004), end);
      pg.gain.setValueAtTime(0, end + 0.005);
      pg.connect(g);

      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = hz * ratio;
      osc.connect(pg);
      osc.start(at);
      // Stopped 20 ms after its gain has been exactly zero, so the stop cannot be the edge either.
      osc.stop(end + 0.025);
      if (end > lastEnd) {
        lastEnd = end;
        last = osc;
      }
    }

    // One disconnect for the note's whole subtree, on the partial that finishes last.
    if (last) {
      last.onended = () => {
        g.disconnect();
      };
    }
  }

  /* --- planning ------------------------------------------------------------------------------ */

  /** Crossfade the sustained voices to a chord. No cancellation: each ramp starts where the last ended. */
  function setChord(at: number, chord: Chord): void {
    for (const [name, voice] of voices) {
      const on = name === chord.bass || chord.voices.includes(name);
      const next = on ? voice.weight : 0;
      if (next === voice.target) continue;
      // A no-op in value — the previous ramp finished at `at - BAR + XFADE`, which is before `at` — but
      // it is what makes the ramp below start here rather than glide all the way from the last change.
      voice.level.gain.setValueAtTime(voice.target, at);
      voice.level.gain.linearRampToValueAtTime(next, at + XFADE);
      voice.target = next;
    }
  }

  /** The bar's breath. Chained ramps, each picking up exactly where the previous bar's left off. */
  function breathe(at: number): void {
    breath.gain.setValueAtTime(BREATH_LOW, at);
    breath.gain.linearRampToValueAtTime(1, at + BEAT * 0.55);
    breath.gain.linearRampToValueAtTime(BREATH_LOW, at + BAR);
  }

  /**
   * Nudge a step off the one interval in F major that would undo the whole job.
   *
   * The key contains exactly one tritone, B♭ against E, and a line can only meet it across a bar line —
   * a B♭ over the IV chord followed by an E over the V. Six semitones is the interval the ear files under
   * "something is wrong", and a child will not be able to say what happened. So it is stepped around: one
   * place up, then one down, then two, taking the first that is not it.
   */
  function avoidTritone(bag: readonly number[], step: number, previous: number): number {
    if (previous <= 0) return step;
    const at = (s: number): number | null => (s >= 0 && s < bag.length ? (bag[s] as number) : null);
    const here = at(step);
    if (here === null || interval(here, previous) !== 6) return step;
    for (const delta of [1, -1, 2, -2]) {
      const hz = at(step + delta);
      if (hz !== null && interval(hz, previous) !== 6) return step + delta;
    }
    return step;
  }

  /** One bar's worth of tune. */
  function playPhrase(at: number, chord: Chord): void {
    const phrase = PHRASES[phrasePick()] as Phrase;
    const bag = chord.melody;
    const first = phrase[0] as readonly [number, number];

    // Transpose the shape so it starts near wherever the last note left off. This is what turns eight
    // fixed figures into a line: the same phrase is a different set of pitches every time it appears.
    const want =
      lastStep < 0
        ? Math.round(between(rand, 2, 4))
        : clamp(lastStep + Math.round(between(rand, -1.7, 1.7)), 1, bag.length - 3);
    const shift = want - first[1];

    let index = 0;
    for (const [beat, rawStep] of phrase) {
      const stepped = clamp(rawStep + shift, 0, bag.length - 1);
      const step = clamp(avoidTritone(bag, stepped, lastHz), 0, bag.length - 1);
      const hz = bag[step] as number;

      // A music box is mechanical, but not to the millisecond. Eight milliseconds is under the ear's
      // resolution for placement and is the difference between "played" and "clocked".
      const when = at + beat * BEAT + between(rand, -0.008, 0.008);
      // The first note of a phrase leans; the rest give way to it. Higher notes are pulled back a little,
      // because the ear hears them as louder at the same amplitude.
      const lean = index === 0 ? 1 : between(rand, 0.66, 0.88);
      const height = clamp(700 / hz, 0.62, 1);
      bell(when, hz, NOTE_LEVEL * lean * height);

      // Once in a while the first note gets its own octave over the top of it. A glint, well under the
      // pad's own lowpass, and one more reason two hearings of the same phrase are not the same event.
      if (index === 0 && rand() < 0.12 && hz * 2 < 2600) {
        bell(when + 0.02, hz * 2, NOTE_LEVEL * 0.22);
      }

      lastStep = step;
      lastHz = hz;
      index += 1;
    }
  }

  function planBar(at: number): void {
    if (progressionAt >= progression.length) {
      progression = PROGRESSIONS[progressionPick()] as readonly ChordName[];
      progressionAt = 0;
    }
    const name = progression[progressionAt] as ChordName;
    progressionAt += 1;

    const chord = CHORDS[name];
    setChord(at, chord);
    breathe(at);

    if (resting > 0) {
      resting -= 1;
      return;
    }
    playPhrase(at, chord);
    run += 1;
    // Two bars of tune is a phrase and its answer; three would be a song, which this is not allowed to be.
    if (run >= 2 || rand() > 0.34) {
      run = 0;
      resting = 1 + Math.floor(rand() * 3);
      // And now and then it simply stops for a while, which is the thing that keeps it from nagging.
      if (rand() < 0.18) resting += 2;
    }
  }

  return {
    start(at) {
      if (disposed) return;
      accepting = true;

      /**
       * Glide every voice to a known zero FIRST, and only then let bars be planned.
       *
       * This is the case of a child hammering the M key. `stop` leaves the voices fading; if `start`
       * arrived in the middle of that fade and the next chord change anchored itself with
       * `setValueAtTime(voice.target)`, it would be setting a value the param is not currently at — which
       * is a step, which is a click. Going to a known zero through `rampTo`, which holds the live value
       * before it moves, makes that anchor honest again. The first bar cannot be planned sooner than
       * 1.2 s away, so this has always finished before anything reads `target`.
       */
      for (const voice of voices.values()) {
        rampTo(voice.level.gain, at, 0, 0.25);
        voice.target = 0;
      }
      rampTo(breath.gain, at, BREATH_LOW, 0.25);
      // Long enough that nothing is noticed arriving, short enough that unmuting feels answered.
      rampTo(bedLevel.gain, at, BED_LEVEL, 5);

      progressionAt = PROGRESSIONS.length + 1;
      lastStep = -1;
      lastHz = 0;
      run = 0;
    },
    stop(at) {
      if (disposed) return;
      accepting = false;
      nextBar = -1;
      rampTo(bedLevel.gain, at, 0, 2.5);
      for (const voice of voices.values()) {
        rampTo(voice.level.gain, at, 0, 2.0);
        voice.target = 0;
      }
      rampTo(breath.gain, at, BREATH_LOW, 0.5);
    },
    scheduleUntil(now, horizon) {
      if (disposed || !accepting) return;
      if (nextBar < 0) {
        // The first bar waits. A downbeat landing on the same second as a child's first click would be
        // heard arriving, and the first phrase waits two more bars behind that.
        nextBar = now + between(rand, 1.2, 2.6);
        resting = 2 + Math.floor(rand() * 2);
      }
      // A suspended tab freezes the clock. When it thaws, the grid re-anchors to now rather than trying
      // to catch up: the bars that "should" have played are gone, not owed.
      if (nextBar < now) nextBar = now;
      let guard = 0;
      while (nextBar < now + horizon && guard < 512) {
        guard += 1;
        planBar(nextBar);
        nextBar += BAR;
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      accepting = false;
      const now = ctx.currentTime;
      for (const voice of voices.values()) {
        try {
          voice.osc.stop(now);
        } catch {
          // Already stopped, or the context is going away. Teardown cannot fail.
        }
      }
      for (const voice of voices.values()) {
        try {
          voice.osc.disconnect();
          voice.level.disconnect();
        } catch {
          // As above.
        }
      }
      for (const n of [bedTone, breath, bedLevel]) {
        try {
          n.disconnect();
        } catch {
          // As above.
        }
      }
    },
  };
}
