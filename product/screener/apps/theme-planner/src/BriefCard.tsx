import { useState } from 'react';

import type { AssetBrief, BriefEdit } from './types';

/**
 * One asset brief, editable in place.
 *
 * `neededBy` is shown rather than hidden because it is the argument for the work existing. A brief
 * eleven types depend on is shared infrastructure; a brief one type depends on is a line item that
 * disappears if that type is dropped, and a producer should be able to see which they are looking at.
 */
export function BriefCard({
  brief,
  edit,
  onChange,
}: {
  brief: AssetBrief;
  edit: BriefEdit;
  onChange: (next: BriefEdit) => void;
}) {
  const [open, setOpen] = useState(false);
  const title = edit.title ?? brief.title;
  const text = edit.brief ?? brief.brief;
  const quantity = edit.quantity ?? brief.quantity;
  const edited = edit.title !== undefined || edit.brief !== undefined || edit.quantity !== undefined;
  const sole = brief.neededBy.length === 1;

  return (
    <article className={`brief ${edit.done ? 'done' : ''}`}>
      <div className="briefhead">
        <label className="check">
          <input
            type="checkbox"
            checked={edit.done ?? false}
            onChange={(e) => onChange({ ...edit, done: e.target.checked })}
          />
        </label>
        <div className="brieftitle">
          <h3>{title}</h3>
          <p className="briefmeta">
            <span className={`kind ${brief.kind}`}>{brief.kind}</span>
            <code>{brief.element}</code>
            <span>{quantity === 1 ? '1 piece' : `${quantity} pieces`}</span>
            <span className={sole ? 'sole' : 'shared'}>
              {sole
                ? `only ${brief.neededBy[0]} needs this`
                : `${brief.neededBy.length} types need this`}
            </span>
            {edited ? <span className="editedflag">edited</span> : null}
          </p>
        </div>
        <button type="button" className="ghost small" onClick={() => setOpen(!open)}>
          {open ? 'Close' : 'Edit'}
        </button>
      </div>

      <p className="briefbody">{text}</p>

      {open ? (
        <div className="briefedit">
          <label className="field">
            <span>Title</span>
            <input value={title} onChange={(e) => onChange({ ...edit, title: e.target.value })} />
          </label>
          <label className="field">
            <span>Brief</span>
            <textarea
              rows={4}
              value={text}
              onChange={(e) => onChange({ ...edit, brief: e.target.value })}
            />
          </label>
          <label className="field narrow">
            <span>How many pieces</span>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => onChange({ ...edit, quantity: Number(e.target.value) })}
            />
          </label>
          <details>
            <summary>Which types need this</summary>
            <p className="mono small">{brief.neededBy.join(', ')}</p>
          </details>
          {edited ? (
            <button
              type="button"
              className="ghost small"
              onClick={() => onChange({ done: edit.done })}
            >
              Reset to the generated version
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
