import { useState } from 'react';
import type { StoredSettings } from '../../db/types.ts';
import { NumberField } from '../../ui/NumberField.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { Problem, Section, parseDateInput, saveCore } from './shared.tsx';

/** Settings › Practice: when the daily question sets run, and how many questions each subject gets. */
export function PracticeSettings({ settings }: { settings: StoredSettings }) {
  const practice = settings.core.practice;
  const [start, setStart] = useState(practice.start);
  const [end, setEnd] = useState(practice.end);
  const [problem, setProblem] = useState<string | null>(null);

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
      <Problem text={problem} />
    </Section>
  );
}
