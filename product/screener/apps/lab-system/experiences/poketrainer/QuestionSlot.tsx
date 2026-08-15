import type { CSSProperties } from 'react';

import type { Choice, Facets, Question } from '../../shared/headless/adapt';

export interface QuestionSlotProps {
  readonly question: Question;
  readonly onAnswer: (choice: Choice) => void;
  readonly busy: boolean;
}

/**
 * THE SWAP POINT. This whole component is placeholder and will be replaced by a new question
 * presentation system. Keep it plain: render the stem as minimally as possible, render the choices as
 * plain buttons, and put NO Pokémon styling in here. Nothing outside this file may depend on its
 * internals.
 *
 * Self-contained on purpose. Every style it uses is in this file, it imports no stylesheet and it
 * carries no class names, so deleting the file removes the whole of it and the replacement inherits
 * nothing it did not ask for. The only contract is {@link QuestionSlotProps}.
 */

const style = {
  root: { font: '15px/1.45 system-ui, sans-serif', color: '#111' },
  stem: { border: '1px solid #999', padding: '10px 12px', marginBottom: 12, background: '#fff' },
  label: { fontSize: 12, color: '#555', margin: '0 0 6px' },
  line: { margin: '0 0 4px' },
  list: { margin: '4px 0 0', paddingLeft: 20 },
  grid: { borderCollapse: 'collapse' as const, margin: '4px 0 0' },
  cell: { border: '1px solid #bbb', padding: '4px 8px', fontSize: 13, minWidth: 56, textAlign: 'left' as const },
  choices: { display: 'flex', flexWrap: 'wrap' as const, gap: 8 },
  button: { font: 'inherit', padding: '10px 14px', border: '1px solid #666', background: '#fff', color: '#111', cursor: 'pointer', textAlign: 'left' as const },
} satisfies Record<string, CSSProperties>;

/** Every facet that is set, as `key: value`. No interpretation, no mapping, no drawing. */
function describe(f: Facets): string {
  const parts: string[] = [];
  if (f.shape !== undefined) parts.push(`shape ${f.shape}`);
  if (f.glyph !== undefined) parts.push(`glyph ${f.glyph}`);
  if (f.color !== undefined) parts.push(`colour ${f.color}`);
  if (f.fill !== undefined) parts.push(`fill ${f.fill}`);
  if (f.pos !== undefined) parts.push(`position ${f.pos}`);
  if (f.border !== undefined) parts.push(`border ${f.border}`);
  if (f.count !== undefined) parts.push(`count ${f.count}`);
  if (f.size !== undefined) parts.push(`size ${f.size}`);
  if (f.rot !== undefined) parts.push(`rotation ${f.rot}`);
  if (f.tilt !== undefined) parts.push(`tilt ${f.tilt}`);
  if (f.text !== undefined) parts.push(f.text);
  if (f.value !== undefined) parts.push(String(f.value));
  if (f.blocks !== undefined) parts.push(`blocks ${f.blocks.join(', ')}`);
  if (f.seq !== undefined) parts.push(`steps ${f.seq.join(' then ')}`);
  if (f.series !== undefined) parts.push(`series ${f.series.join(', ')}`);
  if (f.note !== undefined) parts.push(f.note);
  return parts.length > 0 ? parts.join(', ') : 'no details';
}

/** The label on a choice button: its own text or number when it has one, otherwise its position. */
function labelFor(choice: Choice, index: number): string {
  const { text, value } = choice.facets;
  if (text !== undefined && text !== '') return text;
  if (value !== undefined) return String(value);
  const rest = describe(choice.facets);
  return rest === 'no details' ? `Option ${index + 1}` : `Option ${index + 1}: ${rest}`;
}

function Stem({ question }: { question: Question }) {
  const stem = question.stem;

  switch (stem.kind) {
    case 'compare':
      return (
        <div>
          <p style={style.line}>Left: {describe(stem.left)}</p>
          <p style={style.line}>Right: {describe(stem.right)}</p>
          <p style={style.line}>Which has {stem.wants}?</p>
        </div>
      );

    case 'matrix': {
      const rows: number[] = [];
      for (let r = 0; r < stem.rows; r++) rows.push(r);
      const cols: number[] = [];
      for (let c = 0; c < stem.cols; c++) cols.push(c);
      return (
        <table style={style.grid}>
          <tbody>
            {rows.map((r) => (
              <tr key={r}>
                {cols.map((c) => {
                  const cell = stem.cells[r * stem.cols + c];
                  return (
                    <td key={c} style={style.cell}>
                      {cell === null || cell === undefined ? '?' : describe(cell)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    case 'transform':
      return (
        <div>
          <p style={style.line}>Start: {describe(stem.input)}</p>
          <p style={style.line}>Steps: {stem.chain.join(' then ')}</p>
          {stem.vocabulary.length > 0 ? <p style={style.line}>Possible steps: {stem.vocabulary.join(', ')}</p> : null}
        </div>
      );

    case 'constraints':
      return (
        <ul style={style.list}>
          {stem.clues.map((clue, i) => (
            <li key={i}>{clue}</li>
          ))}
        </ul>
      );

    case 'passage':
      return (
        <div>
          {stem.title !== '' ? <p style={style.line}>{stem.title}</p> : null}
          {stem.sentences.map((s, i) => (
            <p key={i} style={style.line}>
              {s}
            </p>
          ))}
          {stem.question !== '' ? <p style={style.line}>{stem.question}</p> : null}
        </div>
      );

    case 'pairs':
      return (
        <ol style={style.list}>
          {stem.rows.map((row) => (
            <li key={row.key}>
              {describe(row.left)} / {describe(row.right)}
            </li>
          ))}
        </ol>
      );

    case 'target':
      return (
        <div>
          {stem.target.map((t, i) => (
            <p key={i} style={style.line}>
              Target: {describe(t)}
            </p>
          ))}
          {stem.note !== '' ? <p style={style.line}>{stem.note}</p> : null}
        </div>
      );

    default:
      return null;
  }
}

export function QuestionSlot({ question, onAnswer, busy }: QuestionSlotProps) {
  const hasStem = question.stem.kind !== 'plain';
  return (
    <div style={style.root}>
      <p style={style.label}>{question.ask}</p>
      {hasStem ? (
        <div style={style.stem}>
          <Stem question={question} />
        </div>
      ) : null}
      <div style={style.choices}>
        {question.choices.map((choice, i) => (
          <button
            key={choice.key}
            type="button"
            style={style.button}
            disabled={busy}
            onClick={() => onAnswer(choice)}
          >
            {question.choicesAreStemRows ? `Row ${i + 1}` : labelFor(choice, i)}
          </button>
        ))}
      </div>
    </div>
  );
}
