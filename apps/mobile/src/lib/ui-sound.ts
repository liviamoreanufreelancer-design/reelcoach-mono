/**
 * ════════════════════════════════════════════════════════════════════
 *  UI AMBIENT SOUND
 * ════════════════════════════════════════════════════════════════════
 *
 *  Generates short procedural UI sounds with the WebAudio API. No mp3
 *  files in the bundle — sounds are synthesised on demand.
 *
 *  Why procedural:
 *    - Zero asset weight, no copyright concerns
 *    - Crisp and consistent across devices
 *    - Easy to tune timing/pitch without re-encoding
 *
 *  Honours the user's mute preference (localStorage). Defaults to ON
 *  but the user can mute from the home screen.
 *
 *  Browsers require a user gesture before audio can play; the AudioContext
 *  is created lazily on the first call so the very first tap initialises
 *  it. Subsequent calls are instant.
 * ════════════════════════════════════════════════════════════════════
 */

const STORAGE_KEY = "reelcoach:soundEnabled";

let ctx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function isEnabled(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try { localStorage.setItem(STORAGE_KEY, on ? "1" : "0"); } catch { /* ignore */ }
  if (masterGain) {
    masterGain.gain.value = on ? 1 : 0;
  }
}

export function getSoundEnabled(): boolean {
  return isEnabled();
}

function ensureCtx(): { ctx: AudioContext; master: GainNode } | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      masterGain = ctx.createGain();
      masterGain.gain.value = isEnabled() ? 1 : 0;
      masterGain.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  // Resume on user gesture (iOS Safari).
  if (ctx.state === "suspended") {
    void ctx.resume().catch(() => { /* ignore */ });
  }
  return { ctx, master: masterGain! };
}

/** Helper: short sine/triangle/square tone with ADSR envelope. */
function tone(opts: {
  freq: number;
  toFreq?: number;
  durationMs: number;
  type?: OscillatorType;
  volume?: number;
  attackMs?: number;
  delay?: number;
}) {
  const handle = ensureCtx();
  if (!handle) return;
  const { ctx, master } = handle;
  const now = ctx.currentTime + (opts.delay ?? 0);
  const dur = opts.durationMs / 1000;
  const vol = opts.volume ?? 0.15;
  const attack = (opts.attackMs ?? 8) / 1000;

  const osc = ctx.createOscillator();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, now);
  if (opts.toFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(20, opts.toFreq),
      now + dur,
    );
  }

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(vol, now + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

  osc.connect(gain).connect(master);
  osc.start(now);
  osc.stop(now + dur + 0.02);
}

/* ─────────────────────────────────────────────────────────────────────
 * Sound vocabulary — designed to feel premium/calm, never sharp
 * ──────────────────────────────────────────────────────────────────── */

/** Light tap — for any tappable surface. */
export function playTap() {
  tone({ freq: 1400, durationMs: 60, type: "sine", volume: 0.06, attackMs: 3 });
}

/** Soft confirm — selecting a filter, style pack, template. */
export function playSelect() {
  tone({ freq: 880, toFreq: 1320, durationMs: 110, type: "sine", volume: 0.09 });
}

/** Success chime — clip captured, reel exported. Two-note ascending. */
export function playSuccess() {
  tone({ freq: 880,  durationMs: 140, type: "sine", volume: 0.1 });
  tone({ freq: 1320, durationMs: 180, type: "sine", volume: 0.1, delay: 0.09 });
}

/** Countdown beep — 3, 2, 1. */
export function playCountdown() {
  tone({ freq: 1040, durationMs: 70, type: "sine", volume: 0.12, attackMs: 2 });
}

/** Recording start — go signal. */
export function playRecordStart() {
  tone({ freq: 660, toFreq: 1320, durationMs: 220, type: "sine", volume: 0.12 });
}

/** Recording stop — done signal. */
export function playRecordStop() {
  tone({ freq: 1320, toFreq: 440, durationMs: 220, type: "sine", volume: 0.1 });
}

/** Navigation forward — moving between phases/screens. */
export function playNavForward() {
  tone({ freq: 660, toFreq: 990, durationMs: 90, type: "sine", volume: 0.07 });
}

/** Navigation back — going back. */
export function playNavBack() {
  tone({ freq: 990, toFreq: 660, durationMs: 90, type: "sine", volume: 0.07 });
}

/** Soft error / cannot do that. */
export function playError() {
  tone({ freq: 220, durationMs: 200, type: "triangle", volume: 0.12 });
}
