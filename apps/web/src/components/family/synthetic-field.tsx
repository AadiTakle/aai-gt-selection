'use client';

import { type ReactNode, useId } from 'react';

import type { VocabOption } from '@/lib/family/vocab';

import styles from './synthetic-field.module.css';

type FieldShellProps = {
  label: string;
  required?: boolean | undefined;
  hint?: string | undefined;
  children: ReactNode;
};

export function Field({ label, required, hint, children }: FieldShellProps) {
  return (
    <label className={styles.field}>
      <span className={styles.label}>
        {label}
        {required ? (
          <span className={styles.req}> *</span>
        ) : (
          <span className={styles.opt}> optional</span>
        )}
      </span>
      {children}
      {hint ? <span className={styles.hint}>{hint}</span> : null}
    </label>
  );
}

type SelectProps = {
  label: string;
  options: VocabOption[];
  value: string;
  onChange: (code: string) => void;
  required?: boolean;
  hint?: string;
  placeholder?: string;
};

export function SyntheticSelect({
  label,
  options,
  value,
  onChange,
  required,
  hint,
  placeholder = 'Select…',
}: SelectProps) {
  return (
    <Field label={label} required={required} hint={hint}>
      <div className={styles.selectWrap}>
        <select
          className={styles.control}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="" disabled>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.code} value={option.code}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </Field>
  );
}

type TextInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'date' | 'number';
  required?: boolean;
  hint?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  inputMode?: 'numeric' | 'text';
};

export function TextField({
  label,
  value,
  onChange,
  type = 'text',
  required,
  hint,
  placeholder,
  min,
  max,
  inputMode,
}: TextInputProps) {
  return (
    <Field label={label} required={required} hint={hint}>
      <input
        className={styles.control}
        type={type}
        value={value}
        placeholder={placeholder}
        min={min}
        max={max}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

type ToggleProps = {
  legend: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
};

/**
 * Tri-state yes/no. `value === null` means unanswered (nothing highlighted), so
 * a section is never silently "complete" before the family has chosen. The
 * chosen option is clearly highlighted.
 */
export function YesNoToggle({
  legend,
  value,
  onChange,
  yesLabel = 'Yes',
  noLabel = 'No',
}: ToggleProps) {
  return (
    <div className={styles.toggleRow} role="group" aria-label={legend}>
      <span className={styles.toggleLegend}>{legend}</span>
      <div className={styles.segmented}>
        <button
          type="button"
          aria-pressed={value === true}
          className={value === true ? styles.segActive : undefined}
          onClick={() => onChange(true)}
        >
          {yesLabel}
        </button>
        <button
          type="button"
          aria-pressed={value === false}
          className={value === false ? styles.segActive : undefined}
          onClick={() => onChange(false)}
        >
          {noLabel}
        </button>
      </div>
    </div>
  );
}

type ChipsProps = {
  label: string;
  options: VocabOption[];
  selected: string[];
  onToggle: (code: string) => void;
};

export function ChipMultiSelect({ label, options, selected, onToggle }: ChipsProps) {
  const groupId = useId();
  return (
    <div className={styles.field}>
      <span className={styles.label} id={groupId}>
        {label}
        <span className={styles.opt}> select all that apply</span>
      </span>
      <div className={styles.chips} role="group" aria-labelledby={groupId}>
        {options.map((option) => {
          const active = selected.includes(option.code);
          return (
            <button
              key={option.code}
              type="button"
              aria-pressed={active}
              className={active ? `${styles.chip} ${styles.chipActive}` : styles.chip}
              onClick={() => onToggle(option.code)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function RevealGroup({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className={open ? `${styles.reveal} ${styles.revealOpen}` : styles.reveal}>
      <div className={styles.revealInner}>{children}</div>
    </div>
  );
}
