import { useState } from 'react';
import { updateSettings } from '../../db/settings.ts';
import type { DayChange, StoredSettings } from '../../db/types.ts';
import { addDays, dayName } from '../../lib/dates.ts';
import { resolveDay, withDayChange } from '../../lib/day-plan.ts';
import { seed } from '../../seed/index.ts';
import type { BlockId } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { NumberField } from '../../ui/NumberField.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { PickerSheet } from './PickerSheet.tsx';
import { blockShort, span } from './text.ts';

type Picking = { kind: 'template' } | { kind: 'swap'; block: BlockId } | null;

/**
 * Today's one quiet action: change this day only. Switch its template, change one block's minutes, skip a block,
 * move a block to tomorrow, swap two blocks' items, or make it a rest day. Each change names this date, so it
 * never touches another day's plan, and the weekly pattern stays as it is.
 */
export function ChangeTodaySheet({ open, onClose, date, settings, title }: { open: boolean; onClose: () => void; date: string; settings: StoredSettings; title: string }) {
  const [openBlock, setOpenBlock] = useState<BlockId | null>(null);
  const [picking, setPicking] = useState<Picking>(null);
  const day = resolveDay(date, settings);
  const change = settings.schedule.days[date] ?? {};
  const changed = Object.keys(change).length > 0;
  const tomorrow = dayName(addDays(date, 1));

  const apply = (edit: (c: DayChange) => DayChange): void => {
    void updateSettings(seed.settings, (s) => withDayChange(s, date, edit));
  };
  const nameOf = (id: BlockId): string => blockShort(settings.core.blocks.find((b) => b.id === id)?.name ?? 'Block ' + id);
  const without = (list: BlockId[] | undefined, id: BlockId): BlockId[] => (list ?? []).filter((b) => b !== id);
  const close = (): void => {
    setOpenBlock(null);
    onClose();
  };

  const away = [
    ...day.skipped.map((id) => ({ id, why: 'Skipped today' })),
    ...day.movedOut.map((id) => ({ id, why: 'Moved to ' + tomorrow })),
  ];

  return (
    <>
      <Sheet
        open={open && picking === null}
        title={title}
        onClose={close}
        footer={
          changed ? (
            <Button onClick={() => apply(() => ({}))} icon="undo">
              Undo today&apos;s changes
            </Button>
          ) : undefined
        }
      >
        <RowList plain>
          <Row title="Template" trailing={day.rest ? 'Rest day' : day.templateName} meta={day.overrideLabel ? 'From ' + day.overrideLabel : day.source === 'pattern' ? 'From the weekly pattern' : undefined} onClick={() => setPicking({ kind: 'template' })} />
          <Row title="Rest day" meta="Nothing planned; the streak is safe" toggle={{ on: Boolean(change.rest), onChange: (on) => apply((c) => ({ ...c, rest: on || undefined })) }} />
        </RowList>

        {!day.rest && (
          <RowList className="mt-4" label={'Blocks · ' + span(day.planned)}>
            {day.blocks.map((block) => {
              const swapped = day.swaps.find((pair) => pair.includes(block.id));
              const meta = [
                'Block ' + block.id,
                block.movedFrom ? 'moved from ' + dayName(block.movedFrom) : null,
                swapped ? "doing " + nameOf(swapped[0] === block.id ? swapped[1] : swapped[0]) + "'s work" : null,
              ]
                .filter(Boolean)
                .join(' · ');
              const expanded = openBlock === block.id;
              return (
                <Row key={block.id} title={nameOf(block.id)} meta={meta} trailing={span(block.minutes)} expanded={expanded} onClick={() => setOpenBlock(expanded ? null : block.id)}>
                  {expanded && (
                    <div className="space-y-3 pb-3 pt-1">
                      <NumberField
                        label={'Minutes for ' + nameOf(block.id) + ' today'}
                        value={block.minutes}
                        min={0}
                        max={720}
                        onCommit={(n) => apply((c) => ({ ...c, minutes: { ...c.minutes, [block.id]: n } }))}
                      />
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" onClick={() => apply((c) => ({ ...c, skip: [...without(c.skip, block.id), block.id] }))}>
                          Skip today
                        </Button>
                        <Button size="sm" onClick={() => apply((c) => ({ ...c, toTomorrow: [...without(c.toTomorrow, block.id), block.id] }))}>
                          Move to {tomorrow}
                        </Button>
                        {swapped ? (
                          <Button size="sm" onClick={() => apply((c) => ({ ...c, swaps: (c.swaps ?? []).filter((p) => !p.includes(block.id)) }))}>
                            Undo the swap
                          </Button>
                        ) : (
                          day.blocks.length > 1 && (
                            <Button size="sm" onClick={() => setPicking({ kind: 'swap', block: block.id })}>
                              Swap items with…
                            </Button>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </Row>
              );
            })}
          </RowList>
        )}

        {away.length > 0 && (
          <RowList className="mt-4" label="Not today">
            {away.map(({ id, why }) => (
              <Row
                key={id}
                title={nameOf(id)}
                meta={why}
                action={
                  <Button size="sm" onClick={() => apply((c) => ({ ...c, skip: without(c.skip, id), toTomorrow: without(c.toTomorrow, id) }))}>
                    Bring back
                  </Button>
                }
              />
            ))}
          </RowList>
        )}

        <p className="mt-4 text-meta text-ink2">These changes are for this day only. Templates, the weekly pattern and date ranges are in Settings › Schedule.</p>
      </Sheet>

      <PickerSheet
        open={open && picking?.kind === 'template'}
        title="Template for today"
        searchLabel="Search templates"
        value={change.template ?? day.templateId}
        options={settings.core.templates.map((t) => ({
          value: t.id,
          label: t.name,
          meta: t.blocks.length === 0 ? 'No blocks' : t.blocks.map((b) => b.block).join(' · '),
        }))}
        onPick={(v) => v && apply((c) => ({ ...c, template: v, rest: undefined }))}
        onClose={() => setPicking(null)}
      />

      <PickerSheet
        open={open && picking?.kind === 'swap'}
        title={picking?.kind === 'swap' ? 'Swap ' + nameOf(picking.block) + "'s item with" : 'Swap with'}
        searchLabel="Search blocks"
        value={null}
        options={day.blocks.filter((b) => picking?.kind === 'swap' && b.id !== picking.block && !day.swaps.some((p) => p.includes(b.id))).map((b) => ({ value: b.id, label: nameOf(b.id), meta: 'Block ' + b.id }))}
        onPick={(v) => {
          if (v && picking?.kind === 'swap') {
            const a = picking.block;
            apply((c) => ({ ...c, swaps: [...(c.swaps ?? []).filter((p) => !p.includes(a) && !p.includes(v)), [a, v]] }));
          }
        }}
        onClose={() => setPicking(null)}
      />
    </>
  );
}
