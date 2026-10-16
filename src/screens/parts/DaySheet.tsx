import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { editLog, isBlockDone, readLog, removeEntry, toggleBlockDone } from '../../lib/logs.ts';
import { weekday } from '../../lib/dates.ts';
import type { AppSeed, SettingsDefaults } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { DayFields } from './DayFields.tsx';
import { LogTimeSheet } from './LogTimeSheet.tsx';
import { blockShort, shortTitle, span } from './text.ts';

/** Titles come from the curriculum with the user's edits, so items they added show their names. */
export function titleOf(refId: string, seed: AppSeed): string {
  return seed.resources.find((r) => r.id === refId)?.title ?? seed.projects.find((p) => p.id === refId)?.title ?? seed.papers.find((p) => p.id === refId)?.title ?? refId;
}

/**
 * One day: what was logged, which blocks were done, and the line, energy and freeze from "How was today?".
 * `editable` (Calendar's "Edit logged time", the one place minutes are entered by hand) also lets an entry go and
 * more time be added; elsewhere the sheet points to that day in Calendar for corrections.
 */
export function DaySheet({ date, title, onClose, seed, blocks, editable = false }: { date: string | null; title: string; onClose: () => void; seed: AppSeed; blocks: SettingsDefaults['blocks']; editable?: boolean }) {
  const log = useLiveQuery(async () => (date ? ((await readLog(date)) ?? null) : null), [date]);
  const [logging, setLogging] = useState(false);
  const trackName = (id: string): string => seed.tracks.find((t) => t.id === id)?.name ?? id;
  const scheduled = date ? blocks.filter((b) => b.days.includes(weekday(date))) : [];

  return (
    <>
      <Sheet open={date !== null && !logging} title={title} onClose={onClose}>
        {date && (
          <div className="space-y-6">
            <RowList label="Logged" flat>
              {(log?.entries ?? []).length === 0 && <li className="py-2.5 text-meta text-ink2">Nothing logged.</li>}
              {(log?.entries ?? []).map((entry, index) => {
                const name = entry.refId ? shortTitle(titleOf(entry.refId, seed)) : (entry.note ?? 'Time logged');
                return (
                  <Row
                    key={index}
                    title={name}
                    meta={'Block ' + entry.block + ' · ' + trackName(entry.track)}
                    trailing={span(entry.minutes)}
                    action={editable ? <Button variant="icon" icon="x" label={'Remove ' + span(entry.minutes) + ' of ' + name} onClick={() => void editLog(date, (current) => removeEntry(current, index))} /> : undefined}
                  />
                );
              })}
            </RowList>
            {editable ? (
              <Button onClick={() => setLogging(true)}>Add logged time</Button>
            ) : (
              <Button icon="calendar" to={'/calendar?view=day&date=' + date} onClick={onClose}>
                Correct it in Calendar
              </Button>
            )}

            {scheduled.length > 0 && (
              <RowList label="Blocks done" flat>
                {scheduled.map((block) => (
                  <Row
                    key={block.id}
                    title={blockShort(block.name)}
                    meta={'Block ' + block.id + ' · ' + span(block.minutes)}
                    check={{ checked: isBlockDone(log ?? undefined, block.id), onChange: () => void editLog(date, (current) => toggleBlockDone(current, block.id)) }}
                  />
                ))}
              </RowList>
            )}

            <DayFields date={date} />
          </div>
        )}
      </Sheet>
      {date && <LogTimeSheet key={date} open={logging} onClose={() => setLogging(false)} date={date} />}
    </>
  );
}
