import { rampTo } from './bus';
import { between, createChooser, jitter, type Rand } from './variation';

/**
 * THE AMBIENCE. "Very soft ambient music", and the owner meant it, so the design question is not what it
 * should play but how little it can play and still be there.
 *
 * ══ WHAT IT IS ═══════════════════════════════════════════════════════════════════════════════════
 *
 * Two parts, and neither of them is a tune:
 *
 *   · A DRONE. Two triangles a slow beat apart at the root, an octave apart, behind a lowpass that drifts
 *     between 380 and 620 Hz on a 40-second cycle. Continuous, at a fiftieth of full scale. This is the
 *     part that makes the ranch feel warm rather than empty, and it is below the level at which anyone
 *     will identify it as music.
 *   · SWELLS. Every 8 to 16 seconds, one note from an F major pentatonic, over four octaves, with a 4-
 *     second attack and a 6-second release. Sometimes a fifth above it at the same time, so a chord
 *     happens now and then without anything being a chord progression.
 *
 * ══ WHY IT CANNOT LOOP AUDIBLY ════════════════════════════════════════════════════════════════════
 *
 * There is nothing to loop. The gaps are random in a range, the pitches are drawn by a chooser that never
 * repeats a note consecutively, the attack and release lengths are jittered per note, and the drone's
 * filter cycle (40 s) is not a whole multiple of anything else. Nothing in here has a period, so there is
 * no period to recognise — which is a stronger guarantee than a long loop, and it costs less.
 *
 * ══ WHY NO BEAT AND NO MELODY ════════════════════════════════════════════════════════════════════
 *
 * A beat entrains attention, and this game is played next to an adaptive assessment: a pulse would be
 * setting a tempo for a child's thinking, which is the last thing a measurement of their reasoning wants
 * near it. And a melody, unlike a drone, is something you can find yourself listening TO. So: attacks
 * measured in seconds so no note has an onset, pentatonic so no two pitches can clash however they land,
 * and no rhythmic relationship between any two events.
 *
 * F MAJOR PENTATONIC, low, is the golden-hour part. It has no semitones in it at all, which is why it
 * cannot sound anxious, and F rather than C because the whole set then sits under the squelches (whose
 * energy is 300–1500 Hz) rather than in among them.
 *
 * ══ HOW IT IS SCHEDULED ══════════════════════════════════════════════════════════════════════════
 *
 * `scheduleUntil(now, horizon)` is a lookahead: the engine calls it every couple of seconds and it fills
 * in any notes that fall inside the next `horizon` seconds. Timing therefore comes entirely from the
 * audio clock and a late or coalesced `setInterval` — a backgrounded tab, a long frame — cannot make a
 * note land in the wrong place. The same call is what lets `measure.ts` render fifteen seconds of pad
 * offline in a few milliseconds: it is handed a whole window at once instead of being fed by a timer.
 */

export interface Pad {
  /** Fade the drone in. Notes come from `scheduleUntil`. */
  start(at: number): void;
  /** Fade the drone out and stop accepting notes. Anything already scheduled plays out its release. */
  stop(at: number): void;
  /** Fill in every note that begins before `now + horizon`. Idempotent with respect to time. */
  scheduleUntil(now: number, horizon: number): void;
  dispose(): void;
}

/** F major pentatonic — F G A C D — over four octaves. No semitones anywhere in the set. */
const NOTES: readonly number[] = [
  87.31, 98.0, 110.0, 130.81, 146.83,
  174.61, 196.0, 220.0, 261.63, 293.66,
  349.23, 392.0, 440.0,
];

const ROOT = 87.31;
const DRONE_LEVEL = 0.02;
/** Per swell. Deliberately about a fifth of one squelch. */
const NOTE_LEVEL = 0.075;

export function createPad(ctx: BaseAudioContext, out: AudioNode, rand: Rand = Math.random): Pad {
  /* --- the drone ----------------------------------------------------------------------------- */

  const droneLevel = ctx.createGain();
  droneLevel.gain.value = 0;
  droneLevel.connect(out);

  const droneTone = ctx.createBiquadFilter();
  droneTone.type = 'lowpass';
  droneTone.frequency.value = 500;
  droneTone.Q.value = 0.4;
  droneTone.connect(droneLevel);

  // The drift. 0.025 Hz is a 40-second cycle: slow enough that it is a change in the weather rather than
  // an effect, and prime to nothing else in the file.
  const drift = ctx.createOscillator();
  drift.type = 'sine';
  drift.frequency.value = 0.025;
  const driftDepth = ctx.createGain();
  driftDepth.gain.value = 120;
  drift.connect(driftDepth);
  driftDepth.connect(droneTone.frequency);

  const droneA = ctx.createOscillator();
  droneA.type = 'triangle';
  // A third of a hertz apart from perfect, which is a beat every three seconds. Two exactly-tuned
  // oscillators sum to one louder oscillator and sound synthetic; this is what makes it breathe.
  droneA.frequency.value = ROOT;
  droneA.connect(droneTone);

  const droneB = ctx.createOscillator();
  droneB.type = 'triangle';
  droneB.frequency.value = ROOT * 2 + 0.33;
  const droneBGain = ctx.createGain();
  droneBGain.gain.value = 0.4;
  droneB.connect(droneBGain);
  droneBGain.connect(droneTone);

  const started = ctx.currentTime;
  drift.start(started);
  droneA.start(started);
  droneB.start(started);

  /* --- the swells ---------------------------------------------------------------------------- */

  const notePick = createChooser(NOTES.length, rand);
  /** When the next swell begins, on the audio clock. Set on the first `scheduleUntil`. */
  let nextAt = -1;
  let accepting = false;
  let disposed = false;

  /**
   * One swell. Three oscillators — two detuned triangles and a sine an octave down — behind a lowpass
   * placed relative to the note's own pitch, so a high note is not brighter than a low one, it is just
   * higher. Attack and release in seconds, with no sustain segment at all: the note is nothing but a rise
   * and a fall, which is why it has no onset to hear.
   */
  function swell(at: number, hz: number, levelScale: number): void {
    const attack = between(rand, 3.4, 5.2);
    const release = between(rand, 5.0, 7.5);
    const end = at + attack + release;

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(NOTE_LEVEL * levelScale, at + attack);
    g.gain.exponentialRampToValueAtTime(0.00002, end);
    g.gain.setValueAtTime(0, end + 0.01);
    g.connect(out);

    const tone = ctx.createBiquadFilter();
    tone.type = 'lowpass';
    tone.frequency.setValueAtTime(hz * 2.2 + 260, at);
    // Opens a little as it swells and closes as it goes, which is what a sound moving towards you and
    // away again does. It is the only movement in the note.
    tone.frequency.linearRampToValueAtTime(hz * 3.4 + 320, at + attack);
    tone.frequency.linearRampToValueAtTime(hz * 1.8 + 200, end);
    tone.Q.value = 0.3;
    tone.connect(g);

    const detune = jitter(rand, 0.002);
    const a = ctx.createOscillator();
    a.type = 'triangle';
    a.frequency.value = hz * detune;
    a.connect(tone);

    const b = ctx.createOscillator();
    b.type = 'triangle';
    b.frequency.value = hz / detune;
    const bGain = ctx.createGain();
    bGain.gain.value = 0.6;
    b.connect(bGain);
    bGain.connect(tone);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.value = hz / 2;
    const subGain = ctx.createGain();
    subGain.gain.value = 0.45;
    sub.connect(subGain);
    subGain.connect(tone);

    for (const osc of [a, b, sub]) {
      osc.start(at);
      osc.stop(end + 0.05);
    }
    // One disconnect for the note's whole subtree, on the last oscillator to finish.
    sub.onended = () => {
      g.disconnect();
    };
  }

  return {
    start(at) {
      if (disposed) return;
      accepting = true;
      // Twelve seconds to fade the drone in. Nothing about this should be noticed arriving.
      rampTo(droneLevel.gain, at, DRONE_LEVEL, 12);
    },
    stop(at) {
      if (disposed) return;
      accepting = false;
      nextAt = -1;
      rampTo(droneLevel.gain, at, 0, 3);
    },
    scheduleUntil(now, horizon) {
      if (disposed || !accepting) return;
      // The first swell waits: a pad note landing on the same second as the child's first click would be
      // heard arriving, which is the one thing it must not be.
      if (nextAt < 0) nextAt = now + between(rand, 6, 11);
      let guard = 0;
      while (nextAt < now + horizon && guard < 32) {
        guard += 1;
        const at = Math.max(nextAt, now);
        const hz = NOTES[notePick()] as number;
        swell(at, hz, 1);
        // A fifth above, a quarter of the time, entering a moment later so the two are not one sound.
        if (rand() < 0.25) swell(at + between(rand, 0.4, 1.6), hz * 1.5, 0.6);
        nextAt += between(rand, 8, 16);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      accepting = false;
      const now = ctx.currentTime;
      for (const osc of [drift, droneA, droneB]) {
        try {
          osc.stop(now);
        } catch {
          // Already stopped, or the context is going away. Teardown cannot fail.
        }
      }
      for (const n of [droneLevel, droneTone, drift, driftDepth, droneA, droneB, droneBGain]) {
        try {
          n.disconnect();
        } catch {
          // As above.
        }
      }
    },
  };
}
