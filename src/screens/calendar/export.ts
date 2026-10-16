import type { Atlas } from '../../hooks/useAtlas.ts';
import { addDays, eachDay } from '../../lib/dates.ts';
import { buildIcs } from '../../lib/ics.ts';
import type { IcsEvent } from '../../lib/ics.ts';
import type { ScheduleContext } from '../../lib/schedule.ts';
import { columnFor } from './model.ts';

/** The next four weeks of blocks, from today, as Calendar places them. */
export function upcomingEvents(atlas: Atlas, ctx: ScheduleContext, today: string): IcsEvent[] {
  return eachDay(today, addDays(today, 27)).flatMap((date) =>
    columnFor(date, atlas, ctx).map((b) => ({
      date,
      start: b.start,
      minutes: b.minutes,
      title: b.name + (b.item ? ': ' + b.item : ''),
      description: 'Block ' + b.id + ' in Atlas',
      uid: 'atlas-' + date + '-' + b.id,
    })),
  );
}

/** Downloads atlas-next-4-weeks.ics. */
export function downloadIcs(atlas: Atlas, ctx: ScheduleContext, today: string): void {
  const text = buildIcs(upcomingEvents(atlas, ctx, today));
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'atlas-next-4-weeks.ics';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
