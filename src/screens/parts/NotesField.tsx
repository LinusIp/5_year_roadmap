import { useEffect, useRef, useState } from 'react';
import { Markdown } from '../../lib/markdown.tsx';
import { Button } from '../../ui/Button.tsx';
import { TextField } from '../../ui/TextField.tsx';

/**
 * Markdown notes: read as text, edited in a field. Saved when the field loses focus or on "Save".
 * `startEditing` opens straight into the field (Today's "Add a note").
 */
export function NotesField({ label, value, onSave, startEditing }: { label: string; value: string | undefined; onSave: (text: string) => void; startEditing?: boolean }) {
  const [draft, setDraft] = useState<string | null>(startEditing || !value ? (value ?? '') : null);
  const touched = useRef(false);
  const editing = draft !== null;

  // The notes can arrive after the first render (they come from a live query), so an empty field nobody has
  // typed in gives way to the saved text once it is there.
  useEffect(() => {
    if (value && draft === '' && !touched.current && !startEditing) setDraft(null);
  }, [value, draft, startEditing]);

  const save = (): void => {
    if (draft === null) return;
    onSave(draft.trim() ? draft : '');
    if (draft.trim()) setDraft(null);
  };

  if (!editing) {
    return (
      <div>
        <Markdown source={value ?? ''} className="prose-notes text-body" />
        <Button className="mt-2" onClick={() => setDraft(value ?? '')}>
          Edit {label.toLowerCase()}
        </Button>
      </div>
    );
  }
  return (
    <div>
      <TextField
        label={label}
        value={draft}
        onChange={(text) => {
          touched.current = true;
          setDraft(text);
        }}
        onBlur={save}
        multiline
        rows={4}
        autoFocus={startEditing}
        hint="Markdown works: # headings, - lists, **bold**, [links](https://…)."
      />
    </div>
  );
}
