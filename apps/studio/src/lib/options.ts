/**
 * UI constants for the Studio editor.
 *
 * TRANSITIONS, EFFECTS and FILTERS now all derive from the shared engine
 * (@reelcoach/core) — single source of truth, so the pickers can never drift
 * from what the renderer actually supports. FILTERS uses the curated
 * STUDIO_FILTERS subset (the partner-facing palette), not the full catalog.
 */

import { TRANSITION_LIST, EFFECT_LIST, STUDIO_FILTERS } from "@reelcoach/core";
import type { TransitionId, EffectId } from "./db-types";

/**
 * Suggested patterns. These are autocomplete hints only — the user can
 * type anything for a scene's pattern. Use these labels (Before, Process,
 * etc.) for the well-known transformation flow.
 */
export const PATTERNS: { id: string; label: string; desc: string }[] = [
  { id: "before",     label: "Before",     desc: "Punctul de plecare, înainte de transformare." },
  { id: "process",    label: "Process",    desc: "Munca propriu-zisă — mâinile și mișcarea." },
  { id: "suspense",   label: "Suspense",   desc: "Creează tensiune. Părul ascuns, fața nu se vede." },
  { id: "reveal",     label: "Reveal",     desc: "Marele moment — rezultatul complet." },
  { id: "reaction",   label: "Reaction",   desc: "Reacția clientei la rezultat." },
  { id: "confidence", label: "Confidence", desc: "Energia finală — clienta în noua versiune." },
];

/**
 * Transitions — derived from the engine's canonical catalog so Studio and the
 * renderer can never disagree on which transitions exist.
 */
export const TRANSITIONS: { id: TransitionId; label: string; desc: string }[] =
  TRANSITION_LIST.map((t) => ({ id: t.id as TransitionId, label: t.label, desc: t.desc }));

/**
 * Effects — likewise derived from the engine's catalog (includes glow /
 * softLight / lensFlare which the renderer draws).
 */
export const EFFECTS: { id: EffectId; label: string; desc: string }[] =
  EFFECT_LIST.map((e) => ({ id: e.id as EffectId, label: e.label, desc: e.desc }));

/**
 * Filters — the curated Studio palette (~16) derived from the engine's
 * STUDIO_FILTERS. The full filter catalog is larger in core; Studio exposes
 * this brand-coherent subset. Shape preserved ({ id, label, category }).
 */
export const FILTERS: { id: string; label: string; category: string }[] =
  STUDIO_FILTERS.map((f) => ({ id: f.id, label: f.label, category: f.category }));

// How-shoot icon picker — known icon ids the mobile app supports.
export const HOW_SHOOT_ICONS: { id: string; label: string }[] = [
  { id: "light",    label: "Lumină" },
  { id: "eye",      label: "Poziționare telefon" },
  { id: "distance", label: "Distanță" },
  { id: "movement", label: "Mișcare" },
];

export const DIFFICULTIES = [
  { id: "easy",   label: "Ușor" },
  { id: "medium", label: "Mediu" },
  { id: "hard",   label: "Greu" },
] as const;
