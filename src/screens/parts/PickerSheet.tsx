import { useState } from 'react';
import type { ReactNode } from 'react';
import { Row, RowList } from '../../ui/Row.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { TextField } from '../../ui/TextField.tsx';

export interface PickerOption {
  value: string;
  label: string;
  meta?: string;
  trailing?: ReactNode;
  /** Extra words the search matches, beyond the label. */
  keywords?: string;
}

/**
 * Anything with more than six options: a sheet with a search field and a list of rows. Choosing closes it.
 * With `multi`, rows tick on and off and the sheet stays open.
 */
export function PickerSheet({
  open,
  title,
  options,
  value,
  onPick,
  onClose,
  multi,
  clearLabel,
  searchLabel = 'Search',
}: {
  open: boolean;
  title: string;
  options: PickerOption[];
  /** The chosen value(s). */
  value: string | string[] | null;
  onPick: (value: string | null) => void;
  onClose: () => void;
  multi?: boolean;
  /** Offers "no selection" (for filters, where Any is the absence of a choice). */
  clearLabel?: string;
  searchLabel?: string;
}) {
  const [query, setQuery] = useState('');
  const chosen = new Set(Array.isArray(value) ? value : value ? [value] : []);
  const words = query.trim().toLowerCase();
  const shown = words ? options.filter((o) => (o.label + ' ' + (o.meta ?? '') + ' ' + (o.keywords ?? '')).toLowerCase().includes(words)) : options;
  const close = (): void => {
    setQuery('');
    onClose();
  };

  return (
    <Sheet open={open} title={title} onClose={close}>
      {options.length > 6 && <TextField label={searchLabel} value={query} onChange={setQuery} type="search" className="mb-3" />}
      <RowList>
        {clearLabel && !words && (
          <Row
            title={clearLabel}
            selected={chosen.size === 0}
            onClick={() => {
              onPick(null);
              if (!multi) close();
            }}
          />
        )}
        {shown.map((option) =>
          multi ? (
            <Row key={option.value} title={option.label} meta={option.meta} trailing={option.trailing} check={{ checked: chosen.has(option.value), onChange: () => onPick(option.value) }} />
          ) : (
            <Row
              key={option.value}
              title={option.label}
              meta={option.meta}
              trailing={option.trailing}
              selected={chosen.has(option.value)}
              onClick={() => {
                onPick(option.value);
                close();
              }}
            />
          ),
        )}
        {shown.length === 0 && <Row title={'Nothing matches "' + query.trim() + '"'} />}
      </RowList>
    </Sheet>
  );
}
