import { useCallback, useEffect, useMemo, useState } from 'react';

import { BriefCard } from './BriefCard';
import { LegendEditor } from './LegendEditor';
import { WritingList } from './WritingList';
import type {
  AssetPlan,
  BriefEdit,
  CatalogueType,
  LegendEntry,
  ThemeIssue,
  ThemePack,
} from './types';

/**
 * Theme planner: describe an idea, get the development plan, edit it, save it.
 *
 * The plan is not advice. Every asset in it is there because some selected question type cannot be
 * presented without it, and dropping that type is what removes the work. So the type selection at the
 * top is the real control and the asset list is downstream of it, which is the opposite of how a
 * moodboard works and is the point.
 *
 * Edits are held per brief id in localStorage, so changing the type selection re-derives the plan
 * without discarding anything already written.
 */

const EDITS_KEY = 'gt-theme-planner-edits';
const PACK_KEY = 'gt-theme-planner-pack';

const PRESETS: { id: string; label: string; hint: string; pick: (all: CatalogueType[]) => string[] }[] =
  [
    {
      id: 'cogat',
      label: 'CogAT-aligned only',
      hint: 'The 10 types with direct CogAT correspondence. The cheapest real screener',
      pick: (all) => all.filter((t) => t.cogat?.strength === 'direct').map((t) => t.typeCode),
    },
    {
      id: 'screening-form',
      label: "CogAT's own screening form",
      hint: 'Riverside screens on the analogies subtests: verbal, number, figure matrices',
      pick: (all) =>
        all
          .filter(
            (t) =>
              t.cogat?.strength === 'direct' &&
              ['verbal-analogies', 'number-analogies', 'figure-matrices'].includes(t.cogat.subtest),
          )
          .map((t) => t.typeCode),
    },
    {
      id: 'no-writing',
      label: 'Nothing to write',
      hint: 'Types a legend alone can theme. No new questions at all',
      pick: (all) => all.filter((t) => t.contextCost === 'legend-only').map((t) => t.typeCode),
    },
    {
      id: 'everything',
      label: 'The whole library',
      hint: 'All 53 types, so you can see the full ceiling',
      pick: (all) => all.map((t) => t.typeCode),
    },
  ];

const EMPTY_PACK: ThemePack = {
  theme: '',
  describes: '',
  legend: {
    counting: { label: '', order: 'ordered', values: [] },
    kind: { label: '', order: 'nominal', values: [] },
  },
};

export default function App() {
  const [catalogue, setCatalogue] = useState<CatalogueType[]>([]);
  const [idea, setIdea] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [plan, setPlan] = useState<AssetPlan | null>(null);
  const [pack, setPack] = useState<ThemePack>(EMPTY_PACK);
  const [edits, setEdits] = useState<Record<string, BriefEdit>>({});
  const [issues, setIssues] = useState<ThemeIssue[]>([]);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/catalogue');
        const body = (await res.json()) as { types: CatalogueType[] };
        setCatalogue(body.types);
        setSelected(
          new Set(body.types.filter((t) => t.cogat?.strength === 'direct').map((t) => t.typeCode)),
        );
      } catch {
        setError('Could not load the question type catalogue. Is the dev server running?');
      }
    })();

    try {
      const storedEdits = window.localStorage.getItem(EDITS_KEY);
      if (storedEdits) setEdits(JSON.parse(storedEdits) as Record<string, BriefEdit>);
      const storedPack = window.localStorage.getItem(PACK_KEY);
      if (storedPack) setPack(JSON.parse(storedPack) as ThemePack);
    } catch {
      // A corrupt draft should not stop the app from opening.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(EDITS_KEY, JSON.stringify(edits));
  }, [edits]);
  useEffect(() => {
    window.localStorage.setItem(PACK_KEY, JSON.stringify(pack));
  }, [pack]);

  const selectedCodes = useMemo(() => [...selected].sort(), [selected]);

  const generate = useCallback(async () => {
    if (selectedCodes.length === 0) {
      setError('Pick at least one question type. The plan is derived from them.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ idea, typeCodes: selectedCodes }),
      });
      const body = (await res.json()) as AssetPlan & { error?: string };
      if (body.error) setError(body.error);
      else setPlan(body);
    } catch {
      setError('Could not build the plan.');
    } finally {
      setBusy(false);
    }
  }, [idea, selectedCodes]);

  // Validate whenever the pack or the selection changes, so a legend gap is visible as it happens
  // rather than at save time.
  useEffect(() => {
    if (selectedCodes.length === 0) return;
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch('/api/validate', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ pack, typeCodes: selectedCodes }),
          });
          const body = (await res.json()) as { issues?: ThemeIssue[] };
          setIssues(body.issues ?? []);
        } catch {
          // Validation is advisory; a failed poll should not surface as an app error.
        }
      })();
    }, 350);
    return () => clearTimeout(timer);
  }, [pack, selectedCodes]);

  const save = useCallback(async () => {
    setSaved(null);
    setError(null);
    try {
      const res = await fetch('/api/save-theme', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pack }),
      });
      const body = (await res.json()) as { savedTo?: string; checkWith?: string; error?: string };
      if (body.error) setError(body.error);
      else setSaved(`${body.savedTo ?? ''}  ·  check it with: ${body.checkWith ?? ''}`);
    } catch {
      setError('Could not save the theme.');
    }
  }, [pack]);

  const errors = issues.filter((i) => i.severity === 'error');
  const warnings = issues.filter((i) => i.severity === 'warning');
  const byCost = plan?.writing;

  return (
    <div className="app">
      <header className="head">
        <div>
          <p className="kicker">Theme planner</p>
          <h1>What has to be built to put the screener in your world</h1>
          <p className="lede">
            Every asset below is here because a question type you selected cannot be presented without
            it. Nothing is a suggestion, and dropping a type is what removes work. Edit anything; your
            edits survive changing the selection.
          </p>
        </div>
      </header>

      {error ? <p className="error">{error}</p> : null}

      <section className="panel">
        <h2>1. The idea</h2>
        <label className="field">
          <span>Theme name</span>
          <input
            value={pack.theme}
            onChange={(e) => setPack({ ...pack, theme: e.target.value })}
            placeholder="gem-collector"
          />
        </label>
        <label className="field">
          <span>Describe it. Nouns from here seed the art briefs.</span>
          <textarea
            rows={3}
            value={idea}
            onChange={(e) => {
              setIdea(e.target.value);
              setPack({ ...pack, describes: e.target.value });
            }}
            placeholder="A dragon hoard world where kids collect gems and chests, trade with factions, and breed creatures."
          />
        </label>
      </section>

      <section className="panel">
        <h2>2. Which questions</h2>
        <p className="note">
          {selectedCodes.length} of {catalogue.length} types selected.
        </p>
        <div className="presets">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="preset"
              onClick={() => setSelected(new Set(preset.pick(catalogue)))}
              title={preset.hint}
            >
              <strong>{preset.label}</strong>
              <span>{preset.hint}</span>
            </button>
          ))}
        </div>
        <details>
          <summary>Pick types individually</summary>
          <div className="typegrid">
            {catalogue.map((type) => (
              <label key={type.typeCode} className="typerow">
                <input
                  type="checkbox"
                  checked={selected.has(type.typeCode)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    if (e.target.checked) next.add(type.typeCode);
                    else next.delete(type.typeCode);
                    setSelected(next);
                  }}
                />
                <code>{type.typeCode}</code>
                {type.cogat ? (
                  <span className={`tag ${type.cogat.strength}`}>{type.cogat.subtest}</span>
                ) : (
                  <span className="tag none">no CogAT analogue</span>
                )}
                <span className={`cost ${type.contextCost}`}>{type.contextCost}</span>
              </label>
            ))}
          </div>
        </details>
        <button type="button" className="primary" onClick={() => void generate()} disabled={busy}>
          {busy ? 'Working…' : plan ? 'Rebuild the plan' : 'Build the plan'}
        </button>
      </section>

      {plan ? (
        <>
          <section className="panel">
            <h2>3. What it costs</h2>
            <div className="totals">
              <div>
                <strong>{plan.totals.artPieces}</strong>
                <span>pieces of art</span>
              </div>
              <div>
                <strong>{plan.totals.interactions}</strong>
                <span>interactions to build</span>
              </div>
              <div>
                <strong>{plan.totals.promptsToRewrite}</strong>
                <span>prompts to re-voice</span>
              </div>
              <div>
                <strong>{plan.totals.typesNeedingNewItems}</strong>
                <span>types needing new questions</span>
              </div>
            </div>
            <p className="note">
              {byCost ? byCost['legend-only'].length + byCost.revoice.length : 0} of{' '}
              {selectedCodes.length} selected types need no new questions written at all.
            </p>
          </section>

          <section className="panel">
            <h2>4. The art and interaction briefs</h2>
            <p className="note">
              Sorted by how many question types depend on each one, so the top of the list is the
              reused work and the bottom is what a single type is costing you.
            </p>
            {plan.briefs.map((brief) => (
              <BriefCard
                key={brief.id}
                brief={brief}
                edit={edits[brief.id] ?? {}}
                onChange={(next) => setEdits({ ...edits, [brief.id]: next })}
              />
            ))}
          </section>

          <section className="panel">
            <h2>5. The legend, which every type shares</h2>
            <p className="note">
              These are the reused elements. One variable is used by many question types, so editing it
              here changes all of them at once.
            </p>
            <LegendEditor
              legend={pack.legend}
              onChange={(legend: Record<string, LegendEntry>) => setPack({ ...pack, legend })}
            />
            {errors.length > 0 ? (
              <div className="issues error">
                <strong>Must fix before this theme can serve every selected type</strong>
                <ul>
                  {errors.map((issue, i) => (
                    <li key={i}>
                      {issue.typeCode ? <code>{issue.typeCode}</code> : null} {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="ok">
                No blocking problems. This legend can carry all {selectedCodes.length} selected types.
              </p>
            )}
            {warnings.length > 0 ? (
              <details className="issues warn">
                <summary>{warnings.length} things worth a look</summary>
                <ul>
                  {warnings.map((issue, i) => (
                    <li key={i}>
                      {issue.typeCode ? <code>{issue.typeCode}</code> : null} {issue.message}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </section>

          <WritingList
            catalogue={catalogue}
            writing={plan.writing}
            pack={pack}
            onPack={setPack}
          />

          <section className="panel">
            <h2>7. Save it</h2>
            <p className="note">
              Writes a theme pack next to the bundled examples, where the command line tool can check
              it.
            </p>
            <button type="button" className="primary" onClick={() => void save()}>
              Save theme pack
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => {
                const blob = new Blob([JSON.stringify(pack, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${pack.theme || 'theme'}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download instead
            </button>
            {saved ? <p className="ok mono">{saved}</p> : null}
          </section>
        </>
      ) : null}
    </div>
  );
}
