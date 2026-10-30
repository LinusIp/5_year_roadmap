/**
 * Atlas sounds (ATLAS-FOCUS-MUSIC): noise and a slow pad generated in the browser with the Web Audio API, so they
 * play offline, keep playing with the screen locked (a YouTube embed pauses there), and need no file and no
 * licence. White, pink and brown noise are looped buffers; soft rain is filtered noise with random droplets; the
 * pad a few detuned oscillators through a low-pass filter and a generated reverb. Volume moves on a 5 s ramp in
 * and out. The buffer generators are pure, so the unit test can check them without an AudioContext.
 */

export const SOUND_KINDS = ['white', 'pink', 'brown', 'rain', 'pad'] as const;
export type SoundKind = (typeof SOUND_KINDS)[number];

export const SOUND_DEFS: { kind: SoundKind; name: string; note: string }[] = [
  { kind: 'rain', name: 'Soft rain', note: 'Filtered noise with droplets' },
  { kind: 'brown', name: 'Brown noise', note: 'Deep and steady' },
  { kind: 'pink', name: 'Pink noise', note: 'Softer than white' },
  { kind: 'white', name: 'White noise', note: 'Every frequency alike' },
  { kind: 'pad', name: 'Ambient pad', note: 'Slow warm tone' },
];

export function soundName(kind: SoundKind): string {
  return SOUND_DEFS.find((d) => d.kind === kind)?.name ?? kind;
}

/** Park–Miller, so a buffer is the same for a seed (the tests) and never the browser's Math.random. */
function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

/** White noise in [-1, 1]. */
export function whiteNoise(length: number, seed = 1): Float32Array<ArrayBuffer> {
  const out = new Float32Array(length);
  const random = rng(seed);
  for (let i = 0; i < length; i++) out[i] = random() * 2 - 1;
  return out;
}

/** Pink noise (Paul Kellet's filter), roughly in [-1, 1]. */
export function pinkNoise(length: number, seed = 2): Float32Array<ArrayBuffer> {
  const out = new Float32Array(length);
  const random = rng(seed);
  let b0 = 0;
  let b1 = 0;
  let b2 = 0;
  let b3 = 0;
  let b4 = 0;
  let b5 = 0;
  let b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.969 * b2 + white * 0.153852;
    b3 = 0.8665 * b3 + white * 0.3104856;
    b4 = 0.55 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.016898;
    out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return out;
}

/** Brown noise: integrated white noise, leaking so it never drifts, scaled to about [-1, 1]. */
export function brownNoise(length: number, seed = 3): Float32Array<ArrayBuffer> {
  const out = new Float32Array(length);
  const random = rng(seed);
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = random() * 2 - 1;
    last = (last + 0.02 * white) / 1.02;
    out[i] = last * 3.5;
  }
  return out;
}

/** The loudest sample of a buffer, as a share of full scale. */
export function peak(buffer: Float32Array): number {
  let max = 0;
  for (const v of buffer) max = Math.max(max, Math.abs(v));
  return max;
}

/** A soft stereo-ish reverb impulse: exponentially decaying noise, `seconds` long. */
export function reverbImpulse(sampleRate: number, seconds = 2.5, seed = 4): Float32Array<ArrayBuffer> {
  const length = Math.floor(sampleRate * seconds);
  const out = whiteNoise(length, seed);
  for (let i = 0; i < length; i++) out[i]! *= (1 - i / length) ** 3;
  return out;
}

type Ctx = AudioContext;

/** The running engine: one sound at a time, a master gain the slider and the fades move. */
export class AtlasSounds {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private nodes: AudioScheduledSourceNode[] = [];
  private cleanup: (() => void)[] = [];
  private stopTimer: ReturnType<typeof setTimeout> | undefined;
  kind: SoundKind | null = null;
  private readonly makeContext: () => Ctx;

  constructor(makeContext: () => Ctx = () => new AudioContext()) {
    this.makeContext = makeContext;
  }

  private context(): Ctx {
    if (!this.ctx) {
      this.ctx = this.makeContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  /** Starts a sound, fading in over `fade` seconds to `volume` (0 to 1). A sound already playing is replaced. */
  async start(kind: SoundKind, volume: number, fade = 5): Promise<void> {
    const ctx = this.context();
    if (ctx.state === 'suspended') await ctx.resume();
    clearTimeout(this.stopTimer);
    this.silence();
    this.kind = kind;
    const master = this.master!;
    const into = this.build(ctx, kind);
    into.connect(master);
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, volume)), now + fade);
    for (const n of this.nodes) n.start();
  }

  /** Moves the volume (0 to 1) over a short ramp. */
  setVolume(volume: number): void {
    if (!this.ctx || !this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, volume)), now + 0.3);
  }

  /** Fades out over `fade` seconds, then stops everything. */
  stop(fade = 5): void {
    if (!this.ctx || !this.master || !this.kind) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(0, now + fade);
    this.kind = null;
    clearTimeout(this.stopTimer);
    this.stopTimer = setTimeout(() => this.silence(), fade * 1000 + 100);
  }

  get playing(): boolean {
    return this.kind !== null;
  }

  private silence(): void {
    for (const n of this.nodes) {
      try {
        n.stop();
      } catch {
        /* never started */
      }
      n.disconnect();
    }
    this.nodes = [];
    for (const c of this.cleanup) c();
    this.cleanup = [];
  }

  private loop(ctx: Ctx, samples: Float32Array<ArrayBuffer>): AudioBufferSourceNode {
    const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
    buffer.copyToChannel(samples, 0);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    this.nodes.push(source);
    return source;
  }

  /** Builds a sound's graph and returns the node to connect to the master. */
  private build(ctx: Ctx, kind: SoundKind): AudioNode {
    const seconds = 4;
    const length = ctx.sampleRate * seconds;
    if (kind === 'white') return this.loop(ctx, whiteNoise(length)).connect(ctx.createGain());
    if (kind === 'pink') return this.loop(ctx, pinkNoise(length));
    if (kind === 'brown') return this.loop(ctx, brownNoise(length));
    if (kind === 'rain') {
      // A steady hiss through a band-pass, and droplets: short bursts of noise through a higher band, at random.
      const out = ctx.createGain();
      const hiss = ctx.createBiquadFilter();
      hiss.type = 'bandpass';
      hiss.frequency.value = 900;
      hiss.Q.value = 0.5;
      const hissGain = ctx.createGain();
      hissGain.gain.value = 0.5;
      this.loop(ctx, pinkNoise(length, 7)).connect(hiss).connect(hissGain).connect(out);
      const drops = ctx.createBiquadFilter();
      drops.type = 'bandpass';
      drops.frequency.value = 3200;
      drops.Q.value = 2;
      const dropGain = ctx.createGain();
      dropGain.gain.value = 0;
      this.loop(ctx, whiteNoise(length, 8)).connect(drops).connect(dropGain).connect(out);
      let live = true;
      const random = rng(Date.now() % 2147483646 || 1);
      const drip = (): void => {
        if (!live) return;
        const t = ctx.currentTime;
        dropGain.gain.cancelScheduledValues(t);
        dropGain.gain.setValueAtTime(0, t);
        dropGain.gain.linearRampToValueAtTime(0.25 + random() * 0.35, t + 0.01);
        dropGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08 + random() * 0.1);
        setTimeout(drip, 60 + random() * 260);
      };
      const first = setTimeout(drip, 200);
      this.cleanup.push(() => {
        live = false;
        clearTimeout(first);
      });
      return out;
    }
    // The pad: a soft chord of detuned oscillators, low-passed, with a slow swell and a long reverb tail.
    const out = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 520;
    filter.Q.value = 0.7;
    const dry = ctx.createGain();
    dry.gain.value = 0.35;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    const reverb = ctx.createConvolver();
    const impulse = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 2.5), ctx.sampleRate);
    impulse.copyToChannel(reverbImpulse(ctx.sampleRate), 0);
    reverb.buffer = impulse;
    filter.connect(dry).connect(out);
    filter.connect(reverb).connect(wet).connect(out);
    const voices: [number, OscillatorType, number][] = [
      [110, 'sine', 0],
      [110.6, 'triangle', 0],
      [164.8, 'sine', 3],
      [165.4, 'triangle', -3],
      [220.4, 'sine', 5],
      [329.6, 'sine', -5],
    ];
    for (const [freq, type, detune] of voices) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const g = ctx.createGain();
      g.gain.value = 0.12;
      // A slow swell, so the chord breathes.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + Math.abs(detune) * 0.004;
      const depth = ctx.createGain();
      depth.gain.value = 0.05;
      lfo.connect(depth).connect(g.gain);
      osc.connect(g).connect(filter);
      this.nodes.push(osc, lfo);
    }
    return out;
  }
}

/** Lock-screen controls (Media Session API): "Atlas · Brown noise", with pause and play. */
export function setMediaSession(title: string, artist: string, onPlay: () => void, onPause: () => void, onStop: () => void): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist, album: 'Atlas' });
    navigator.mediaSession.setActionHandler('play', onPlay);
    navigator.mediaSession.setActionHandler('pause', onPause);
    navigator.mediaSession.setActionHandler('stop', onStop);
    navigator.mediaSession.playbackState = 'playing';
  } catch {
    /* an action the browser does not support */
  }
}

export function clearMediaSession(): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.playbackState = 'none';
    navigator.mediaSession.metadata = null;
  } catch {
    /* nothing to clear */
  }
}
