/**
 * ════════════════════════════════════════════════════════════════════
 *  REGISTRY — singura listă de efecte din produs
 * ════════════════════════════════════════════════════════════════════
 *
 * Un efect există dacă e aici. Engine-ul îl caută în registry, Studio își
 * construiește selectoarele din registry, iar controalele de parametri se
 * generează din schema declarată de fiecare efect. Nu există a doua listă
 * care s-ar putea desincroniza — regula era deja scrisă în effects.ts
 * („UI-ul nu poate oferi un efect pe care engine-ul nu-l randează"), acum e
 * și structural imposibil.
 *
 * Ca să adaugi un efect: scrii fișierul, îl importi, îl pui în listă. Atât.
 * Nici o atingere în bucla de randare, nici o migrație — parametrii stau în
 * `slots` (jsonb).
 */
import type { TransitionDef, ClipEffectDef } from "./types";
import {
  cutTransition, fadeTransition, flashTransition, zoomTransition,
  glitchTransition, blurTransition, slideTransition, spinTransition,
  whipPanTransition, smoothZoomTransition, motionBlurTransition,
} from "./transitions/legacy";
import { zoomThrough } from "./transitions/zoom-through";
import { lightSweep } from "./effects/light-sweep";
import {
  sparkleEffect, leakEffect, bokehEffect, dustEffect,
  glowEffect, softLightEffect, lensFlareEffect,
} from "./effects/legacy";

/** Tranzițiile, în ordinea în care apar în Studio. */
export const TRANSITION_DEFS: TransitionDef[] = [
  fadeTransition,
  zoomThrough,        // premium — vezi fx/transitions/zoom-through.ts
  smoothZoomTransition,
  blurTransition,
  flashTransition,
  zoomTransition,
  slideTransition,
  whipPanTransition,
  motionBlurTransition,
  spinTransition,
  glitchTransition,
  cutTransition,
];

/** Efectele de clip, în ordinea în care apar în Studio. */
export const CLIP_EFFECT_DEFS: ClipEffectDef[] = [
  lightSweep,         // premium — vezi fx/effects/light-sweep.ts
  glowEffect,
  softLightEffect,
  sparkleEffect,
  lensFlareEffect,
  leakEffect,
  bokehEffect,
  dustEffect,
];

const transitionById = new Map(TRANSITION_DEFS.map((d) => [d.id, d]));
const clipEffectById = new Map(CLIP_EFFECT_DEFS.map((d) => [d.id, d]));

export function findTransition(id: string | undefined): TransitionDef | undefined {
  return id ? transitionById.get(id) : undefined;
}
export function findClipEffect(id: string | undefined): ClipEffectDef | undefined {
  return id ? clipEffectById.get(id) : undefined;
}
