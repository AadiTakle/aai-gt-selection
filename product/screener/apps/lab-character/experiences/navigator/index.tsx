import { Component, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ErrorInfo, ReactNode, RefObject } from 'react';

import type { ExperienceProps } from '../../shared/experience';
import type { Skin } from '../../shared/glyphs';
import { ItemStage, RENDERABLE_TYPES } from '../../shared/ItemStage';
import { useScreenerSession } from '../../shared/useScreenerSession';

import './styles.css';

/**
 * SHIP'S NAVIGATOR — band 4-5.
 *
 * The pull is being needed. Three crew hail the child, defer to their calls and react to them; the
 * ship advances along a named route as the voyage runs and makes port at the end. Every item is one
 * console reading. Reactions land per LEG of three readings, never per reading, and never say
 * anything about whether a call was the one the bank wanted — a leg report is earned by turning up.
 *
 * Art direction lives in two places: this file's SKIN, which redraws the bank's abstract shapes as
 * console instrumentation, and styles.css, which is the dim bridge around it.
 */

/* -------------------------------------------------------------------------- */
/* the console skin                                                            */
/* -------------------------------------------------------------------------- */

/**
 * The bank names colours `teal | violet | blue | coral | gold | ink`. None of those are in the
 * shared default palette, so every one of them is remapped here.
 *
 * Six hues far apart in both hue and value, because several item types make colour the rule and a
 * child cannot read a rule they cannot separate.
 *
 * Deliberately MID-TONE rather than full phosphor. The reading sits on dark glass (see styles.css),
 * which the world reaches by restating the renderers' own documented ink and surface properties — and
 * if one of those names ever drifts, a mark at this value is still legible on a bright surface. The
 * palette is the fallback plan as well as the palette.
 */
const CONSOLE_COLORS: Record<string, string> = {
  teal: '#24b8a6',
  blue: '#4f8ce8',
  violet: '#9575e0',
  coral: '#ef6a52',
  gold: '#d9a232',
  ink: '#8fa8b4',
  // the shared palette's own names, in case a renderer passes them through
  crimson: '#ef6a52',
  amber: '#d9a232',
  indigo: '#4f8ce8',
  lime: '#8cc63f',
  slate: '#8fa8b4',
  rose: '#e8779b',
};

const STROKE = 7;

/**
 * Every abstract shape, drawn as something a navigation console would actually put on glass:
 * position fixes, waypoint marks, range rings, bearing arrows, depth traces. Silhouettes are kept
 * deliberately far apart, because a shape-rule item is only solvable if its shapes are separable.
 */
function consoleGlyph(shape: string, c: string): ReactNode | undefined {
  const line = {
    fill: 'none',
    stroke: c,
    strokeWidth: STROKE,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };

  switch (shape) {
    // position fix — crosshair with a lit core
    case 'star':
      return (
        <g>
          <path {...line} d="M50 8V30M50 70V92M8 50H30M70 50H92" />
          <circle cx="50" cy="50" r="13" fill={c} />
          <path {...line} strokeWidth={4} opacity={0.6} d="M24 24 33 33M76 24 67 33M24 76 33 67M76 76 67 67" />
        </g>
      );

    // waypoint beacon
    case 'pentagon':
      return (
        <g>
          <path {...line} d="M50 10 88 38 74 84H26L12 38Z" />
          <path fill={c} d="M50 34 68 47 61 68H39L32 47Z" />
        </g>
      );

    // range ring
    case 'circle':
      return (
        <g>
          <circle {...line} cx="50" cy="50" r="38" />
          <circle cx="50" cy="50" r="11" fill={c} />
          <path {...line} strokeWidth={5} opacity={0.55} d="M50 4V16M50 84V96M4 50H16M84 50H96" />
        </g>
      );

    // sector plate
    case 'square':
      return (
        <g>
          <rect {...line} x="16" y="16" width="68" height="68" rx="4" />
          <path fill={c} d="M34 34H66V66H34Z" opacity={0.9} />
        </g>
      );

    // bearing arrow
    case 'triangle':
      return (
        <g>
          <path {...line} d="M50 10 88 84H12Z" />
          <path fill={c} d="M50 34 74 78H26Z" />
        </g>
      );

    // channel mark
    case 'diamond':
      return (
        <g>
          <path {...line} d="M50 8 88 50 50 92 12 50Z" />
          <path fill={c} d="M50 30 68 50 50 70 32 50Z" />
        </g>
      );

    // relay node
    case 'hexagon':
      return (
        <g>
          <path {...line} d="M50 8 87 29V71L50 92 13 71V29Z" />
          <path fill={c} d="M50 30 72 42V64L50 76 28 64V42Z" opacity={0.92} />
        </g>
      );

    // set and drift
    case 'chevron':
      return (
        <g>
          <path {...line} d="M16 34 50 60 84 34" />
          <path {...line} strokeWidth={5} opacity={0.65} d="M16 62 50 84 84 62" />
        </g>
      );

    // power surge trace
    case 'bolt':
      return (
        <g>
          <path {...line} d="M62 6 32 50H50L40 94" />
          <path {...line} strokeWidth={4} opacity={0.5} d="M74 10 66 22M78 84 68 76" />
        </g>
      );

    // signal mast
    case 'flag':
      return (
        <g>
          <path {...line} d="M26 10V92" />
          <path fill={c} d="M32 16 82 30 32 46Z" />
          <path {...line} strokeWidth={5} opacity={0.6} d="M32 58 62 66 32 74Z" />
        </g>
      );

    // sweep arc
    case 'crescent':
      return (
        <g>
          <path {...line} d="M74 16A44 44 0 1 0 74 84" />
          <path {...line} strokeWidth={5} opacity={0.55} d="M58 32A26 26 0 1 0 58 68" />
          <circle cx="78" cy="50" r="8" fill={c} />
        </g>
      );

    // gyre
    case 'spiral':
      return (
        <g>
          <path {...line} d="M50 50a12 12 0 1 1 12 12 26 26 0 1 1-26-26 40 40 0 1 1 40 40" />
          <circle cx="50" cy="50" r="5" fill={c} />
        </g>
      );

    // shoal cluster
    case 'trefoil':
      return (
        <g>
          <circle {...line} strokeWidth={6} cx="50" cy="27" r="16" />
          <circle {...line} strokeWidth={6} cx="27" cy="70" r="16" />
          <circle {...line} strokeWidth={6} cx="73" cy="70" r="16" />
          <circle cx="50" cy="27" r="5" fill={c} />
        </g>
      );

    // depth trace
    case 'zigzag':
      return (
        <g>
          <path {...line} d="M8 66 30 28 50 66 70 28 92 66" />
          <path {...line} strokeWidth={3} opacity={0.4} d="M8 88H92" />
        </g>
      );

    // sounding lead
    case 'teardrop':
      return (
        <g>
          <path {...line} strokeWidth={4} opacity={0.55} d="M50 6V26" />
          <path fill={c} d="M50 22C66 44 78 56 78 66A28 28 0 1 1 22 66C22 56 34 44 50 22Z" />
        </g>
      );

    // drift vane
    case 'leaf':
      return (
        <g>
          <path {...line} d="M50 10C78 30 84 60 50 92 16 60 22 30 50 10Z" />
          <path {...line} strokeWidth={5} opacity={0.7} d="M50 22V80" />
        </g>
      );

    // cargo module
    case 'cube':
      return (
        <g>
          <path {...line} d="M50 10 86 30V70L50 90 14 70V30Z" />
          <path {...line} strokeWidth={5} opacity={0.7} d="M14 30 50 50 86 30M50 50V90" />
          <circle cx="50" cy="34" r="6" fill={c} />
        </g>
      );

    default:
      return undefined;
  }
}

const CONSOLE_SKIN: Skin = {
  id: 'navigator-console',
  color: (name) => CONSOLE_COLORS[name] ?? CONSOLE_COLORS.teal!,
  draw: (shape, fill) => consoleGlyph(shape, fill),
};

/* -------------------------------------------------------------------------- */
/* voyage copy                                                                 */
/* -------------------------------------------------------------------------- */

type CrewId = 'helm' | 'signals' | 'engine';

const CREW: { id: CrewId; station: string; name: string }[] = [
  { id: 'helm', station: 'HELM', name: 'R. RUIZ' },
  { id: 'signals', station: 'SIGNALS', name: 'T. OKONJO' },
  { id: 'engine', station: 'ENGINE ROOM', name: 'B. VANCE' },
];

const CREW_BY_ID: Record<CrewId, { station: string; name: string }> = {
  helm: { station: 'HELM', name: 'RUIZ' },
  signals: { station: 'SIGNALS', name: 'OKONJO' },
  engine: { station: 'ENGINE ROOM', name: 'VANCE' },
};

/** One hail per reading. They ask, they defer, they wait on the call. None of them evaluates it. */
const HAILS: { crew: CrewId; line: string }[] = [
  { crew: 'signals', line: 'New reading on your console. I can log the marks, I cannot read them. What is it telling us?' },
  { crew: 'helm', line: 'Wheel is yours. Give me the mark and I will bring her round to it.' },
  { crew: 'engine', line: 'Holding revolutions until you call this one. No rush from down here.' },
  { crew: 'signals', line: 'Second trace came through cleaner than the first. Same question for you.' },
  { crew: 'helm', line: 'I have options in front of me and no way to choose between them. Your call, Navigator.' },
  { crew: 'engine', line: 'The last navigator used to talk us through these. You do not have to. Just call it.' },
  { crew: 'signals', line: 'Console is steady. Take as long as this one needs — I will log whatever you say.' },
  { crew: 'helm', line: 'Captain is asleep. This one is between you, me and the chart.' },
  { crew: 'engine', line: 'Whatever heading comes back, I can hold it all night.' },
  { crew: 'signals', line: 'Another mark up. You are the only one aboard who reads these.' },
];

/** Waypoints, bow to stern of the voyage. The ship makes for the next unlit one. */
const WAYPOINTS = ['MOORING', 'SHOAL GATE', 'THE NARROWS', 'OPEN WATER', 'CAPE SILT', 'PORT KESSEL'];

const READINGS_PER_LEG = 3;
const LEGS = WAYPOINTS.length - 1;

/** The reaction, once per leg. Earned by reading the leg through, and nothing else. */
const LEG_REPORTS: { crew: CrewId; line: string }[] = [
  { crew: 'helm', line: 'Ruiz took all three of your marks without asking twice. We are through the shoal gate.' },
  { crew: 'signals', line: 'Okonjo says the console is easier to feed now that somebody aboard is reading it. The Narrows are behind us.' },
  { crew: 'engine', line: 'Vance has the revolutions up, because you have kept us moving all watch. Open water on the bow.' },
  { crew: 'helm', line: 'Ruiz has stopped checking the chart against your headings. Cape Silt is off the beam.' },
  { crew: 'signals', line: 'The bridge has gone quiet, the way it does when a crew trusts its navigator. Harbour lights ahead.' },
];

const TYPE_LABELS: Record<string, string> = {
  'FLU-MATRIX-01': 'PLOT TABLE',
  'FLU-CARPET-01': 'SIGNAL BAND',
  'FLU-OPCHAIN-01': 'TRANSFORM CHAIN',
  'QUANT-SERIES-01': 'SOUNDING RUN',
  'QUANT-FUNC-01': 'CONVERSION UNIT',
  'QUANT-BALANCE-01': 'TRIM SCALE',
  'QUANT-DOTS-01': 'TALLY BOARD',
  'SPA-XFORM-01': 'CHART OVERLAY',
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/* -------------------------------------------------------------------------- */
/* fitting a reading to the glass                                              */
/* -------------------------------------------------------------------------- */

/** Below this the tap targets inside a reading would stop being comfortable, so it never goes lower. */
const MIN_FIT = 0.82;

/**
 * The plate is a fixed screen, not a box that resizes per question — a console does not change shape
 * between readings, and a stable frame is what lets one reading dissolve into the next.
 *
 * Some item types are drawn taller than the glass on a laptop. Rather than let a child scroll to
 * find the choices, the reading is scaled to fit. Layout height is measured, never the transformed
 * height, so there is no feedback loop, and this animates nothing: it is one transform applied
 * before the frame is painted.
 */
function useFitToGlass(itemId: string | undefined) {
  const glass = useRef<HTMLDivElement | null>(null);
  const reading = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState(1);

  useLayoutEffect(() => {
    const outer = glass.current;
    const inner = reading.current;
    if (!outer || !inner) return;

    let raf = 0;
    const measure = () => {
      const avail = outer.clientHeight;
      const natural = inner.offsetHeight;
      if (!avail || !natural) return;
      const next = Math.min(1, Math.max(MIN_FIT, avail / natural));
      setFit((prev) => (Math.abs(prev - next) < 0.004 ? prev : next));
    };

    const ro = new ResizeObserver(() => {
      window.cancelAnimationFrame(raf);
      raf = window.requestAnimationFrame(measure);
    });
    ro.observe(outer);
    ro.observe(inner);
    measure();

    return () => {
      ro.disconnect();
      window.cancelAnimationFrame(raf);
    };
  }, [itemId]);

  return { glass, reading, fit };
}

/* -------------------------------------------------------------------------- */
/* a reading that cannot be drawn                                              */
/* -------------------------------------------------------------------------- */

/**
 * A renderer chunk that fails to load throws inside Suspense, which would otherwise blank the
 * bridge. In this world that is a smeared panel the child logs by hand and moves past: no dead end,
 * and the shared notice's own wording — which judges the child's answers — never has to appear.
 */
class PanelFault extends Component<{ onPast: () => void; children: ReactNode }, { faulted: boolean }> {
  constructor(props: { onPast: () => void; children: ReactNode }) {
    super(props);
    this.state = { faulted: false };
  }

  static getDerivedStateFromError(): { faulted: boolean } {
    return { faulted: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Worth a console line for whoever is building the renderer, and nothing for the child.
    console.warn('[navigator] a reading could not be drawn', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.faulted) {
      return <SmearedPanel onPast={this.props.onPast} />;
    }
    return this.props.children;
  }
}

function SmearedPanel({ onPast }: { onPast: () => void }) {
  return (
    <div className="nv-smear" role="group" aria-label="Unreadable panel">
      <p className="nv-smear-code">PANEL 07 — SIGNAL SMEARED</p>
      <p className="nv-smear-copy">
        Salt on the glass. Nothing you called is affected. Log this one by hand and we will carry on.
      </p>
      <button type="button" className="nv-btn" onClick={onPast}>
        Log it by hand
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* the world                                                                   */
/* -------------------------------------------------------------------------- */

type Act = 'hail' | 'voyage' | 'arrival';

export default function Navigator({ onExit }: ExperienceProps) {
  const s = useScreenerSession({ band: '4-5', precisionIndex: 2, settleMs: 900 });
  const [act, setAct] = useState<Act>('hail');
  const [leg, setLeg] = useState<number | null>(null);
  const legsShown = useRef(0);
  const legButton = useRef<HTMLButtonElement | null>(null);

  const answered = s.answeredCount;

  const takeConsole = useCallback(() => {
    setAct('voyage');
    void s.start();
  }, [s]);

  const bringBackUp = useCallback(() => {
    legsShown.current = 0;
    setLeg(null);
    s.reset();
    setAct('voyage');
    void s.start();
  }, [s]);

  // A leg closes every third reading. The overlay covers the reading column while the next one
  // loads behind it, so the child never sees a question flick past under a report.
  useEffect(() => {
    const closed = Math.floor(answered / READINGS_PER_LEG);
    if (closed > legsShown.current && s.phase !== 'done' && s.phase !== 'error') {
      legsShown.current = closed;
      setLeg(closed);
    }
  }, [answered, s.phase]);

  useEffect(() => {
    if (s.phase === 'done') {
      setLeg(null);
      setAct('arrival');
    }
  }, [s.phase]);

  useEffect(() => {
    if (leg !== null) legButton.current?.focus();
  }, [leg]);

  // Progress is distance covered for turning up: it counts readings logged, not anything about them.
  const progress = useMemo(() => {
    if (act === 'arrival') return 1;
    return Math.min(0.94, answered / (READINGS_PER_LEG * LEGS));
  }, [act, answered]);

  const passed = Math.min(LEGS, Math.floor(progress * LEGS + 0.001));
  const making = act === 'arrival' ? WAYPOINTS[LEGS]! : WAYPOINTS[Math.min(LEGS, passed + 1)]!;

  const hail = HAILS[answered % HAILS.length]!;
  const speaker: CrewId = leg !== null ? (LEG_REPORTS[Math.min(leg, LEG_REPORTS.length) - 1]?.crew ?? 'signals') : hail.crew;
  const liveCrew: CrewId | null =
    act !== 'voyage' ? null : s.phase === 'error' ? 'signals' : speaker;

  const serve = s.serve;
  const kind = serve ? (TYPE_LABELS[serve.typeCode] ?? 'CONSOLE READING') : null;
  const drawable = serve ? RENDERABLE_TYPES.includes(serve.typeCode) : false;

  const skipReading = useCallback(() => {
    void s.answer('A');
  }, [s]);

  const { glass, reading, fit } = useFitToGlass(serve?.served.itemId);

  return (
    <div className="nv-root" data-act={act}>
      <div className="nv-grain" aria-hidden="true" />

      <header className="nv-top">
        <p className="nv-ident">
          <span className="nv-ident-ship">MV ALDEBARAN</span>
          <span className="nv-ident-sep" aria-hidden="true" />
          <span>NORTHERN LINE</span>
          <span className="nv-ident-sep" aria-hidden="true" />
          <span className="nv-ident-dim">NIGHT WATCH</span>
        </p>
        <button type="button" className="nv-btn nv-btn--ghost" onClick={onExit}>
          Leave the bridge
        </button>
      </header>

      <aside className="nv-crew" aria-label="Bridge crew">
        <p className="nv-cap">BRIDGE CREW</p>
        <ul className="nv-crew-list">
          {CREW.map((c) => (
            <li key={c.id} className={`nv-crewman${liveCrew === c.id ? ' is-live' : ''}`}>
              <span className="nv-crew-dot" aria-hidden="true" />
              <span className="nv-crew-station">{c.station}</span>
              <span className="nv-crew-name">{c.name}</span>
            </li>
          ))}
        </ul>

        <div className="nv-comm" aria-live="polite">
          {act === 'hail' && (
            <p className="nv-comm-line" key="standby">
              <span className="nv-comm-who">ALL STATIONS</span>
              Standing by for a navigator.
            </p>
          )}
          {act === 'voyage' && s.phase === 'error' && (
            <p className="nv-comm-line" key="lost">
              <span className="nv-comm-who">OKONJO</span>
              I have lost the feed at my end as well. Nothing to do with you.
            </p>
          )}
          {act === 'voyage' && leg === null && s.phase !== 'error' && (
            <p className="nv-comm-line" key={`h${answered}`}>
              <span className="nv-comm-who">{CREW_BY_ID[hail.crew].name}</span>
              {hail.line}
            </p>
          )}
          {act === 'arrival' && (
            <p className="nv-comm-line" key="alongside">
              <span className="nv-comm-who">ALL STATIONS</span>
              Alongside. Lines ashore.
            </p>
          )}
        </div>
      </aside>

      <main className="nv-main">
        {act === 'hail' && <Briefing onTake={takeConsole} />}

        {act === 'voyage' && s.phase === 'error' && (
          <ConsoleFault detail={s.error} onRetry={bringBackUp} onExit={onExit} />
        )}

        {act === 'voyage' && s.phase === 'starting' && (
          <p className="nv-waking" role="status">
            CONSOLE WARMING
          </p>
        )}

        {act === 'voyage' && s.phase !== 'error' && serve && (
          <section className="nv-panel" key={serve.served.itemId}>
            <span className="nv-corner nv-corner--tl" aria-hidden="true" />
            <span className="nv-corner nv-corner--tr" aria-hidden="true" />
            <span className="nv-corner nv-corner--bl" aria-hidden="true" />
            <span className="nv-corner nv-corner--br" aria-hidden="true" />

            <div className="nv-panel-head">
              <span className="nv-panel-id">READING {pad(answered + 1)}</span>
              <span className="nv-panel-rule" aria-hidden="true" />
              <span className="nv-panel-kind">{kind}</span>
              <span className={`nv-receipt${s.phase === 'settling' ? ' is-on' : ''}`}>CALL LOGGED</span>
            </div>

            {drawable ? (
              <PanelFault key={serve.served.itemId} onPast={skipReading}>
                <div className="nv-plate">
                  <div className="nv-fit" ref={glass} style={{ ['--nv-fit' as string]: String(fit) }}>
                    <div className="nv-fit-in" ref={reading}>
                      <ItemStage
                        serve={serve}
                        band="4-5"
                        onAnswer={s.answer}
                        answered={s.phase !== 'asking'}
                        skin={CONSOLE_SKIN}
                      />
                    </div>
                  </div>
                </div>
              </PanelFault>
            ) : (
              <SmearedPanel onPast={skipReading} />
            )}
          </section>
        )}

        {act === 'arrival' && <Arrival count={answered} onExit={onExit} />}

        {leg !== null && act === 'voyage' && (
          <LegReport
            leg={leg}
            count={answered}
            place={WAYPOINTS[Math.min(LEGS, leg)]!}
            buttonRef={legButton}
            onOn={() => setLeg(null)}
          />
        )}
      </main>

      <footer className="nv-route">
        <p className="nv-route-leg">
          {act === 'arrival' ? (
            'PASSAGE MADE'
          ) : (
            <>
              LEG {pad(Math.min(LEGS, Math.floor(answered / READINGS_PER_LEG) + 1))}
              <span className="nv-route-of"> / {pad(LEGS)}</span>
            </>
          )}
        </p>

        <div className="nv-track" style={{ ['--p' as string]: String(progress) }}>
          <span className="nv-track-base" aria-hidden="true" />
          <span className="nv-track-run" aria-hidden="true" />
          <span className="nv-sweep" aria-hidden="true" />
          <ul className="nv-wps" aria-hidden="true">
            {WAYPOINTS.map((w, i) => (
              <li key={w} className={`nv-wp${i <= passed ? ' is-lit' : ''}`}>
                <span className="nv-wp-core" />
              </li>
            ))}
          </ul>
          <span className="nv-sled" aria-hidden="true">
            <span className="nv-ship">
              <svg viewBox="0 0 24 24" role="presentation">
                <path d="M3 5 21 12 3 19 7 12Z" />
              </svg>
            </span>
          </span>
        </div>

        <p className="nv-route-dest">
          <span className="nv-route-dest-cap">{act === 'arrival' ? 'ALONGSIDE' : 'MAKING FOR'}</span>
          {making}
        </p>
      </footer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* acts                                                                        */
/* -------------------------------------------------------------------------- */

function Briefing({ onTake }: { onTake: () => void }) {
  return (
    <section className="nv-brief">
      <p className="nv-cap nv-stagger" style={{ ['--i' as string]: '0' }}>
        02:40 — DEPARTURE HELD
      </p>
      <h1 className="nv-brief-title nv-stagger" style={{ ['--i' as string]: '1' }}>
        The console is yours.
      </h1>
      <p className="nv-brief-copy nv-stagger" style={{ ['--i' as string]: '2' }}>
        Nobody else aboard can read the navigation console. Ruiz can hold any heading you give her.
        Okonjo can pull any reading you ask for. Neither of them can tell you what a reading means.
      </p>
      <p className="nv-brief-copy nv-stagger" style={{ ['--i' as string]: '3' }}>
        We run the northern line tonight: six waypoints, dark water, and a console that talks in
        shapes. Every mark you call, this ship acts on.
      </p>
      <button
        type="button"
        className="nv-btn nv-btn--major nv-stagger"
        style={{ ['--i' as string]: '4' }}
        onClick={onTake}
      >
        Take the console
      </button>
      <p className="nv-brief-foot nv-stagger" style={{ ['--i' as string]: '5' }}>
        You can stand down whenever you like. The crew will see the voyage out either way.
      </p>
    </section>
  );
}

function LegReport({
  leg,
  count,
  place,
  buttonRef,
  onOn,
}: {
  leg: number;
  count: number;
  place: string;
  buttonRef: RefObject<HTMLButtonElement | null>;
  onOn: () => void;
}) {
  const report = LEG_REPORTS[Math.min(leg, LEG_REPORTS.length) - 1] ?? LEG_REPORTS[LEG_REPORTS.length - 1]!;
  const who = CREW_BY_ID[report.crew];

  return (
    <div className="nv-leg" role="group" aria-label={`Leg ${leg} logged`}>
      <div className="nv-leg-inner">
        <p className="nv-cap nv-stagger" style={{ ['--i' as string]: '0' }}>
          LEG {pad(leg)} CLOSED — {pad(count)} READINGS LOGGED
        </p>
        <p className="nv-leg-line nv-stagger" style={{ ['--i' as string]: '1' }}>
          {report.line}
        </p>
        <p className="nv-leg-mark nv-stagger" style={{ ['--i' as string]: '2' }}>
          <span className="nv-leg-mark-cap">{who.station}</span>
          ALDEBARAN NOW PAST {place}
        </p>
        <button
          ref={buttonRef}
          type="button"
          className="nv-btn nv-btn--major nv-stagger"
          style={{ ['--i' as string]: '3' }}
          onClick={onOn}
        >
          Set the next heading
        </button>
      </div>
    </div>
  );
}

function Arrival({ count, onExit }: { count: number; onExit: () => void }) {
  return (
    <section className="nv-arrive">
      <p className="nv-cap nv-stagger" style={{ ['--i' as string]: '0' }}>
        05:12 — PORT KESSEL, ALONGSIDE
      </p>
      <h1 className="nv-brief-title nv-stagger" style={{ ['--i' as string]: '1' }}>
        Harbour lights, off the bow.
      </h1>
      <p className="nv-brief-copy nv-stagger" style={{ ['--i' as string]: '2' }}>
        Ruiz eases the wheel over without being told. She has had your headings all night and she
        knows what the last one is going to be.
      </p>

      <ul className="nv-arrive-log">
        <li className="nv-stagger" style={{ ['--i' as string]: '3' }}>
          <span className="nv-comm-who">OKONJO</span>
          {count} readings called and logged. Every one of them went into the book.
        </li>
        <li className="nv-stagger" style={{ ['--i' as string]: '4' }}>
          <span className="nv-comm-who">VANCE</span>
          Engines to stop. Quietest run I have had on this line.
        </li>
        <li className="nv-stagger" style={{ ['--i' as string]: '5' }}>
          <span className="nv-comm-who">RUIZ</span>
          Same watch tomorrow night, Navigator?
        </li>
      </ul>

      <button
        type="button"
        className="nv-btn nv-btn--major nv-stagger"
        style={{ ['--i' as string]: '6' }}
        onClick={onExit}
      >
        Stand down
      </button>
    </section>
  );
}

function ConsoleFault({
  detail,
  onRetry,
  onExit,
}: {
  detail: string | null;
  onRetry: () => void;
  onExit: () => void;
}) {
  return (
    <section className="nv-fault" role="alert">
      <p className="nv-cap">CONSOLE FEED LOST</p>
      <h2 className="nv-fault-title">The console has dropped its feed.</h2>
      <p className="nv-brief-copy">
        That is the ship&rsquo;s fault and not yours. Vance can bring the panel back up, or we can
        put you ashore and run the line another night.
      </p>
      <div className="nv-fault-acts">
        <button type="button" className="nv-btn nv-btn--major" onClick={onRetry}>
          Bring the console back up
        </button>
        <button type="button" className="nv-btn nv-btn--ghost" onClick={onExit}>
          Leave the bridge
        </button>
      </div>
      {detail && <p className="nv-fault-detail">{detail}</p>}
    </section>
  );
}
