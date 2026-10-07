import { useState } from 'react';
import { setItemStatus } from '../../db/state.ts';
import { parseDuration } from '../../lib/dates.ts';
import { addEntry, editLog } from '../../lib/logs.ts';
import type { ScheduledItem } from '../../lib/schedule.ts';
import { seed } from '../../seed/index.ts';
import type { BlockId, TrackId } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { Chips } from '../../ui/Chips.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { SegmentedControl } from '../../ui/SegmentedControl.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { PickerSheet } from './PickerSheet.tsx';
import { shortTitle } from './text.ts';

type Mode = 'item' | 'other';

/**
 * Logs minutes: against the item in front of you, or against something else (free text, a track and a
 * block). Quick amounts log at once; any amount can be typed ("45", "1h 30m").
 */
export function LogTimeSheet({
  open,
  onClose,
  date,
  block,
  item,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
  /** The block and item the time belongs to by default; without them the sheet logs "something else". */
  block?: BlockId;
  item?: ScheduledItem;
}) {
  const [mode, setMode] = useState<Mode>(item ? 'item' : 'other');
  const [minutes, setMinutes] = useState('');
  const [what, setWhat] = useState('');
  const [track, setTrack] = useState<TrackId>(item?.track ?? 'swe');
  const [otherBlock, setOtherBlock] = useState<BlockId>(block ?? 'D');
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const effective: Mode = item ? mode : 'other';

  const close = (): void => {
    setMinutes('');
    setWhat('');
    setError(null);
    onClose();
  };

  const log = (amount: number): void => {
    if (effective === 'item' && item && block) {
      void editLog(date, (current) => addEntry(current, { block, track: item.track, refId: item.refId, minutes: amount }));
      if (item.status === 'todo') void setItemStatus(item.refId, 'active');
    } else {
      if (!what.trim()) {
        setError('Say what you did, in a few words.');
        return;
      }
      void editLog(date, (current) => addEntry(current, { block: otherBlock, track, minutes: amount, note: what.trim() }));
    }
    close();
  };

  const submit = (): void => {
    const amount = parseDuration(minutes);
    if (amount === null || amount <= 0) {
      setError('Enter the time, for example 45 or 1h 30m.');
      return;
    }
    log(amount);
  };

  const trackName = seed.tracks.find((t) => t.id === track)?.name ?? track;

  return (
    <Sheet
      open={open}
      title="Log time"
      onClose={close}
      footer={
        <Button variant="filled" onClick={submit}>
          Log time
        </Button>
      }
    >
      {item && (
        <div className="mb-4">
          <SegmentedControl
            label="What the time was for"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'item', label: shortTitle(item.title) },
              { value: 'other', label: 'Something else' },
            ]}
          />
        </div>
      )}

      {effective === 'other' && (
        <div className="mb-4 space-y-3">
          <TextField label="What did you do?" value={what} onChange={(v) => { setWhat(v); setError(null); }} autoFocus />
          <RowList>
            <Row title="Track" trailing={trackName} onClick={() => setPicking(true)} />
          </RowList>
          <Chips
            label="Block"
            items={seed.settings.blocks.map((b) => ({ key: b.id, label: 'Block ' + b.id, pressed: otherBlock === b.id, onClick: () => setOtherBlock(b.id) }))}
          />
        </div>
      )}

      <Chips label="Quick amounts" items={[15, 30, 60].map((m) => ({ key: String(m), label: 'Log ' + m + ' min', pressed: false, onClick: () => log(m) }))} />
      <TextField
        className="mt-3"
        label="Minutes"
        value={minutes}
        onChange={(v) => {
          setMinutes(v);
          setError(null);
        }}
        type="numeric"
        error={error}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
      />

      <PickerSheet
        open={picking}
        title="Track"
        value={track}
        options={seed.tracks.map((t) => ({ value: t.id, label: t.name, meta: t.family }))}
        onPick={(v) => v && setTrack(v as TrackId)}
        onClose={() => setPicking(false)}
        searchLabel="Search tracks"
      />
    </Sheet>
  );
}
