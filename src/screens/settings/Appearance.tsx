import type { StoredSettings } from '../../db/types.ts';
import { SCENES, useCurrentScene } from '../../hooks/useScenes.ts';
import { DEFAULT_SCENE_PREFS, isoOf, pickScene } from '../../lib/scenes.ts';
import type { ScenePrefs } from '../../lib/scenes.ts';
import { Button } from '../../ui/Button.tsx';
import { Row, RowList } from '../../ui/Row.tsx';
import { SceneSwatches } from '../../ui/ScenePanel.tsx';
import { Section, saveSettings } from './shared.tsx';

export function savePrefs(change: (prefs: ScenePrefs) => ScenePrefs): void {
  void saveSettings((s) => ({ ...s, scenes: change(structuredClone(s.scenes ?? DEFAULT_SCENE_PREFS)) }));
}

/**
 * Settings › Appearance (ATLAS-DAILY-SCENES): the daily scene on or off, the pin, a skip for today, favourites only,
 * and the way to the Daily scenes page.
 */
export function Appearance({ settings }: { settings: StoredSettings }) {
  const prefs = settings.scenes ?? DEFAULT_SCENE_PREFS;
  const { scene, day } = useCurrentScene();
  const todays = pickScene(SCENES, day, { ...prefs, on: true })?.scene ?? null;
  const pinned = prefs.pinned ? SCENES.find((s) => s.id === prefs.pinned) : undefined;
  const skippedToday = prefs.skipped?.date === isoOf(day);
  const starred = prefs.favourites.filter((id) => SCENES.some((s) => s.id === id)).length;
  return (
    <Section id="appearance" title="Appearance" onReset={() => void saveSettings((s) => ({ ...s, scenes: { ...DEFAULT_SCENE_PREFS } }))}>
      <RowList>
        <Row title="Daily scene" meta="A new image and palette every day; off keeps the fixed clay theme" toggle={{ on: prefs.on, onChange: (on) => savePrefs((p) => ({ ...p, on })) }} />
        {prefs.on && todays && (
          <Row
            title={pinned ? 'Pinned · ' + pinned.name : "Today's scene · " + todays.name}
            meta={pinned ? 'Kept until unpinned' : skippedToday ? 'Skipped once today' : 'Changes at midnight'}
            trailing={<SceneSwatches scene={scene ?? todays} size={12} />}
            to="/scenes"
          />
        )}
        {prefs.on && todays && (
          <Row
            title="Pin this scene"
            meta={pinned ? 'Unpin to let the days turn again' : 'Keep ' + todays.name + ' until unpinned'}
            toggle={{ on: pinned !== undefined, onChange: (on) => savePrefs((p) => (on ? { ...p, pinned: (scene ?? todays).id } : (({ pinned: _pinned, ...rest }) => rest)(p))) }}
          />
        )}
        {prefs.on && (
          <Row title="Favourites only" meta={starred > 0 ? 'Rotate through the ' + starred + ' starred scene' + (starred === 1 ? '' : 's') : 'Star scenes on the Daily scenes page first'} toggle={{ on: prefs.favouritesOnly, onChange: (on) => savePrefs((p) => ({ ...p, favouritesOnly: on })) }} />
        )}
      </RowList>
      {prefs.on && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" icon="chevronRight" aria-disabled={pinned !== undefined || undefined} onClick={() => !pinned && savePrefs((p) => ({ ...p, skipped: { date: isoOf(day), steps: (p.skipped?.date === isoOf(day) ? p.skipped.steps : 0) + 1 } }))}>
            Skip today's scene
          </Button>
          <Button size="sm" icon="image" to="/scenes">
            Daily scenes
          </Button>
        </div>
      )}
    </Section>
  );
}
