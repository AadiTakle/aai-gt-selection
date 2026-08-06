import type { CatalogueType, ContextCost, ThemePack } from './types';

/**
 * The writing, separated by whether it changes the instrument.
 *
 * Re-voicing rewrites an instruction: one sentence per type, and it cannot change what is measured
 * because the reasoning lives in the structure. Re-authoring writes new material per item, because for
 * a Sentence Completion type the sentence IS the item, so a themed version is a new question at a new
 * difficulty. Presenting them as one list is what makes people underestimate the second.
 */

const HEADINGS: Record<ContextCost, { title: string; blurb: string }> = {
  'legend-only': {
    title: 'Nothing to write',
    blurb:
      'The legend above is the whole job for these. No words appear in the items, so they arrive themed the moment the variables are mapped.',
  },
  revoice: {
    title: 'One instruction each',
    blurb:
      'Rewrite the instruction in your world. Once per type, not per question, and it cannot change what the item measures.',
  },
  reauthor: {
    title: 'New questions, per item',
    blurb:
      'The material is the construct here, so a themed version is new writing at a new difficulty. Treat the result as its own instrument and review it, rather than as a re-skin.',
  },
};

export function WritingList({
  catalogue,
  writing,
  pack,
  onPack,
}: {
  catalogue: CatalogueType[];
  writing: Readonly<Record<ContextCost, readonly string[]>>;
  pack: ThemePack;
  onPack: (next: ThemePack) => void;
}) {
  const byCode = new Map(catalogue.map((t) => [t.typeCode, t]));

  const setPrompt = (typeCode: string, prompt: string) => {
    const voice = { ...(pack.voice ?? {}) };
    if (prompt.trim()) voice[typeCode] = { prompt };
    else delete voice[typeCode];
    onPack({ ...pack, voice });
  };

  return (
    <section className="panel">
      <h2>6. The writing</h2>

      {(['revoice', 'reauthor', 'legend-only'] as const).map((cost) => {
        const codes = writing[cost];
        if (codes.length === 0) return null;
        const heading = HEADINGS[cost];
        return (
          <div key={cost} className={`writegroup ${cost}`}>
            <h3>
              {heading.title} <span className="count">{codes.length}</span>
            </h3>
            <p className="note">{heading.blurb}</p>

            {cost === 'legend-only' ? (
              <p className="mono small">{codes.join(', ')}</p>
            ) : (
              codes.map((typeCode) => {
                const type = byCode.get(typeCode);
                return (
                  <div key={typeCode} className="writerow">
                    <div className="writemeta">
                      <code>{typeCode}</code>
                      {type?.cogat ? <span className="tag direct">{type.cogat.subtest}</span> : null}
                      <span className="why">{type?.contextWhy}</span>
                    </div>

                    {cost === 'revoice' ? (
                      <label className="field">
                        <span>Instruction, in your world</span>
                        <input
                          value={pack.voice?.[typeCode]?.prompt ?? ''}
                          placeholder="Which chest finishes the row?"
                          onChange={(e) => setPrompt(typeCode, e.target.value)}
                        />
                      </label>
                    ) : (
                      <div className="supplies">
                        <span>Somebody has to write, per question:</span>
                        <ul>
                          {(type?.authorSupplies ?? ['themed content']).map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                        <p className="note small">
                          Author these in the bank rather than here. This list exists so the work is
                          costed rather than discovered late.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </section>
  );
}
