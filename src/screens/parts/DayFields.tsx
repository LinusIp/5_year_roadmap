import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { editLog, readLog } from '../../lib/logs.ts';
import { useOptimistic } from '../../lib/useOptimistic.ts';
import { Row, RowList } from '../../ui/Row.tsx';
import { TextField } from '../../ui/TextField.tsx';

const ENERGY = ['Drained', 'Low', 'Even', 'Good', 'Sharp'];

/**
 * One line about the day, five dots for energy, and the freeze switch: what "How was today?" asks, and
 * what a day's sheet on Activity edits.
 */
export function DayFields({ date }: { date: string }) {
  const log = useLiveQuery(() => readLog(date), [date]);
  const [draft, setDraft] = useState<string | null>(null);
  const [energy, showEnergy] = useOptimistic(log?.energy);
  const [frozen, showFrozen] = useOptimistic(Boolean(log?.frozen));
  const saveReflection = (): void => {
    if (draft === null) return;
    const text = draft.trim();
    void editLog(date, (current) => {
      const next = { ...current };
      if (text) next.reflection = text;
      else delete next.reflection;
      return next;
    });
    setDraft(null);
  };

  return (
    <div className="space-y-4">
      <TextField label="One line about today" value={draft ?? log?.reflection ?? ''} onChange={setDraft} onBlur={saveReflection} multiline rows={2} />

      <div>
        <p id={'energy-' + date} className="text-meta text-ink2">
          Energy{energy ? ': ' + ENERGY[energy - 1] : ''}
        </p>
        <div role="radiogroup" aria-labelledby={'energy-' + date} className="-ml-3 flex">
          {([1, 2, 3, 4, 5] as const).map((value) => {
            const checked = energy === value;
            const filled = energy !== undefined && value <= energy;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={checked}
                aria-label={value + ' of 5, ' + ENERGY[value - 1]}
                className="grid size-11 place-items-center"
                onClick={() => {
                  const next = checked ? undefined : value;
                  showEnergy(next);
                  void editLog(date, (current) => {
                    const updated = { ...current };
                    if (next === undefined) delete updated.energy;
                    else updated.energy = next;
                    return updated;
                  });
                }}
              >
                <span className={'size-4 rounded-pill border ' + (filled ? 'border-accent bg-accent' : 'border-ink2')} />
              </button>
            );
          })}
        </div>
      </div>

      <RowList>
        <Row
          title="Use a freeze day"
          meta="Keeps the streak without logging time"
          toggle={{
            on: frozen,
            onChange: (next) => {
              showFrozen(next);
              void editLog(date, (current) => {
                const updated = { ...current };
                if (next) updated.frozen = true;
                else delete updated.frozen;
                return updated;
              });
            },
          }}
        />
      </RowList>
    </div>
  );
}
