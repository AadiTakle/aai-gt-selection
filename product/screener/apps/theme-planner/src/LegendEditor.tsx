import type { ChannelOrder, LegendEntry } from './types';

/**
 * The legend: what each abstract variable becomes in this world.
 *
 * The `order` control is the one that matters and the reason it carries a warning. A variable whose
 * rule is a progression, mapped onto unordered values, produces an item that looks completely finished
 * and cannot be solved, because "the next one along" is not visible to the child. Colours are the
 * classic trap: they are the most tempting thing to vary and they have no order.
 */

const ORDER_HELP: Record<ChannelOrder, string> = {
  ordered:
    'Runs least to most, in even steps. Counting is safest, size works. NOT colour: a child cannot say which colour comes next.',
  nominal: 'Merely different from each other. Species, factions, symbols. No order implied.',
  cyclic: 'Wraps around, like orientation. Needs a visibly asymmetric shape or a quarter turn is invisible.',
};

export function LegendEditor({
  legend,
  onChange,
}: {
  legend: Record<string, LegendEntry>;
  onChange: (next: Record<string, LegendEntry>) => void;
}) {
  const update = (name: string, entry: LegendEntry) => onChange({ ...legend, [name]: entry });

  const rename = (from: string, to: string) => {
    if (!to || to === from || legend[to]) return;
    const next: Record<string, LegendEntry> = {};
    for (const [key, value] of Object.entries(legend)) next[key === from ? to : key] = value;
    onChange(next);
  };

  const remove = (name: string) => {
    const next = { ...legend };
    delete next[name];
    onChange(next);
  };

  const add = () => {
    let name = 'variable';
    let n = 2;
    while (legend[name]) name = `variable${String(n++)}`;
    onChange({ ...legend, [name]: { label: '', order: 'nominal', values: [] } });
  };

  return (
    <div className="legend">
      {Object.entries(legend).map(([name, entry]) => (
        <div key={name} className="legendrow">
          <div className="legendtop">
            <label className="field narrow">
              <span>Variable</span>
              <input
                defaultValue={name}
                onBlur={(e) => rename(name, e.target.value.trim())}
                title="Internal name. Question types refer to variables, never to what they look like."
              />
            </label>
            <label className="field">
              <span>What it is in your world</span>
              <input
                value={entry.label}
                placeholder="how many gems the chest holds"
                onChange={(e) => update(name, { ...entry, label: e.target.value })}
              />
            </label>
            <label className="field narrow">
              <span>Ordering</span>
              <select
                value={entry.order}
                onChange={(e) =>
                  update(name, { ...entry, order: e.target.value as ChannelOrder })
                }
              >
                <option value="ordered">ordered</option>
                <option value="nominal">nominal</option>
                <option value="cyclic">cyclic</option>
              </select>
            </label>
            <button type="button" className="ghost small" onClick={() => remove(name)}>
              Remove
            </button>
          </div>

          <p className={`orderhelp ${entry.order}`}>{ORDER_HELP[entry.order]}</p>

          <label className="field">
            <span>
              Its values, in order, one per line. {entry.values.length} so far
            </span>
            <textarea
              rows={Math.min(8, Math.max(3, entry.values.length + 1))}
              value={entry.values.join('\n')}
              placeholder={'1 gem\n2 gems\n3 gems'}
              onChange={(e) =>
                update(name, {
                  ...entry,
                  values: e.target.value.split('\n').map((v) => v.trim()).filter(Boolean),
                })
              }
            />
          </label>
        </div>
      ))}
      <button type="button" className="ghost" onClick={add}>
        Add a variable
      </button>
    </div>
  );
}
