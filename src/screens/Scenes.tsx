/**
 * The Daily scenes page (ATLAS-DAILY-SCENES, the "Daily scenes" artboard): the picked scene large with its name,
 * when it next shows and its swatches, then every scene in a grid of thumbnails with three swatches each, today's
 * marked. A tap previews a scene (its palette too); the star keeps it among the favourites and the pin keeps it
 * until unpinned.
 */
import { useEffect, useState } from 'react';
import { SCENES, useCurrentScene } from '../hooks/useScenes.ts';
import { isoOf, upcoming, whenText } from '../lib/scenes.ts';
import { applyScene, resolveTheme } from '../lib/theme.ts';
import { useSettings } from '../db/settings.ts';
import { seed } from '../seed/index.ts';
import { Button } from '../ui/Button.tsx';
import { Header } from '../ui/Header.tsx';
import { Icon } from '../ui/Icon.tsx';
import { ScenePanel } from '../ui/ScenePanel.tsx';
import { Screen } from '../ui/Screen.tsx';
import { savePrefs } from './settings/Appearance.tsx';

export function Scenes() {
  const settings = useSettings(seed.settings);
  const { scene: todays, prefs, day } = useCurrentScene();
  const [pick, setPick] = useState<string | null>(null);
  const selected = (pick ? SCENES.find((s) => s.id === pick) : undefined) ?? todays ?? SCENES[0] ?? null;
  const next = upcoming(SCENES, day, prefs);
  const theme = settings ? resolveTheme(settings.theme) : 'light';

  // A previewed scene colours the page while it is picked; leaving restores the day's.
  useEffect(() => {
    if (!prefs.on || !selected || selected.id === todays?.id) return undefined;
    applyScene(selected, theme);
    return () => applyScene(todays, theme);
  }, [selected, todays, theme, prefs.on]);

  const isStarred = (id: string): boolean => prefs.favourites.includes(id);
  const toggleStar = (id: string): void => savePrefs((p) => ({ ...p, favourites: p.favourites.includes(id) ? p.favourites.filter((f) => f !== id) : [...p.favourites, id] }));
  const togglePin = (id: string): void => savePrefs((p) => (p.pinned === id ? (({ pinned: _pinned, ...rest }) => rest)(p) : { ...p, pinned: id }));

  return (
    <Screen title="Daily scenes">
      <Header title="Daily scenes" sub={prefs.on ? 'A new image and palette every day' : 'The daily scene is off in Settings › Appearance'} back={<Button variant="icon" icon="chevronLeft" label="Back to Today" to="/" />} />
      {selected && (
        <section aria-labelledby="scene-name" className="tile mt-[18px] overflow-hidden !p-0">
          <ScenePanel slot="scenes-page" scene={selected} aspect="16 / 9" focal="50% 40%" bare className="rounded-t-[24px]" eager alt={'Scene: ' + selected.name} />
          <div className="flex flex-col gap-2.5 px-[18px] pb-[18px] pt-3.5">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="scene-name" className="text-lead font-semibold">
                {selected.name}
              </h2>
              <span className="text-small font-semibold text-blue-deep">{prefs.pinned === selected.id ? 'Pinned' : prefs.skipped?.date === isoOf(day) && selected.id === todays?.id ? 'Today (skipped to)' : whenText(next.get(selected.id))}</span>
            </div>
            <ul className="flex gap-1.5" aria-label={'Palette of ' + selected.name}>
              {[
                ['Paper', selected.paper],
                ['Ink', selected.ink],
                ['Primary', selected.lanes[0]],
                ['Lane 2', selected.lanes[1]],
                ['Lane 3', selected.lanes[2]],
                ['Lane 4', selected.lanes[3]],
                ['Lane 5', selected.lanes[4]],
              ].map(([label, hex]) => (
                <li key={label} className="flex flex-1 flex-col items-center gap-1 text-[10px] font-semibold text-ink2">
                  <i aria-hidden="true" className="block h-8 w-full rounded-[10px]" style={{ background: hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,.1)' }} />
                  {label}
                  <span className="sr-only">{' ' + hex}</span>
                </li>
              ))}
            </ul>
            <p className="text-small text-ink2">Colours are taken from the image and adjusted so text and buttons stay readable.</p>
            <div className="flex gap-2">
              <Button size="sm" icon="star" aria-pressed={isStarred(selected.id)} onClick={() => toggleStar(selected.id)}>
                {isStarred(selected.id) ? 'Starred' : 'Star'}
              </Button>
              <Button size="sm" icon="pin" aria-pressed={prefs.pinned === selected.id} onClick={() => togglePin(selected.id)}>
                {prefs.pinned === selected.id ? 'Pinned' : 'Pin'}
              </Button>
            </div>
          </div>
        </section>
      )}

      <div className="mt-[18px] flex items-baseline justify-between px-1">
        <h2 className="section-label mb-0">{'All ' + SCENES.length + ' scene' + (SCENES.length === 1 ? '' : 's')}</h2>
        <span className="text-small text-ink2">tap to preview</span>
      </div>
      <ul className="mt-2 grid grid-cols-4 gap-2.5" aria-label="Every scene">
        {SCENES.map((s) => {
          const days = next.get(s.id);
          const today = s.id === todays?.id;
          return (
            <li key={s.id} className="relative">
              <button
                type="button"
                onClick={() => setPick(s.id)}
                aria-pressed={selected?.id === s.id}
                aria-label={'Preview scene ' + s.name + (today ? ', today' : days !== undefined ? ', in ' + days + ' days' : '') + (isStarred(s.id) ? ', starred' : '') + (prefs.pinned === s.id ? ', pinned' : '')}
                className={'relative block aspect-[3/4] w-full overflow-hidden rounded-[18px] ' + (selected?.id === s.id ? 'outline outline-[3px] outline-offset-2 outline-blue-deep' : '')}
              >
                <ScenePanel slot="scenes-cell" scene={s} thumb bare focal="50% 40%" className="absolute inset-0" />
                {today && <span className="absolute left-1.5 top-1.5 rounded-pill bg-[var(--l0)] px-1.5 text-[10px] font-semibold leading-4 text-[var(--on-lane)]">TODAY</span>}
                {(isStarred(s.id) || prefs.pinned === s.id) && (
                  <span className="scene-chip absolute right-1.5 top-1.5 grid size-5 place-items-center !rounded-pill text-ink">
                    <Icon name={prefs.pinned === s.id ? 'pin' : 'star'} size={12} />
                  </span>
                )}
                <span aria-hidden="true" className="absolute inset-x-1.5 bottom-1.5 flex gap-[3px] rounded-pill bg-[rgb(255_255_255/.85)] p-1">
                  {s.lanes.slice(0, 3).map((lane, i) => (
                    <i key={i} className="block h-1.5 flex-1 rounded-pill" style={{ background: lane }} />
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Screen>
  );
}
