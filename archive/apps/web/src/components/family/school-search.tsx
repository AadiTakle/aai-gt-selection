'use client';

import { useEffect, useRef, useState } from 'react';

import type { SchoolResult } from '@/app/api/schools/route';
import { useDebouncedCallback } from '@/lib/family/use-debounced';

import styles from './school-search.module.css';

const STATE_OPTIONS: [string, string][] = [
  ['AL', 'Alabama'],
  ['AK', 'Alaska'],
  ['AZ', 'Arizona'],
  ['AR', 'Arkansas'],
  ['CA', 'California'],
  ['CO', 'Colorado'],
  ['CT', 'Connecticut'],
  ['DE', 'Delaware'],
  ['FL', 'Florida'],
  ['GA', 'Georgia'],
  ['HI', 'Hawaii'],
  ['ID', 'Idaho'],
  ['IL', 'Illinois'],
  ['IN', 'Indiana'],
  ['IA', 'Iowa'],
  ['KS', 'Kansas'],
  ['KY', 'Kentucky'],
  ['LA', 'Louisiana'],
  ['ME', 'Maine'],
  ['MD', 'Maryland'],
  ['MA', 'Massachusetts'],
  ['MI', 'Michigan'],
  ['MN', 'Minnesota'],
  ['MS', 'Mississippi'],
  ['MO', 'Missouri'],
  ['MT', 'Montana'],
  ['NE', 'Nebraska'],
  ['NV', 'Nevada'],
  ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'],
  ['NY', 'New York'],
  ['NC', 'North Carolina'],
  ['ND', 'North Dakota'],
  ['OH', 'Ohio'],
  ['OK', 'Oklahoma'],
  ['OR', 'Oregon'],
  ['PA', 'Pennsylvania'],
  ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'],
  ['SD', 'South Dakota'],
  ['TN', 'Tennessee'],
  ['TX', 'Texas'],
  ['UT', 'Utah'],
  ['VT', 'Vermont'],
  ['VA', 'Virginia'],
  ['WA', 'Washington'],
  ['WV', 'West Virginia'],
  ['WI', 'Wisconsin'],
  ['WY', 'Wyoming'],
];

type SchoolSearchProps = {
  /** current chosen school display name (empty if none) */
  selectedName: string;
  onSelect: (school: SchoolResult) => void;
  onOther: () => void;
};

export function SchoolSearch({ selectedName, onSelect, onOther }: SchoolSearchProps) {
  const [stateAbbr, setStateAbbr] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SchoolResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const runSearch = useDebouncedCallback((st: string, q: string) => {
    if (!st) return;
    setLoading(true);
    void fetch(`/api/schools?state=${st}&q=${encodeURIComponent(q)}`)
      .then((r) => (r.ok ? r.json() : { schools: [] }))
      .then((data: { schools?: SchoolResult[] }) => {
        setResults(data.schools ?? []);
        setOpen(true);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, 300);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickAway);
    return () => document.removeEventListener('mousedown', onClickAway);
  }, []);

  return (
    <div className={styles.wrap} ref={boxRef}>
      <div className={styles.row}>
        <div className={styles.stateField}>
          <label className={styles.label}>State</label>
          <div className={styles.selectWrap}>
            <select
              className={styles.control}
              value={stateAbbr}
              onChange={(e) => {
                setStateAbbr(e.target.value);
                setResults([]);
                setQuery('');
              }}
            >
              <option value="">Select state…</option>
              {STATE_OPTIONS.map(([abbr, name]) => (
                <option key={abbr} value={abbr}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.searchField}>
          <label className={styles.label}>
            Current school{' '}
            {selectedName ? <span className={styles.chosen}>· {selectedName}</span> : null}
          </label>
          <input
            className={styles.control}
            type="text"
            placeholder={stateAbbr ? 'Type your school name…' : 'Choose a state first'}
            disabled={!stateAbbr}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              runSearch(stateAbbr, e.target.value);
            }}
            onFocus={() => {
              if (stateAbbr) runSearch(stateAbbr, query);
            }}
          />
        </div>
      </div>

      {open && stateAbbr ? (
        <div className={styles.results} role="listbox">
          {loading ? <div className={styles.hintRow}>Searching real schools…</div> : null}
          {!loading && results.length === 0 ? (
            <div className={styles.hintRow}>
              No matches. Try fewer letters, or choose “not listed”.
            </div>
          ) : null}
          {results.map((s) => (
            <button
              key={s.id}
              type="button"
              className={styles.resultRow}
              onClick={() => {
                onSelect(s);
                setQuery(s.name);
                setOpen(false);
              }}
            >
              <span className={styles.resultName}>{s.name}</span>
              <span className={styles.resultMeta}>
                {s.city}, {s.state} {s.zip}
              </span>
            </button>
          ))}
          <button
            type="button"
            className={`${styles.resultRow} ${styles.otherRow}`}
            onClick={() => {
              onOther();
              setOpen(false);
            }}
          >
            My school isn’t listed / home education
          </button>
        </div>
      ) : null}
      <p className={styles.source}>Schools from the U.S. Dept. of Education (NCES) directory.</p>
    </div>
  );
}
