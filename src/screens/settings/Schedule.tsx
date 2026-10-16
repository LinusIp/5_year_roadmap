import { useState } from 'react';
import type { DateOverride, StoredSettings } from '../../db/types.ts';
import { dayName, formatRange, today } from '../../lib/dates.ts';
import { weeklyTargetMinutes } from '../../lib/schedule.ts';
import { seed } from '../../seed/index.ts';
import type { BlockDef, DayTemplate, SettingsDefaults, TrackId } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { Chips } from '../../ui/Chips.tsx';
import { BLOCK_COLOURS, blockColor } from '../../ui/colors.ts';
import { NumberField } from '../../ui/NumberField.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { PickerSheet } from '../parts/PickerSheet.tsx';
import { blockShort, span } from '../parts/text.ts';
import { DATE_OF_DAY, DAY_LONG, DAY_SHORT, Problem, Section, describeDays, parseDateInput, saveCore, saveSettings } from './shared.tsx';

function templateMinutes(t: DayTemplate, blocks: BlockDef[]): number {
  return t.blocks.reduce((sum, b) => sum + (b.minutes ?? blocks.find((d) => d.id === b.block)?.minutes ?? 0), 0);
}

function describeTemplate(t: DayTemplate, blocks: BlockDef[]): string {
  if (t.blocks.length === 0) return 'No blocks';
  return t.blocks.map((b) => b.block + ' ' + span(b.minutes ?? blocks.find((d) => d.id === b.block)?.minutes ?? 0)).join(' · ');
}

function newTemplateId(name: string, taken: Set<string>): string {
  const base = 'my-' + (name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'day');
  let id = base;
  for (let n = 2; taken.has(id); n++) id = base + '-' + n;
  return id;
}

/* ------------------------------------------------------------------ one template */

function TemplateSheet({ settings, id, onClose, onOpen }: { settings: StoredSettings; id: string | null; onClose: () => void; onOpen: (id: string) => void }) {
  const template = settings.core.templates.find((t) => t.id === id);
  const [name, setName] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const blocks = settings.core.blocks;
  const run = async (change: (core: SettingsDefaults) => SettingsDefaults): Promise<void> => setProblem(await saveCore(change));
  const edit = (change: (t: DayTemplate) => void): void =>
    void run((core) => {
      const t = core.templates.find((x) => x.id === id);
      if (t) change(t);
      return core;
    });
  const usedOn = template ? settings.core.pattern.flatMap((tid, d) => (tid === template.id ? [DAY_LONG[d]!] : [])) : [];
  const usedBy = template ? settings.schedule.overrides.filter((o) => o.template === template.id && o.to >= today()) : [];
  const close = (): void => {
    setName(null);
    setProblem(null);
    onClose();
  };

  return (
    <Sheet open={template !== undefined} title={template?.name ?? ''} onClose={close}>
      {template && (
        <div className="space-y-4">
          <TextField
            label="Name"
            value={name ?? template.name}
            onChange={setName}
            onBlur={() => {
              const next = (name ?? '').trim();
              if (next && next !== template.name) edit((t) => (t.name = next));
              setName(null);
            }}
          />
          <RowList label={'Blocks · ' + span(templateMinutes(template, blocks))}>
            {blocks.map((def) => {
              const entry = template.blocks.find((b) => b.block === def.id);
              return (
                <Row
                  key={def.id}
                  title={'Block ' + def.id + ' · ' + blockShort(def.name)}
                  meta={entry ? span(entry.minutes ?? def.minutes) + (entry.minutes === undefined ? ', the block’s own minutes' : '') : 'Not in this template'}
                  toggle={{
                    on: Boolean(entry),
                    onChange: (on) =>
                      edit((t) => {
                        t.blocks = on ? [...t.blocks, { block: def.id }].sort((a, b) => blocks.findIndex((x) => x.id === a.block) - blocks.findIndex((x) => x.id === b.block)) : t.blocks.filter((b) => b.block !== def.id);
                      }),
                  }}
                >
                  {entry && (
                    <div className="pb-3">
                      <NumberField
                        label={'Minutes of ' + blockShort(def.name)}
                        value={entry.minutes ?? def.minutes}
                        min={0}
                        max={720}
                        onCommit={(n) =>
                          edit((t) => {
                            const b = t.blocks.find((x) => x.block === def.id);
                            if (b) b.minutes = n;
                          })
                        }
                      />
                    </div>
                  )}
                </Row>
              );
            })}
          </RowList>
          <Problem text={problem} />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                const copyId = newTemplateId(template.name + ' copy', new Set(settings.core.templates.map((t) => t.id)));
                void run((core) => ((core.templates = [...core.templates, { ...structuredClone(template), id: copyId, name: template.name + ' (copy)' }]), core)).then(() => onOpen(copyId));
              }}
            >
              Duplicate
            </Button>
            <Button
              aria-disabled={usedOn.length > 0 || usedBy.length > 0 || settings.core.templates.length === 1 || undefined}
              onClick={() => {
                if (usedOn.length > 0 || usedBy.length > 0 || settings.core.templates.length === 1) return;
                void run((core) => ((core.templates = core.templates.filter((t) => t.id !== template.id)), core)).then(close);
              }}
            >
              Delete
            </Button>
          </div>
          {(usedOn.length > 0 || usedBy.length > 0) && (
            <p className="text-meta text-ink2">
              In use {usedOn.length > 0 ? 'on ' + usedOn.join(', ') : ''}
              {usedOn.length > 0 && usedBy.length > 0 ? ' and ' : ''}
              {usedBy.length > 0 ? 'by ' + usedBy.map((o) => o.label || formatRange(o.from, o.to)).join(', ') : ''}. Give those another template to delete it.
            </p>
          )}
        </div>
      )}
    </Sheet>
  );
}

/* ------------------------------------------------------------------ a date range */

function OverrideSheet({ settings, override, onClose }: { settings: StoredSettings; override: DateOverride | 'new' | null; onClose: () => void }) {
  const existing = override && override !== 'new' ? override : null;
  const [label, setLabel] = useState(existing?.label ?? '');
  const [from, setFrom] = useState(existing?.from ?? today());
  const [to, setTo] = useState(existing?.to ?? today());
  const [template, setTemplate] = useState(existing?.template ?? settings.core.templates.find((t) => t.id === 'exam')?.id ?? settings.core.templates[0]!.id);
  const [picking, setPicking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const save = (): void => {
    const start = parseDateInput(from);
    const end = parseDateInput(to);
    if (!start || !end) return setProblem('Dates are written YYYY-MM-DD, such as 2026-12-12.');
    if (end < start) return setProblem('The last day must not be before the first.');
    const row: DateOverride = { id: existing?.id ?? 'o-' + Date.now().toString(36), from: start, to: end, template };
    if (label.trim()) row.label = label.trim();
    void saveSettings((s) => ({ ...s, schedule: { ...s.schedule, overrides: [...s.schedule.overrides.filter((o) => o.id !== row.id), row].sort((a, b) => a.from.localeCompare(b.from)) } })).then(onClose);
  };
  const remove = (): void => {
    if (!existing) return;
    void saveSettings((s) => ({ ...s, schedule: { ...s.schedule, overrides: s.schedule.overrides.filter((o) => o.id !== existing.id) } })).then(onClose);
  };

  return (
    <>
      <Sheet
        open={override !== null && !picking}
        title={existing ? existing.label || 'Date range' : 'Give dates another template'}
        onClose={onClose}
        footer={
          <div className="flex gap-2">
            <Button variant="filled" onClick={save}>
              Save
            </Button>
            {existing && <Button onClick={remove}>Delete</Button>}
          </div>
        }
      >
        <div className="space-y-3">
          <TextField label="Name" value={label} onChange={setLabel} hint="Optional: “Exam week”, “Holiday”." />
          <div className="grid grid-cols-2 gap-3">
            <TextField label="First day" value={from} onChange={setFrom} hint="YYYY-MM-DD" />
            <TextField label="Last day" value={to} onChange={setTo} hint="YYYY-MM-DD" />
          </div>
          <RowList plain>
            <Row title="Template" trailing={settings.core.templates.find((t) => t.id === template)?.name ?? template} onClick={() => setPicking(true)} />
          </RowList>
          <Problem text={problem} />
          <p className="text-meta text-ink2">These days use this template instead of the weekly pattern. A change made on Today still beats it.</p>
        </div>
      </Sheet>
      <PickerSheet
        open={override !== null && picking}
        title="Template for these days"
        value={template}
        options={settings.core.templates.map((t) => ({ value: t.id, label: t.name, meta: describeTemplate(t, settings.core.blocks) }))}
        onPick={(v) => v && setTemplate(v)}
        onClose={() => setPicking(false)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ the section */

export function Schedule({ settings }: { settings: StoredSettings }) {
  const [template, setTemplate] = useState<string | null>(null);
  const [override, setOverride] = useState<DateOverride | 'new' | null>(null);
  const [weekday, setWeekday] = useState<number | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const core = settings.core;
  const days = core.weekStartsOn === 1 ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6];
  const nameOf = (id: string): string => core.templates.find((t) => t.id === id)?.name ?? id;
  const upcoming = settings.schedule.overrides.filter((o) => o.to >= today());
  const reset = (): void =>
    void saveCore((c) => ({ ...c, templates: structuredClone(seed.settings.templates), pattern: [...seed.settings.pattern] })).then((p) => {
      setProblem(p);
      if (!p) void saveSettings((s) => ({ ...s, schedule: { ...s.schedule, overrides: [] } }));
    });

  return (
    <Section id="schedule" title={'Schedule · ' + span(weeklyTargetMinutes(settings)) + ' this week'} onReset={reset}>
      <RowList label="Weekly pattern">
        {days.map((d) => (
          <Row key={d} title={DAY_LONG[d]!} trailing={nameOf(core.pattern[d]!) + (d === core.review.day ? ' · review' : '')} onClick={() => setWeekday(d)} />
        ))}
      </RowList>

      <RowList className="mt-4" label="Day templates">
        {core.templates.map((t) => (
          <Row key={t.id} title={t.name} meta={describeTemplate(t, core.blocks)} trailing={span(templateMinutes(t, core.blocks))} onClick={() => setTemplate(t.id)} />
        ))}
        <Row
          title="Add a template"
          onClick={() => {
            const id = newTemplateId('My day', new Set(core.templates.map((t) => t.id)));
            void saveCore((c) => ((c.templates = [...c.templates, { id, name: 'My day', blocks: [] }]), c)).then((p) => {
              setProblem(p);
              if (!p) setTemplate(id);
            });
          }}
        />
      </RowList>

      <RowList className="mt-4" label="Date ranges">
        {upcoming.map((o) => (
          <Row key={o.id} title={o.label || nameOf(o.template)} meta={formatRange(o.from, o.to) + (o.label ? ' · ' + nameOf(o.template) : '')} onClick={() => setOverride(o)} />
        ))}
        <Row title="Give a date or a range another template" meta="An exam week, a holiday, a rest day" onClick={() => setOverride('new')} />
      </RowList>
      <Problem text={problem} />

      <TemplateSheet settings={settings} id={template} onClose={() => setTemplate(null)} onOpen={setTemplate} />
      {override !== null && <OverrideSheet key={override === 'new' ? 'new' : override.id} settings={settings} override={override} onClose={() => setOverride(null)} />}
      <PickerSheet
        open={weekday !== null}
        title={weekday !== null ? DAY_LONG[weekday]! : ''}
        value={weekday !== null ? core.pattern[weekday]! : null}
        options={core.templates.map((t) => ({ value: t.id, label: t.name, meta: describeTemplate(t, core.blocks) }))}
        onPick={(v) => {
          if (v && weekday !== null) void saveCore((c) => ((c.pattern[weekday] = v), c)).then(setProblem);
        }}
        onClose={() => setWeekday(null)}
      />
    </Section>
  );
}

/* ------------------------------------------------------------------ blocks */

function nextBlockId(blocks: BlockDef[]): string {
  for (const letter of 'FGHIJKLMNOQRSTUVWXYZ') if (!blocks.some((b) => b.id === letter)) return letter;
  return 'X' + blocks.length;
}

function BlockSheet({ settings, id, onClose }: { settings: StoredSettings; id: string | null; onClose: () => void }) {
  const index = settings.core.blocks.findIndex((b) => b.id === id);
  const block = index >= 0 ? settings.core.blocks[index] : undefined;
  const [name, setName] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [pickingTrack, setPickingTrack] = useState(false);
  const run = async (change: (core: SettingsDefaults) => SettingsDefaults): Promise<void> => setProblem(await saveCore(change));
  const isLane = block ? ['A', 'B', 'C', 'D', 'E'].includes(block.id) : false;
  const close = (): void => {
    setName(null);
    setProblem(null);
    onClose();
  };
  return (
    <>
      <Sheet open={block !== undefined && !pickingTrack} title={block ? 'Block ' + block.id : ''} onClose={close}>
        {block && (
          <div className="space-y-4">
            <TextField
              label="Name"
              value={name ?? block.name}
              onChange={setName}
              onBlur={() => {
                const next = (name ?? '').trim();
                if (next && next !== block.name) void run((core) => ((core.blocks[index]!.name = next), core));
                setName(null);
              }}
            />
            <NumberField label="Minutes a day" value={block.minutes} min={0} max={720} hint="In a template that does not set its own, such as the Full day." onCommit={(n) => void run((core) => ((core.blocks[index]!.minutes = n), core))} />
            <Chips
              label="Days"
              items={DAY_SHORT.map((day, d) => {
                const on = block.days.includes(d);
                return {
                  key: day,
                  label: day,
                  pressed: on,
                  onClick: () =>
                    void run((core) => {
                      const days = core.blocks[index]!.days;
                      core.blocks[index]!.days = on ? days.filter((x) => x !== d) : [...days, d].sort();
                      return core;
                    }),
                };
              })}
            />
            <div>
              <p className="mb-1.5 text-meta text-ink2">Colour</p>
              <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-1">
                {BLOCK_COLOURS.map((track) => {
                  const chosen = (block.colour ?? null) === track;
                  return (
                    <button
                      key={track}
                      type="button"
                      role="radio"
                      aria-checked={chosen}
                      aria-label={seed.tracks.find((t) => t.id === track)?.name ?? track}
                      onClick={() => void run((core) => ((core.blocks[index]!.colour = track), core))}
                      className="grid size-11 place-items-center rounded-button"
                    >
                      <span className={'size-7 rounded-pill ' + (chosen ? 'ring-2 ring-ink ring-offset-2 ring-offset-surface' : '')} style={{ background: 'var(--track-' + track + ')' }} />
                    </button>
                  );
                })}
              </div>
              {block.colour && (
                <Button size="sm" className="mt-1" onClick={() => void run((core) => (delete core.blocks[index]!.colour, core))}>
                  The lane’s own colour
                </Button>
              )}
            </div>
            <RowList plain>
              <Row title="Track" meta="Time in this block counts toward it when its item has none" trailing={seed.tracks.find((t) => t.id === block.track)?.name ?? 'None'} onClick={() => setPickingTrack(true)} />
            </RowList>
            <Problem text={problem} />
            {isLane ? (
              <p className="text-meta text-ink2">Blocks A to E carry the curriculum's lanes and stay; take one out of a template to leave it out of those days.</p>
            ) : (
              <Button
                onClick={() =>
                  void run((core) => {
                    core.blocks = core.blocks.filter((b) => b.id !== block.id);
                    core.templates = core.templates.map((t) => ({ ...t, blocks: t.blocks.filter((b) => b.block !== block.id) }));
                    if (core.review.block === block.id) core.review.block = 'D';
                    return core;
                  }).then(close)
                }
              >
                Delete block {block.id}
              </Button>
            )}
          </div>
        )}
      </Sheet>
      <PickerSheet
        open={block !== undefined && pickingTrack}
        title="Track"
        searchLabel="Search tracks"
        value={block?.track ?? null}
        clearLabel="None"
        options={seed.tracks.map((t) => ({ value: t.id, label: t.name, keywords: t.summary }))}
        onPick={(v) =>
          void run((core) => {
            if (v) core.blocks[index]!.track = v as TrackId;
            else delete core.blocks[index]!.track;
            return core;
          })
        }
        onClose={() => setPickingTrack(false)}
      />
    </>
  );
}

export function Blocks({ settings }: { settings: StoredSettings }) {
  const [open, setOpen] = useState<string | null>(null);
  const [ordering, setOrdering] = useState(false);
  const [pickingDay, setPickingDay] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const blocks = settings.core.blocks;
  const move = (from: number, to: number): void =>
    void saveCore((core) => {
      const [b] = core.blocks.splice(from, 1);
      core.blocks.splice(to, 0, b!);
      return core;
    }).then(setProblem);
  const reset = (): void =>
    void saveCore((core) => {
      const extra = core.blocks.filter((b) => !seed.settings.blocks.some((d) => d.id === b.id));
      return { ...core, blocks: structuredClone(seed.settings.blocks), templates: core.templates.map((t) => ({ ...t, blocks: t.blocks.filter((b) => !extra.some((x) => x.id === b.block)) })), review: { ...seed.settings.review } };
    }).then(setProblem);

  return (
    <Section id="blocks" title="Blocks" onReset={reset}>
      <RowList>
        {blocks.map((block, index) => (
          <Row
            key={block.id}
            edge={blockColor(block)}
            title={'Block ' + block.id + ' · ' + blockShort(block.name)}
            meta={span(block.minutes) + ' · ' + describeDays(block.days)}
            onClick={ordering ? undefined : () => setOpen(block.id)}
            action={
              ordering ? (
                <span className="flex shrink-0">
                  <Button variant="icon" icon="arrowUp" label={'Move block ' + block.id + ' up'} aria-disabled={index === 0 || undefined} onClick={() => index > 0 && move(index, index - 1)} />
                  <Button variant="icon" icon="arrowDown" label={'Move block ' + block.id + ' down'} aria-disabled={index === blocks.length - 1 || undefined} onClick={() => index < blocks.length - 1 && move(index, index + 1)} />
                </span>
              ) : undefined
            }
          />
        ))}
        <Row title="Weekly review" trailing={dayName(DATE_OF_DAY[settings.core.review.day]!)} onClick={() => setPickingDay(true)} />
      </RowList>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          icon="plus"
          onClick={() => {
            const id = nextBlockId(blocks);
            void saveCore((core) => {
              core.blocks.push({ id, name: 'My block', minutes: 30, days: [0, 1, 2, 3, 4, 5, 6], summary: 'A block of your own.' });
              const full = core.templates.find((t) => t.id === core.pattern[1]) ?? core.templates[0];
              full?.blocks.push({ block: id });
              return core;
            }).then((p) => {
              setProblem(p);
              if (!p) setOpen(id);
            });
          }}
        >
          Add a block
        </Button>
        <Button onClick={() => setOrdering((v) => !v)} aria-pressed={ordering}>
          {ordering ? 'Done' : 'Reorder'}
        </Button>
      </div>
      <Problem text={problem} />
      <BlockSheet settings={settings} id={open} onClose={() => setOpen(null)} />
      <PickerSheet
        open={pickingDay}
        title="Weekly review"
        value={String(settings.core.review.day)}
        options={DAY_SHORT.map((_, d) => ({ value: String(d), label: dayName(DATE_OF_DAY[d]!) }))}
        onPick={(v) => v && void saveCore((core) => ((core.review.day = Number(v)), core)).then(setProblem)}
        onClose={() => setPickingDay(false)}
      />
    </Section>
  );
}
