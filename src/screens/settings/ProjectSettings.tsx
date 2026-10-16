import { useState } from 'react';
import type { StoredSettings } from '../../db/types.ts';
import { Chips } from '../../ui/Chips.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { useOptimistic } from '../../lib/useOptimistic.ts';
import { DAY_SHORT, Problem, Section, describeDays, saveCore } from './shared.tsx';

/** Settings › Projects: the daily challenge in Block B, and the weekdays of Block D's weekly slot. */
export function ProjectSettings({ settings }: { settings: StoredSettings }) {
  const catalogue = settings.core.catalogue;
  const [daily, setDaily] = useOptimistic(catalogue.dailyChallenge);
  const [problem, setProblem] = useState<string | null>(null);
  const days = catalogue.weeklyDays;
  const toggleDay = (d: number): void => {
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort();
    void saveCore((core) => ((core.catalogue.weeklyDays = next), core)).then(setProblem);
  };
  return (
    <Section id="projects" title="Projects">
      <RowList flat>
        <Row
          title="Daily challenge"
          meta="An easy coding challenge in Block B every day"
          toggle={{
            on: daily,
            onChange: (on) => {
              setDaily(on);
              void saveCore((core) => ((core.catalogue.dailyChallenge = on), core)).then(setProblem);
            },
          }}
        />
      </RowList>
      <p className="mb-2 mt-4 text-meta text-ink2">Weekly slot in Block D: the week's build and medium challenge, on {days.length ? describeDays(days) : 'no days'}.</p>
      <Chips label="Weekly slot days" items={[1, 2, 3, 4, 5, 6, 0].map((d) => ({ key: String(d), label: DAY_SHORT[d]!, pressed: days.includes(d), onClick: () => toggleDay(d) }))} />
      <Problem text={problem} />
    </Section>
  );
}
