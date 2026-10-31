/**
 * The Focus tab's player, one for the whole app (ATLAS-FOCUS-MUSIC): which session plays, whether it is paused,
 * the session timer, the Atlas sound and the volumes. The screens read it through useFocusPlayer and act on it
 * through the functions below; src/ui/FocusPlayer.tsx owns the YouTube embed and registers its controls here, so
 * music keeps playing when the user leaves the Focus tab, with the player still on screen (docked, never hidden).
 *
 * Nothing here starts on its own: play() runs from a tap. A timer's end, a stop from Today's block timer or a
 * stop here fades the video and the sound out over five seconds.
 */
import { useSyncExternalStore } from 'react';
import { AtlasSounds, clearMediaSession, setMediaSession, soundName } from './sounds.ts';
import type { SoundKind } from './sounds.ts';
import { timerEndsAt } from './focus.ts';
import type { TimerOption } from './focus.ts';

export interface PlayerSession {
  id: string;
  videoId: string;
  kind: 'video' | 'live' | 'playlist';
  title: string;
  channel: string;
  /** The video's own thumbnail, or '' when none is known yet. */
  thumbnail: string;
  category: string;
}

export interface PlayerTimer {
  option: TimerOption;
  endsAt: number;
}

export interface PlayerState {
  session: PlayerSession | null;
  /** idle: nothing loaded; loading: the embed is on its way; playing; paused; fading: on its way out. */
  status: 'idle' | 'loading' | 'playing' | 'paused' | 'fading';
  timer: PlayerTimer | null;
  /** The block this session was started for, so the block's Stop fades it out. */
  block: string | null;
  sound: SoundKind | null;
  volume: number;
  layerVolume: number;
  /** Whether the YouTube embed is in the Focus screen's tile or docked above the tab bar. */
  docked: boolean;
}

/** What the embed component offers once the YouTube player is ready. */
export interface EmbedControls {
  load: (session: PlayerSession) => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
  setVolume: (volume: number) => void;
}

const FADE_SECONDS = 5;

let state: PlayerState = { session: null, status: 'idle', timer: null, block: null, sound: null, volume: 80, layerVolume: 40, docked: true };
const listeners = new Set<() => void>();
let controls: EmbedControls | null = null;
let sounds: AtlasSounds | null = null;
let tick: ReturnType<typeof setInterval> | undefined;
let fadeTimer: ReturnType<typeof setTimeout> | undefined;
let fadeSteps: ReturnType<typeof setInterval> | undefined;

function set(next: Partial<PlayerState>): void {
  state = { ...state, ...next };
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useFocusPlayer(): PlayerState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

export function focusPlayerState(): PlayerState {
  return state;
}

/** The embed component hands over its controls when ready, and takes them back when it unmounts. */
export function registerEmbed(next: EmbedControls | null): void {
  controls = next;
  if (next && state.session) {
    next.setVolume(state.volume);
    if (state.status === 'loading') {
      next.load(state.session);
    }
  }
}

/** For the tests and the dev screen: a sound engine other than the real one. */
export function useSoundEngine(engine: AtlasSounds | null): void {
  sounds = engine;
}

function engine(): AtlasSounds {
  sounds ??= new AtlasSounds();
  return sounds;
}

function watchTimer(): void {
  clearInterval(tick);
  if (!state.timer) return;
  tick = setInterval(() => {
    if (state.timer && Date.now() >= state.timer.endsAt) {
      clearInterval(tick);
      endSession();
    }
  }, 1000);
}

/** Starts a session from a tap: the embed loads it (and plays once ready), with a timer and the block it serves. */
export function play(session: PlayerSession, options: { timer?: TimerOption; blockEndsAt?: number | null; block?: string | null } = {}): void {
  clearTimeout(fadeTimer);
  clearInterval(fadeSteps);
  const option = options.timer ?? state.timer?.option ?? 'block';
  const endsAt = timerEndsAt(option, Date.now(), options.blockEndsAt ?? null);
  set({ session, status: 'loading', timer: endsAt ? { option, endsAt } : null, block: options.block ?? state.block });
  controls?.setVolume(state.volume);
  controls?.load(session);
  watchTimer();
  setMediaSession(session.title, session.channel, resume, pause, () => stop());
}

/** The embed reports what the video does. */
export function embedReported(status: 'playing' | 'paused' | 'ended'): void {
  if (status === 'ended') {
    if (state.sound) {
      set({ status: 'paused' });
    } else {
      set({ status: 'idle', session: null, timer: null, block: null });
      clearInterval(tick);
      clearMediaSession();
    }
    return;
  }
  if (state.status === 'fading') return;
  set({ status });
}

export function pause(): void {
  controls?.pause();
  set({ status: 'paused' });
}

export function resume(): void {
  if (!state.session) return;
  controls?.setVolume(state.volume);
  controls?.play();
  set({ status: 'playing' });
}

export function togglePlay(): void {
  if (state.status === 'playing') pause();
  else resume();
}

/** Stops at once (no fade): the user's Stop. */
export function stop(): void {
  clearTimeout(fadeTimer);
  clearInterval(fadeSteps);
  clearInterval(tick);
  controls?.stop();
  if (state.sound) engine().stop(0.3);
  set({ session: null, status: 'idle', timer: null, block: null, sound: null });
  clearMediaSession();
}

/** The timer ran out, or the block's timer stopped: everything fades out over five seconds, then stops. */
export function endSession(): void {
  if (state.status === 'idle' && !state.sound) return;
  clearInterval(tick);
  set({ status: 'fading', timer: null });
  if (state.sound) engine().stop(FADE_SECONDS);
  const start = state.volume;
  let step = 0;
  clearInterval(fadeSteps);
  fadeSteps = setInterval(() => {
    step++;
    controls?.setVolume(Math.max(0, Math.round(start * (1 - step / (FADE_SECONDS * 4)))));
    if (step >= FADE_SECONDS * 4) clearInterval(fadeSteps);
  }, 250);
  clearTimeout(fadeTimer);
  fadeTimer = setTimeout(() => {
    controls?.stop();
    controls?.setVolume(state.volume);
    set({ session: null, status: 'idle', timer: null, block: null, sound: null });
    clearMediaSession();
  }, FADE_SECONDS * 1000 + 200);
}

/** Today's block timer stopped: a session started for that block fades out. */
export function blockStopped(block: string): void {
  if (state.block === block && (state.session || state.sound)) endSession();
}

export function setTimer(option: TimerOption, blockEndsAt: number | null): void {
  const endsAt = state.session || state.sound ? timerEndsAt(option, Date.now(), blockEndsAt) : null;
  set({ timer: endsAt ? { option, endsAt } : { option, endsAt: Number.POSITIVE_INFINITY } });
  watchTimer();
}

export function setVolume(volume: number): void {
  set({ volume });
  controls?.setVolume(volume);
}

export function setLayerVolume(volume: number): void {
  set({ layerVolume: volume });
  if (state.sound) engine().setVolume(volume / 100);
}

/** Turns an Atlas sound on (replacing another) or off. Under a video it plays at the layer volume. */
export async function toggleSound(kind: SoundKind, options: { timer?: TimerOption; blockEndsAt?: number | null; block?: string | null } = {}): Promise<void> {
  if (state.sound === kind) {
    engine().stop(FADE_SECONDS);
    set({ sound: null });
    if (!state.session) {
      clearInterval(tick);
      set({ timer: null, block: null });
      clearMediaSession();
    }
    return;
  }
  clearTimeout(fadeTimer);
  const volume = state.session ? state.layerVolume : state.volume;
  await engine().start(kind, volume / 100);
  const option = options.timer ?? state.timer?.option ?? 'block';
  const endsAt = state.timer?.endsAt ?? timerEndsAt(option, Date.now(), options.blockEndsAt ?? null);
  set({ sound: kind, timer: endsAt && Number.isFinite(endsAt) ? { option, endsAt } : null, block: options.block ?? state.block });
  watchTimer();
  if (!state.session) setMediaSession('Atlas · ' + soundName(kind), 'Atlas sounds', () => void toggleSound(kind), () => void toggleSound(kind), () => stop());
}

export function setDocked(docked: boolean): void {
  if (state.docked !== docked) set({ docked });
}

/** For the tests: back to nothing. */
export function resetFocusPlayer(): void {
  clearInterval(tick);
  clearTimeout(fadeTimer);
  clearInterval(fadeSteps);
  state = { session: null, status: 'idle', timer: null, block: null, sound: null, volume: 80, layerVolume: 40, docked: true };
  for (const l of listeners) l();
}
