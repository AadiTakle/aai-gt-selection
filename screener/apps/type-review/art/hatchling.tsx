/**
 * Vector art for the Hatchling Garden kit.
 *
 * WHY THE ART IS INLINE. A kit can point at a URL — the Pokédex one does — but a garden has no public
 * sprite sheet to point at, and a review tool that needs the network to draw a question is a review tool
 * that fails on a bad hotel wifi. Every plant here is a handful of SVG paths, so the whole kit is a few
 * kilobytes and works offline.
 *
 * THE ONE QUALITY BAR THAT MATTERS. These get drawn at about 48px inside a matrix cell, and a matrix
 * whose cells are not clearly different is not a hard question, it is an unanswerable one. So the twelve
 * species are separated by SILHOUETTE first — petal count, petal shape, whether the head droops, whether
 * it is a spike or a disc or a frond — and only then by colour. Anyone editing this should check the
 * result at 48px, not at 200px, because two flowers that are obviously different large can be the same
 * blob small.
 *
 * Stage is drawn as a genuine progression rather than a colour change: 1 is a seed in soil, 2 a sprout
 * with leaves only, 3 a closed bud on a stem, 4 the open flower. A child should be able to order them
 * without being told the rule, since several question types ask exactly that.
 *
 * Palette is Tiffany's Hatchling theme (apps/lab-character/experiences/hatchling/styles.css).
 */

import type { JSX } from 'react';

const CREAM = '#fdf3e3';
const PEACH = '#fbe1c2';
const APRICOT = '#f4c39c';
const BLUSH = '#eaa382';
const SUN = '#f4d58d';
const HONEY = '#e8b25c';
const MOSS = '#5f8f5a';
const LEAF = '#a8cf8a';
const BARK = '#8d5f3c';
const INK = '#4a3529';
const ROSEP = '#e79ab0';

/** Per-species bloom colour, chosen so neighbours in the bank do not collide. */
const HUE: Record<string, string> = {
  rose: ROSEP,
  tulip: '#e2574c',
  daisy: '#fdfaf2',
  fern: MOSS,
  clover: LEAF,
  sunflower: SUN,
  poppy: '#d8452f',
  orchid: '#b57ec4',
  lily: '#fff3d6',
  thistle: '#8f7ec4',
  bluebell: '#7b9fd4',
  foxglove: '#d98cc0',
};

type Stage = 1 | 2 | 3 | 4;

function parse(key: string): { species: string; stage: Stage } {
  const i = key.lastIndexOf('-');
  const species = i > 0 ? key.slice(0, i) : key;
  const tail = i > 0 ? key.slice(i + 1) : 'bloom';
  const stage: Stage = tail === 'seed' ? 1 : tail === 'sprout' ? 2 : tail === 'bud' ? 3 : 4;
  return { species, stage };
}

/** Soil, stem and leaves are shared; only the head differs by species. */
function Stem({ tall, leaves }: { tall: number; leaves: 0 | 1 | 2 }) {
  return (
    <>
      <path d={`M50 92 L50 ${String(92 - tall)}`} stroke={MOSS} strokeWidth="5" strokeLinecap="round" fill="none" />
      {leaves >= 1 ? (
        <path d={`M50 ${String(92 - tall * 0.45)} C34 ${String(84 - tall * 0.5)} 30 ${String(76 - tall * 0.5)} 44 ${String(74 - tall * 0.45)} Z`} fill={LEAF} />
      ) : null}
      {leaves >= 2 ? (
        <path d={`M50 ${String(92 - tall * 0.62)} C66 ${String(84 - tall * 0.66)} 70 ${String(76 - tall * 0.66)} 56 ${String(74 - tall * 0.6)} Z`} fill={MOSS} />
      ) : null}
    </>
  );
}

function Soil() {
  return <ellipse cx="50" cy="93" rx="26" ry="6" fill={BARK} opacity="0.85" />;
}

/** A ring of petals, the workhorse silhouette. `petals` and `sharp` do the differentiating. */
function Rosette({ cx, cy, r, petals, fill, sharp, core }: { cx: number; cy: number; r: number; petals: number; fill: string; sharp?: boolean; core?: string }) {
  const out: JSX.Element[] = [];
  for (let i = 0; i < petals; i += 1) {
    const a = (i / petals) * Math.PI * 2 - Math.PI / 2;
    const px = cx + Math.cos(a) * r * 0.62;
    const py = cy + Math.sin(a) * r * 0.62;
    out.push(
      sharp ? (
        <path
          key={i}
          d={`M${String(cx)} ${String(cy)} L${String(cx + Math.cos(a - 0.28) * r)} ${String(cy + Math.sin(a - 0.28) * r)} L${String(cx + Math.cos(a) * r * 1.22)} ${String(cy + Math.sin(a) * r * 1.22)} L${String(cx + Math.cos(a + 0.28) * r)} ${String(cy + Math.sin(a + 0.28) * r)} Z`}
          fill={fill}
          stroke={INK}
          strokeWidth="1"
          strokeOpacity="0.25"
        />
      ) : (
        <ellipse key={i} cx={px} cy={py} rx={r * 0.46} ry={r * 0.62} fill={fill} stroke={INK} strokeWidth="1" strokeOpacity="0.25" transform={`rotate(${String((a * 180) / Math.PI + 90)} ${String(px)} ${String(py)})`} />
      ),
    );
  }
  return (
    <>
      {out}
      <circle cx={cx} cy={cy} r={r * 0.3} fill={core ?? HONEY} />
    </>
  );
}

/**
 * A species' structural family, used to keep it recognisable before the flower opens.
 * 0 = round head, 1 = cup, 2 = tall spike, 3 = frond or leaf-cluster with no single head.
 */
function familyOf(species: string): 0 | 1 | 2 | 3 {
  if (species === 'fern' || species === 'clover') return 3;
  if (species === 'foxglove' || species === 'bluebell' || species === 'thistle') return 2;
  if (species === 'tulip' || species === 'lily' || species === 'orchid') return 1;
  return 0;
}

/** The sprout stage, varied by family so the species is not a coin flip one stage early. */
function Seedling({ species }: { species: string }) {
  const fam = familyOf(species);
  if (fam === 3) {
    // Frond families come up as a spray of small leaflets rather than a single pair.
    return (
      <>
        {[-1, 0, 1].map((k) => (
          <path
            key={k}
            d={`M50 58 C${String(50 + k * 10)} 50 ${String(50 + k * 13)} 46 ${String(50 + k * 9)} 42`}
            stroke={k === 0 ? MOSS : LEAF}
            strokeWidth="3.2"
            fill="none"
            strokeLinecap="round"
          />
        ))}
      </>
    );
  }
  if (fam === 2) {
    // Spike families come up narrow and upright.
    return <path d="M50 60 C46 52 48 42 50 38 C52 42 54 52 50 60 Z" fill={LEAF} />;
  }
  if (fam === 1) {
    // Cup families come up as two broad opposed blades.
    return (
      <>
        <path d="M50 56 C40 52 38 44 44 42 C49 44 51 50 50 56 Z" fill={LEAF} />
        <path d="M50 56 C60 52 62 44 56 42 C51 44 49 50 50 56 Z" fill={MOSS} />
      </>
    );
  }
  return <path d="M50 58 C44 52 46 46 50 44 C54 46 56 52 50 58 Z" fill={LEAF} />;
}

/** The bud stage, shaped by family and coloured by species. */
function Bud({ species, hue }: { species: string; hue: string }) {
  const fam = familyOf(species);
  if (fam === 3) {
    // No true bud: a tight leaf knot, which is itself the tell.
    return (
      <>
        <circle cx="50" cy="40" r="11" fill={MOSS} />
        <circle cx="50" cy="40" r="6" fill={LEAF} />
        <path d="M50 34 L50 46 M44 40 L56 40" stroke={MOSS} strokeWidth="2" />
      </>
    );
  }
  if (fam === 2) {
    // A tall closed spike, species colour up its whole length.
    return (
      <>
        <path d="M45 48 C45 26 50 18 50 18 C50 18 55 26 55 48 Z" fill={hue} />
        <path d="M45 48 C45 40 47 34 48 32 L48 48 Z" fill={MOSS} opacity="0.55" />
      </>
    );
  }
  if (fam === 1) {
    // A pointed cup, mostly species colour with a green calyx at the base.
    return (
      <>
        <path d="M41 44 C41 26 50 18 50 18 C50 18 59 26 59 44 C55 49 45 49 41 44 Z" fill={hue} />
        <path d="M41 44 C45 50 55 50 59 44 C55 47 45 47 41 44 Z" fill={MOSS} />
      </>
    );
  }
  // A round bud with the species colour showing through a split calyx.
  return (
    <>
      <circle cx="50" cy="36" r="13" fill={hue} />
      <path d="M37 38 C37 46 43 50 50 50 C57 50 63 46 63 38 C58 44 42 44 37 38 Z" fill={MOSS} />
      <path d="M44 26 C46 32 54 32 56 26 C54 24 46 24 44 26 Z" fill={MOSS} opacity="0.5" />
    </>
  );
}

/** Each species' open flower head, drawn to be told apart by outline alone. */
function Head({ species }: { species: string }) {
  const c = HUE[species] ?? ROSEP;
  switch (species) {
    case 'rose':
      // Concentric whorls, no visible separate petals.
      return (
        <>
          <circle cx="50" cy="34" r="19" fill={c} />
          <circle cx="50" cy="34" r="13" fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="3" />
          <circle cx="50" cy="34" r="7" fill="none" stroke="#fff" strokeOpacity="0.7" strokeWidth="3" />
        </>
      );
    case 'tulip':
      // Closed cup, flat top, three lobes.
      return (
        <path d="M32 40 C32 22 40 14 50 14 C60 14 68 22 68 40 C60 46 40 46 32 40 Z" fill={c} stroke={INK} strokeOpacity="0.25" strokeWidth="1.2" />
      );
    case 'daisy':
      return <Rosette cx={50} cy={34} r={20} petals={12} fill={c} core={SUN} />;
    case 'sunflower':
      // Many sharp petals, big dark disc.
      return (
        <>
          <Rosette cx={50} cy={34} r={22} petals={16} fill={c} sharp core={BARK} />
          <circle cx="50" cy="34" r="8" fill={BARK} />
        </>
      );
    case 'poppy':
      // Four broad petals, black centre.
      return <Rosette cx={50} cy={34} r={21} petals={4} fill={c} core={INK} />;
    case 'orchid':
      // Asymmetric: two upper petals plus a drooping lip.
      return (
        <>
          <ellipse cx="40" cy="28" rx="10" ry="13" fill={c} transform="rotate(-25 40 28)" />
          <ellipse cx="60" cy="28" rx="10" ry="13" fill={c} transform="rotate(25 60 28)" />
          <path d="M50 34 C40 40 42 52 50 54 C58 52 60 40 50 34 Z" fill="#8e5aa0" />
          <circle cx="50" cy="33" r="4" fill={CREAM} />
        </>
      );
    case 'lily':
      // Six pointed petals and long stamens.
      return (
        <>
          <Rosette cx={50} cy={34} r={21} petals={6} fill={c} sharp core={APRICOT} />
          <path d="M50 34 L44 18 M50 34 L50 16 M50 34 L56 18" stroke={HONEY} strokeWidth="1.8" strokeLinecap="round" />
        </>
      );
    case 'thistle':
      // Spiky tuft over a bulbous calyx.
      return (
        <>
          <path d="M38 46 C38 34 62 34 62 46 C58 52 42 52 38 46 Z" fill={MOSS} />
          <path d="M40 36 L36 18 M45 34 L43 14 M50 33 L50 12 M55 34 L57 14 M60 36 L64 18" stroke={c} strokeWidth="3" strokeLinecap="round" />
        </>
      );
    case 'bluebell':
      // Several drooping bells on one side of the stalk.
      return (
        <>
          <path d="M50 16 L50 60" stroke={MOSS} strokeWidth="4" strokeLinecap="round" />
          {[22, 34, 46].map((y, i) => (
            <path key={y} d={`M50 ${String(y)} C${String(34 - i)} ${String(y + 2)} ${String(32 - i)} ${String(y + 14)} ${String(43 - i)} ${String(y + 15)} C${String(50 - i)} ${String(y + 14)} 50 ${String(y + 6)} 50 ${String(y)} Z`} fill={c} />
          ))}
        </>
      );
    case 'foxglove':
      // A tall spike of tubular flowers, alternating sides.
      return (
        <>
          <path d="M50 12 L50 62" stroke={MOSS} strokeWidth="4" strokeLinecap="round" />
          {[20, 32, 44, 56].map((y, i) => (
            <ellipse key={y} cx={i % 2 ? 62 : 38} cy={y} rx="11" ry="7" fill={c} transform={`rotate(${i % 2 ? 18 : -18} ${String(i % 2 ? 62 : 38)} ${String(y)})`} />
          ))}
        </>
      );
    case 'fern':
      // No flower at all: a frond. Deliberately the odd one out.
      return (
        <>
          <path d="M50 88 C50 60 50 34 50 14" stroke={MOSS} strokeWidth="4" fill="none" strokeLinecap="round" />
          {[22, 32, 42, 52, 62, 72].map((y, i) => {
            const w = 12 + i * 3;
            return (
              <g key={y}>
                <path d={`M50 ${String(y)} C${String(50 - w * 0.6)} ${String(y - 5)} ${String(50 - w)} ${String(y + 1)} ${String(50 - w)} ${String(y + 7)}`} stroke={LEAF} strokeWidth="3.4" fill="none" strokeLinecap="round" />
                <path d={`M50 ${String(y)} C${String(50 + w * 0.6)} ${String(y - 5)} ${String(50 + w)} ${String(y + 1)} ${String(50 + w)} ${String(y + 7)}`} stroke={MOSS} strokeWidth="3.4" fill="none" strokeLinecap="round" />
              </g>
            );
          })}
        </>
      );
    case 'clover':
      // Three round lobes, unmistakable.
      return (
        <>
          {[-1, 0, 1].map((k) => (
            <ellipse key={k} cx={50 + k * 15} cy={k === 0 ? 24 : 38} rx="12" ry="13" fill={c} stroke={MOSS} strokeWidth="1.4" />
          ))}
          <circle cx="50" cy="34" r="4" fill={MOSS} />
        </>
      );
    default:
      return <Rosette cx={50} cy={34} r={20} petals={5} fill={c} />;
  }
}

/** The pixel size a `size` of 1 draws at. Cells in a matrix are built around roughly this. */
const BASE_PX = 52;

export function HatchlingSprite({
  sprite,
  size = 1,
  turns = 0,
  tint,
}: {
  sprite: string;
  /**
   * RELATIVE scale, not pixels: 1 is the default and the resolver hands out roughly 0.6 to 1.5 for
   * items that vary size. Reading it as a pixel count is the obvious mistake and draws a 1px flower,
   * so it is clamped to something visible either way.
   */
  size?: number;
  turns?: number;
  tint?: string;
}): JSX.Element {
  const px = Math.round(BASE_PX * Math.min(3, Math.max(0.35, size)));
  const { species, stage } = parse(sprite);
  const known = species in HUE;
  const hue = HUE[species] ?? ROSEP;

  // `tint` is an app-interpreted token. `outline` and `shadow` are the treatments the kits declare, and
  // anything unrecognised is ignored rather than guessed at.
  const outline = tint === 'outline';
  const shadow = tint === 'shadow';

  return (
    <svg
      viewBox="0 0 100 100"
      width={px}
      height={px}
      role="img"
      aria-label={`${species} ${stage === 1 ? 'seed' : stage === 2 ? 'sprout' : stage === 3 ? 'bud' : 'in bloom'}`}
      style={{
        transform: turns ? `rotate(${String(turns * 90)}deg)` : undefined,
        opacity: outline ? 0.55 : 1,
        filter: shadow ? 'drop-shadow(0 2px 2px rgba(74,53,41,0.35))' : undefined,
      }}
    >
      {!known ? (
        // An unknown key draws a plain marker rather than nothing, so a kit typo is visible but not fatal.
        <>
          <circle cx="50" cy="50" r="30" fill={PEACH} stroke={BARK} strokeWidth="2" strokeDasharray="5 4" />
          <text x="50" y="56" textAnchor="middle" fontSize="26" fill={BARK}>
            ?
          </text>
        </>
      ) : stage === 1 ? (
        <>
          <Soil />
          {/* A seed: buried, with only a crack of green showing. */}
          <ellipse cx="50" cy="84" rx="9" ry="11" fill={BARK} />
          <ellipse cx="47" cy="81" rx="3" ry="4" fill={APRICOT} opacity="0.7" />
          <path d="M50 74 C50 70 52 68 54 67" stroke={LEAF} strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      ) : stage === 2 ? (
        <>
          <Soil />
          {/* A sprout: stem and leaves, no head yet. The leaf silhouette already differs by species so
              the species is readable a stage before the flower opens. */}
          <Stem tall={34} leaves={2} />
          <Seedling species={species} />
        </>
      ) : stage === 3 ? (
        <>
          <Soil />
          {/* A bud: full stem, head closed. The bud SHAPE varies by species and the species colour is
              given real area rather than a sliver, because a row of buds that all look alike turns a
              species-varying matrix into an unanswerable one. */}
          <Stem tall={52} leaves={2} />
          <Bud species={species} hue={hue} />
        </>
      ) : (
        <>
          <Soil />
          <Stem tall={species === 'fern' ? 6 : 50} leaves={species === 'fern' ? 0 : 2} />
          <Head species={species} />
        </>
      )}
    </svg>
  );
}
