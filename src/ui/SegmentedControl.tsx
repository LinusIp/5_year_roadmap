import { useRef } from 'react';

export interface Segment<T extends string> {
  value: T;
  label: string;
}

/**
 * Views, sort and group: one control, never a dropdown. Arrow keys move between segments. The track is 2 px
 * of line colour around 36 px segments, as in the mockup; each segment's tap target is 44 px tall.
 */
export function SegmentedControl<T extends string>({ label, options, value, onChange }: { label: string; options: Segment<T>[]; value: T; onChange: (value: T) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  const move = (to: number): void => {
    const next = (to + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className="grid rounded-button bg-line p-0.5" style={{ gridTemplateColumns: 'repeat(' + options.length + ', minmax(0, 1fr))' }}>
      {options.map((option, i) => {
        const checked = i === index;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                move(i + 1);
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                move(i - 1);
              }
            }}
            className="group -my-1 min-h-11 min-w-0"
          >
            <span className={'block h-9 truncate rounded-segment px-1 text-meta font-medium leading-9 ' + (checked ? 'bg-surface text-ink' : 'text-ink2 group-hover:text-ink')}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
