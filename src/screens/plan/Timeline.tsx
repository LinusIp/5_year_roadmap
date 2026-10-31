import { useState } from 'react';
import type { Atlas } from '../../hooks/useAtlas.ts';
import { describeVerdict, verdictTone } from '../../lib/forecast.ts';
import { ArtPanel } from '../../ui/ArtPanel.tsx';
import { phaseSlot } from '../../lib/art.ts';
import { laneSlot } from '../../lib/scenes.ts';
import { ScenePanel } from '../../ui/ScenePanel.tsx';
import { monthName } from '../../lib/dates.ts';
import type { Goal, Unit } from '../../seed/schema.ts';
import { goalStatus } from '../../lib/goals.ts';
import { useInternSummaries } from '../../hooks/useInternships.ts';
import { daysToApply, roleName } from '../../lib/internships.ts';
import { today } from '../../lib/dates.ts';
import { longDate } from '../parts/text.ts';
import { BlockTile, IconTile } from '../../ui/glyphs.tsx';
import { Button } from '../../ui/Button.tsx';
import { ProgressLine } from '../../ui/ProgressLine.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { nameOf, span } from '../parts/text.ts';
import { isOpenItem, itemDetail } from './model.ts';
import { dayLayout } from '../../lib/calendar.ts';
import { hm } from '../../lib/calendar-layout.ts';
import { BREAK_MINUTES, formatWindow } from '../../lib/clock-plan.ts';
import type { StoredSettings } from '../../db/types.ts';
import type { PhaseModel } from './model.ts';


/** "Math & physics" -> "Math and physics", "Core track" -> "Core", "Projects / hands-on" -> "Projects". */
export function laneName(name: string): string {
  return name.split('/')[0]!.trim().replace(/ track$/i, '').replace(/\s*&\s*/g, ' and ');
}

/**
 * The day's schedule for the Timeline's first group: "Every day" when every weekday has the same template, and
 * "06:00–12:00 · 18:00–22:00 · 10 h" from its sessions (blocks run back to back; a gap of an hour or more starts a new one).
 */
export function scheduleSummary(settings: StoredSettings, date: string): { label: string; aside: string; windows: { id: string; start: number; minutes: number }[] } {
  const windows = dayLayout(date, settings).map((b) => ({ id: b.id, start: b.start, minutes: b.minutes }));
  const sessions: [number, number][] = [];
  for (const w of [...windows].sort((a, b) => a.start - b.start)) {
    const last = sessions.at(-1);
    if (last && w.start - last[1] < BREAK_MINUTES) last[1] = Math.max(last[1], w.start + w.minutes);
    else sessions.push([w.start, w.start + w.minutes]);
  }
  const total = windows.reduce((sum, w) => sum + w.minutes, 0);
  const same = new Set(settings.core.pattern).size === 1;
  return { label: same ? 'Every day' : 'Today', aside: [...sessions.map(([a, b]) => formatWindow(a, b - a)), span(total)].join(' · '), windows };
}

/** "February → August 2027", or both years when the range crosses one. */
function monthRange(start: string, end: string): string {
  const [ys, ms] = start.split('-').map(Number) as [number, number];
  const [ye, me] = end.split('-').map(Number) as [number, number];
  return ys === ye ? monthName(ms - 1) + ' → ' + monthName(me - 1) + ' ' + ye : monthName(ms - 1) + ' ' + ys + ' → ' + monthName(me - 1) + ' ' + ye;
}

/**
 * The five lanes of a phase, as on the Plan board: one list group, each lane a row with its block's icon in a knob,
 * the block and its hours, the forecast on the right ("behind" in ice-deep), the item it is on, and a progress well.
 */
function Lanes({
  atlas,
  model,
  units,
  isCurrent,
  weekly,
  onLane,
  onReplan,
  label,
  aside,
  windows,
}: {
  atlas: Atlas;
  model: PhaseModel;
  units: Record<string, Unit[]> | undefined;
  isCurrent: boolean;
  weekly: string | null;
  onLane: (block: string) => void;
  /** With the current phase: the lanes whose plan does not fit the days left can go straight to Re-plan. */
  onReplan?: () => void;
  label?: string;
  aside?: string;
  /** The day's blocks at their times: lanes in that order, each with its window, and only those. */
  windows?: { id: string; start: number; minutes: number }[];
}) {
  const lanes = windows
    ? windows.flatMap((w) => model.progress.lanes.filter((l) => l.block === w.id))
    : model.progress.lanes;
  const list = (
    <ul className="rows">
      {lanes.map((lane) => {
        const def = atlas.settings.core.blocks.find((b) => b.id === lane.block)!;
        const next = lane.items.find(isOpenItem);
        const forecast = model.forecast.lanes.find((l) => l.block === lane.block);
        let meta: string;
        if (lane.items.length === 0) meta = 'Nothing planned';
        else if (!next) meta = 'All ' + lane.items.length + ' done';
        else {
          const detail = itemDetail(next, units, atlas.states.get(next.refId)?.unitsDone ?? []);
          meta = nameOf(next) + (detail ? ', ' + detail : '');
          if (lane.block === 'D' && isCurrent && weekly) meta = 'Weekly: ' + weekly + ' · Monthly: ' + nameOf(next);
        }
        const behind = isCurrent && forecast !== undefined && verdictTone(forecast.verdict) === 'warning';
        const window = windows?.find((w) => w.id === lane.block);
        if (window) meta = hm(window.start) + '–' + hm(window.start + window.minutes) + ' · ' + meta;
        const title = window ? def.name : laneName(def.name) + ' · ' + span(def.minutes);
        return (
          <li key={lane.block}>
            <button type="button" onClick={() => onLane(lane.block)} className="flex w-full items-start gap-3 py-3 text-left">
              <BlockTile block={lane.block} />
              <span className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 text-body font-medium leading-[1.3]">{title}</span>
                  {/* A long verdict ("Finishes ~Jun 2028 (17 months late)") wraps on the right, never past the tile. */}
                  <span className={'min-w-0 max-w-[60%] shrink text-right text-meta ' + (behind ? 'font-semibold text-ice-deep' : 'text-ink2')}>
                    {isCurrent && forecast ? describeVerdict(forecast.verdict, forecast.weeksLate, { projectedEnd: forecast.projectedEnd, overflowHours: forecast.overflowHours }) : Math.round(lane.totalHours) + ' h'}
                  </span>
                </span>
                <span className="text-meta text-ink2">{meta}</span>
                <span className="mt-1.5 block">
                  <ProgressLine value={lane.fraction} label={laneName(def.name) + ' progress'} lane={laneSlot(lane.block)} />
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
  // The phase in one line, only when a pace alone cannot mend it: lanes planned past the days left, or too little
  // logged yet to say anything. Over the lanes shown here: a block outside the daily schedule (Projects, fed from
  // Calendar) has no days to hold its hours and is not the point.
  const shown = lanes.map((lane) => model.forecast.lanes.find((l) => l.block === lane.block)).filter((f) => f !== undefined);
  const lanesOver = shown.filter((f) => f.verdict === 'over-planned').length;
  const open = shown.filter((f) => f.verdict !== 'done');
  const note =
    isCurrent && lanesOver > 0
      ? describeVerdict('over-planned', null, { lanesOver }) + ': more hours on the plan than the days left hold.'
      : isCurrent && open.length > 0 && open.every((f) => f.verdict === 'early')
        ? 'Too early to tell: a week of logs, three days with hours, and the lanes get a verdict.'
        : null;
  const footer = note && (
    <div className="flex flex-wrap items-center justify-between gap-2 pb-2 pt-1">
      <p className={'text-meta ' + (lanesOver > 0 ? 'font-semibold text-ice-deep' : 'text-ink2')}>{note}</p>
      {lanesOver > 0 && onReplan && (
        <Button size="sm" variant="ice" onClick={onReplan}>
          Re-plan these lanes
        </Button>
      )}
    </div>
  );
  if (!label)
    return (
      <>
        {list}
        {footer}
      </>
    );
  return (
    <section className="tile px-[18px] pb-2 pt-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="section-label">{label}</h2>
        {aside && <span className="text-meta font-semibold text-ink2">{aside}</span>}
      </div>
      {list}
      {footer}
    </section>
  );
}

/**
 * Timeline: the current phase's lanes, then the phases after it as rows that open in place. Re-plan sits behind
 * one quiet button at the end, never as a banner; next to it, the five-year map.
 */
export function Timeline({
  atlas,
  model,
  currentId,
  units,
  weekly,
  onLane,
  onReplan,
  onEdit,
  onGoal,
}: {
  atlas: Atlas;
  model: PhaseModel[];
  currentId: string | null;
  units: Record<string, Unit[]> | undefined;
  weekly: string | null;
  onLane: (phaseId: string, block: string) => void;
  onReplan: () => void;
  onEdit: () => void;
  onGoal: (goal: Goal) => void;
}) {
  const [openPhase, setOpenPhase] = useState<string | null>(null);
  const everyDay = scheduleSummary(atlas.settings, today());
  const internships = useInternSummaries(today()) ?? [];
  const index = model.findIndex((m) => m.phase.id === currentId);
  const current = index >= 0 ? model[index] : undefined;
  const earlier = index >= 0 ? model.slice(0, index) : model.filter((m) => m.phase.end < (atlas.seed.phases[0]?.start ?? ''));
  const later = index >= 0 ? model.slice(index + 1) : model;

  /** "February → August 2027 · C, C++, 6.006" for the phase straight after this one, "Year 2 · …" for the rest. */
  const phaseMeta = (m: PhaseModel, position: number): string => {
    const topics = m.phase.topics ?? m.progress.lanes.map((l) => l.items[0]).filter((i) => i !== undefined).map((i) => nameOf(i)).join(', ');
    const when = position === 0 ? monthRange(m.phase.start, m.phase.end) : 'Year ' + m.phase.year;
    return when + (topics ? ' · ' + topics : '');
  };

  const phaseRows = (list: PhaseModel[]) =>
    list.map((m, position) => {
      const open = openPhase === m.phase.id;
      return (
        <Row key={m.phase.id} height={52} icon={<IconTile icon="flag" tone={position === 0 ? 'blue' : 'ice'} />} title={m.phase.title} meta={phaseMeta(m, position)} expanded={open} chevron onClick={() => setOpenPhase(open ? null : m.phase.id)}>
          {open && (
            <div className="pb-4">
              {/* The phase's landscape (ATLAS-ART): the river a little further along with each year. */}
              <ArtPanel slot={phaseSlot(m.phase)} aspect="2 / 1" className="mb-3" alt={'Year ' + m.phase.year + ' of the plan'} />
              {m.phase.theme && <p className="mb-1 text-meta font-medium">{m.phase.theme}</p>}
              <p className="mb-2 text-meta text-ink2">{m.phase.goal}</p>
              <Lanes atlas={atlas} model={m} units={units} isCurrent={false} weekly={null} onLane={(block) => onLane(m.phase.id, block)} />
            </div>
          )}
        </Row>
      );
    });

  return (
    <div className="mt-[18px] flex flex-col gap-[18px]">
      {current && (
        <ScenePanel
          slot="plan"
          aspect="2 / 1"
          focal="50% 70%"
          alt=""
          bottom={
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-lead font-semibold">{current.phase.title}</p>
                <span className="text-meta font-semibold text-blue-deep">{Math.round(current.progress.fraction * 100) + '%'}</span>
              </div>
              <p className="text-meta text-ink2">{current.phase.theme ?? 'Year ' + current.phase.year + ' · ' + monthRange(current.phase.start, current.phase.end)}</p>
            </div>
          }
          fallback={<ArtPanel slot={phaseSlot(current.phase)} aspect="3 / 1" alt={'Year ' + current.phase.year + ' of the plan'} bottom={<p className="text-meta font-semibold">{current.phase.theme ?? 'Year ' + current.phase.year}</p>} />}
        />
      )}
      {current && (
        <Lanes
          atlas={atlas}
          model={current}
          units={units}
          isCurrent
          weekly={weekly}
          label={everyDay.label}
          aside={everyDay.aside}
          windows={everyDay.windows}
          onLane={(block) => onLane(current.phase.id, block)}
          onReplan={onReplan}
        />
      )}
      {earlier.length > 0 && (
        <RowList flat label="Earlier">
          {phaseRows(earlier)}
        </RowList>
      )}
      {(later.length > 0 || internships.length > 0) && (
        <RowList flat label="Next">
          {/* Internships (INTERNSHIPS): a row per goal, with the next application and its gate. */}
          {internships.map((g) => (
            <Row
              key={g.goal.goal.id}
              title={'Internships · ' + g.name}
              meta={g.card ? roleName(g.card.target) + ' · ' + daysToApply(g.card.days) + ' · gate ' + g.card.gate.done + ' of ' + g.card.gate.total : 'Every dated application is in'}
              icon={<IconTile icon="briefcase" tone="ice" />}
              chevron
              to={'/internships?goal=' + g.goal.goal.id}
            />
          ))}
          {phaseRows(later)}
        </RowList>
      )}
      {(atlas.seed.goals ?? []).length > 0 && (
        <RowList flat label="Goals">
          {(atlas.seed.goals ?? []).map((goal) => {
            const status = goalStatus(goal, atlas.seed, atlas.settings, atlas.states, atlas.logs, today());
            return (
              <Row
                key={goal.id}
                title={goal.title}
                meta={'By ' + longDate(goal.date) + (status.projected && status.verdict !== 'done' ? ' · projected ' + longDate(status.projected) : '')}
                icon={<IconTile icon="flag" tone={status.verdict === 'done' ? 'blue' : 'ice'} />}
                trailing={<span className={status.verdict === 'at-risk' ? 'font-semibold text-ice-deep' : undefined}>{status.verdict === 'done' ? 'Done' : status.verdict === 'on-track' ? 'On track' : 'At risk'}</span>}
                onClick={() => onGoal(goal)}
              />
            );
          })}
        </RowList>
      )}
      <div className="flex flex-wrap gap-3">
        <Button variant="ice" icon="shuffle" to="/plan/pick">
          Pick a project
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={onReplan}>
          Re-plan
        </Button>
        <Button size="sm" to="/plan/map">
          Five-year map
        </Button>
        <Button size="sm" onClick={onEdit}>
          Edit plan
        </Button>
      </div>
    </div>
  );
}
