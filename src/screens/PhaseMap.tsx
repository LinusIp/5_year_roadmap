import { useEffect } from 'react';
import { useAtlas } from '../hooks/useAtlas.ts';
import { daysBetween, monthName } from '../lib/dates.ts';
import type { BlockId, Phase } from '../seed/schema.ts';
import { Button } from '../ui/Button.tsx';
import { span } from './parts/text.ts';
import { BlockTile } from '../ui/glyphs.tsx';
import { Icon } from '../ui/Icon.tsx';
import { today } from '../lib/dates.ts';
import { planBlocks } from '../lib/settings.ts';

const STAGE_NAME: Record<number, string> = { 1: 'Software engineering mastery', 2: 'Electrical + mechanical' };
const MAP_LANES: BlockId[] = ['A', 'B', 'C', 'E'];

const short = (date: string): string => monthName(Number(date.slice(5, 7)) - 1, true) + ' ' + date.slice(0, 4);
const day = (date: string, withYear: boolean): string => Number(date.slice(8, 10)) + ' ' + monthName(Number(date.slice(5, 7)) - 1, true) + (withYear ? ' ' + date.slice(0, 4) : '');
const long = (date: string): string => Number(date.slice(8, 10)) + ' ' + monthName(Number(date.slice(5, 7)) - 1) + ' ' + date.slice(0, 4);
const months = (phase: Phase): number => (daysBetween(phase.start, phase.end) + 1) / 30.44;

/** "graphics / sim", "math / physics", "projects": a block's name as the map's legend writes it. */
function legendName(name: string): string {
  const parts = name
    .toLowerCase()
    .replace(/ track$/, '')
    .split(/\s*[/&]\s*/)
    .filter((p) => p && p !== 'hands-on')
    .map((p) => (p === 'simulation' ? 'sim' : p));
  return (parts.length > 2 ? [parts[0], parts.at(-1)] : parts).join(' / ');
}

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
  if (!atlas) return <main id="main" className="min-h-dvh bg-bg" />;

  const { seed, settings } = atlas;
  const phases = seed.phases;
  const first = phases[0]!;
  const last = phases.at(-1)!;
  const columns = phases.map((p) => Math.round(months(p) * 100) / 100 + 'fr').join(' ');
  const stage1 = phases.filter((p) => p.stage === 1);
  const daily = settings.core.blocks.reduce((sum, b) => sum + b.minutes, 0);
  const themes = [...new Set(stage1.map((p) => p.theme).filter(Boolean))].join(' · ');
  const asOf = today();
  const nowId = phases.find((p) => p.start <= asOf && asOf <= p.end)?.id;

  return (
    <main id="main" tabIndex={-1} className="min-h-dvh bg-bg outline-none">
      <div className="relative overflow-x-auto">
        <div className="flex min-w-[1200px] flex-col gap-7 px-14 py-12">
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-col gap-1.5">
              <h1 className="text-hero font-semibold">Five years, six phases</h1>
              <p className="text-meta text-ink2">
                {long(first.start)} → {long(last.end)} · {span(daily)} a day · Stage 1 software{themes ? ': ' + themes : ''} · Stage 2 electrical and mechanical
              </p>
            </div>
            <Button variant="quiet" to="/plan">
              Close
            </Button>
          </div>
          <ul className="-mt-2 flex flex-wrap gap-x-6 gap-y-3 text-meta text-ink2" aria-label="Lanes">
            {planBlocks(settings.core).map((b) => (
              <li key={b.id} className="flex items-center gap-2.5 whitespace-nowrap">
                <BlockTile block={b.id} size={36} />
                {b.id} {legendName(b.name)} · {span(b.minutes)}
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

          <div className="relative h-14" aria-hidden="true">
            <div className="well absolute inset-x-0 top-[25px] h-1.5 rounded-pill" />
            <div className="absolute inset-x-0 top-0 grid gap-4" style={{ gridTemplateColumns: columns }}>
              {phases.map((p) => (
                <div key={p.id} className="flex flex-col items-start gap-1.5">
                  <span className="h-4 text-label text-ink2">{short(p.start)}</span>
                  <span className={'size-4 rounded-pill ' + (p.id === nowId ? 'fill-ice' : 'fill-blue')} />
                  <span className="text-label text-ink2">{Math.round(months(p))} months</span>
                </div>
              ))}
            </div>
            <span className="absolute right-0 top-0 text-label text-ink2">{short(last.end)}</span>
          </div>

          <ol className="grid gap-4" style={{ gridTemplateColumns: columns }}>
            {phases.map((p) => {
              const sameYear = p.start.slice(0, 4) === p.end.slice(0, 4);
              return (
                <li key={p.id} className="tile flex flex-col gap-4 p-[18px]">
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
      </div>
    </main>
  );
}
