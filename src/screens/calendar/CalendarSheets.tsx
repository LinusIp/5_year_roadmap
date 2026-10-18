import { useEffect, useState } from 'react';
import type { BusyEvent } from '../../db/types.ts';
import type { Atlas } from '../../hooks/useAtlas.ts';
import {
  dayLayout,
  withAddedBlock,
  withBlockItem,
  withBlockLength,
  withBlockTime,
  withBusy,
  withEveryDay,
  withEveryWeekday,
  usedEveryDay,
  withMovedToDate,
  withoutBusy,
  withRestDay,
  withSkip,
  withTemplateOn,
} from '../../lib/calendar.ts';
import { busyOn, hm, parseHm } from '../../lib/calendar-layout.ts';
import { dayName, weekday } from '../../lib/dates.ts';
import { resolveDay } from '../../lib/day-plan.ts';
import { describePlanItem, effectivePhase, lane, planForDay } from '../../lib/schedule.ts';
import type { ScheduleContext } from '../../lib/schedule.ts';
import type { BlockId } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { SegmentedControl } from '../../ui/SegmentedControl.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { DaySheet } from '../parts/DaySheet.tsx';
import { PickerSheet } from '../parts/PickerSheet.tsx';
import { blockShort, dateTitle, nameOf, span } from '../parts/text.ts';
import { calendarEdit } from './edit.ts';
import { itemOf } from './model.ts';

const LENGTHS = Array.from({ length: 48 }, (_, i) => (i + 1) * 15);

/** A time field: the device's own time picker, in 15-minute steps. */
function TimeInput({ label, value, onChange }: { label: string; value: number; onChange: (minutes: number) => void }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-meta font-semibold text-ink2">{label}</span>
      <input type="time" step={900} value={hm(value)} onChange={(e) => e.target.value && onChange(parseHm(e.target.value))} className="well h-12 rounded-pill px-4 text-body text-ink" />
    </label>
  );
}

function LengthSelect({ label, value, onChange }: { label: string; value: number; onChange: (minutes: number) => void }) {
  const options = LENGTHS.includes(value) ? LENGTHS : [...LENGTHS, value].sort((a, b) => a - b);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-meta font-semibold text-ink2">{label}</span>
      <select value={value} onChange={(e) => onChange(Number(e.target.value))} className="well h-12 rounded-pill px-4 text-body text-ink">
        {options.map((m) => (
          <option key={m} value={m}>
            {span(m)}
          </option>
        ))}
      </select>
    </label>
  );
}

const blockName = (atlas: Atlas, block: string): string => blockShort(atlas.settings.core.blocks.find((b) => b.id === block)?.name ?? block);

/**
 * A block on a date: its time and length, the item it works on (the lane's next, or another of the lane), skip it,
 * move it to another date, or apply its time and length to every such weekday instead of this date. A block with
 * time logged also offers "Edit logged time", the one place minutes can be corrected by hand.
 */
export function BlockSheet({ atlas, ctx, sheet, today, onClose }: { atlas: Atlas; ctx: ScheduleContext; sheet: { date: string; block: string } | null; today: string; onClose: () => void }) {
  const { settings } = atlas;
  const core = settings.core;
  const date = sheet?.date ?? today;
  const block = (sheet?.block ?? 'A') as BlockId;
  const placed = sheet ? dayLayout(date, settings).find((b) => b.id === block) : undefined;
  const [start, setStart] = useState(placed?.start ?? 8 * 60);
  const [minutes, setMinutes] = useState(placed?.minutes ?? 60);
  const [every, setEvery] = useState(false);
  const [moveTo, setMoveTo] = useState('');
  const [pickingItem, setPickingItem] = useState(false);
  const [editingLog, setEditingLog] = useState(false);
  useEffect(() => {
    setStart(placed?.start ?? 8 * 60);
    setMinutes(placed?.minutes ?? 60);
    setEvery(false);
    setMoveTo('');
    // A new block or date resets the fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet?.date, sheet?.block]);

  const name = blockName(atlas, block);
  const plan = sheet ? planForDay({ date, settings, ctx }) : null;
  const item = itemOf(plan?.blocks.find((b) => b.id === block));
  const chosenRef = settings.schedule.days[date]?.items?.[block];
  const phase = effectivePhase(date, atlas.seed.phases);
  const laneItems = phase ? lane(atlas.seed, phase.id, block).map((p) => describePlanItem(p, ctx)).filter((i) => i !== null) : [];
  const logged = (atlas.logs.find((l) => l.date === date)?.entries ?? []).filter((e) => e.block === block).reduce((sum, e) => sum + e.minutes, 0);
  const weekdayName = dayName(date);
  const daily = usedEveryDay(settings, date);
  const everyLabel = daily ? 'day' : weekdayName;

  const save = (): void => {
    if (!placed) return;
    const changedTime = start !== placed.start;
    const changedLength = minutes !== placed.minutes;
    if (!changedTime && !changedLength && !every) return onClose();
    if (every) {
      void calendarEdit(core, name + ' on every ' + everyLabel + ': ' + hm(start) + ', ' + span(minutes), (s) =>
        daily ? withEveryDay(s, today, date, block, { start, minutes }) : withEveryWeekday(s, today, date, block, { start, minutes }),
      );
    } else {
      void calendarEdit(core, name + ' on ' + dateTitle(date) + ': ' + hm(start) + ', ' + span(minutes), (s) => {
        let next = changedTime ? withBlockTime(s, date, block, start) : s;
        if (changedLength) next = withBlockLength(next, date, block, minutes);
        return next;
      });
    }
    onClose();
  };

  return (
    <>
      <Sheet
        open={sheet !== null && !pickingItem && !editingLog}
        title={name}
        aside={dateTitle(date)}
        onClose={onClose}
        footer={
          <Button variant="filled" className="w-full" onClick={save}>
            Save
          </Button>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <TimeInput label="Starts" value={start} onChange={setStart} />
          <LengthSelect label="Length" value={minutes} onChange={setMinutes} />
        </div>
        <RowList label="Works on">
          <Row title={item ? nameOf(item) : 'Nothing planned'} meta={chosenRef ? 'Chosen for this day' : 'The lane’s next item'} chevron onClick={() => setPickingItem(true)} />
        </RowList>
        <RowList label={'Every ' + everyLabel}>
          <Row
            title={'Apply to every ' + everyLabel}
            meta={daily ? 'Saves the time and length in the daily schedule, from today on' : 'Saves the time and length in the day’s template, from today on'}
            toggle={{ on: every, onChange: setEvery }}
          />
        </RowList>
        <RowList label="This day">
          <Row
            title="Skip it this day"
            meta="Only this date; the template stays"
            onClick={() => {
              void calendarEdit(core, 'Skipped ' + name + ' on ' + dateTitle(date), (s) => withSkip(s, date, block));
              onClose();
            }}
          />
          {logged > 0 || date <= today ? <Row title="Edit logged time" meta={logged > 0 ? span(logged) + ' logged' : 'Nothing logged'} chevron onClick={() => setEditingLog(true)} /> : null}
        </RowList>
        <div className="flex items-end gap-3">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-meta font-semibold text-ink2">Move to another date</span>
            <input type="date" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="well h-12 rounded-pill px-4 text-body text-ink" />
          </label>
          <Button
            disabled={!moveTo || moveTo === date}
            onClick={() => {
              void calendarEdit(core, 'Moved ' + name + ' to ' + dateTitle(moveTo), (s) => withMovedToDate(s, date, block, moveTo));
              onClose();
            }}
          >
            Move
          </Button>
        </div>
      </Sheet>
      <PickerSheet
        open={pickingItem}
        title={'What ' + name + ' works on'}
        searchLabel="Search the lane"
        value={chosenRef ?? null}
        clearLabel="The lane’s next item"
        options={laneItems.map((i) => ({ value: i.refId, label: nameOf(i), meta: i.status === 'done' ? 'Done' : i.status === 'active' ? 'In progress' : 'Not started' }))}
        onPick={(refId) => void calendarEdit(core, refId ? name + ' works on another item on ' + dateTitle(date) : name + ' back to its next item', (s) => withBlockItem(s, date, block, refId))}
        onClose={() => setPickingItem(false)}
      />
      <DaySheet date={editingLog ? date : null} title={'Logged on ' + dateTitle(date)} onClose={() => setEditingLog(false)} seed={atlas.seed} blocks={core.blocks} editable />
    </>
  );
}

/** An empty slot: add a block there, a busy event (once or every week), or make the day a rest day. */
export function AddSheet({ atlas, sheet, onClose }: { atlas: Atlas; sheet: { date: string; minute: number } | null; onClose: () => void }) {
  const { settings } = atlas;
  const core = settings.core;
  const date = sheet?.date ?? '';
  const [kind, setKind] = useState<'block' | 'busy' | 'rest'>('block');
  const [start, setStart] = useState(sheet?.minute ?? 9 * 60);
  const [minutes, setMinutes] = useState(60);
  const [title, setTitle] = useState('');
  const [weekly, setWeekly] = useState(false);
  useEffect(() => {
    setStart(sheet?.minute ?? 9 * 60);
    setTitle('');
    setMinutes(60);
  }, [sheet?.date, sheet?.minute]);
  if (!sheet) return <Sheet open={false} title="Add" onClose={onClose}>{null}</Sheet>;
  const planned = new Set(resolveDay(date, settings).blocks.map((b) => b.id));
  const free = core.blocks.filter((b) => !planned.has(b.id));

  return (
    <Sheet open title={'Add at ' + hm(start)} aside={dateTitle(date)} onClose={onClose}>
      <SegmentedControl
        label="What to add"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'block', label: 'Block' },
          { value: 'busy', label: 'Busy' },
          { value: 'rest', label: 'Rest day' },
        ]}
      />
      {kind !== 'rest' && (
        <div className="grid grid-cols-2 gap-3">
          <TimeInput label="Starts" value={start} onChange={setStart} />
          <LengthSelect label="Length" value={minutes} onChange={setMinutes} />
        </div>
      )}
      {kind === 'block' &&
        (free.length === 0 ? (
          <p className="text-meta text-ink2">Every block is already on this day. Drag one to move it here.</p>
        ) : (
          <RowList label="Block">
            {free.map((b) => (
              <Row
                key={b.id}
                title={blockShort(b.name)}
                meta={'Block ' + b.id}
                onClick={() => {
                  void calendarEdit(core, 'Added ' + blockShort(b.name) + ' at ' + hm(start), (s) => withAddedBlock(s, date, b.id, minutes, start));
                  onClose();
                }}
              />
            ))}
          </RowList>
        ))}
      {kind === 'busy' && (
        <>
          <TextField label="What" value={title} onChange={setTitle} hint="A class, work, an appointment. Blocks move out of its way." />
          <RowList>
            <Row title={'Every ' + dayName(date)} meta="Repeats weekly from this date" toggle={{ on: weekly, onChange: setWeekly }} />
          </RowList>
          <Button
            variant="filled"
            className="w-full"
            disabled={!title.trim()}
            onClick={() => {
              const event: BusyEvent = weekly
                ? { id: 'busy-' + Date.now().toString(36), title: title.trim(), start: hm(start), minutes, weekday: weekday(date), from: date }
                : { id: 'busy-' + Date.now().toString(36), title: title.trim(), start: hm(start), minutes, date };
              void calendarEdit(core, 'Busy: ' + event.title + (weekly ? ' every ' + dayName(date) : ''), (s) => withBusy(s, event));
              onClose();
            }}
          >
            Add busy time
          </Button>
        </>
      )}
      {kind === 'rest' && (
        <Button
          variant="filled"
          className="w-full"
          onClick={() => {
            void calendarEdit(core, dateTitle(date) + ' is a rest day', (s) => withRestDay(s, date));
            onClose();
          }}
        >
          Make it a rest day
        </Button>
      )}
    </Sheet>
  );
}

/** A busy event: when it is, and taking it off (a weekly one from this week on, or entirely). */
export function BusySheet({ atlas, sheet, onClose }: { atlas: Atlas; sheet: { date: string; id: string } | null; onClose: () => void }) {
  const core = atlas.settings.core;
  const event = sheet ? (atlas.settings.schedule.busy ?? []).find((e) => e.id === sheet.id) : undefined;
  if (!sheet || !event) return <Sheet open={false} title="Busy" onClose={onClose}>{null}</Sheet>;
  const end = hm(parseHm(event.start) + event.minutes);
  return (
    <Sheet open title={event.title} aside={event.start + '–' + end} onClose={onClose}>
      <p className="text-body text-ink2">{event.weekday !== undefined ? 'Every ' + dayName(sheet.date) + (event.from ? ', from ' + dateTitle(event.from) : '') : dateTitle(sheet.date)}. Blocks never overlap it.</p>
      <RowList>
        {event.weekday !== undefined && (
          <Row
            title="Remove from this week on"
            meta="Earlier weeks keep it"
            onClick={() => {
              void calendarEdit(core, 'Removed ' + event.title + ' from ' + dateTitle(sheet.date), (s) => withoutBusy(s, event.id, sheet.date));
              onClose();
            }}
          />
        )}
        <Row
          title={event.weekday !== undefined ? 'Remove every week' : 'Remove it'}
          onClick={() => {
            void calendarEdit(core, 'Removed ' + event.title, (s) => withoutBusy(s, event.id));
            onClose();
          }}
        />
      </RowList>
    </Sheet>
  );
}

/** A block dropped on busy time: shift it, and the blocks after it, to after the busy time. */
export function ConflictSheet({ atlas, sheet, onClose }: { atlas: Atlas; sheet: { date: string; block: string; start: number } | null; onClose: () => void }) {
  const core = atlas.settings.core;
  if (!sheet) return <Sheet open={false} title="Busy then" onClose={onClose}>{null}</Sheet>;
  const busy = busyOn(atlas.settings.schedule.busy ?? [], sheet.date).find((e) => parseHm(e.start) <= sheet.start + 1 && sheet.start < parseHm(e.start) + e.minutes) ?? busyOn(atlas.settings.schedule.busy ?? [], sheet.date)[0];
  const name = blockName(atlas, sheet.block);
  const after = busy ? hm(parseHm(busy.start) + busy.minutes) : '';
  return (
    <Sheet
      open
      title="Busy then"
      onClose={onClose}
      footer={
        <div className="flex gap-3 [&>*]:flex-1">
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="filled"
            onClick={() => {
              void calendarEdit(core, 'Shifted ' + name + ' to after ' + (busy?.title ?? 'busy time'), (s) => withBlockTime(s, sheet.date, sheet.block as BlockId, sheet.start));
              onClose();
            }}
          >
            Shift them
          </Button>
        </div>
      }
    >
      <p className="text-body">
        {busy ? busy.title + ' is ' + busy.start + '–' + after + '. ' : ''}
        Shift {name} and the blocks after it to after {after || 'it'}?
      </p>
    </Sheet>
  );
}

/** The template of one date, or a rest day. */
export function TemplateSheet({ atlas, sheet, onClose }: { atlas: Atlas; sheet: { date: string } | null; onClose: () => void }) {
  const { settings } = atlas;
  const core = settings.core;
  const current = sheet ? resolveDay(sheet.date, settings) : null;
  return (
    <PickerSheet
      open={sheet !== null}
      title={sheet ? 'Template for ' + dateTitle(sheet.date) : 'Template'}
      value={current ? (current.rest ? 'rest-day' : current.templateId) : null}
      options={[...core.templates.map((t) => ({ value: t.id, label: t.name })), { value: 'rest-day', label: 'Rest day', meta: 'Nothing planned; the streak is safe' }]}
      onPick={(value) => {
        if (!sheet || !value) return;
        if (value === 'rest-day') void calendarEdit(core, dateTitle(sheet.date) + ' is a rest day', (s) => withRestDay(s, sheet.date));
        else void calendarEdit(core, dateTitle(sheet.date) + ': ' + (core.templates.find((t) => t.id === value)?.name ?? value), (s) => withTemplateOn(s, sheet.date, value));
      }}
      onClose={onClose}
    />
  );
}
