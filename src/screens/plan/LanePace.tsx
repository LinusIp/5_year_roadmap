import { useState } from 'react';
import type { LanePaceMode, Pause } from '../../db/types.ts';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { addDays, formatLong, today } from '../../lib/dates.ts';
import { pauseOn } from '../../lib/day-plan.ts';
import { catchUpMinutes, defaultPauseTarget, laneBalance } from '../../lib/pace.ts';
import { activePhase, nextInLane } from '../../lib/schedule.ts';
import type { BlockId } from '../../seed/schema.ts';
import { Button } from '../../ui/Button.tsx';
import { NumberField } from '../../ui/NumberField.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { SegmentedControl } from '../../ui/SegmentedControl.tsx';
import { Sheet } from '../../ui/Sheet.tsx';
import { TextField } from '../../ui/TextField.tsx';
import { PickerSheet } from '../parts/PickerSheet.tsx';
import { blockShort, span } from '../parts/text.ts';
import { parseDateInput, saveSettings } from '../settings/shared.tsx';

const PACE_LABEL: Record<LanePaceMode, string> = { normal: 'Normal', relaxed: 'Relaxed, 25 % less', intense: 'Intense, 25 % more', custom: 'Custom' };

/** One line for the lane sheet's Pace row. */
export function paceSummary(atlas: Atlas, block: BlockId): string {
  const now = today();
  const pace = atlas.settings.pace[block];
  const pause = pauseOn(atlas.settings, block, now);
  const parts = [pace?.mode === 'custom' ? span(pace.minutes ?? 0) + ' a day' : PACE_LABEL[pace?.mode ?? 'normal']];
  if (pause) parts.push('paused' + (pause.until ? ' until ' + formatLong(pause.until) : ''));
  if (atlas.settings.catchUp[block]) parts.push('catching up');
  return parts.join(' · ');
}

/**
 * A lane's pace: normal, relaxed, intense or a fixed number of minutes; pausing it (its minutes go to another lane
 * or to free time); how far behind or ahead it is, with opt-in catch-up; and, when it is done for the phase early,
 * what to do with its time.
 */
export function LanePace({ atlas, block, open, onClose }: { atlas: Atlas; block: BlockId; open: boolean; onClose: () => void }) {
  const { settings, seed, logs } = atlas;
  const now = today();
  const phase = activePhase(now, seed.phases);
  const def = settings.core.blocks.find((b) => b.id === block);
  const name = blockShort(def?.name ?? 'Block ' + block);
  const pace = settings.pace[block] ?? { mode: 'normal' as const };
  const pause = pauseOn(settings, block, now) ?? settings.pauses.find((p) => p.block === block && p.from > now);
  const balance = phase ? laneBalance(settings, logs, block, phase.start, now) : null;
  const catchUp = settings.catchUp[block];
  const [pausing, setPausing] = useState(false);
  const [from, setFrom] = useState(now);
  const [until, setUntil] = useState('');
  const [target, setTarget] = useState<BlockId | 'free'>(() => defaultPauseTarget(seed, settings, phase?.id ?? null, block, now));
  const [picking, setPicking] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const laneDone = phase ? nextInLane(phase.id, block, { seed, states: atlas.states }) === null || nextInLane(phase.id, block, { seed, states: atlas.states })?.fromLaterPhase === true : false;
  const nameOf = (id: BlockId | 'free'): string => (id === 'free' ? 'Free time' : blockShort(settings.core.blocks.find((b) => b.id === id)?.name ?? id));

  const setPace = (mode: LanePaceMode, minutes?: number): void =>
    void saveSettings((s) => {
      const next = { ...s.pace };
      if (mode === 'normal') delete next[block];
      else next[block] = { mode, from: now, ...(mode === 'custom' ? { minutes: minutes ?? s.pace[block]?.minutes ?? def?.minutes ?? 60 } : {}) };
      return { ...s, pace: next };
    });

  const savePause = (row: Pause): void => void saveSettings((s) => ({ ...s, pauses: [...s.pauses.filter((p) => p.id !== row.id), row] }));
  const resume = (): void => {
    if (!pause) return;
    void saveSettings((s) => ({
      ...s,
      // A pause that has not begun is simply removed; one under way ends yesterday, so the days it covered keep their plan.
      pauses: pause.from >= now ? s.pauses.filter((p) => p.id !== pause.id) : s.pauses.map((p) => (p.id === pause.id ? { ...p, until: addDays(now, -1) } : p)),
    }));
  };
  const startPause = (): void => {
    const start = parseDateInput(from);
    const end = until.trim() ? parseDateInput(until) : null;
    if (!start || (until.trim() && !end)) return setProblem('Dates are written YYYY-MM-DD.');
    if (end && end < start) return setProblem('The pause must end on or after the day it starts.');
    setProblem(null);
    savePause({ id: 'pause-' + Date.now().toString(36), block, from: start, until: end, to: target });
    setPausing(false);
  };

  const behindText = balance
    ? Math.abs(balance.behind) < 15
      ? 'On plan this phase'
      : balance.behind > 0
        ? 'Behind by ' + span(balance.behind) + ' this phase'
        : 'Ahead by ' + span(-balance.behind) + ' this phase'
    : 'No phase is under way';

  return (
    <>
      <Sheet open={open && !picking} title={'Pace · ' + name} onClose={onClose}>
        <div className="space-y-5">
          <div>
            <SegmentedControl
              label="Pace"
              value={pace.mode}
              onChange={(mode: LanePaceMode) => setPace(mode)}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'relaxed', label: 'Relaxed' },
                { value: 'intense', label: 'Intense' },
                { value: 'custom', label: 'Custom' },
              ]}
            />
            <p className="mt-2 text-meta text-ink2">{pace.mode === 'custom' ? 'The same minutes on every day this lane runs, whatever the template says.' : PACE_LABEL[pace.mode] + ' against what the day’s template plans.'}</p>
            {pace.mode === 'custom' && (
              <div className="mt-3">
                <NumberField label="Minutes a day" value={pace.minutes ?? def?.minutes ?? 60} min={0} max={720} onCommit={(n) => setPace('custom', n)} />
              </div>
            )}
          </div>

          <RowList label={behindText}>
            <Row
              title="Catch up"
              meta={catchUp ? 'Up to ' + span(catchUp.capMinutes) + ' a day extra' + (balance && catchUpMinutes(settings, balance) > 0 ? ', ' + span(catchUpMinutes(settings, balance)) + ' today' : '') : 'Off: being behind never adds to tomorrow'}
              toggle={{
                on: Boolean(catchUp),
                onChange: (on) =>
                  void saveSettings((s) => {
                    const next = { ...s.catchUp };
                    if (on) next[block] = { capMinutes: 30 };
                    else delete next[block];
                    return { ...s, catchUp: next };
                  }),
              }}
            >
              {catchUp && (
                <div className="pb-3">
                  <NumberField
                    label="At most, minutes a day"
                    value={catchUp.capMinutes}
                    min={5}
                    max={240}
                    onCommit={(n) => void saveSettings((s) => ({ ...s, catchUp: { ...s.catchUp, [block]: { capMinutes: n } } }))}
                  />
                </div>
              )}
            </Row>
          </RowList>

          {laneDone && phase && (
            <div className="space-y-2">
              <p className="text-body">This lane is done for {phase.title}, ahead of {formatLong(phase.end)}.</p>
              <div className="flex flex-wrap gap-2">
                <Button to="/" onClick={onClose}>
                  Start the next item now
                </Button>
                <Button onClick={() => savePause({ id: 'pause-' + Date.now().toString(36), block, from: now, until: phase.end, to: defaultPauseTarget(seed, settings, phase.id, block, now) })}>
                  Give the time to another lane
                </Button>
              </div>
            </div>
          )}

          {pause ? (
            <div className="space-y-2">
              <p className="text-body">
                {pause.from > now ? 'Pauses from ' + formatLong(pause.from) : 'Paused since ' + formatLong(pause.from)}
                {pause.until ? ' until ' + formatLong(pause.until) : ' until you resume it'}. Its time goes to {nameOf(pause.to)}.
              </p>
              <Button onClick={resume}>{pause.from > now ? 'Cancel the pause' : 'Resume'}</Button>
            </div>
          ) : pausing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <TextField label="From" value={from} onChange={setFrom} hint="YYYY-MM-DD" />
                <TextField label="Until" value={until} onChange={setUntil} hint="Empty: until you resume" />
              </div>
              <RowList plain>
                <Row title="Its time goes to" trailing={nameOf(target)} onClick={() => setPicking(true)} />
              </RowList>
              {problem && (
                <p role="alert" className="text-meta font-medium text-ink">
                  {problem}
                </p>
              )}
              <div className="flex gap-2">
                <Button onClick={startPause}>Pause {name}</Button>
                <Button variant="icon" onClick={() => setPausing(false)}>
                  Not now
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setPausing(true)}>Pause this lane</Button>
          )}
        </div>
      </Sheet>
      <PickerSheet
        open={open && picking}
        title="Its time goes to"
        value={target}
        options={[...settings.core.blocks.filter((b) => b.id !== block).map((b) => ({ value: b.id, label: 'Block ' + b.id + ' · ' + blockShort(b.name) })), { value: 'free', label: 'Free time', meta: 'The day plans less' }]}
        onPick={(v) => v && setTarget(v)}
        onClose={() => setPicking(false)}
      />
    </>
  );
}
