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
import type { TransitionDef, ClipEffectDef, TransformDef } from "./types";
import {
  cutTransition, fadeTransition, flashTransition, zoomTransition,
  glitchTransition, blurTransition, slideTransition, spinTransition,
  whipPanTransition, smoothZoomTransition, motionBlurTransition,
} from "./transitions/legacy";
import { zoomThrough } from "./transitions/zoom-through";
import { splitReveal } from "./transitions/split-reveal";
import { whipPan } from "./transitions/whip-pan";
import { hairSweep } from "./transitions/hair-sweep";
import { lightSweep } from "./effects/light-sweep";
import { editorialFrame } from "./effects/editorial-frame";
import { photoMotion } from "./transforms/photo-motion";
import { focusPull } from "./transforms/focus-pull";
import { freezeZoom } from "./transforms/freeze-zoom";
import {
  sparkleEffect, leakEffect, bokehEffect, dustEffect,
  glowEffect, softLightEffect, lensFlareEffect,
} from "./effects/legacy";

/** Tranzițiile, în ordinea în care apar în Studio. */
export const TRANSITION_DEFS: TransitionDef[] = [
  fadeTransition,
  zoomThrough,        // premium — mișcare de aparat
  hairSweep,          // premium — citește imaginea, nu o presupune
  splitReveal,        // premium — transformare grafică
  whipPan,            // premium — versiunea parametrizată a lui whipPan
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
  lightSweep,         // premium — lumină
  editorialFrame,     // premium — identitate grafică
  glowEffect,
  softLightEffect,
  sparkleEffect,
  lensFlareEffect,
  leakEffect,
  bokehEffect,
  dustEffect,
];

/**
 * Transformările — schimbă CUM se desenează cadrul, nu ce se pune peste el.
 * Studio le arată în acelasi selector cu efectele de clip: pentru partenera e
 * tot „un efect pe momentul ăsta", iar engine-ul decide unde se aplică.
 */
export const TRANSFORM_DEFS: TransformDef[] = [
  focusPull,
  freezeZoom,
  photoMotion,
];

const transitionById = new Map(TRANSITION_DEFS.map((d) => [d.id, d]));
const transformById = new Map(TRANSFORM_DEFS.map((d) => [d.id, d]));
const clipEffectById = new Map(CLIP_EFFECT_DEFS.map((d) => [d.id, d]));

export function findTransition(id: string | undefined): TransitionDef | undefined {
  return id ? transitionById.get(id) : undefined;
}
export function findClipEffect(id: string | undefined): ClipEffectDef | undefined {
  return id ? clipEffectById.get(id) : undefined;
}
export function findTransform(id: string | undefined): TransformDef | undefined {
  return id ? transformById.get(id) : undefined;
}
