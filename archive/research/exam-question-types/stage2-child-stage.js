// THE CHILD'S SCREEN — the only place the child-facing markup for a Stage 2 learning block exists.
//
// WHY THIS IS A SEPARATE MODULE. Two callers draw it: the review window
// (`stage2-review.js`) and the sample renderer that produces the stimuli for the intuitiveness audit
// (`stage2-render-samples.mjs`). If those had their own markup, the audit would be an audit of a
// mock-up rather than of the instrument, and evaluator findings could not be trusted to transfer. One
// definition also keeps the arm constraint honest at the level of code rather than of intention:
// `consistent` and `perTrial` reach this file through the same `view` and there is no branch on arm
// anywhere below (§4.1 — a separate control renderer confounds the gate with the renderer).
//
// THE TASK IS CONVEYED BY LAYOUT, NOT BY INSTRUCTION. There is no sentence anywhere on this screen
// telling the child what to work out. What carries the task instead:
//
//   1. A TABLE OF FINISHED ROWS PLUS ONE UNFINISHED ROW. Every row is the same grammar left to right:
//      a figure, the badges, the figure that came out. The worked demonstrations are simply the first
//      rows, already complete. The live row is the same shape with its last cell empty. "Finish the
//      row" is a convention a K-8 child already holds from matrix puzzles, and it needs no words.
//   2. SHAPE CONGRUENCE. The empty cell and the option cards are the same size and outline, so which
//      thing goes in the hole is a visual match rather than a stated rule.
//   3. ORDER MADE VISIBLE. Chevrons run left to right between every cell and between every badge, so
//      "they act in order" is in the picture. No numbering, which would be one more notation to
//      decode.
//   4. REPETITION. The layout never changes between trials or between arms, so the task is parsed
//      once. A child who has understood row one has understood row eighteen.
//   5. THE DEMONSTRATIONS ARE WORKED EXAMPLES OF THE TASK, IN TWO BEATS. Beat one poses the
//      demonstration exactly as a trial is posed — hole open, options below, nothing to press but
//      forward. Beat two fills the hole and marks the option it matches. Every evaluator in the
//      intuitiveness audit reported that the task became clear only when a hole and an option tray
//      first appeared together, which under the previous single-beat demonstrations was the first
//      SCORED trial: three screens of watching passed before anyone knew a task existed, and two
//      evaluators independently described those screens as an onboarding carousel. The two-beat
//      demonstration moves that recognition to screen one at the cost of nothing, because the beats
//      are the same rows either way. Beat one's tray is inert: showing options that cannot be chosen
//      is a worked example, whereas accepting a choice that is not scored would teach that choices do
//      not matter.
//
// The system stays cryptic while the task does not, because none of these devices says anything about
// what a badge DOES. The tape shows only reveals the child was already shown, never a mapping.
//
// THE FEEDBACK IS THE ROW COMPLETING. No verdict, no score, no streak, no praise, and no right/wrong
// colouring — informational only (§1.5). The child's own choice is outlined as a record of what they
// picked, in the same neutral ink as everything else. Extrinsic reward and evaluative feedback change
// what a learning-rate measurement is measuring, so the only signal is the figure the machine made,
// which is also the only signal the induction needs.
//
// Nothing here is type-specific: `inspector` supplies `figureSvg` and `badgeSvg`, so a second Stage 2
// type draws through the same frame.

const esc = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

/**
 * ONE FIGURE SIZE EVERYWHERE, which is a measurement decision rather than a matter of taste.
 *
 * The audit ran two layouts blind: this one, with every row at one size so that input, machine and
 * output form three columns, and a `scaled` variant that drew the live row large above smaller
 * history. Scaled won on orientation — its evaluator never once lost track of which row was in play —
 * and lost the audit anyway, on an argument neither I nor the design documents had made: SIZE IS ONE
 * OF THE TRANSFORMATIONS. `twin` turns one figure into two smaller copies, so a small glyph in a
 * history row is ambiguous between "the data is small here" and "history is drawn small". Their
 * words: the layout was speaking the same language as the content, with no way to separate the two
 * voices. A layout variable cannot share a channel with a component of the vocabulary being induced,
 * so the scaled variant is gone and the live row is marked by tint and by the open hole alone.
 */
export const SIZES = { figure: 62, badge: 24, option: 62 };

export const STAGE_CSS = `
/* ---- the child's screen ------------------------------------------------ */
.kid {
  --ink: #12202e;
  --hair: #d7dee7;
  --paper: #fff;
  --dim: #8b9aab;
  background: var(--paper);
  padding: 4px 0 18px;
  font-family: inherit;
}
/* The tape: finished rows above, the live row last. One grammar, repeated. */
.kid .tape {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
  padding: 6px 10px 0;
}
.kid .row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  padding: 6px 14px;
  border: 1px solid transparent;
  border-radius: 12px;
}
.kid .row.past {
  opacity: 0.82;
}
/* The row in play, marked by tint and by the open hole. Not by size — see SIZES. */
.kid .row.live {
  background: #f7fafd;
  border-color: var(--hair);
}
.kid .cell {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--paper);
  border: 1.5px solid var(--hair);
  border-radius: 10px;
  width: ${SIZES.figure + 12}px;
  height: ${SIZES.figure + 12}px;
  flex: none;
}
/* The hole. Same outline and size as an option card, so the match is visual. */
.kid .cell.hole {
  border-style: dashed;
  border-color: #a8b6c6;
  background: #fdfefe;
}
/* The machine body.
   TWO ELEMENTS, FOR ONE REASON. The column alignment that makes this screen read as a table needs the
   machine to occupy a fixed width in every row; the pill itself must NOT, because an enclosure wider
   than its contents reads as an enclosure with room left in it. Three of the four audit evaluators
   independently misread the old fixed-width pill on sight — as a partly filled input, as a progress
   bar, and as a carousel page-indicator strip — and two of them said the misreading persisted for
   three screens. So millbox holds the column and mill hugs the badges. */
.kid .millbox {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 214px;
  flex: none;
}
.kid .mill {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 11px;
  background: #eef3f9;
  border: 1.5px solid var(--hair);
  border-radius: 999px;
}
.kid .slot {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  background: var(--paper);
  border: 1.5px solid #b9c6d4;
  border-radius: 9px;
  flex: none;
}
/* Order, in the picture rather than in a sentence. */
.kid .chev {
  color: #9fb0c2;
  font-size: 15px;
  line-height: 1;
}
/* The options, directly under the hole they fill. */
.kid .tray {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
  padding: 16px 12px 4px;
}
/* Same footprint and outline as the hole in the live row: which thing goes in the gap is a shape
   match, not a stated rule. */
.kid .card {
  width: ${SIZES.option + 12}px;
  height: ${SIZES.option + 12}px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--paper);
  border: 1.5px solid var(--hair);
  border-radius: 10px;
  cursor: pointer;
  padding: 0;
  font-family: inherit;
}
.kid .card:hover:not(.done) {
  border-color: #7f93a8;
  background: #f7fafd;
}
/* THE RECORD OF WHAT THIS CHILD PICKED — a bar under the card, NOT a ring around it.
   The audit caught a confound here that the design documents had missed. ring is one of the six
   components of the hidden vocabulary, and it used to be drawn as a rounded rectangle at the figure's
   bounding box: the same shape, weight and ink as this marker and as every cell outline. Three of four
   evaluators reported a heavy dark border that appeared to mark the chosen tile, the active row, the
   answer slot and nothing at all, on different screens; one spent seven screens trying to induce a
   rule for it and correctly guessed it might be part of the artwork. A child inducing over interface
   furniture is the purest possible construct-irrelevant variance. Two changes close it: the component
   is now drawn as a circle (see opchain.js), and the marker for a chosen card is now a bar beneath
   the card, which is not a shape any figure can contain. Still the same neutral ink as every other
   line on the screen — a record, not a verdict. No green, no red, no tick, no cross (§1.5). */
.kid .card.mine {
  box-shadow: 0 7px 0 -1px var(--ink);
}
.kid .card.done {
  cursor: default;
}
/* NOT opacity, which was the previous implementation and faded the figure's ink along with the
   card. shade — solid versus outline — is another component of the vocabulary, so a faded solid
   figure is indistinguishable from an outlined one, and an evaluator flagged exactly that. Only the
   card's own chrome recedes; every figure keeps full-strength ink. */
.kid .card.done:not(.mine) {
  border-color: #edf1f6;
  background: #fbfcfd;
}
.kid .tray.done .card {
  cursor: default;
}
/* An inert tray, on the demonstration beats: the options are part of the picture being shown rather
   than a choice being offered, so they are rendered as spans and cannot be pressed. */
.kid .tray.shown .card {
  cursor: default;
  border-color: #e4eaf1;
}
/* FORWARD. A filled pill with a solid triangle, deliberately not the hairline chevron used inside a
   row: every evaluator noted that one glyph was doing two unrelated jobs — punctuation meaning "then"
   between cells, and the only control on the screen — and two said they identified the control only by
   elimination. Different job, different mark. */
.kidbtn {
  display: block;
  margin: 14px auto 0;
  border: none;
  background: #1b3a5b;
  border-radius: 999px;
  padding: 9px 26px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1;
  color: #fff;
  cursor: pointer;
}
.kidbtn:hover {
  background: #12202e;
}
`;

/** One completed or in-progress row: figure, machine, figure. */
function rowMarkup({ inspector, input, chain, output, live }) {
  const badges = chain
    .map((symbol) => `<span class="slot">${inspector.badgeSvg(symbol, SIZES.badge)}</span>`)
    .join('<span class="chev">\u203a</span>');

  const outCell =
    output === null
      ? '<span class="cell hole"></span>'
      : `<span class="cell">${inspector.figureSvg(output, SIZES.figure)}</span>`;

  return (
    `<div class="row ${live ? 'live' : 'past'}">` +
    `<span class="cell">${inspector.figureSvg(input, SIZES.figure)}</span>` +
    '<span class="chev">\u203a</span>' +
    `<span class="millbox"><span class="mill">${badges}</span></span>` +
    '<span class="chev">\u203a</span>' +
    outCell +
    '</div>'
  );
}

/** Whether two figure records are the same figure, for marking which card a demonstration matched. */
const sameFigure = (a, b) =>
  Boolean(a) &&
  Boolean(b) &&
  ['glyph', 'orient', 'shade', 'border', 'pair'].every((k) => a[k] === b[k]);

/**
 * The whole child screen.
 *
 * `view.kind` is one of:
 *   `pose`   beat one of a worked demonstration: the row posed exactly as a trial is posed, hole open
 *            and options shown but inert. Unscored. This is the screen that makes the task legible,
 *            and it says nothing about the mapping.
 *   `show`   beat two of the same demonstration: the hole filled by the figure the machine made, and
 *            the option it matches marked. A worked example of a whole trial, start to finish.
 *   `ask`    the live row with its last cell empty and the options below it, live.
 *   `answer` the same row completed by the figure the machine made, with the child's card marked.
 *
 * `history` is the reveals already shown, most recent last. Trimmed to `historyLimit` rows: the point
 * is to remove memory-for-reveals from the measurement, not to make the screen a spreadsheet.
 */
export function stageMarkup({ inspector, view, historyLimit = 3 }) {
  const history = (view.history ?? []).slice(-historyLimit);
  const past = history
    .map((entry) =>
      rowMarkup({
        inspector,
        input: entry.input,
        chain: entry.chain,
        output: entry.output,
        live: false,
      }),
    )
    .join('');

  const item = view.item;
  const filled = view.kind === 'show' || view.kind === 'answer';
  const live = rowMarkup({
    inspector,
    input: item.content.input,
    chain: item.content.chain,
    output: filled ? view.output : null,
    live: true,
  });

  // A demonstration's tray is `shown`: rendered as spans, so the options are visibly part of the task
  // being demonstrated and cannot be pressed. Accepting a choice that was never scored would teach
  // that choices do not matter, which is why beat one poses the question and answers it itself.
  const demo = view.kind === 'pose' || view.kind === 'show';
  const trayCls = demo ? ' shown' : view.kind === 'answer' ? ' done' : '';
  const tray =
    `<div class="tray${trayCls}">` +
    item.content.options
      .map((option) => {
        const marked = demo
          ? view.kind === 'show' && sameFigure(option.figure, view.output)
          : view.kind === 'answer' && option.key === view.chosenKey;
        const cls = ['card', demo || view.kind === 'answer' ? 'done' : '', marked ? 'mine' : '']
          .filter(Boolean)
          .join(' ');
        const label = esc(inspector.figureLabel(option.figure));
        const glyph = inspector.figureSvg(option.figure, SIZES.option);
        return demo
          ? `<span class="${cls}" role="img" aria-label="${label}">${glyph}</span>`
          : `<button class="${cls}" type="button" data-key="${esc(option.key)}" ` +
              `aria-label="${label}">${glyph}</button>`;
      })
      .join('') +
    '</div>';

  const button =
    demo || view.kind === 'answer'
      ? '<button class="kidbtn" type="button" id="kidNext">\u25b6</button>'
      : '';

  return `<div class="kid"><div class="tape">${past}${live}</div>${tray}${button}</div>`;
}
