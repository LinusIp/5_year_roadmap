import { useEffect } from 'react';
import { useAtlas } from '../hooks/useAtlas.ts';
import { daysBetween, monthName } from '../lib/dates.ts';
import type { BlockId, Phase } from '../seed/schema.ts';
import { Button } from '../ui/Button.tsx';
import { BlockTile } from '../ui/glyphs.tsx';
import { FadeStrip } from '../ui/FadeStrip.tsx';
import { formatWindow } from '../lib/clock-plan.ts';
import { scheduleSummary } from './plan/Timeline.tsx';
import { Icon } from '../ui/Icon.tsx';
import { ArtPanel } from '../ui/ArtPanel.tsx';
import { ScenePanel } from '../ui/ScenePanel.tsx';
import { useCurrentScene } from '../hooks/useScenes.ts';
import { today } from '../lib/dates.ts';

const STAGE_NAME: Record<number, string> = { 1: 'Software engineering mastery', 2: 'Electrical + mechanical' };
const MAP_LANES: BlockId[] = ['A', 'B', 'C', 'E'];

const short = (date: string): string => monthName(Number(date.slice(5, 7)) - 1, true) + ' ' + date.slice(0, 4);
const day = (date: string, withYear: boolean): string => Number(date.slice(8, 10)) + ' ' + monthName(Number(date.slice(5, 7)) - 1, true) + (withYear ? ' ' + date.slice(0, 4) : '');
const long = (date: string): string => Number(date.slice(8, 10)) + ' ' + monthName(Number(date.slice(5, 7)) - 1) + ' ' + date.slice(0, 4);
const months = (phase: Phase): number => (daysBetween(phase.start, phase.end) + 1) / 30.44;


/**
 * The five-year map, as the mockup draws it: the two stages, a timeline with a dot per phase, and one card per
 * phase with what each lane does, what ships and which credentials it earns. It is the plan's one wide view;
 * on a phone it scrolls sideways.
 */
export function PhaseMap() {
  const atlas = useAtlas();
  useEffect(() => {
    document.title = 'Five-year map · Atlas';
  }, []);
  const { scene } = useCurrentScene();
  if (!atlas) return <main id="main" className="min-h-dvh bg-bg" />;

  const { seed, settings } = atlas;
  const phases = seed.phases;
  const first = phases[0]!;
  const last = phases.at(-1)!;
  const columns = phases.map((p) => Math.round(months(p) * 100) / 100 + 'fr').join(' ');
  const stage1 = phases.filter((p) => p.stage === 1);
  // The day as the schedule runs it: "10 h a day (06–12 and 18–22)", and a legend of the blocks at their times.
  const schedule = scheduleSummary(settings, today());
  const [, ...parts] = schedule.aside.split(' · ').reverse();
  const daily = schedule.aside.split(' · ').at(-1)!;
  const sessions = parts.reverse().join(' and ');
  const themes = [...new Set(stage1.map((p) => p.theme).filter(Boolean))].join(' · ');
  const asOf = today();
  const nowId = phases.find((p) => p.start <= asOf && asOf <= p.end)?.id;

  return (
    <main id="main" tabIndex={-1} className="min-h-dvh bg-bg outline-none">
      {/* Wider than a phone: it opens with the current phase in view and fades at a hidden edge. */}
      <FadeStrip open="current" label="Five-year map, scroll for the other phases">
        <div className="relative isolate flex min-w-[1200px] flex-col gap-7 px-14 py-12">
          {/* The journey's river (ATLAS-ART): one long illustration behind the stage bands and the phases, decoration only. */}
          {scene ? (
            <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
              <ScenePanel slot="map" decorative bare focal="50% 50%" className="h-full w-full" sizes="1200px" />
              <div className="absolute inset-0 bg-[var(--bg)] opacity-35" />
            </div>
          ) : (
            <div className="pointer-events-none absolute inset-y-6 left-1/2 -z-10 w-56 -translate-x-1/2 opacity-40" aria-hidden="true">
              <ArtPanel slot="map-river-long" aspect="1 / 3" decorative className="w-full !border-0 !shadow-none" />
            </div>
          )}
          <div className="flex items-start justify-between gap-6">
            <div className={'flex flex-col gap-1.5' + (scene ? ' scene-chip -mx-3.5 -my-2 px-3.5 py-2' : '')}>
              <h1 className="text-hero font-semibold">Five years, six phases</h1>
              <p className="text-meta text-ink2">
                {long(first.start)} → {long(last.end)} · {daily} a day{sessions ? ' (' + sessions + ')' : ''} · Stage 1 software{themes ? ': ' + themes : ''} · Stage 2 electrical and mechanical
              </p>
            </div>
            <Button variant="quiet" to="/plan">
              Close
            </Button>
          </div>
          <ul className={'-mt-2 flex flex-wrap gap-x-6 gap-y-3 text-meta text-ink2' + (scene ? ' scene-chip w-fit px-4 py-2.5' : '')} aria-label="Lanes">
            {schedule.windows.map((w) => (
              <li key={w.id} className="flex items-center gap-2.5 whitespace-nowrap">
                <BlockTile block={w.id} size={36} />
                {formatWindow(w.start, w.minutes) + ' ' + (settings.core.blocks.find((b) => b.id === w.id)?.name ?? w.id)}
              </li>
            ))}
          </ul>

          <div className="grid gap-4" style={{ gridTemplateColumns: columns }}>
            <div className="knob flex h-9 items-center rounded-pill !bg-blue-soft px-4 text-label text-blue-deep" style={{ gridColumn: '1 / ' + (stage1.length + 1) }}>
              Stage 1 · {STAGE_NAME[1]} · {short(stage1[0]!.start)} → {short(stage1.at(-1)!.end)}
            </div>
            {phases.length > stage1.length && (
              <div className="knob flex h-9 items-center rounded-pill !bg-ice-soft px-4 text-label text-ice-deep" style={{ gridColumn: stage1.length + 1 + ' / ' + (phases.length + 1) }}>
                Stage 2 · {STAGE_NAME[2]} · {short(phases[stage1.length]!.start)} → {short(last.end)}
              </div>
            )}
          </div>

          <div className={'relative h-14' + (scene ? ' scene-chip -mx-4 px-4' : '')} aria-hidden="true">
            <div className={'well absolute top-[25px] h-1.5 rounded-pill ' + (scene ? 'inset-x-4' : 'inset-x-0')} />
            <div className={'absolute top-0 grid gap-4 ' + (scene ? 'inset-x-4' : 'inset-x-0')} style={{ gridTemplateColumns: columns }}>
              {phases.map((p) => (
                <div key={p.id} className="flex flex-col items-start gap-1.5">
                  <span className="h-4 text-label text-ink2">{short(p.start)}</span>
                  <span className={'size-4 rounded-pill ' + (p.id === nowId ? 'fill-ice' : 'fill-blue')} />
                  <span className="text-label text-ink2">{Math.round(months(p))} months</span>
                </div>
              ))}
            </div>
            <span className={'absolute top-0 text-label text-ink2 ' + (scene ? 'right-4' : 'right-0')}>{short(last.end)}</span>
          </div>

          <ol className="grid gap-4" style={{ gridTemplateColumns: columns }}>
            {phases.map((p) => {
              const sameYear = p.start.slice(0, 4) === p.end.slice(0, 4);
              return (
                <li key={p.id} className="tile flex flex-col gap-4 p-[18px]" aria-current={p.id === nowId ? 'step' : undefined}>
                  <div className="flex flex-col gap-1">
                    <p className="text-meta text-ink2">
                      {day(p.start, !sameYear)} → {day(p.end, true)}
                    </p>
                    {p.id === nowId && <span className="w-fit rounded-pill bg-ice-soft px-2.5 py-0.5 text-label text-ice-deep">Now</span>}
                    <h2 className="text-lead font-semibold leading-[1.3]">{p.title}</h2>
                  </div>
                  <ul className="flex flex-col gap-4 text-meta">
                    {MAP_LANES.map((lane) => (
                      <li key={lane} className="flex gap-3">
                        <BlockTile block={lane} size={36} />
                        <span className="pt-1.5">
                          <span className="sr-only">Block {lane}: </span>
                          {p.map?.[lane as 'A' | 'B' | 'C' | 'E'] ?? (p.focus as Record<string, string>)[lane]}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {p.map && (
                    <div className="knob mt-auto flex flex-col gap-1.5 rounded-[18px] p-3.5">
                      <p className="flex items-center gap-1.5 text-label text-ice-deep">
                        <Icon name="hammer" size={16} />
                        Ships
                      </p>
                      <p className="text-meta font-medium leading-[1.4]">{p.map.ships}</p>
                      <p className="text-small text-ink2">{p.map.credentials}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </FadeStrip>
    </main>
  );
}
