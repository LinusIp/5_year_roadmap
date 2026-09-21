import { useState } from 'react';
import { Markdown } from '../lib/markdown.tsx';

interface NotesEditorProps {
  label: string;
  value: string | undefined;
  onSave: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

/**
 * A Markdown field with a write / preview switch. It saves when it loses focus, so there is no save button to
 * forget, and it keeps its draft if the stored value changes underneath it while it is being typed in.
 *
 * Mount it only once the stored value is known: it opens in preview when there is a note and in write mode
 * when there is none, and it can only tell those apart from "still loading" if it is not asked to guess.
 */
export function NotesEditor({ label, value, onSave, placeholder, rows = 5 }: NotesEditorProps) {
  const [mode, setMode] = useState<'write' | 'preview'>(value ? 'preview' : 'write');
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value ?? '';

  const commit = (): void => {
    if (draft === null) return;
    if (draft !== (value ?? '')) onSave(draft);
    setDraft(null);
  };

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label mb-0">{label}</span>
        <div className="flex gap-1" role="tablist" aria-label={label + ' view'}>
          {(['write', 'preview'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              className={'btn btn-sm' + (mode === m ? ' btn-primary' : ' btn-ghost')}
              onClick={() => {
                commit();
                setMode(m);
              }}
            >
              {m === 'write' ? 'Write' : 'Preview'}
            </button>
          ))}
        </div>
      </div>
      {mode === 'write' ? (
        <textarea
          className="input font-mono text-[0.8125rem]"
          rows={rows}
          value={text}
          placeholder={placeholder}
          aria-label={label}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
        />
      ) : text.trim() ? (
        // Not a button: button content is presentational, so the note's headings and links would vanish for
        // screen readers, and a link inside a button is invalid. The Write tab above switches back.
        <div className="rounded-lg border border-line p-3">
          <Markdown source={text} />
        </div>
      ) : (
        <button type="button" className="w-full rounded-lg border border-dashed border-line p-3 text-left text-sm text-ink-3" onClick={() => setMode('write')}>
          {placeholder ?? 'Nothing yet. Click to write.'}
        </button>
      )}
      {mode === 'write' && <p className="mt-1 text-xs text-ink-3">Markdown: **bold**, *italic*, `code`, [links](https://…), lists and headings.</p>}
    </div>
  );
}
