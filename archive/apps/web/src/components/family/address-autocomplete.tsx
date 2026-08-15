'use client';

import { useEffect, useRef, useState } from 'react';

import type { AddressPrediction, ResolvedAddress } from '@/app/api/address/route';
import { useDebouncedCallback } from '@/lib/family/use-debounced';

import styles from './address-autocomplete.module.css';

/**
 * Address autocomplete. Queries `/api/address` (free, keyless OpenStreetMap
 * Nominatim by default). Each prediction carries its resolved parts, so
 * selecting one fills street/city/state/zip immediately.
 */
export function AddressAutocomplete({ onResolved }: { onResolved: (a: ResolvedAddress) => void }) {
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState<AddressPrediction[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const runSearch = useDebouncedCallback((q: string) => {
    if (q.trim().length < 3) {
      setPredictions([]);
      return;
    }
    void fetch(`/api/address?q=${encodeURIComponent(q)}`)
      .then((r) => (r.ok ? r.json() : { predictions: [] }))
      .then((data: { predictions?: AddressPrediction[] }) => {
        setPredictions(data.predictions ?? []);
        setOpen(true);
      })
      .catch(() => setPredictions([]));
  }, 400);

  function choose(prediction: AddressPrediction) {
    setOpen(false);
    onResolved(prediction.address);
  }

  useEffect(() => {
    function onAway(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onAway);
    return () => document.removeEventListener('mousedown', onAway);
  }, []);

  return (
    <div className={styles.wrap} ref={boxRef}>
      <label className={styles.label}>
        Find your address <span className={styles.opt}>start typing to autofill</span>
      </label>
      <input
        className={styles.control}
        type="text"
        placeholder="Start typing your address…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          runSearch(e.target.value);
        }}
        onFocus={() => {
          if (predictions.length) setOpen(true);
        }}
      />
      {open && predictions.length > 0 ? (
        <div className={styles.results} role="listbox">
          {predictions.map((p) => (
            <button
              key={p.id}
              type="button"
              className={styles.resultRow}
              onClick={() => {
                setQuery(p.label);
                choose(p);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
