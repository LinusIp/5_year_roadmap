import { useId } from 'react';
import type { KeyboardEvent, Ref } from 'react';
import { Icon } from './Icon.tsx';

export interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** number fields are text with a numeric keyboard: no native spinners. */
  type?: 'text' | 'password' | 'search' | 'url' | 'numeric';
  multiline?: boolean;
  rows?: number;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  /** Shown under the field, in ink, announced to screen readers. */
  error?: string | null;
  hint?: string;
  autoFocus?: boolean;
  autoComplete?: string;
  inputRef?: Ref<HTMLInputElement>;
  /** Marks the field the "/" shortcut focuses. */
  searchBox?: boolean;
  className?: string;
}

/**
 * 44 px tall, a hairline border that turns accent on focus. The label sits in the field like a placeholder
 * and moves above the value once there is one, in 100 ms.
 */
export function TextField({ label, value, onChange, type = 'text', multiline, rows = 3, onBlur, onKeyDown, error, hint, autoFocus, autoComplete, inputRef, searchBox, className = '' }: TextFieldProps) {
  const id = useId();
  const describedBy = error ? id + '-error' : hint ? id + '-hint' : undefined;
  const field =
    'peer block w-full rounded-button border bg-surface px-3 text-body text-ink outline-none focus:border-accent ' +
    (error ? 'border-ink ' : 'border-line ');
  const floating =
    'pointer-events-none absolute left-3 top-1.5 text-meta leading-none text-ink2 transition-[top,font-size] duration-100 ' +
    'peer-focus:top-1.5 peer-focus:text-meta';

  return (
    <div className={className}>
      <div className="relative">
        {multiline ? (
          <textarea
            id={id}
            className={field + 'min-h-24 resize-y pb-2 pt-6'}
            rows={rows}
            value={value}
            placeholder=" "
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- only for fields that appear because the user asked for them
            autoFocus={autoFocus}
          />
        ) : (
          <input
            id={id}
            ref={inputRef}
            type={type === 'numeric' ? 'text' : type}
            inputMode={type === 'numeric' ? 'numeric' : undefined}
            className={field + 'h-11 pb-0.5 pt-4'}
            value={value}
            placeholder=" "
            onChange={(e) => onChange(e.target.value)}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            autoComplete={autoComplete}
            spellCheck={type === 'password' || type === 'url' ? false : undefined}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            data-search-box={searchBox ? '' : undefined}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- only for fields that appear because the user asked for them
            autoFocus={autoFocus}
          />
        )}
        <label
          htmlFor={id}
          className={floating + (multiline ? ' peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-body' : ' peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-body')}
        >
          {label}
        </label>
      </div>
      {error && (
        <p id={id + '-error'} role="alert" className="mt-1 text-meta font-medium text-ink">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={id + '-hint'} className="mt-1 text-meta text-ink2">
          {hint}
        </p>
      )}
    </div>
  );
}

/**
 * The Library's search, as in the mockup: a magnifier inside the field and a placeholder that says what can be
 * found. The field's name is a visually hidden label, so the placeholder never has to stand in for it.
 */
export function SearchField({ label, placeholder, value, onChange, searchBox, className = '' }: { label: string; placeholder: string; value: string; onChange: (value: string) => void; searchBox?: boolean; className?: string }) {
  const id = useId();
  return (
    <div className={'relative flex items-center ' + className}>
      <Icon name="search" size={18} className="pointer-events-none absolute left-3.5 text-ink2" />
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        data-search-box={searchBox ? '' : undefined}
        className="h-11 w-full rounded-button border border-line bg-surface pl-[42px] pr-3.5 text-body text-ink outline-none placeholder:text-ink2 focus:border-accent"
      />
    </div>
  );
}
