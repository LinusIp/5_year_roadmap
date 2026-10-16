/**
 * Calendar's model and edits over the schedule. Nothing here logs minutes: a change to one date is that date's
 * entry in `schedule.days` (its times, lengths, item, skips, added blocks, template or rest day), a change to
 * "every Monday" is an edit of the template Monday uses, and busy events live in `schedule.busy`. All of them sync
 * with settings, as Change today always has.
 *
 * Pure.
 */
import type { BusyEvent, DayChange, StoredSettings } from '../db/types.ts';
import type { BlockId, DayTemplate } from '../seed/schema.ts';
import { busyIntervals, hm, layoutDay, parseHm } from './calendar-layout.ts';
import type { PlacedBlock } from './calendar-layout.ts';
import { addDays, dayName, weekday } from './dates.ts';
import { configOn, resolveDay, withDayChange, withScheduleEdit } from './day-plan.ts';

/** The start times a date's template gives its blocks, where it gives one. */
export function templateStarts(date: string, settings: StoredSettings): Map<BlockId, number> {
  const resolved = resolveDay(date, settings);
  const template = configOn(date, settings).templates.find((t) => t.id === resolved.templateId);
  const out = new Map<BlockId, number>();
  for (const entry of template?.blocks ?? []) if (entry.start) out.set(entry.block, parseHm(entry.start));
  return out;
}

/** Where each of a date's blocks sits: the date's own time, else the template's, else after the one before. */
export function dayLayout(date: string, settings: StoredSettings): PlacedBlock[] {
  const resolved = resolveDay(date, settings);
  const change = settings.schedule.days[date];
  const starts = templateStarts(date, settings);
  const blocks = resolved.blocks.map((b) => {
    const own = change?.times?.[b.id];
    const start = own !== undefined ? parseHm(own) : starts.get(b.id);
    return start === undefined ? { id: b.id, minutes: b.minutes } : { id: b.id, minutes: b.minutes, start };
  });
  return layoutDay(blocks, busyIntervals(settings.schedule.busy ?? [], date));
}

/** The blocks of a date in the order of their start times: Today's Now and Later today follow it. */
export function blockOrderByTime(date: string, settings: StoredSettings): BlockId[] {
  return dayLayout(date, settings).map((b) => b.id);
}

const edit = (settings: StoredSettings, date: string, change: (c: DayChange) => DayChange): StoredSettings => withDayChange(settings, date, change);

/** Moves a block on one date to a start time. */
export function withBlockTime(settings: StoredSettings, date: string, block: BlockId, start: number): StoredSettings {
  return edit(settings, date, (c) => ({ ...c, times: { ...c.times, [block]: hm(start) } }));
}

/** Sets a block's length on one date. */
export function withBlockLength(settings: StoredSettings, date: string, block: BlockId, minutes: number): StoredSettings {
  const added = settings.schedule.days[date]?.add?.some((a) => a.block === block);
  if (added) return edit(settings, date, (c) => ({ ...c, add: (c.add ?? []).map((a) => (a.block === block ? { ...a, minutes } : a)) }));
  return edit(settings, date, (c) => ({ ...c, minutes: { ...c.minutes, [block]: minutes } }));
}

/** The item a block works on, on one date; null goes back to the lane's own next item. */
export function withBlockItem(settings: StoredSettings, date: string, block: BlockId, refId: string | null): StoredSettings {
  return edit(settings, date, (c) => {
    const items = { ...c.items };
    if (refId) items[block] = refId;
    else delete items[block];
    return { ...c, items };
  });
}

/** Leaves a block out of one date. A block added to that date is simply taken off again. */
export function withSkip(settings: StoredSettings, date: string, block: BlockId): StoredSettings {
  const change = settings.schedule.days[date];
  if (change?.add?.some((a) => a.block === block)) return edit(settings, date, (c) => ({ ...c, add: (c.add ?? []).filter((a) => a.block !== block) }));
  return edit(settings, date, (c) => ({ ...c, skip: [...new Set([...(c.skip ?? []), block])] }));
}

/** Adds a block to one date, at a time, for a length. */
export function withAddedBlock(settings: StoredSettings, date: string, block: BlockId, minutes: number, start?: number): StoredSettings {
  return edit(settings, date, (c) => {
    const skip = (c.skip ?? []).filter((b) => b !== block);
    const add = [...(c.add ?? []).filter((a) => a.block !== block), start === undefined ? { block, minutes } : { block, minutes, start: hm(start) }];
    return { ...c, skip, add };
  });
}

/** Moves a block from one date to another, with its length and, if it had one, its time. */
export function withMovedToDate(settings: StoredSettings, from: string, block: BlockId, to: string): StoredSettings {
  if (from === to) return settings;
  const placed = dayLayout(from, settings).find((b) => b.id === block);
  if (!placed) return settings;
  const skipped = withSkip(settings, from, block);
  return withAddedBlock(skipped, to, block, placed.minutes, placed.fixed ? placed.start : undefined);
}

/** Another template for one date. */
export function withTemplateOn(settings: StoredSettings, date: string, templateId: string): StoredSettings {
  return edit(settings, date, (c) => {
    const next: DayChange = { ...c, template: templateId };
    delete next.rest;
    return next;
  });
}

/** One date becomes a rest day. */
export function withRestDay(settings: StoredSettings, date: string): StoredSettings {
  return edit(settings, date, (c) => ({ ...c, rest: true }));
}

const DAY_ID = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * "Apply to every Monday": the block's time and length go into the template Monday uses, from today on (days
 * already past keep their plan). If that template is also used on other weekdays, Monday gets its own copy
 * ("Full day · Monday") so the others stay as they were. The date's own time and length for the block are
 * cleared, so the template's apply there too.
 */
export function withEveryWeekday(settings: StoredSettings, today: string, date: string, block: BlockId, values: { start?: number; minutes?: number }): StoredSettings {
  const day = weekday(date);
  const cleared = edit(settings, date, (c) => {
    const times = { ...c.times };
    const minutes = { ...c.minutes };
    delete times[block];
    delete minutes[block];
    return { ...c, times, minutes };
  });
  return withScheduleEdit(cleared, today, (s) => {
    const pattern = [...s.core.pattern];
    const templateId = pattern[day] ?? s.core.templates[0]!.id;
    const shared = pattern.some((t, i) => i !== day && t === templateId);
    let templates = s.core.templates;
    let target = templateId;
    if (shared) {
      const source = templates.find((t) => t.id === templateId);
      target = templateId + '-' + DAY_ID[day];
      if (source && !templates.some((t) => t.id === target)) {
        templates = [...templates, { ...structuredClone(source), id: target, name: source.name + ' · ' + dayName(date) }];
      }
      pattern[day] = target;
    }
    templates = templates.map((t): DayTemplate => {
      if (t.id !== target) return t;
      const has = t.blocks.some((b) => b.block === block);
      const entries = has ? t.blocks : [...t.blocks, { block }];
      return {
        ...t,
        blocks: entries.map((b) => {
          if (b.block !== block) return b;
          const next = { ...b };
          if (values.start !== undefined) next.start = hm(values.start);
          if (values.minutes !== undefined) next.minutes = values.minutes;
          return next;
        }),
      };
    });
    return { ...s, core: { ...s.core, templates, pattern } };
  });
}

/** Adds a busy event, or replaces the one with its id. */
export function withBusy(settings: StoredSettings, event: BusyEvent): StoredSettings {
  const busy = [...(settings.schedule.busy ?? []).filter((e) => e.id !== event.id), event];
  return { ...settings, schedule: { ...settings.schedule, busy } };
}

/**
 * Removes a busy event. A weekly one removed from a date on keeps its earlier weeks (it ends the day before);
 * removed from its first week, or a one-off, it goes.
 */
export function withoutBusy(settings: StoredSettings, id: string, fromDate?: string): StoredSettings {
  const busy = (settings.schedule.busy ?? []).flatMap((e): BusyEvent[] => {
    if (e.id !== id) return [e];
    if (e.weekday === undefined || !fromDate || !e.from || fromDate <= e.from) return [];
    return [{ ...e, until: addDays(fromDate, -1) }];
  });
  return { ...settings, schedule: { ...settings.schedule, busy } };
}

/** "University day" -> "Uni", "Exam week" -> "Exam", "Rest day" -> "Rest": the month view's tiny label. */
export function shortTemplateLabel(name: string): string {
  const first = name.split(/[\s·]+/)[0] ?? name;
  if (/^univ/i.test(first)) return 'Uni';
  return first.length > 6 ? first.slice(0, 5) : first;
}
