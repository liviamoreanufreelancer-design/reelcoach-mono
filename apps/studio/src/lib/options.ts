/**
 * UI constants for the Studio editor.
 *
 * TRANSITIONS and EFFECTS now derive from the shared engine (@reelcoach/core)
 * — single source of truth, so the pickers can never drift from what the
 * renderer actually supports. FILTERS is still local for now; it gets
 * consolidated into core in a later pass (core exposes a superset filter set).
 */

import { TRANSITION_LIST, EFFECT_LIST } from "@reelcoach/core";
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
 * renderer can never disagree on which transitions exist. Shape preserved
 * ({ id, label, desc }) so existing consumers need no change.
 */
export const TRANSITIONS: { id: TransitionId; label: string; desc: string }[] =
  TRANSITION_LIST.map((t) => ({ id: t.id as TransitionId, label: t.label, desc: t.desc }));

/**
 * Effects — likewise derived from the engine's catalog. Includes glow /
 * softLight / lensFlare which the renderer draws; the picker now stays in
 * lockstep with drawPremiumEffect.
 */
export const EFFECTS: { id: EffectId; label: string; desc: string }[] =
  EFFECT_LIST.map((e) => ({ id: e.id as EffectId, label: e.label, desc: e.desc }));

// Filter ids — keep simple textual list matching mobile FILTERS object.
// We don't store labels for each here; the dropdown shows id, label maps in UI.
export const FILTERS: { id: string; label: string; category: string }[] = [
  { id: "none",       label: "Fără filtru", category: "natural" },
  { id: "clean",      label: "Clean",       category: "natural" },
  { id: "daylight",   label: "Daylight",    category: "natural" },
  { id: "glow",       label: "Glow",        category: "soft" },
  { id: "porcelain",  label: "Porcelain",   category: "soft" },
  { id: "honey",      label: "Honey",       category: "soft" },
  { id: "velvet",     label: "Velvet",      category: "soft" },
  { id: "rose",       label: "Rose",        category: "soft" },
  { id: "champagne",  label: "Champagne",   category: "luxury" },
  { id: "cinema",     label: "Cinema",      category: "cinematic" },
  { id: "warm",       label: "Warm",        category: "luxury" },
];

// How-shoot icon picker — known icon ids the mobile app supports.
export const HOW_SHOOT_ICONS: { id: string; label: string }[] = [
  { id: "phone-vertical", label: "Telefon" },
  { id: "distance",       label: "Distanță" },
  { id: "duration",       label: "Durată" },
  { id: "movement",       label: "Mișcare" },
];

export const DIFFICULTIES = [
  { id: "easy",   label: "Ușor" },
  { id: "medium", label: "Mediu" },
  { id: "hard",   label: "Greu" },
] as const;
