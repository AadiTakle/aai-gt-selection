import { useCallback, useEffect, useRef, useState } from 'react';

import type { Choice } from '../shared/headless/adapt';
import { useQuestionSession } from '../shared/headless/useQuestionSession';
import { loadProgress, recordRound, type Progress } from '../shared/progression';
import type { AgeBand, ExperienceMeta } from '../shared/types';
import { Dialogue } from './poketrainer/Dialogue';
import { Encounter, type Beat } from './poketrainer/Encounter';
import { Party } from './poketrainer/Party';
import { QuestionSlot } from './poketrainer/QuestionSlot';
import { Registration } from './poketrainer/Registration';
import { TrainerHud } from './poketrainer/TrainerHud';
import { Verdict } from './poketrainer/Verdict';
import { useReducedMotion } from './poketrainer/motion';
import { DEFAULT_DIVISION, speciesFor, type Division, type Species } from './poketrainer/roster';
import { Ball } from './poketrainer/sprites';
import './PoketrainerBootcamp.css';

/**
 * Poketrainer Bootcamp: register at the League desk, walk one route, and find out how many Pokémon you
 * would have caught.
 *
 * WHERE THE WORK WENT, AND WHERE IT DELIBERATELY DID NOT. Everything around the question is Pokémon —
 * the desk, the ball ladder that stands in for a grade dropdown, the battle stage, the name box, the
 * throw, the wobble, the dialogue box with its blinking arrow, the trainer card at the end. The question
 * itself is drawn by `poketrainer/QuestionSlot`, which is plain on purpose and is the one piece here
 * meant to be thrown away: a different presentation system is being designed for it, so it sits behind a
 * three-prop contract and nothing outside that file knows anything about how it renders.
 *
 * That split is not only a hand-off convenience. It is why the theming can be this heavy without
 * touching the item: the encounter is one wild Pokémon and the question is the field note you read to
 * catch it, so no facet of any item is ever mapped onto a creature, a colour or a count. Swap the slot
 * and the route is unchanged.
 *
 * WHAT THE APP IS NEVER TOLD. It does not mark anything. `onAnswered` hands back the server's verdict
 * and the only thing done with it is deciding whether a ball clicks shut or springs open. Progress that
 * persists between visits comes from `recordRound`, which is told how many encounters happened and
 * nothing at all about how they went.
 */

export const meta: ExperienceMeta = {
  id: 'poketrainer-bootcamp',
  title: 'Poketrainer Bootcamp',
  world: 'Pokémon',
  band: '4-5',
  pull: 'See how many Pokémon you would catch as a trainer',
  accent: '#e3350d',
};

/** The wild Pokémon on screen, frozen for the length of the encounter so an animation cannot outrun it. */
interface Wild {
  readonly species: Species;
  /** Straight from the engine's difficulty for this item. A harder item is a higher-level Pokémon. */
  readonly level: number;
  readonly no: number;
}

function levelFor(difficulty: number): number {
  return Math.max(2, Math.min(70, Math.round(difficulty)));
}

/** "an Ultra Ball", not "a Ultra Ball". */
function article(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}

export default function PoketrainerBootcamp() {
  const reduced = useReducedMotion();
  const [division, setDivision] = useState<Division | null>(null);
  const [onRoute, setOnRoute] = useState(false);
  const [beat, setBeat] = useState<Beat>('walking');
  const [wild, setWild] = useState<Wild | null>(null);
  const [caught, setCaught] = useState<readonly Species[]>([]);
  const [progress, setProgress] = useState<Progress>(() => loadProgress(meta.id));
  const [earned, setEarned] = useState(0);

  // The answer handler fires from inside the hook with a closure taken before this render's state
  // lands, so anything it needs is mirrored here.
  const wildRef = useRef<Wild | null>(null);
  const lastSpecies = useRef<string | null>(null);
  const threwAt = useRef(0);
  const reducedRef = useRef(reduced);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    reducedRef.current = reduced;
  }, [reduced]);

  useEffect(
    () => () => {
      for (const t of timers.current) window.clearTimeout(t);
    },
    [],
  );

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const clearTimers = useCallback(() => {
    for (const t of timers.current) window.clearTimeout(t);
    timers.current = [];
  }, []);

  const session = useQuestionSession({
    ageBand: division?.band,
    // K-1 gets the shortest route, 2-3 the middle one, the two older divisions the long one. Held on
    // the division rather than branched on here so the desk and the engine cannot disagree.
    precisionIndex: division?.precisionIndex ?? 1,
    onAnswered: ({ correct }) => {
      const met = wildRef.current;
      const quick = reducedRef.current;
      const throwMs = quick ? 260 : 900;
      const holdMs = quick ? 700 : 1500;
      const elapsed = Date.now() - threwAt.current;
      const wait = Math.max(0, throwMs - elapsed);

      later(() => {
        // `correct` is the server's word and the only input to this branch. Anything that is not a
        // clean yes is treated as one that got away, which costs the child nothing either way.
        if (correct === true) {
          setBeat('caught');
          if (met) setCaught((list) => [...list, met.species]);
        } else {
          setBeat('fled');
        }
      }, wait);
      later(() => setBeat('walking'), wait + holdMs);
    },
    onFinished: (result) => {
      const outcome = recordRound(meta.id, result.itemsServed);
      setProgress(outcome.progress);
      setEarned(outcome.currencyEarned);
    },
  });

  const question = session.question;

  /** A new item has arrived and the last one has finished playing out: something new is in the grass. */
  useEffect(() => {
    if (beat !== 'walking' || !question) return;
    const species = speciesFor(question.itemId, lastSpecies.current);
    lastSpecies.current = species.id;
    const next: Wild = { species, level: levelFor(question.difficulty), no: session.asked + 1 };
    wildRef.current = next;
    setWild(next);
    setBeat('encounter');
  }, [beat, question, session.asked]);

  const throwBall = useCallback(
    (choice: Choice) => {
      if (session.busy || beat !== 'encounter') return;
      threwAt.current = Date.now();
      setBeat('throwing');
      void session.answer(choice);
    },
    [beat, session],
  );

  const headOut = useCallback(() => {
    clearTimers();
    lastSpecies.current = null;
    wildRef.current = null;
    setWild(null);
    setCaught([]);
    setBeat('walking');
    setOnRoute(true);
    void session.start();
  }, [clearTimers, session]);

  const backToDesk = useCallback(() => {
    clearTimers();
    lastSpecies.current = null;
    wildRef.current = null;
    setWild(null);
    setCaught([]);
    setBeat('walking');
    setOnRoute(false);
    session.reset();
  }, [clearTimers, session]);

  /* ------------------------------------------------------------- the desk */

  if (!onRoute) {
    return (
      <Registration
        chosen={division}
        onChoose={setDivision}
        onStart={headOut}
        starting={session.phase === 'starting'}
        progress={progress}
        expected={session.expectedItems}
        error={session.phase === 'error' ? session.error : null}
      />
    );
  }

  const kit = division ?? DEFAULT_DIVISION;
  const done = session.phase === 'finished' && session.result !== null && beat === 'walking';

  /* ----------------------------------------------------------- the verdict */

  if (done && session.result) {
    return (
      <Verdict
        caught={caught}
        result={session.result}
        division={kit}
        progress={progress}
        earned={earned}
        onAgain={headOut}
        onDesk={backToDesk}
      />
    );
  }

  /* ------------------------------------------------------------- the route */

  const lines = ((): readonly string[] => {
    if (session.phase === 'error') return ['The Pokégear crackled and cut out.', session.error ?? ''];
    if (session.phase === 'starting') return ['You step off the path into the tall grass…'];
    const name = wild?.species.name ?? 'something';
    switch (beat) {
      case 'encounter':
        return [`A wild ${name.toUpperCase()} appeared!`, 'Read the field note, then throw.'];
      case 'throwing':
        return [`You threw ${article(kit.ballName)} ${kit.ballName}!`];
      case 'caught':
        return [`Gotcha! ${name.toUpperCase()} was caught!`, wild?.species.entry ?? ''];
      case 'fled':
        return [`${name.toUpperCase()} broke free and slipped into the grass.`, 'No harm done. Something else is already rustling.'];
      default:
        return ['You push on through the tall grass…'];
    }
  })();

  return (
    <div className={reduced ? 'pkb still' : 'pkb'}>
      <TrainerHud
        division={kit}
        caughtCount={caught.length}
        encounterNo={wild?.no ?? 1}
        expected={session.expectedItems}
      />

      <Encounter
        species={wild?.species ?? null}
        beat={beat}
        ball={kit.ball}
        level={wild?.level ?? 5}
        reduced={reduced}
      />

      <div className="pkb-lower">
        <div className="pkb-lower-left">
          <Dialogue
            lines={lines}
            tone={beat === 'caught' ? 'good' : beat === 'fled' ? 'soft' : 'route'}
            beat={`${session.phase}-${beat}-${wild?.no ?? 0}`}
          />
          <Party caught={caught} ball={kit.ball} />
        </div>

        {session.phase === 'error' ? (
          <div className="pkb-slotframe">
            <span className="pkb-slotlabel">Pokégear</span>
            <div className="pkb-slot pkb-slot-msg">
              <button type="button" className="pkb-primary" onClick={headOut}>
                <Ball kind={kit.ball} px={22} />
                Try the route again
              </button>
              <button type="button" className="pkb-ghost" onClick={backToDesk}>
                Back to the desk
              </button>
            </div>
          </div>
        ) : (
          <div className="pkb-slotframe">
            <span className="pkb-slotlabel">Field note</span>
            {/*
              THE SWAP POINT. Everything inside this box is `QuestionSlot`, which is plain by design and
              is going to be replaced wholesale. The frame is the app's; the contents are not, and the
              app reads nothing out of them.
            */}
            <div className="pkb-slot">
              {beat === 'encounter' && question ? (
                <QuestionSlot question={question} onAnswer={throwBall} busy={session.busy} />
              ) : (
                <p className="pkb-slot-wait">
                  {beat === 'throwing' || beat === 'caught' || beat === 'fled'
                    ? 'The ball is in the air…'
                    : 'Walking on…'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
