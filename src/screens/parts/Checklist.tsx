import { Fragment } from 'react';
import { toggleUnit } from '../../db/state.ts';
import { useOptimisticSet } from '../../lib/useOptimisticSet.ts';
import { Row, RowList } from '../../ui/Row.tsx';

export interface ChecklistUnit {
  id: string;
  title: string;
  url?: string;
  section?: string;
}

/** A project's acceptance criteria as checklist units: their ticks are stored as criterion-1, criterion-2… */
export function criteriaUnits(acceptance: string[]): ChecklistUnit[] {
  return acceptance.map((title, index) => ({ id: 'criterion-' + (index + 1), title }));
}

/**
 * Sub-units (lectures, chapters, labs, acceptance criteria) as rows with a checkbox; `compact` is Today's
 * 44 px version with regular-weight titles. A unit with a link
 * opens it from its title; the circle ticks it. A tick shows at once and is stored behind it.
 */
export function Checklist({ refId, units, done, label, plain, compact }: { refId: string; units: ChecklistUnit[]; done: string[]; label?: string; plain?: boolean; compact?: boolean }) {
  const ticks = useOptimisticSet(done);
  let lastSection: string | undefined;
  return (
    <RowList label={label} plain={plain}>
      {units.map((unit) => {
        const section = unit.section && unit.section !== lastSection ? unit.section : null;
        lastSection = unit.section;
        return (
          <Fragment key={unit.id}>
            {section && (
              <li className="pb-1 pt-3 text-meta text-ink2">
                {section}
              </li>
            )}
            <Row
              title={unit.title}
              height={compact ? 44 : 56}
              plainTitle={compact}
              href={unit.url}
              check={{
                checked: ticks.has(unit.id),
                onChange: () => {
                  ticks.flip(unit.id);
                  void toggleUnit(refId, unit.id);
                },
                label: unit.title,
              }}
            />
          </Fragment>
        );
      })}
    </RowList>
  );
}
