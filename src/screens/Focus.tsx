/**
 * The Focus tab (ATLAS-FOCUS-MUSIC): calm, long music sessions to study to, through YouTube's official embed, plus
 * Atlas sounds generated in the browser. Now playing at the top (the embed in the tile, title and channel, play and
 * pause, the session timer), the categories as chips over the day's scene, the sessions of the category (the user's
 * own first, with a field to paste a link, reordering and deletion), and the Atlas sounds with their volume.
 *
 * Nothing plays until a tap. Focus minutes log nothing on their own: only the block timer and the check-ins do.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAtlas } from '../hooks/useAtlas.ts';
import { useRunningTimer } from '../db/timer.ts';
import { dayLayout } from '../lib/calendar.ts';
import { clockNow } from '../lib/clock-plan.ts';
import { formatClock, today } from '../lib/dates.ts';
import { blockEndsAt, DEFAULT_FOCUS_PREFS, mixFor, oembedUrl, parseYouTubeUrl, readOembed, reorder, timeLeft, timerLabel, TIMER_OPTIONS } from '../lib/focus.ts';
import type { TimerOption, UserSession } from '../lib/focus.ts';
import { play, resume, pause, setLayerVolume, setTimer, setVolume, stop, toggleSound, useFocusPlayer } from '../lib/focus-player.ts';
import type { PlayerSession } from '../lib/focus-player.ts';
import { SOUND_DEFS } from '../lib/sounds.ts';
import { categoryLabel, FOCUS_CATEGORIES } from '../seed/focus.ts';
import type { FocusCategory } from '../seed/focus.ts';
import { asPlayable, STARTER, userAsPlayable } from '../lib/focus-sessions.ts';
import { useQueryParam } from '../router/router.tsx';
import { Button } from '../ui/Button.tsx';
import { Chips } from '../ui/Chips.tsx';
import { registerPlayerAnchor } from '../ui/FocusPlayer.tsx';
import { Header } from '../ui/Header.tsx';
import { Icon } from '../ui/Icon.tsx';
import { Row, RowList } from '../ui/Row.tsx';
import { ScenePanel } from '../ui/ScenePanel.tsx';
import { Screen } from '../ui/Screen.tsx';
import { TextField } from '../ui/TextField.tsx';
import { blockShort } from './parts/text.ts';
import { saveFocusPrefs as savePrefs } from './settings/shared.tsx';

/** A video's thumbnail, the day's scene when it fails to load (offline, or a session without one yet). */
function Cover({ session, large = false }: { session: PlayerSession; large?: boolean }) {
  const [failed, setFailed] = useState<string | null>(null);
  const bad = !session.thumbnail || failed === session.thumbnail;
  const cls = large ? 'absolute inset-0 h-full w-full object-cover' : 'h-10 w-14 shrink-0 rounded-[10px] object-cover';
  if (bad) return <ScenePanel slot={large ? 'focus-cover' : 'focus-thumb'} thumb bare decorative className={large ? 'absolute inset-0' : 'h-10 w-14 shrink-0 rounded-[10px]'} />;
  return <img src={session.thumbnail} alt="" loading="lazy" decoding="async" className={cls} onError={() => setFailed(session.thumbnail)} />;
}

export function Focus() {
  const atlas = useAtlas();
  const timer = useRunningTimer();
  const player = useFocusPlayer();
  const [blockParam] = useQueryParam('block');
  const [category, setCategory] = useState<FocusCategory | null>(null);
  const [link, setLink] = useState('');
  const [adding, setAdding] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const anchor = useRef<HTMLDivElement>(null);

  // The embed sits over the Now playing tile while this screen is open.
  useEffect(() => {
    registerPlayerAnchor(anchor.current);
    return () => registerPlayerAnchor(null);
  }, [player.session]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const settings = atlas?.settings;
  const prefs = settings?.focus ?? DEFAULT_FOCUS_PREFS;
  const clock = settings?.layout.general.clock ?? '24';
  const hm = (ms: number): string => formatClock(new Date(ms), clock);

  // The block of the hour (or the one whose timer runs), and when its window ends.
  const placed = useMemo(() => (settings ? dayLayout(today(), settings) : []), [settings]);
  const minute = new Date(now).getHours() * 60 + new Date(now).getMinutes();
  const clockBlock = clockNow(placed, minute);
  const blockId = blockParam ?? timer?.block ?? (clockBlock.kind === 'block' ? clockBlock.id : null);
  const blockDef = blockId ? settings?.core.blocks.find((b) => b.id === blockId) : undefined;
  const window = blockId ? placed.find((p) => p.id === blockId) : undefined;
  const endsAt = blockEndsAt(window, new Date(now));
  const mix = mixFor(prefs, blockId ?? undefined);
  const shown: FocusCategory = category ?? mix ?? (prefs.sessions.length > 0 ? 'mine' : 'lofi');

  const mine: PlayerSession[] = prefs.sessions.map(userAsPlayable);
  const listed: PlayerSession[] = shown === 'mine' ? [...mine, ...STARTER.filter((s) => s.category === 'mine').map(asPlayable)] : STARTER.filter((s) => s.category === shown).map(asPlayable);
  const current = player.session;
  const timerOption: TimerOption = player.timer?.option ?? 'block';

  const start = (s: PlayerSession): void => play(s, { timer: timerOption, blockEndsAt: endsAt, block: blockId });

  const add = async (): Promise<void> => {
    const ref = parseYouTubeUrl(link);
    if (!ref) {
      setProblem('That is not a YouTube link. Paste a watch, youtu.be or playlist address.');
      return;
    }
    if (prefs.sessions.some((s) => s.url === ref.url)) {
      setProblem('That one is already in My sessions.');
      return;
    }
    setAdding(true);
    setProblem(null);
    try {
      const response = await fetch(oembedUrl(ref.url), { headers: { accept: 'application/json' } });
      if (response.status === 401) {
        setProblem('YouTube does not allow this video to be embedded, so Atlas cannot play it.');
        return;
      }
      if (response.status === 404) {
        setProblem('YouTube cannot find that video.');
        return;
      }
      if (!response.ok) {
        setProblem('YouTube answered ' + response.status + '. Try again later.');
        return;
      }
      const info = readOembed(await response.json());
      if (!info) {
        setProblem('YouTube did not confirm that link. Nothing was added.');
        return;
      }
      const session: UserSession = { id: ref.kind + '-' + ref.id, url: ref.url, videoId: ref.id, kind: ref.kind, title: info.title, channel: info.channel, thumbnail: info.thumbnail, addedAt: new Date().toISOString() };
      savePrefs((p) => ({ ...p, sessions: [...p.sessions.filter((s) => s.id !== session.id), session] }));
      setLink('');
      setCategory('mine');
    } catch {
      setProblem('Could not reach YouTube. Check the connection and try again.');
    } finally {
      setAdding(false);
    }
  };

  const timerPills = TIMER_OPTIONS.map((option) => ({ option, label: timerLabel(option, endsAt, hm) }));
  const timeLeftText = player.timer && Number.isFinite(player.timer.endsAt) ? timeLeft(player.timer.endsAt, now) : null;
  const sub = blockDef ? blockShort(blockDef.name) + ' block' + (endsAt ? ' · ends ' + hm(endsAt) : '') : 'No block running';

  return (
    <Screen title="Focus">
      <Header title="Focus" sub={sub} actions={timeLeftText ? <span className="rounded-pill bg-blue px-3 py-1.5 text-label font-semibold text-on-blue">{timeLeftText}</span> : undefined} />

      {/* Now playing: the embed goes over the anchor (src/ui/FocusPlayer.tsx); before any tap it holds the cover. */}
      <section aria-labelledby="now-playing" className="tile mt-[18px] flex flex-col gap-3 p-3">
        <div ref={anchor} className="relative aspect-video w-full overflow-hidden rounded-[18px] bg-[var(--lo)]" data-focus-anchor>
          {!current && (
            <>
              <Cover session={listed[0] ?? { id: 'none', videoId: '', kind: 'video', title: '', channel: '', thumbnail: '', category: shown }} large />
              <span className="scene-chip absolute left-2.5 top-2.5 flex items-center gap-1.5 px-2.5 py-1 text-small font-semibold">
                <Icon name="play" size={12} />
                YouTube
              </span>
              <button type="button" aria-label={listed[0] ? 'Play ' + listed[0].title : 'Pick a session'} onClick={() => listed[0] && start(listed[0])} className="scene-chip absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center !rounded-pill text-ink">
                <Icon name="play" size={26} />
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 px-1">
          <div className="min-w-0 flex-1">
            <h2 id="now-playing" className="line-clamp-2 text-body font-medium leading-tight">
              {current ? current.title : (listed[0]?.title ?? 'Nothing playing')}
            </h2>
            <p className="truncate text-meta text-ink2">{current ? current.channel + ' · YouTube' : listed[0] ? listed[0].channel + ' · tap to play' : 'Pick a category'}</p>
          </div>
          {current && (
            <span className="-mr-1 flex shrink-0">
              <Button variant="icon" icon={player.status === 'playing' ? 'pause' : 'play'} className="!size-11" label={player.status === 'playing' ? 'Pause' : 'Play'} onClick={() => (player.status === 'playing' ? pause() : resume())} />
              <Button variant="icon" icon="stop" className="!size-11" label="Stop the music" onClick={stop} />
            </span>
          )}
        </div>
        <div role="group" aria-label="Session timer" className="well flex gap-1 rounded-pill p-1">
          {timerPills.map((p) => (
            <button
              key={p.option}
              type="button"
              aria-pressed={timerOption === p.option}
              onClick={() => setTimer(p.option, endsAt)}
              className={'min-h-11 flex-1 whitespace-nowrap rounded-pill px-1 text-small font-semibold ' + (timerOption === p.option ? 'knob text-blue-deep' : 'text-ink2')}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      {/* The categories over the day's scene: a calm panel, the chips on the paper below it. */}
      <ScenePanel slot="focus" aspect="21 / 9" focal="50% 60%" decorative className="mt-[18px]" bottom={<p className="text-meta font-semibold">{categoryLabel(shown) + (mix && blockDef ? ' · ' + blockShort(blockDef.name) + "'s mix" : '')}</p>} />
      <div className="mt-2">
        <Chips label="Category" items={FOCUS_CATEGORIES.map((c) => ({ key: c.key, label: c.label, pressed: shown === c.key, onClick: () => setCategory(c.key) }))} />
      </div>

      <section aria-labelledby="sessions" className="tile mt-2 px-4 py-1">
        <h2 id="sessions" className="section-label pt-2.5">
          {shown === 'brown' ? 'Brown noise is an Atlas sound' : categoryLabel(shown)}
        </h2>
        {shown === 'brown' ? (
          <p className="pb-3 text-meta text-ink2">Generated below, so it plays offline and with the screen locked. No YouTube needed.</p>
        ) : (
          <RowList plain>
            {listed.map((s) => {
              const isUser = s.id.startsWith('mine:');
              const index = prefs.sessions.findIndex((u) => 'mine:' + u.id === s.id);
              return (
                <Row
                  key={s.id}
                  icon={<Cover session={s} />}
                  title={s.title}
                  meta={s.channel + (s.kind === 'live' ? ' · LIVE' : STARTER.find((x) => x.id === s.id)?.durationLabel ? ' · ' + STARTER.find((x) => x.id === s.id)!.durationLabel : '')}
                  trailing={current?.id === s.id ? <span className="rounded-pill bg-blue px-2 py-0.5 text-small font-semibold text-on-blue">ON</span> : undefined}
                  action={
                    isUser && current?.id !== s.id ? (
                      <span className="-mr-2 flex shrink-0">
                        <Button variant="icon" icon="arrowUp" className="!size-11" label={'Move ' + s.title + ' up'} aria-disabled={index === 0 || undefined} onClick={() => index > 0 && savePrefs((p) => ({ ...p, sessions: reorder(p.sessions, index, index - 1) }))} />
                        <Button variant="icon" icon="arrowDown" className="!size-11" label={'Move ' + s.title + ' down'} aria-disabled={index === prefs.sessions.length - 1 || undefined} onClick={() => index < prefs.sessions.length - 1 && savePrefs((p) => ({ ...p, sessions: reorder(p.sessions, index, index + 1) }))} />
                        <Button variant="icon" icon="x" className="!size-11" label={'Remove ' + s.title} onClick={() => savePrefs((p) => ({ ...p, sessions: p.sessions.filter((u) => 'mine:' + u.id !== s.id) }))} />
                      </span>
                    ) : undefined
                  }
                  onClick={() => (current?.id === s.id ? (player.status === 'playing' ? pause() : resume()) : start(s))}
                  plainTitle
                  truncate
                  height={60}
                />
              );
            })}
          </RowList>
        )}
        {shown === 'mine' && (
          <div className="flex flex-col gap-2 pb-3 pt-2">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <TextField label="Paste a YouTube link to save it" type="url" value={link} onChange={setLink} error={problem} onKeyDown={(e) => e.key === 'Enter' && void add()} />
              </div>
              <Button size="sm" onClick={() => void add()} aria-disabled={adding || undefined}>
                {adding ? 'Checking…' : 'Add'}
              </Button>
            </div>
            <p className="text-small text-ink2">YouTube confirms the title and channel first; a video that refuses embedding is not added.</p>
          </div>
        )}
      </section>

      {/* Atlas sounds: generated, so they play offline and with the screen locked; one at a time, under a video if one plays. */}
      <section aria-labelledby="atlas-sounds" className="tile mt-[18px] px-4 pb-3 pt-1">
        <div className="flex items-baseline justify-between pt-2.5">
          <h2 id="atlas-sounds" className="section-label mb-0">
            Atlas sounds
          </h2>
          <span className="text-small text-ink2">plays with the screen locked</span>
        </div>
        <RowList plain>
          {SOUND_DEFS.map((d) => (
            <Row key={d.kind} title={d.name} meta={d.note} toggle={{ on: player.sound === d.kind, onChange: () => void toggleSound(d.kind, { timer: timerOption, blockEndsAt: endsAt, block: blockId }) }} />
          ))}
        </RowList>
        <div className="mt-2 flex flex-col gap-2">
          <label className="flex min-h-11 items-center gap-3 text-meta text-ink2">
            <span className="w-28 shrink-0">Volume</span>
            <input type="range" min={0} max={100} value={player.volume} onChange={(e) => setVolume(Number(e.target.value))} className="h-11 w-full accent-[var(--blue-deep)]" aria-label="Volume" />
          </label>
          <label className="flex min-h-11 items-center gap-3 text-meta text-ink2">
            <span className="w-28 shrink-0">Layer under video</span>
            <input type="range" min={0} max={100} value={player.layerVolume} onChange={(e) => setLayerVolume(Number(e.target.value))} className="h-11 w-full accent-[var(--blue-deep)]" aria-label="Volume of the Atlas sound under a video" />
          </label>
        </div>
        <p className="mt-1 text-small text-ink2">Focus minutes count as nothing on their own: the block timer and the check-ins log study time.</p>
      </section>
    </Screen>
  );
}
