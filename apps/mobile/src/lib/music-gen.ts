/**
 * Procedural music generator. Produces a 30s loopable WAV per track id using
 * the Web Audio OfflineAudioContext — no external assets, no network, no CORS.
 * Cached as Blob URLs so previewing is instant after the first call.
 */
import type { Vibe } from "./brand-store";

const SR = 44100;
const DEFAULT_DUR = 30;
const MIN_DUR = 8;
const MAX_DUR = 30;

const blobCache = new Map<string, Blob>();
const urlCache = new Map<string, string>();

interface Recipe {
  vibe: Vibe;
  bpm: number;
  /** Root MIDI note for the bass / pad. */
  root: number;
  /** Chord scale degrees (semitones from root). */
  chord: number[];
  /** Pad oscillator type. */
  padType: OscillatorType;
  /** Reverb-ish noise wash level 0..1. */
  airLevel: number;
  /** Drum pattern: kick on which 8ths. */
  kickPattern: number[];
  /** Hi-hat 16ths gate. */
  hatGate: boolean[];
  /** Pad gain. */
  padGain: number;
  /** Bass gain. */
  bassGain: number;
  /** Master gain. */
  master: number;
  /** Melody notes (semitones from root) per bar; null = rest. */
  melody?: (number | null)[];
}

const RECIPES: Record<string, Recipe> = {
  // Luxury — slow, warm, jazzy minor 9
  "lux-1": {
    vibe: "luxury", bpm: 70, root: 45, // A2
    chord: [0, 3, 7, 10, 14],
    padType: "sine", airLevel: 0.06,
    kickPattern: [0],
    hatGate: [false, false, true, false, false, false, true, false, false, false, true, false, false, false, true, false],
    padGain: 0.18, bassGain: 0.22, master: 0.85,
    melody: [12, null, 10, 7, 12, 14, 10, null],
  },
  "lux-2": {
    vibe: "luxury", bpm: 64, root: 43, // G2
    chord: [0, 4, 7, 11, 14],
    padType: "triangle", airLevel: 0.08,
    kickPattern: [0, 4],
    hatGate: Array(16).fill(false).map((_, i) => i % 4 === 2),
    padGain: 0.2, bassGain: 0.18, master: 0.85,
    melody: [7, 11, 14, null, 12, 7, 4, null],
  },
  // Soft — gentle pads, light kick
  "soft-1": {
    vibe: "soft", bpm: 80, root: 48, // C3
    chord: [0, 4, 7, 11],
    padType: "sine", airLevel: 0.07,
    kickPattern: [0, 6],
    hatGate: Array(16).fill(false).map((_, i) => i % 2 === 1),
    padGain: 0.22, bassGain: 0.16, master: 0.85,
    melody: [7, 11, 12, 7, 11, 14, 12, null],
  },
  "soft-2": {
    vibe: "soft", bpm: 76, root: 50, // D3
    chord: [0, 3, 7, 10],
    padType: "triangle", airLevel: 0.09,
    kickPattern: [0, 4],
    hatGate: Array(16).fill(false).map((_, i) => i === 6 || i === 14),
    padGain: 0.2, bassGain: 0.18, master: 0.82,
    melody: [10, 7, 3, 0, 7, 10, 12, null],
  },
  // Bold — punchy, four-on-the-floor
  "bold-1": {
    vibe: "bold", bpm: 120, root: 41, // F2
    chord: [0, 7, 12],
    padType: "sawtooth", airLevel: 0.04,
    kickPattern: [0, 4, 8, 12],
    hatGate: Array(16).fill(true).map((_, i) => i % 2 === 1),
    padGain: 0.14, bassGain: 0.28, master: 0.8,
    melody: [12, 12, 15, 12, 19, 15, 12, null],
  },
  "bold-2": {
    vibe: "bold", bpm: 128, root: 38, // D2
    chord: [0, 5, 12],
    padType: "square", airLevel: 0.05,
    kickPattern: [0, 4, 8, 12],
    hatGate: Array(16).fill(true).map((_, i) => i % 2 === 1 || i === 14),
    padGain: 0.12, bassGain: 0.3, master: 0.8,
    melody: [12, 15, 17, 19, 17, 15, 12, 10],
  },
};

const midiToHz = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

type Ctx = OfflineAudioContext;

function envGain(ctx: Ctx, t: number, attack: number, decay: number, peak: number): GainNode {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}

function kick(ctx: Ctx, t: number, out: AudioNode) {
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(140, t);
  o.frequency.exponentialRampToValueAtTime(40, t + 0.18);
  const g = envGain(ctx, t, 0.002, 0.32, 0.9);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + 0.4);
}

function hat(ctx: Ctx, t: number, out: AudioNode) {
  const len = Math.floor(SR * 0.06);
  const buf = ctx.createBuffer(1, len, SR);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass"; hp.frequency.value = 7000;
  const g = ctx.createGain(); g.gain.value = 0.22;
  src.connect(hp).connect(g).connect(out);
  src.start(t);
}

function note(ctx: Ctx, midi: number, t: number, dur: number, out: AudioNode, type: OscillatorType, peak: number) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.value = midiToHz(midi);
  const g = envGain(ctx, t, 0.04, dur, peak);
  o.connect(g).connect(out);
  o.start(t); o.stop(t + dur + 0.05);
}

function airNoise(ctx: Ctx, durationSec: number, level: number, out: AudioNode) {
  const len = Math.floor(SR * durationSec);
  const buf = ctx.createBuffer(1, len, SR);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * 0.5;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass"; lp.frequency.value = 1800;
  const g = ctx.createGain(); g.gain.value = level;
  src.connect(lp).connect(g).connect(out);
  src.start(0);
}

function buildTrack(ctx: Ctx, r: Recipe, durationSec: number) {
  const master = ctx.createGain();
  master.gain.value = r.master;
  master.connect(ctx.destination);

  const beat = 60 / r.bpm;
  const sixteenth = beat / 4;
  const bar = beat * 4;
  const bars = Math.max(1, Math.floor(durationSec / bar));

  // Air / pad bed
  airNoise(ctx, durationSec, r.airLevel, master);

  for (let b = 0; b < bars; b++) {
    const tBar = b * bar;
    // Pad: hold chord across the bar
    for (const semi of r.chord) {
      note(ctx, r.root + semi, tBar, bar * 0.95, master, r.padType, r.padGain / r.chord.length);
    }
    // Bass on root
    note(ctx, r.root - 12, tBar, bar * 0.5, master, "sine", r.bassGain);
    note(ctx, r.root - 12, tBar + bar / 2, bar * 0.5, master, "sine", r.bassGain * 0.85);

    // Drums (16 steps per bar)
    for (let s = 0; s < 16; s++) {
      const t = tBar + s * sixteenth;
      if (r.kickPattern.includes(s)) kick(ctx, t, master);
      if (r.hatGate[s]) hat(ctx, t, master);
    }

    // Melody (8 eighths per bar)
    if (r.melody) {
      for (let i = 0; i < r.melody.length; i++) {
        const m = r.melody[i];
        if (m == null) continue;
        const t = tBar + i * (beat / 2);
        note(ctx, r.root + 12 + m, t, beat * 0.45, master, "triangle", 0.12);
      }
    }
  }
}

function encodeWav(buf: AudioBuffer): ArrayBuffer {
  const numCh = buf.numberOfChannels;
  const len = buf.length * numCh * 2 + 44;
  const out = new ArrayBuffer(len);
  const view = new DataView(out);
  let p = 0;
  const wstr = (s: string) => { for (let i = 0; i < s.length; i++) view.setUint8(p++, s.charCodeAt(i)); };
  const w16 = (n: number) => { view.setUint16(p, n, true); p += 2; };
  const w32 = (n: number) => { view.setUint32(p, n, true); p += 4; };

  wstr("RIFF"); w32(len - 8); wstr("WAVE");
  wstr("fmt "); w32(16); w16(1); w16(numCh);
  w32(buf.sampleRate); w32(buf.sampleRate * numCh * 2); w16(numCh * 2); w16(16);
  wstr("data"); w32(buf.length * numCh * 2);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) channels.push(buf.getChannelData(c));
  for (let i = 0; i < buf.length; i++) {
    for (let c = 0; c < numCh; c++) {
      let s = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(p, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      p += 2;
    }
  }
  return out;
}

export function hasRecipe(id: string): boolean {
  return id in RECIPES;
}

function normalizeDuration(durationSec?: number): number {
  return Math.max(MIN_DUR, Math.min(MAX_DUR, Math.ceil(durationSec ?? DEFAULT_DUR)));
}

function cacheKey(id: string, durationSec?: number): string {
  return `${id}:${normalizeDuration(durationSec)}`;
}

export async function generateMusic(id: string, durationSec?: number): Promise<Blob> {
  const key = cacheKey(id, durationSec);
  if (blobCache.has(key)) return blobCache.get(key)!;
  const recipe = RECIPES[id];
  if (!recipe) throw new Error(`Unknown track ${id}`);
  const dur = normalizeDuration(durationSec);
  const Ctor = (typeof OfflineAudioContext !== "undefined"
    ? OfflineAudioContext
    : (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext);
  const ctx = new Ctor(2, SR * dur, SR);
  buildTrack(ctx, recipe, dur);
  const rendered = await ctx.startRendering();
  const wav = encodeWav(rendered);
  const blob = new Blob([wav], { type: "audio/wav" });
  blobCache.set(key, blob);
  return blob;
}

export async function getMusicUrl(id: string, durationSec?: number): Promise<string> {
  const key = cacheKey(id, durationSec);
  if (urlCache.has(key)) return urlCache.get(key)!;
  const blob = await generateMusic(id, durationSec);
  const url = URL.createObjectURL(blob);
  urlCache.set(key, url);
  return url;
}
