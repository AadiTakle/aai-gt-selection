import { useEffect, useState, type JSX } from 'react';

/**
 * NAN BRAMBLE, drawn.
 *
 * ══ WHO SHE IS ════════════════════════════════════════════════════════════════════════════════════
 *
 * The woman selling the ranch. She is old, she is fond of the place, and she is looking for somebody to
 * take it on — which is the whole reason she is standing there telling a child how the vacpack works.
 * A guide with no reason to be present is a tooltip with a face; hers is the same reason the game gives
 * for the shop existing and for the paddock being boarded up.
 *
 * ══ WHY SHE IS DRAWN AND NOT A PHOTOGRAPH OR AN EMOJI ═════════════════════════════════════════════
 *
 * Every path below is authored here, in SVG, so there is no asset to go missing, nothing to license, and
 * nothing whose style disagrees with the ranch. An emoji would be somebody else's drawing at somebody
 * else's scale, and a photograph of a person is a claim about a real human being that a children's
 * product should not make casually.
 *
 * The palette is `world/pigment.ts`'s, by eye rather than by import — this is flat HTML over the canvas
 * and importing three's material table for six hex strings would be worse than repeating them.
 *
 * ══ WHAT MOVES, AND WHAT STOPS ════════════════════════════════════════════════════════════════════
 *
 * She blinks on a randomised interval, and her mouth works while she is talking. Both are here for one
 * reason: a still face beside a voice reads as a picture of somebody, and a face that moves ON THE VOICE
 * reads as the source of it — which is what makes a child look at the portrait when she starts speaking
 * rather than at nothing. `prefers-reduced-motion` stops both and leaves her smiling, which is the
 * resting state rather than an absence.
 */

/** Warm skin, silver hair, straw, and the barn's own honey. Not a grey anywhere. */
const SKIN = '#f0c49b';
const SKIN_SHADE = '#dda87d';
const HAIR = '#eee7dd';
const HAIR_SHADE = '#cfc3b3';
const LINE = '#7a5a3a';
const DARK = '#4a3218';
const STRAW = '#e8c47a';
const STRAW_DEEP = '#c79f52';
const BAND = '#c9614f';
const KERCHIEF = '#7fae86';
const COLLAR = '#8fb8cf';
const CHEEK = '#e88f7a';
const CREAM = '#fffaf0';
const HONEY = '#ffd76b';

export function Nan({ speaking, reduced }: { speaking: boolean; reduced: boolean }): JSX.Element {
  const [blink, setBlink] = useState(false);

  /**
   * A blink every few seconds, at an interval that is never the same twice.
   *
   * A fixed period is worse than no blinking at all: at 4.0s exactly the eye becomes a metronome and the
   * face reads as a machine. The jitter is the whole effect.
   */
  useEffect(() => {
    if (reduced) return;
    let live = true;
    let shut: number | undefined;
    let next: number | undefined;
    const cycle = (): void => {
      if (!live) return;
      next = window.setTimeout(() => {
        setBlink(true);
        shut = window.setTimeout(() => {
          setBlink(false);
          cycle();
        }, 130);
      }, 2400 + Math.random() * 4200);
    };
    cycle();
    return () => {
      live = false;
      window.clearTimeout(shut);
      window.clearTimeout(next);
    };
  }, [reduced]);

  const talking = speaking && !reduced;

  return (
    <svg
      className="nb-portrait"
      viewBox="0 0 200 200"
      role="img"
      aria-label="Nan Bramble, the rancher"
      focusable="false"
    >
      <defs>
        <clipPath id="nb-cameo">
          <circle cx="100" cy="100" r="88" />
        </clipPath>
        <clipPath id="nb-eye-l">
          <ellipse cx="80" cy="103" rx="11" ry="9" />
        </clipPath>
        <clipPath id="nb-eye-r">
          <ellipse cx="122" cy="103" rx="11" ry="9" />
        </clipPath>
        <radialGradient id="nb-back" cx="0.5" cy="0.38" r="0.75">
          <stop offset="0" stopColor="#fff6e2" />
          <stop offset="1" stopColor="#f3dcb4" />
        </radialGradient>
      </defs>

      {/* The cameo. A ring rather than a card, so she reads as leaning in at a window. */}
      <circle cx="100" cy="100" r="92" fill={CREAM} opacity="0.96" />
      <circle cx="100" cy="100" r="88" fill="url(#nb-back)" />

      <g clipPath="url(#nb-cameo)">
        {/* Shoulders, a collar and the kerchief she has worn every day of her working life. */}
        <path d="M22 200 Q34 158 100 152 Q166 158 178 200 Z" fill={COLLAR} />
        <path d="M74 155 Q100 176 126 155 Q116 190 100 192 Q84 190 74 155 Z" fill={KERCHIEF} />
        <path d="M92 158 Q100 168 108 158 Q104 172 100 174 Q96 172 92 158 Z" fill="#6b9a73" />
        <path d="M74 155 Q86 150 100 152 Q114 150 126 155" fill="none" stroke="#6b9a73" strokeWidth="3" strokeLinecap="round" />

        {/* The hat brim, behind everything. Straw, with the weave suggested rather than drawn. */}
        <ellipse cx="100" cy="60" rx="86" ry="24" fill={STRAW} />
        <ellipse cx="100" cy="57" rx="86" ry="22" fill={STRAW_DEEP} opacity="0.35" />
        {[-64, -40, -16, 16, 40, 64].map((dx) => (
          <path
            key={dx}
            d={`M${100 + dx} 44 Q${100 + dx * 1.05} 60 ${100 + dx} 76`}
            fill="none"
            stroke={STRAW_DEEP}
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.55"
          />
        ))}

        {/* Hair, as one soft mass around the face plus a bun above the crown. */}
        <ellipse cx="100" cy="44" rx="24" ry="19" fill={HAIR} />
        <ellipse cx="100" cy="44" rx="24" ry="19" fill={HAIR_SHADE} opacity="0.3" />
        <path d="M46 112 Q42 52 100 48 Q158 52 154 112 Q150 78 100 74 Q50 78 46 112 Z" fill={HAIR} />
        <path d="M52 108 Q54 74 100 70 Q146 74 148 108" fill="none" stroke={HAIR_SHADE} strokeWidth="4" strokeLinecap="round" />

        {/* The hat crown, sitting on the hair, with its band. */}
        <path d="M56 62 Q60 20 100 18 Q140 20 144 62 Z" fill={STRAW} />
        <path d="M56 62 Q60 20 100 18 Q112 19 120 26 Q84 34 74 62 Z" fill="#f2d69a" opacity="0.55" />
        <path d="M55 60 Q100 74 145 60 L145 50 Q100 64 55 50 Z" fill={BAND} />
        {/* A sprig of bracken tucked into the band, because the ranch is called what it is called. */}
        <path d="M134 48 Q142 34 152 30" fill="none" stroke="#6b9a73" strokeWidth="3" strokeLinecap="round" />
        {[0, 1, 2, 3].map((i) => (
          <ellipse
            key={i}
            cx={137 + i * 4.4}
            cy={44 - i * 3.8}
            rx="4.6"
            ry="2.6"
            fill="#7fae86"
            transform={`rotate(${-38 + i * 4} ${137 + i * 4.4} ${44 - i * 3.8})`}
          />
        ))}

        {/* The face. */}
        <ellipse cx="100" cy="108" rx="43" ry="46" fill={SKIN} />
        <path d="M100 154 Q78 152 66 136 Q84 148 100 148 Q116 148 134 136 Q122 152 100 154 Z" fill={SKIN_SHADE} opacity="0.5" />
        {/* Ears, and the one bit of brass she wears. */}
        <ellipse cx="57" cy="110" rx="7" ry="10" fill={SKIN} />
        <ellipse cx="143" cy="110" rx="7" ry="10" fill={SKIN} />
        <circle cx="57" cy="121" r="4" fill="none" stroke="#d8a94b" strokeWidth="2.2" />
        <circle cx="143" cy="121" r="4" fill="none" stroke="#d8a94b" strokeWidth="2.2" />

        {/* Brows. Set high and soft: a low brow is a frown however the mouth is drawn. */}
        <path d="M68 89 Q80 82 92 87" fill="none" stroke={HAIR_SHADE} strokeWidth="4.5" strokeLinecap="round" />
        <path d="M110 87 Q122 82 134 89" fill="none" stroke={HAIR_SHADE} strokeWidth="4.5" strokeLinecap="round" />

        {/* Eyes. Whites, a warm brown iris, a catchlight, and a lid that comes down to blink. */}
        {([
          ['nb-eye-l', 80],
          ['nb-eye-r', 122],
        ] as const).map(([clip, cx]) => (
          <g key={clip} clipPath={`url(#${clip})`}>
            <ellipse cx={cx} cy="103" rx="11" ry="9" fill="#fffdf7" />
            <circle cx={cx} cy="104" r="6.2" fill="#7a4f24" />
            <circle cx={cx} cy="104" r="3" fill={DARK} />
            <circle cx={cx - 2.4} cy="101" r="2" fill="#ffffff" opacity="0.9" />
            {/* The lid. Parked above the eye and dropped over it, so a blink is a movement rather than
                a shape appearing. */}
            <rect
              x={cx - 12}
              y={blink ? 93 : 78}
              width="24"
              height="20"
              rx="6"
              fill={SKIN}
              style={{ transition: reduced ? 'none' : 'y 90ms ease-out' }}
            />
          </g>
        ))}
        {/* Laugh lines. Three short strokes are the whole difference between a young face and hers. */}
        <path d="M64 108 Q60 111 62 115" fill="none" stroke={SKIN_SHADE} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M136 108 Q140 111 138 115" fill="none" stroke={SKIN_SHADE} strokeWidth="2.4" strokeLinecap="round" />
        <path d="M67 100 Q62 102 60 106" fill="none" stroke={SKIN_SHADE} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        <path d="M133 100 Q138 102 140 106" fill="none" stroke={SKIN_SHADE} strokeWidth="2" strokeLinecap="round" opacity="0.7" />

        {/* Nose. */}
        <path d="M100 106 Q96 118 92 122 Q97 126 104 124" fill="none" stroke={SKIN_SHADE} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />

        {/* Cheeks, and a scatter of freckles. */}
        <ellipse cx="70" cy="122" rx="12" ry="8" fill={CHEEK} opacity="0.34" />
        <ellipse cx="130" cy="122" rx="12" ry="8" fill={CHEEK} opacity="0.34" />
        {[
          [65, 118],
          [72, 124],
          [78, 119],
          [128, 119],
          [134, 124],
          [122, 121],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" fill={SKIN_SHADE} opacity="0.8" />
        ))}

        {/* The mouth.
            Closed, it is a smile with a crease at each end. Talking, an open shape opens and closes over
            it on its own rhythm — deliberately not synchronised to the words, because a mouth that tries
            to match syllables and fails is worse than one that is plainly just talking. */}
        {talking ? null : (
          <>
            <path d="M84 134 Q100 146 116 134" fill="none" stroke={LINE} strokeWidth="3.4" strokeLinecap="round" />
            <path d="M83 132 Q80 134 81 137" fill="none" stroke={SKIN_SHADE} strokeWidth="2.2" strokeLinecap="round" />
            <path d="M117 132 Q120 134 119 137" fill="none" stroke={SKIN_SHADE} strokeWidth="2.2" strokeLinecap="round" />
          </>
        )}
        {talking ? (
          <g className="nb-talk" style={{ transformOrigin: '100px 134px' }}>
            <path d="M84 133 Q100 128 116 133 Q108 150 100 150 Q92 150 84 133 Z" fill="#8a4a3c" />
            <path d="M86 134 Q100 131 114 134 Q100 137 86 134 Z" fill="#fff6e6" />
            <path d="M92 145 Q100 141 108 145 Q100 150 92 145 Z" fill="#c9736a" />
          </g>
        ) : null}
        <path d="M92 152 Q100 156 108 152" fill="none" stroke={SKIN_SHADE} strokeWidth="2.2" strokeLinecap="round" opacity="0.7" />
      </g>

      {/* The ring. Honey, the colour every "something happens here" in this game is painted. */}
      <circle cx="100" cy="100" r="90" fill="none" stroke={HONEY} strokeWidth="6" />
      <circle cx="100" cy="100" r="94" fill="none" stroke={CREAM} strokeWidth="4" opacity="0.85" />
    </svg>
  );
}
