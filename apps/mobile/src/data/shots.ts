import type { TransitionId } from "@reelcoach/core";
import type { FilterId } from "@reelcoach/core";
import type { EffectId } from "@reelcoach/core";
import type { Profession } from "./scenarios";

/**
 * Premium visual effects that overlay the video frame. The catalog now lives
 * in @reelcoach/core (single source of truth, shared with the renderer that
 * actually draws them). Re-exported here so existing consumers
 * (db-to-template, etc.) keep importing EffectId from this module.
 */
export type { EffectId };

export type ShotPatternId =
  | "before"
  | "process"
  | "suspense"
  | "reveal"
  | "reaction"
  | "confidence";

export interface ShotPattern {
  id: ShotPatternId;
  label: string;
  purpose: string;
  defaults: {
    recordingDuration: number;
    finalUsageDuration: number;
    transitionType: TransitionId;
    filterStyle: FilterId;
    countdown: number;
  };
  icon: string;
  accent: "rose" | "gold" | "emerald" | "violet" | "sky" | "amber";
  /**
   * Premium effect overlay auto-applied to this shot in the final reel
   * (when the user has effects enabled). Tuned per pattern so the effect
   * enhances the moment instead of distracting from it.
   */
  defaultEffect: EffectId;
}

export const SHOT_PATTERNS: Record<ShotPatternId, ShotPattern> = {
  before: {
    id: "before",
    label: "Before Shot",
    purpose: "Arată punctul de plecare — onest, fără filtru. Aici începe transformarea.",
    icon: "Camera",
    accent: "sky",
    defaultEffect: "none",
    defaults: { recordingDuration: 4, finalUsageDuration: 2, transitionType: "cut", filterStyle: "none", countdown: 3 },
  },
  process: {
    id: "process",
    label: "Process Shot",
    purpose: "Munca în desfășurare. Mâini, mișcare, detaliu — dovada priceperii tale.",
    icon: "Sparkles",
    accent: "violet",
    defaultEffect: "none",
    defaults: { recordingDuration: 5, finalUsageDuration: 2, transitionType: "fade", filterStyle: "warm", countdown: 3 },
  },
  suspense: {
    id: "suspense",
    label: "Suspense Shot",
    purpose: "Construiește tensiune. Arată destul cât să stârnești curiozitate — nu dezvălui încă.",
    icon: "EyeOff",
    accent: "amber",
    defaultEffect: "leak",
    defaults: { recordingDuration: 4, finalUsageDuration: 2, transitionType: "fade", filterStyle: "cinema", countdown: 3 },
  },
  reveal: {
    id: "reveal",
    label: "Reveal Shot",
    purpose: "Momentul „uite ce am făcut”. Rezultatul final, filmat curat și încet.",
    icon: "Star",
    accent: "gold",
    defaultEffect: "sparkle",
    defaults: { recordingDuration: 6, finalUsageDuration: 4, transitionType: "zoom", filterStyle: "cinema", countdown: 3 },
  },
  reaction: {
    id: "reaction",
    label: "Reaction Shot",
    purpose: "Reacția reală a clientei. Emoția autentică e cel mai bun social proof.",
    icon: "Heart",
    accent: "rose",
    defaultEffect: "bokeh",
    defaults: { recordingDuration: 8, finalUsageDuration: 3, transitionType: "fade", filterStyle: "warm", countdown: 3 },
  },
  confidence: {
    id: "confidence",
    label: "Confidence Shot",
    purpose: "Clienta se privește și se place. Cadrul care vinde următoarea programare.",
    icon: "Crown",
    accent: "emerald",
    defaultEffect: "sparkle",
    defaults: { recordingDuration: 5, finalUsageDuration: 3, transitionType: "fade", filterStyle: "cinema", countdown: 3 },
  },
};

export const SHOT_PATTERN_LIST: ShotPattern[] = [
  SHOT_PATTERNS.before, SHOT_PATTERNS.process, SHOT_PATTERNS.suspense,
  SHOT_PATTERNS.reveal, SHOT_PATTERNS.reaction, SHOT_PATTERNS.confidence,
];

export interface Shot {
  id: string;
  /**
   * Pattern label. Either one of the well-known ShotPatternId values
   * (looked up in SHOT_PATTERNS for defaults) or any custom string.
   * Free-form to allow templates other than transformations (tips, demos,
   * tutorials, etc.) without locking into a fixed taxonomy.
   */
  pattern: ShotPatternId | string;
  title: string;
  instructions: string[];
  mustShow?: string[];
  handsBusy?: boolean;
  recordingDuration?: number;
  finalUsageDuration?: number;
  countdown?: number;
  overlayText?: string;
  transitionType?: TransitionId;
  filterStyle?: FilterId;
  /** Per-scenă: viteză playback (slow-mo / fast-mo). 1 = normal. */
  playbackSpeed?: number;
  /** Per-scenă: motion blur. */
  motionBlur?: boolean;
  /** Imaginea de exemplu pentru această scenă (cum trebuie să arate cadrul). */
  exampleImageUrl?: string;
  /** Diagrama de filmare (din biblioteca globală, refolosibilă). */
  diagramUrl?: string;
  /**
   * Optional override for the premium effect on this specific shot.
   * If omitted, the pattern's defaultEffect is used.
   */
  effect?: EffectId;
  /**
   * Shot-first "Ce trebuie să se vadă" — checklist of what must appear
   * in the camera frame. Each item is 1-3 words. Used by the pre-shot
   * screen with checkmark icons.
   */
  mustSee?: string[];
  /**
   * Shot-first "Cum filmezi" — 2-3 ultra-short bullets with structured
   * icon + label + detail format. Renders as compact cards on the
   * pre-shot screen.
   */
  howShoot?: { icon: string; label: string; detail: string }[];
  /** Font/preset caption setat in Studio per scena (default reel-ului). */
  captionPreset?: string;
}

export interface ResolvedShot
  extends Required<Omit<Shot, "overlayText" | "mustShow" | "handsBusy" | "effect" | "mustSee" | "howShoot" | "playbackSpeed" | "motionBlur" | "exampleImageUrl" | "diagramUrl" | "captionPreset">> {
  overlayText: string;
  mustShow: string[];
  handsBusy: boolean;
  effect: EffectId;
  patternMeta: ShotPattern;
  mustSee: string[];
  howShoot: { icon: string; label: string; detail: string }[];
  playbackSpeed?: number;
  motionBlur?: boolean;
  exampleImageUrl?: string;
  diagramUrl?: string;
  /** Font/preset caption per scena (din Studio). */
  captionPreset?: string;
}

/**
 * Generic defaults used when a shot's pattern is a custom string not in
 * SHOT_PATTERNS. Keeps the rest of the pipeline (recording, export) working
 * even for fully free-form templates (tips, demos, etc.).
 */
const GENERIC_PATTERN: ShotPattern = {
  id: "before",
  label: "Scena",
  purpose: "Cadru personalizat.",
  defaults: {
    recordingDuration: 4,
    finalUsageDuration: 2,
    transitionType: "fade",
    filterStyle: "none" as FilterId,
    countdown: 3,
  },
  icon: "circle",
  accent: "gold",
  defaultEffect: "none",
};

export function resolveShot(shot: Shot): ResolvedShot {
  // Look up the well-known pattern; fall back to generic defaults if the
  // shot uses a custom free-form pattern label.
  const p = SHOT_PATTERNS[shot.pattern as ShotPatternId] ?? GENERIC_PATTERN;
  return {
    id: shot.id,
    pattern: shot.pattern,
    title: shot.title,
    instructions: shot.instructions,
    mustShow: shot.mustShow ?? [],
    handsBusy: shot.handsBusy ?? false,
    recordingDuration: shot.recordingDuration ?? p.defaults.recordingDuration,
    finalUsageDuration: shot.finalUsageDuration ?? p.defaults.finalUsageDuration,
    countdown: shot.countdown ?? p.defaults.countdown,
    overlayText: shot.overlayText ?? "",
    transitionType: shot.transitionType ?? p.defaults.transitionType,
    filterStyle: shot.filterStyle ?? p.defaults.filterStyle,
    effect: shot.effect ?? p.defaultEffect,
    patternMeta: p,
    mustSee: shot.mustSee ?? [],
    howShoot: shot.howShoot ?? [],
    captionPreset: shot.captionPreset,
    // Per-scene playback speed + motion blur. Carried through so the choices
    // the partner makes in Studio actually reach the renderer (without this,
    // they were silently dropped here and never applied to the export).
    playbackSpeed: shot.playbackSpeed,
    motionBlur: shot.motionBlur,
    exampleImageUrl: shot.exampleImageUrl,
    diagramUrl: shot.diagramUrl,
  };
}

export interface Section {
  id: string;
  title: string;
  shots: Shot[];
}

export interface ReelTemplate {
  id: string;
  subcategoryId: string;
  title: string;
  promise: string;
  /**
   * Editorial pitch — one short paragraph (2-3 sentences) describing the
   * EMOTION and EFFECT of the reel, not the mechanics. Shown on the
   * pre-filming storyboard screen as an italic editorial statement so the
   * creator feels what the viewer will feel before filming.
   *
   * Example: "Construit pentru efectul WOW. Începi calm, creezi tensiune,
   * ajungi la un reveal care oprește scroll-ul."
   */
  emotionalPitch?: string;
  cover: string;
  /** Filming difficulty — easy/medium/hard (label: Ușor/Mediu/Avansat). */
  difficulty?: "easy" | "medium" | "hard";
  professions: Profession[];
  sections: Section[];
}

export interface Subcategory {
  id: string;
  categoryId: string;
  label: string;
  blurb: string;
}

export interface Category {
  id: string;
  label: string;
  blurb: string;
  icon: string;
  /** Hero image for the swipe-through Catalog screen. Each category has its own. */
  cover?: string;
  /** Which profession this category belongs to. */
  profession?: Profession;
}

export function flattenShots(t: ReelTemplate): ResolvedShot[] {
  return t.sections.flatMap((s) => s.shots.map(resolveShot));
}

export function sectionForShotIndex(
  t: ReelTemplate,
  flatIdx: number,
): { section: Section; indexInSection: number; total: number } | null {
  let cursor = 0;
  for (const section of t.sections) {
    if (flatIdx < cursor + section.shots.length) {
      return { section, indexInSection: flatIdx - cursor, total: section.shots.length };
    }
    cursor += section.shots.length;
  }
  return null;
}

export function totalRecordingSeconds(t: ReelTemplate): number {
  return flattenShots(t).reduce((sum, s) => sum + s.recordingDuration, 0);
}

export function totalFinalSeconds(t: ReelTemplate): number {
  return flattenShots(t).reduce((sum, s) => sum + s.finalUsageDuration, 0);
}

export function shotCount(t: ReelTemplate): number {
  return t.sections.reduce((n, s) => n + s.shots.length, 0);
}
