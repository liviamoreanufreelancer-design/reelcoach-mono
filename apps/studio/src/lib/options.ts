/**
 * UI constants mirroring the mobile app's available options.
 * Keep in sync with: reelcoach/src/data/{transitions.ts, filters.ts, shots.ts}
 */

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

export const TRANSITIONS: { id: TransitionId; label: string; desc: string }[] = [
  { id: "cut",        label: "Cut sec",     desc: "Fără tranziție." },
  { id: "fade",       label: "Fade",        desc: "Cross-fade clasic, soft." },
  { id: "flash",      label: "Flash",       desc: "Flash alb la mijloc." },
  { id: "zoom",       label: "Punch zoom",  desc: "Zoom rapid energic." },
  { id: "smoothZoom", label: "Smooth zoom", desc: "Zoom gradual cinematic." },
  { id: "whipPan",    label: "Whip pan",    desc: "Pan rapid cu blur orizontal." },
  { id: "glitch",     label: "Glitch",      desc: "Distorsiune RGB + scanlines." },
  { id: "blur",       label: "Blur focus",  desc: "Defocus → focus, dreamy." },
  { id: "motionBlur", label: "Motion blur", desc: "Blur pe toată scena (filter, nu tranziție per se)." },
  { id: "slide",      label: "Slide",       desc: "Clipul nou intră lateral." },
  { id: "spin",       label: "Spin",        desc: "Rotație rapidă între clipuri." },
];

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

// Filter ids — keep simple textual list matching mobile FILTERS object.
// We don't store labels for each here; the dropdown shows id, label maps in UI.
export const FILTERS: { id: string; label: string; category: string }[] = [
  { id: "none",       label: "Fără filtru",       category: "natural" },
  { id: "clean",      label: "Clean",             category: "natural" },
  { id: "daylight",   label: "Daylight",          category: "natural" },
  { id: "glow",       label: "Glow",              category: "soft" },
  { id: "porcelain",  label: "Porcelain",         category: "soft" },
  { id: "honey",      label: "Honey",             category: "soft" },
  { id: "velvet",     label: "Velvet",            category: "soft" },
  { id: "rose",       label: "Rose",              category: "soft" },
  { id: "champagne",  label: "Champagne",         category: "luxury" },
  { id: "cinema",     label: "Cinema",            category: "cinematic" },
  { id: "warm",       label: "Warm",              category: "luxury" },
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
