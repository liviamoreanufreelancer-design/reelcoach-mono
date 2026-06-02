/**
 * UI constants for the Studio editor.
 * TRANSITIONS derives from @reelcoach/core (single source of truth).
 * FILTERS/EFFECTS still local — consolidated into core later (a2-plus).
 */

import { TRANSITION_LIST } from "@reelcoach/core";
import type { TransitionId, EffectId } from "./db-types";

export const PATTERNS: { id: string; label: string; desc: string }[] = [
  { id: "before",     label: "Before",     desc: "Punctul de plecare, înainte de transformare." },
  { id: "process",    label: "Process",    desc: "Munca propriu-zisă — mâinile și mișcarea." },
  { id: "suspense",   label: "Suspense",   desc: "Creează tensiune. Părul ascuns, fața nu se vede." },
  { id: "reveal",     label: "Reveal",     desc: "Marele moment — rezultatul complet." },
  { id: "reaction",   label: "Reaction",   desc: "Reacția clientei la rezultat." },
  { id: "confidence", label: "Confidence", desc: "Energia finală — clienta în noua versiune." },
];

export const TRANSITIONS: { id: TransitionId; label: string; desc: string }[] =
  TRANSITION_LIST.map((t) => ({ id: t.id as TransitionId, label: t.label, desc: t.desc }));

export const EFFECTS: { id: EffectId; label: string; desc: string }[] = [
  { id: "none",      label: "Fără efect", desc: "Niciun overlay." },
  { id: "sparkle",   label: "Sparkle",    desc: "Sclipiri aurii (transformări lux)." },
  { id: "leak",      label: "Light leak", desc: "Cinematic vintage soft." },
  { id: "bokeh",     label: "Bokeh",      desc: "Pete blurate, dreamy." },
  { id: "dust",      label: "Particule",  desc: "Particule fine în lumină." },
  { id: "glow",      label: "Glow",       desc: "Strălucire animată în jurul subiectului." },
  { id: "softLight", label: "Soft light", desc: "Halo soft alb peste cadru." },
  { id: "lensFlare", label: "Lens flare", desc: "Reflexie lentilă cinematică." },
];

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
