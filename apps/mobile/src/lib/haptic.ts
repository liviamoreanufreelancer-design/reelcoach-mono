/* Tiny haptic helper. No-op when Vibration API unavailable (iOS Safari). */
export function tap(ms = 8) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(ms);
    }
  } catch {
    /* ignore */
  }
}

export function success() { tap(12); }
export function light()   { tap(6); }
