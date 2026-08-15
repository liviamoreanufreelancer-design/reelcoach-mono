/**
 * Limbajul de mișcare ReelCoach.
 *
 * Toate efectele folosesc curbele de aici, nu curbe proprii. Ăsta e singurul
 * lucru care face ca zece efecte diferite să pară membre ale aceleiași familii:
 * nu culoarea, nu forma — RITMUL. Două tranziții cu aceeași curbă se simt
 * înrudite chiar dacă arată complet diferit; două cu curbe diferite se simt
 * străine chiar dacă arată la fel.
 *
 * Principiul: pornire hotărâtă, oprire lungă. Mișcarea premium nu frânează
 * brusc — se așază. De asta `settle` (ieșire lentă, exponent mare) e curba
 * implicită, nu `inOut`.
 */

/** Simetric. Pentru schimburi echilibrate între două cadre. */
export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

/** Pornire hotărâtă, așezare lungă. Curba implicită a familiei. */
export function settle(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

/** Accelerare — pentru ce trebuie să plece din cadru, nu să intre. */
export function accelerate(t: number): number {
  return t * t * t;
}

/** 0 → 1 → 0. Pentru ce culminează la mijloc (sclipiri, treceri de lumină). */
export function peak(t: number): number {
  return Math.sin(Math.max(0, Math.min(1, t)) * Math.PI);
}

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

export const EASINGS = { easeInOut, settle, accelerate } as const;
export type EasingId = keyof typeof EASINGS;

export function easingBy(id: string): (t: number) => number {
  return (EASINGS as Record<string, (t: number) => number>)[id] ?? settle;
}
