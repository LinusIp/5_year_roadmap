import { useState } from 'react';
import type { StoredSettings } from '../../db/types.ts';
import { seed } from '../../seed/index.ts';
import { NumberField } from '../../ui/NumberField.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { PickerSheet } from '../parts/PickerSheet.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { Problem, Section, parseDateInput, saveCore } from './shared.tsx';

/**
 * Settings › Practice: when the daily question sets run, how many questions each subject gets, and the subject the
 * start screen offers first. That last one only suggests: the subjects can still be done in any order.
 */
export function PracticeSettings({ settings }: { settings: StoredSettings }) {
  const practice = settings.core.practice;
  const [start, setStart] = useState(practice.start);
  const [end, setEnd] = useState(practice.end);
  const [problem, setProblem] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const subjects = seed.practiceSubjects ?? [];
  const startWith = subjects.find((s) => s.id === practice.startWith);

  const commit = async (field: 'start' | 'end', text: string): Promise<void> => {
    const date = parseDateInput(text);
    if (!date) return setProblem('Dates are written YYYY-MM-DD, such as 2027-01-31.');
    if (date === practice[field]) return setProblem(null);
    const message = await saveCore((core) => ((core.practice[field] = date), core));
    setProblem(message ? 'The last day must not be before the first.' : null);
    if (message) (field === 'start' ? setStart : setEnd)(practice[field]);
  };

  return (
    <Section id="practice" title="Practice">
      <div className="grid grid-cols-2 gap-3">
        <TextField label="First day" value={start} onChange={setStart} onBlur={() => void commit('start', start)} onKeyDown={(e) => e.key === 'Enter' && void commit('start', start)} />
        <TextField label="Last day" value={end} onChange={setEnd} onBlur={() => void commit('end', end)} onKeyDown={(e) => e.key === 'Enter' && void commit('end', end)} />
        <NumberField label="Questions a subject" value={practice.perSubject} min={3} max={5} onCommit={(n) => void saveCore((core) => ((core.practice.perSubject = n), core)).then(setProblem)} />
      </div>
      <p className="mt-2 text-meta text-ink2">
        A daily set of {practice.perSubject * 3} questions: {practice.perSubject} each of linear algebra, calculus and physics, new ones and reviews of earlier misses. The Practice block is on Today only between these two days.
      </p>
      <RowList plain className="mt-2">
        <Row title="Start with" trailing={startWith?.short ?? 'None'} onClick={() => setPicking(true)} />
      </RowList>
      <p className="text-meta text-ink2">The start screen offers this subject first. It never fixes the order.</p>
      <Problem text={problem} />
      <PickerSheet
        open={picking}
        title="Start with"
        value={practice.startWith ?? null}
        clearLabel="None"
        options={subjects.map((s) => ({ value: s.id, label: s.short }))}
        onPick={(v) =>
          void saveCore((core) => {
            if (v) core.practice.startWith = v;
            else delete core.practice.startWith;
            return core;
          }).then(setProblem)
        }
        onClose={() => setPicking(false)}
      />
    </Section>
  );
}
