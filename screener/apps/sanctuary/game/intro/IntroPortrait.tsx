import { useEffect, useRef, useState, type JSX } from 'react';

import { HeadphonePrompt } from '../audio';
import { hushSpeech, narrate, type NarrationState } from '../screener/speak';
import { usePrefersReducedMotion } from '../world/motion';
import { ControlGlyph } from './Glyphs';
import { Nan } from './Nan';
import { requestSkip } from './signals';
import { useIntroView } from './store';
import './intro.css';

/**
 * NAN, HER LINE, AND NOTHING ELSE ON SCREEN.
 *
 * ══ NON-OBSTRUCTIVE, AND WHAT THAT HAD TO MEAN IN PRACTICE ════════════════════════════════════════
 *
 * The brief is explicit and every clause of it is a constraint on this file:
 *
 *   IT DOES NOT PAUSE THE GAME. Nothing here touches the canvas, the pointer lock or any key. The child
 *   keeps walking, looking and hoovering through every word she says, which is the entire point of a
 *   portrait-only character: there is nobody to wait for.
 *
 *   IT DOES NOT CAPTURE THE POINTER AND DOES NOT SWALLOW CLICKS. The whole layer is
 *   `pointer-events: none`, set on the root in `intro.css` and never overridden except on ONE element —
 *   the adult's skip control, which is a real button and has to be pressable. Everything else, including
 *   the card and the portrait, is transparent to the mouse. That matters more here than anywhere else in
 *   the game because the vacpack fires on a plain click anywhere on the canvas: a dialogue box that ate
 *   clicks would stop a child hoovering while being told how to hoover.
 *
 *   IT DOES NOT REQUIRE DISMISSAL. There is no next, no close, no OK. Lines arrive, are spoken, and
 *   leave on their own.
 *
 *   IT IS OUT OF THE WAY. Bottom left, above `game.css`'s own HUD strip, and clear of the top-centre band
 *   `.bh-beat-slim` uses and the top corners the purse and the mute button take. The middle of the screen
 *   — where the crosshair is, where a station's panel is, where everything a child aims at happens — is
 *   never covered by anything in this file.
 *
 * ══ THE TEXT IS NOT THE INSTRUCTION ═══════════════════════════════════════════════════════════════
 *
 * A five-year-old cannot read it. It is for the adult over their shoulder, and it is deliberately
 * phrased as something to read aloud rather than as a caption. The child is carried by three other
 * things, all of which happen at the same moment: Nan's voice through `speak.ts`, the drawn control
 * picture beside her, and the light on the ground in the world. If any instruction ever exists only in
 * this string, it has not been given.
 */

export function IntroPortrait(): JSX.Element | null {
  const view = useIntroView();
  const reduced = usePrefersReducedMotion();
  const [narration, setNarration] = useState<NarrationState>('idle');
  const [locked, setLocked] = useState(false);
  /** The last `say` that was actually spoken, so a line held back while quiet is said afterwards. */
  const spoken = useRef(-1);

  useEffect(() => {
    const onChange = (): void => setLocked(!!document.pointerLockElement);
    document.addEventListener('pointerlockchange', onChange);
    return () => document.removeEventListener('pointerlockchange', onChange);
  }, []);

  /**
   * Say it.
   *
   * Held back entirely while `quiet` — see the note on that field in `store.ts`; the cost of talking over
   * the verbal station is that the station's story is cancelled. When quiet lifts, whatever she was going
   * to say is said then, which is why this keys off a remembered `say` rather than off a transition.
   *
   * ══ QUIET DEFERS. IT MUST NEVER DROP ══════════════════════════════════════════════════════════════
   *
   * A line that is skipped because the queue was busy has failed exactly as completely as a line that was
   * never written: the words sit on screen for a child who cannot read them and nothing is ever said. So
   * both of the ways that could happen are closed, and neither of them is in this effect alone.
   *
   *   A LINE ISSUED DURING A SILENCE is not marked as spoken and `view.quiet` is in the dependency list,
   *   so the effect runs again the moment quiet lifts and says it then. That is this file's half.
   *
   *   A LINE SUPERSEDED DURING A SILENCE cannot happen, because the tour's clock does not run while quiet
   *   — see `useAttentionClock` in `IntroGuide.tsx`. There is only ever one line waiting, which is the
   *   most this can hold: all it has is the current `say`.
   *
   * And a line CUT OFF by a silence starting mid-sentence is put back rather than counted as said. The
   * mark is cleared, so quiet lifting says it again from the beginning. Half a sentence delivered to a
   * child who was looking at a station at the time is not a line they have heard, and she is repeating
   * herself to nobody: the only listener is the child who just walked away from whatever interrupted her.
   */
  useEffect(() => {
    if (view.quiet) {
      if (narration === 'speaking') {
        hushSpeech();
        setNarration('idle');
        spoken.current = -1;
      }
      return;
    }
    if (!view.line || view.say === spoken.current) return;
    spoken.current = view.say;
    narrate([view.line], setNarration);
    // `narration` is deliberately absent: including it would re-run this on every state the narration
    // reports and re-say the line the moment it finished.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view.say, view.line, view.quiet]);

  /** Nothing left to say and nothing being said: leave the screen entirely. */
  useEffect(() => () => hushSpeech(), []);

  const showCard = view.line.length > 0;
  const speaking = narration === 'speaking' && !view.quiet;

  return (
    <>
      {/*
        Headphones, for the board's own verbal items.
        `Game.tsx` raises this for the three stations, keyed off which station is engaged — which cannot
        see this board, because this board is not one of its `SITES`. So the same component is raised here
        on the same condition: the moment a Verbal round starts, and before a word of it is spoken. The two
        can never be up at once, because a station and this board are 17 metres apart and each holds the
        keeper while it is engaged.
      */}
      <HeadphonePrompt during={view.boardSpeaking} />

      <div className="nb-layer" aria-live="polite">
        {showCard ? (
          <div className={`nb-nan${view.quiet ? ' nb-nan-quiet' : ''}`} key="nan">
            <div className="nb-face">
              <Nan speaking={speaking} reduced={reduced} />
            </div>
            <div className="nb-card">
              <p className="nb-name">Nan Bramble</p>
              <p className="nb-line">{view.line}</p>
              <ControlGlyph glyph={view.glyph} />
            </div>
          </div>
        ) : null}

        {/*
          THE WAY OUT, and the one pressable thing in this file.

          Only while the pointer is free, which is the only time there is a cursor to press it with, and
          only while the tour still has something left to do. It is worded and sized for an adult on
          purpose: the child's way past every step is that every step times out on its own, so nobody has
          to find this to avoid being stuck. It is here for the parent who has seen the tour before.

          It is not a mechanic and it is not on the child's path — pressing Escape to reach it is exactly
          the interaction this game has already ruled out for gameplay, which is why nothing a child needs
          is ever behind it.
        */}
        {!view.settled && !locked ? (
          <button type="button" className="nb-skip" onClick={requestSkip}>
            Skip the tour
          </button>
        ) : null}
      </div>
    </>
  );
}
