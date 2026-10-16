import type { Atlas } from '../../hooks/useAtlas.ts';
import { dayLayout } from '../../lib/calendar.ts';
import { minutesByBlock } from '../../lib/logs.ts';
import { planForDay } from '../../lib/schedule.ts';
import type { ScheduleContext, ScheduledItem, TodayBlock } from '../../lib/schedule.ts';
import { blockShort, nameOf } from '../parts/text.ts';
import type { ColumnBlock } from './DayColumn.tsx';

/** What a block works on, as Today shows it: the week's build for Block D, else the lane's item. */
export function itemOf(block: TodayBlock | undefined): ScheduledItem | undefined {
  if (!block || block.kind === 'review') return undefined;
  const weekly = block.weeklyBuild && block.weeklyBuild.status !== 'done' ? block.weeklyBuild : undefined;
  return weekly ?? block.item;
}

/** One date's column: its blocks, placed, with their names, items and the minutes logged in each. */
export function columnFor(date: string, atlas: Atlas, ctx: ScheduleContext, weeklyPickId?: string): ColumnBlock[] {
  const plan = planForDay({ date, settings: atlas.settings, ctx, ...(weeklyPickId ? { weeklyPickId } : {}) });
  const logged = minutesByBlock(atlas.logs.find((l) => l.date === date));
  return dayLayout(date, atlas.settings).map((placed) => {
    const block = plan.blocks.find((b) => b.id === placed.id);
    const item = itemOf(block);
    const name = blockShort(block?.def.name ?? atlas.settings.core.blocks.find((b) => b.id === placed.id)?.name ?? placed.id);
    return { ...placed, name, logged: logged[placed.id] ?? 0, ...(item ? { item: nameOf(item) } : {}) };
  });
}

