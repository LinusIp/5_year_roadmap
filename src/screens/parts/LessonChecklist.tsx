import { Fragment } from 'react';
import { toggleUnit } from '../../db/state.ts';
import { announceEdit } from '../../lib/edit-events.ts';
import { checklistCounts, checklistModules, counts, currentUnit, moduleLabel, moduleWindow } from '../../lib/checklist.ts';
import type { ChecklistModule } from '../../lib/checklist.ts';
import { useOptimisticSet } from '../../lib/useOptimisticSet.ts';
import type { Unit } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { Row, RowList } from '../../ui/Row.tsx';

/** "1.7 Introduction to NumPy"; a homework or a project goes by its title alone ("Homework 1"). */
export function lessonLabel(unit: Pick<Unit, 'id' | 'title' | 'kind'>): string {
  return unit.kind === 'homework' || unit.kind === 'project' ? unit.title : unit.id + ' ' + unit.title;
}

/** Opens a lesson's video in its place in the playlist: a new tab, or the YouTube app where the phone hands it over. */
export function playVideo(url: string): void {
  window.open(url, '_blank', 'noopener');
}

/** "Module 1 · Introduction to Machine Learning"; a module of projects alone by its title. */
export function moduleHeading(module: ChecklistModule): string {
  const label = moduleLabel(module);
  return label === module.title ? label : label + ' · ' + module.title;
}

function useTick(refId: string, done: string[]) {
  const ticks = useOptimisticSet(done);
  const flip = (unit: Unit): void => {
    const was = ticks.has(unit.id);
    ticks.flip(unit.id);
    void toggleUnit(refId, unit.id).then(() =>
      announceEdit({
        group: 'unit:' + refId + ':' + unit.id + ':' + Date.now(),
        label: (was ? 'Unticked ' : 'Ticked ') + lessonLabel(unit),
        undo: async () => {
          await toggleUnit(refId, unit.id);
          return true;
        },
      }),
    );
  };
  return { ticks, flip };
}

/** `compact`: the Now card's rows, one line each, with no play knob once a lesson is done (the mockup). */
function LessonRow({ unit, checked, now, onFlip, compact }: { unit: Unit; checked: boolean; now: boolean; onFlip: () => void; compact?: boolean }) {
  const label = lessonLabel(unit);
  const meta = now ? (
    <span className="text-chip font-semibold uppercase tracking-[0.04em] text-blue-deep">Now</span>
  ) : unit.outdated ? (
    'Outdated, optional'
  ) : unit.optional ? (
    'Optional'
  ) : undefined;
  return (
    <Row
      title={label}
      meta={meta}
      height={44}
      truncate={compact}
      href={unit.url}
      check={{ checked, onChange: onFlip, label }}
      action={
        unit.video && !(compact && checked) ? (
          <Button variant="icon" icon="play" className="knob !size-11 shrink-0 rounded-knob" label={'Play ' + label} onClick={() => playVideo(unit.video!)} />
        ) : undefined
      }
    />
  );
}

/**
 * The Now card's lesson checklist (ZOOMCAMP-CHECKLIST): the current module from the two lessons done just before the
 * current one (labelled Now) to its homework. A tick marks the lesson done, Now moves to the next lesson that counts,
 * and the last one of a module brings the next module; each tick can be undone from the toast. The timer is not
 * touched. Each video still to watch has a play knob; a title opens its page on GitHub.
 */
export function LessonWindow({ refId, units, done, onShowAll }: { refId: string; units: Unit[]; done: string[]; onShowAll: () => void }) {
  const { ticks, flip } = useTick(refId, done);
  const shown = units.filter((u) => ticks.has(u.id)).map((u) => u.id);
  const list = moduleWindow(units, shown);
  const module = checklistModules(units).find((m) => m.units.includes(list[0]!));
  const now = currentUnit(units, shown);
  return (
    <div className="flex flex-col">
      {module && <p className="section-label mb-1 mt-1">{moduleHeading(module)}</p>}
      <ul className="rows">
        {list.map((unit) => (
          <LessonRow key={unit.id} unit={unit} checked={ticks.has(unit.id)} now={unit === now} onFlip={() => flip(unit)} compact />
        ))}
      </ul>
      <button type="button" onClick={onShowAll} className="inline-flex min-h-11 items-center self-start text-button font-medium text-blue-deep" aria-haspopup="dialog">
        Show all modules
      </button>
    </div>
  );
}

/**
 * The whole checklist by module, with how many of each are done; optional and outdated units are folded under
 * "Optional" at the end of their module.
 */
export function LessonList({ refId, units, done }: { refId: string; units: Unit[]; done: string[] }) {
  const { ticks, flip } = useTick(refId, done);
  const shown = units.filter((u) => ticks.has(u.id)).map((u) => u.id);
  const now = currentUnit(units, shown);
  return (
    <div className="flex flex-col gap-4">
      {checklistModules(units).map((module) => {
        const main = module.units.filter(counts);
        const extra = module.units.filter((u) => !counts(u));
        const c = checklistCounts(module.units, shown);
        return (
          <Fragment key={module.group}>
            <RowList label={moduleHeading(module)} aside={<span className="whitespace-nowrap">{c.done + ' of ' + c.total}</span>}>
              {main.map((unit) => (
                <LessonRow key={unit.id} unit={unit} checked={ticks.has(unit.id)} now={unit === now} onFlip={() => flip(unit)} />
              ))}
              {extra.length > 0 && (
                <li>
                  <details className="group">
                    <summary className="flex min-h-11 cursor-pointer list-none items-center text-meta font-semibold text-ink2">{'Optional (' + extra.length + ')'}</summary>
                    <ul className="rows">
                      {extra.map((unit) => (
                        <LessonRow key={unit.id} unit={unit} checked={ticks.has(unit.id)} now={false} onFlip={() => flip(unit)} />
                      ))}
                    </ul>
                  </details>
                </li>
              )}
            </RowList>
          </Fragment>
        );
      })}
    </div>
  );
}
