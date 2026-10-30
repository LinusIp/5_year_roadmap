/**
 * ATLAS-FOCUS-MUSIC: reading a pasted YouTube address, what an oEmbed answer must carry, the session timer and
 * "until the block ends", each block's default mix and the once-only offer, the starter list's shape, the player's
 * state machine (play, pause, the timer's end fading out, the block's stop), the generated sounds' buffers, and the
 * sixth tab joining the defaults.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadFocusSessions } from '../../scripts/lib/load-focus.ts';
import { seed } from '../../src/seed/index.ts';
import { focusProblems, FOCUS_CATEGORIES } from '../../src/seed/focus.ts';
import { blockEndsAt, DEFAULT_FOCUS_PREFS, mixFor, oembedUrl, parseYouTubeUrl, readOembed, reorder, shouldOffer, thumbnailFor, timeLeft, timerEndsAt, timerLabel } from '../../src/lib/focus.ts';
import { asPlayable, firstOf, STARTER } from '../../src/lib/focus-sessions.ts';
import { blockStopped, embedReported, endSession, focusPlayerState, pause, play, registerEmbed, resetFocusPlayer, resume, setTimer, stop, toggleSound, useSoundEngine } from '../../src/lib/focus-player.ts';
import type { EmbedControls } from '../../src/lib/focus-player.ts';
import { AtlasSounds, brownNoise, peak, pinkNoise, reverbImpulse, whiteNoise } from '../../src/lib/sounds.ts';
import { defaultLayout, upgradeSettings } from '../../src/lib/settings.ts';
import { StoredSettingsSchema } from '../../src/db/types.ts';

describe('a pasted address', () => {
  it('reads a video from its watch, short, shorts, embed and live addresses, and rebuilds the canonical one', () => {
    for (const url of ['https://www.youtube.com/watch?v=jfKfPfyJRdk', 'https://youtu.be/jfKfPfyJRdk', 'https://m.youtube.com/watch?v=jfKfPfyJRdk&t=30s', 'https://www.youtube.com/shorts/jfKfPfyJRdk', 'https://www.youtube-nocookie.com/embed/jfKfPfyJRdk', 'https://www.youtube.com/live/jfKfPfyJRdk?feature=share', '  https://youtube.com/watch?v=jfKfPfyJRdk  ']) {
      expect(parseYouTubeUrl(url), url).toEqual({ kind: 'video', id: 'jfKfPfyJRdk', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' });
    }
  });
  it('reads a playlist, and refuses anything else', () => {
    expect(parseYouTubeUrl('https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf')).toEqual({ kind: 'playlist', id: 'PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf', url: 'https://www.youtube.com/playlist?list=PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf' });
    for (const bad of ['', 'lofi', 'https://vimeo.com/123', 'https://www.youtube.com/', 'https://www.youtube.com/watch?v=short', 'ftp://youtube.com/watch?v=jfKfPfyJRdk', 'javascript:alert(1)']) expect(parseYouTubeUrl(bad), bad).toBeNull();
  });
  it('asks oEmbed about the canonical address, and takes only an answer with a title, a channel and an iframe', () => {
    expect(oembedUrl('https://www.youtube.com/watch?v=jfKfPfyJRdk')).toBe('https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DjfKfPfyJRdk&format=json');
    expect(readOembed({ title: 'lofi', author_name: 'Lofi Girl', thumbnail_url: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg', html: '<iframe src="https://www.youtube.com/embed/jfKfPfyJRdk"></iframe>' })).toEqual({ title: 'lofi', channel: 'Lofi Girl', thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg' });
    expect(readOembed({ title: 'x', author_name: 'y', html: 'no player' })).toBeNull();
    expect(readOembed({ title: 'x' })).toBeNull();
    expect(readOembed(null)).toBeNull();
    expect(readOembed('Unauthorized')).toBeNull();
    expect(thumbnailFor('jfKfPfyJRdk')).toBe('https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg');
  });
});

describe('the session timer', () => {
  const now = new Date(2026, 9, 30, 10, 20).getTime();
  it('ends after the minutes, or when the block ends, or never without a block', () => {
    expect(timerEndsAt('25', now, null)).toBe(now + 25 * 60_000);
    expect(timerEndsAt('90', now, null)).toBe(now + 90 * 60_000);
    const end = blockEndsAt({ start: 10 * 60, minutes: 120 }, new Date(now));
    expect(end).toBe(new Date(2026, 9, 30, 12, 0).getTime());
    expect(timerEndsAt('block', now, end)).toBe(end);
    expect(timerEndsAt('block', now, null)).toBeNull();
    // A block already over gives no timer.
    expect(timerEndsAt('block', now, now - 1)).toBeNull();
    expect(blockEndsAt(undefined, new Date(now))).toBeNull();
  });
  it('reads as "25 m", "Till 12:00", "1:40 left"', () => {
    const clock = (ms: number): string => new Date(ms).toTimeString().slice(0, 5);
    expect(timerLabel('25', null, clock)).toBe('25 m');
    expect(timerLabel('block', new Date(2026, 9, 30, 12, 0).getTime(), clock)).toBe('Till 12:00');
    expect(timerLabel('block', null, clock)).toBe('Till the block ends');
    expect(timeLeft(now + 100 * 60_000, now)).toBe('1:40 left');
    expect(timeLeft(now + 5 * 60_000, now)).toBe('5 m left');
    expect(timeLeft(now + 40_000, now)).toBe('40 s left');
    expect(timeLeft(now - 1, now)).toBe('0 s left');
  });
});

describe('the per-block mix', () => {
  it('names a block’s category, and offers it once', () => {
    const prefs = { ...DEFAULT_FOCUS_PREFS, mixes: { E: 'piano' as const, B: 'lofi' as const } };
    expect(mixFor(prefs, 'E')).toBe('piano');
    expect(mixFor(prefs, 'C')).toBeNull();
    expect(mixFor(undefined, 'E')).toBeNull();
    expect(shouldOffer(prefs, 'E')).toBe('piano');
    expect(shouldOffer({ ...prefs, offered: { E: true } }, 'E')).toBeNull();
    expect(shouldOffer({ ...prefs, offered: { E: false } }, 'E')).toBeNull();
    expect(shouldOffer(prefs, 'C')).toBeNull();
    expect(firstOf('piano', prefs)?.category).toBe('piano');
    expect(firstOf('brown', prefs)).toBeNull();
    const mine = { id: 'video-abc', url: 'https://www.youtube.com/watch?v=abcdefghijk', videoId: 'abcdefghijk', kind: 'video' as const, title: 'Mine', channel: 'Me', thumbnail: '', addedAt: '2026-10-30' };
    expect(firstOf('mine', { ...prefs, sessions: [mine] })?.id).toBe('mine:video-abc');
    expect(firstOf('mine', prefs)?.id).toBe(STARTER.find((s) => s.category === 'mine')?.id);
  });
  it('reorders the user’s list', () => {
    expect(reorder(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
    expect(reorder(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    const same = ['a'];
    expect(reorder(same, 0, 5)).toBe(same);
  });
});

describe('the starter list', () => {
  it('loads, with an address oEmbed can be asked about for every row and a category for each', () => {
    const { sessions, errors } = loadFocusSessions();
    expect(errors).toEqual([]);
    expect(sessions!.length).toBeGreaterThanOrEqual(10);
    for (const s of sessions!) {
      expect(parseYouTubeUrl(s.url)?.url, s.id).toBe(s.url);
      expect(FOCUS_CATEGORIES.some((c) => c.key === s.category)).toBe(true);
      expect(asPlayable(s).videoId).toHaveLength(11);
    }
    // Every category but brown noise (an Atlas sound) has at least one session.
    for (const c of FOCUS_CATEGORIES) if (c.key !== 'brown') expect(sessions!.some((s) => s.category === c.key), c.key).toBe(true);
  });
  it('names what is wrong', () => {
    const row = STARTER[0]!;
    expect(focusProblems([])[0]).toMatch(/focus-sessions/);
    expect(focusProblems([{ ...row, url: 'https://vimeo.com/1' }])[0]).toMatch(/url/);
    expect(focusProblems([row, row])).toContain('focus-sessions.json: two sessions with the id ' + row.id);
    expect(focusProblems([{ ...row, kind: 'live', durationLabel: '' }])[0]).toMatch(/not LIVE/);
  });
});

describe('the player', () => {
  let calls: string[] = [];
  const controls: EmbedControls = {
    load: (s) => calls.push('load ' + s.videoId),
    play: () => calls.push('play'),
    pause: () => calls.push('pause'),
    stop: () => calls.push('stop'),
    setVolume: (v) => calls.push('volume ' + v),
  };
  const session = asPlayable(STARTER.find((s) => s.category === 'lofi')!);
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 30, 10, 0));
    resetFocusPlayer();
    calls = [];
    registerEmbed(controls);
    vi.stubGlobal('navigator', {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('loads a session on play, pauses and resumes, and stops at once on Stop', () => {
    play(session, { timer: '25', block: 'H' });
    expect(focusPlayerState().status).toBe('loading');
    expect(focusPlayerState().timer?.endsAt).toBe(Date.now() + 25 * 60_000);
    expect(calls).toContain('load ' + session.videoId);
    embedReported('playing');
    expect(focusPlayerState().status).toBe('playing');
    pause();
    expect(calls.at(-1)).toBe('pause');
    resume();
    expect(calls.at(-1)).toBe('play');
    stop();
    expect(focusPlayerState()).toMatchObject({ session: null, status: 'idle', timer: null, block: null });
  });

  it('fades out over five seconds when the timer runs out, and when the block’s timer stops', () => {
    play(session, { timer: '25', block: 'H' });
    embedReported('playing');
    vi.advanceTimersByTime(25 * 60_000 + 1500);
    expect(focusPlayerState().status).toBe('fading');
    expect(calls.filter((c) => c.startsWith('volume')).length).toBeGreaterThan(2);
    vi.advanceTimersByTime(6000);
    expect(focusPlayerState().status).toBe('idle');
    expect(calls).toContain('stop');

    calls = [];
    play(session, { timer: 'block', blockEndsAt: Date.now() + 60 * 60_000, block: 'H' });
    embedReported('playing');
    blockStopped('E');
    expect(focusPlayerState().status).toBe('playing');
    blockStopped('H');
    expect(focusPlayerState().status).toBe('fading');
    vi.advanceTimersByTime(6000);
    expect(focusPlayerState().status).toBe('idle');
  });

  it('"until the block ends" without a block keeps playing until stopped, and a new timer applies at once', () => {
    play(session, { timer: 'block', blockEndsAt: null });
    expect(focusPlayerState().timer).toBeNull();
    setTimer('50', null);
    expect(focusPlayerState().timer?.endsAt).toBe(Date.now() + 50 * 60_000);
    vi.advanceTimersByTime(50 * 60_000 + 1500);
    expect(focusPlayerState().status).toBe('fading');
    endSession();
    vi.advanceTimersByTime(6000);
    expect(focusPlayerState().status).toBe('idle');
  });

  it('starts and stops an Atlas sound, layered under a video at the layer volume', async () => {
    const started: [string, number][] = [];
    const engine = {
      start: async (kind: string, volume: number) => void started.push([kind, volume]),
      stop: () => void started.push(['stop', 0]),
      setVolume: () => undefined,
      playing: false,
    } as unknown as AtlasSounds;
    useSoundEngine(engine);
    await toggleSound('brown', { timer: '25' });
    expect(started).toEqual([['brown', 0.8]]);
    expect(focusPlayerState().sound).toBe('brown');
    expect(focusPlayerState().timer?.option).toBe('25');
    await toggleSound('brown');
    expect(started.at(-1)).toEqual(['stop', 0]);
    expect(focusPlayerState().sound).toBeNull();
    play(session, { timer: '25' });
    await toggleSound('rain');
    expect(started.at(-1)).toEqual(['rain', 0.4]);
    useSoundEngine(null);
  });
});

describe('the generated sounds', () => {
  it('fill their buffers within full scale, the same for a seed', () => {
    for (const make of [whiteNoise, pinkNoise, brownNoise]) {
      const a = make(48_000);
      expect(a).toHaveLength(48_000);
      expect(peak(a)).toBeLessThanOrEqual(1);
      expect(peak(a)).toBeGreaterThan(0.2);
      expect(Array.from(make(100))).toEqual(Array.from(make(100)));
    }
    const impulse = reverbImpulse(48_000, 1);
    expect(impulse).toHaveLength(48_000);
    expect(Math.abs(impulse[impulse.length - 1]!)).toBeLessThan(0.01);
  });
  it('brown noise has more low than high frequency energy than white noise', () => {
    const diff = (b: Float32Array): number => {
      let sum = 0;
      for (let i = 1; i < b.length; i++) sum += Math.abs(b[i]! - b[i - 1]!);
      return sum / peak(b) / b.length;
    };
    expect(diff(brownNoise(20_000))).toBeLessThan(diff(whiteNoise(20_000)) / 4);
  });
});

describe('the sixth tab', () => {
  it('is in a fresh layout, joins the five defaults on upgrade, and leaves chosen tabs alone', () => {
    expect(defaultLayout(seed.settings).tabs).toEqual(['today', 'plan', 'calendar', 'library', 'activity', 'focus']);
    const base = upgradeSettings({ id: 'app', core: seed.settings, theme: 'light', github: { username: '', showCalendar: false }, backup: {} }, seed.settings);
    expect(base.layout.tabs).toContain('focus');
    const five = { ...base, layout: { ...base.layout, tabs: ['today', 'plan', 'calendar', 'library', 'activity'] as typeof base.layout.tabs } };
    expect(upgradeSettings(five, seed.settings).layout.tabs).toEqual(['today', 'plan', 'calendar', 'library', 'activity', 'focus']);
    const chosen = { ...base, layout: { ...base.layout, tabs: ['today', 'activity', 'reviews'] as typeof base.layout.tabs } };
    expect(upgradeSettings(chosen, seed.settings)).toBe(chosen);
    expect(StoredSettingsSchema.safeParse({ ...base, layout: { ...base.layout, tabs: [...base.layout.tabs, 'map'] } }).success).toBe(false);
    expect(StoredSettingsSchema.safeParse({ ...base, focus: DEFAULT_FOCUS_PREFS }).success).toBe(true);
  });
});
