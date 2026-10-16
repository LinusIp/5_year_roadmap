import { useState } from 'react';
import { TextField } from './TextField.tsx';

/** A whole number, saved on blur when it is within range. */
export function NumberField({ label, value, min, max, hint, onCommit }: { label: string; value: number; min: number; max: number; hint?: string; onCommit: (n: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const n = Number(draft);
  const bad = draft !== null && !(draft.trim() !== '' && Number.isFinite(n) && n >= min && n <= max);
  return (
    <TextField
      label={label}
      type="numeric"
      value={draft ?? String(value)}
      onChange={setDraft}
      hint={hint}
      error={bad ? 'Enter a number from ' + min + ' to ' + max + '.' : null}
      onBlur={() => {
        if (draft === null || bad) return;
        onCommit(Math.round(n));
        setDraft(null);
      }}
    />
  );
}

