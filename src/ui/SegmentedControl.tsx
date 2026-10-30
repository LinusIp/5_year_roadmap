import { useRef } from 'react';
import { useEdgeFade } from './edgeFade.ts';

export interface Segment<T extends string> {
  value: T;
  label: string;
  /** The full name when the label is a short form ("Certs" for Credentials): what assistive tech reads. */
  name?: string;
}

/**
 * Views, sort and group: one control, never a dropdown. Arrow keys move between segments. A sunken pill track; the
 * selected segment is a raised pill in blue-deep. Each segment's tap target is 44 px tall. A label is never cut:
 * the segments share the width while they fit, and past it the track scrolls sideways under an edge fade
 * (ATLAS-UI-POLISH).
 */
export function SegmentedControl<T extends string>({ label, options, value, onChange }: { label: string; options: Segment<T>[]; value: T; onChange: (value: T) => void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const strip = useRef<HTMLDivElement>(null);
  useEdgeFade(strip, 'current');
  const index = Math.max(0, options.findIndex((o) => o.value === value));

  const move = (to: number): void => {
    const next = (to + options.length) % options.length;
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };

  return (
    <div className="well fade-strip rounded-pill p-[5px]">
      <div ref={strip} role="radiogroup" aria-label={label} className="flex gap-1 overflow-x-auto rounded-pill [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
            aria-label={option.name}
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
            className={'min-h-11 flex-1 shrink-0 whitespace-nowrap rounded-pill px-3 text-chip ' + (checked ? 'knob rounded-pill font-semibold text-blue-deep' : 'font-medium text-ink2 hover:text-ink')}
          >
            {option.label}
          </button>
        );
      })}
      </div>
    </div>
  );
}
