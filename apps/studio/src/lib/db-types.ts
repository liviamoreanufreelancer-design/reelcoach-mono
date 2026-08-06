/**
 * Manually maintained types matching Supabase schema. Update this whenever
 * the migration SQL changes (we don't use supabase-codegen yet to keep
 * the build simple — just edit this file when adding columns).
 */

export type Role = "admin" | "editor";
export type TemplateStatus = "draft" | "published";
export type Difficulty = "easy" | "medium" | "hard";

// ── Concept enums (migration 004) ──────────────────────────────────────────
export type Vertical = "par" | "machiaj" | "unghii" | "gene" | "sprancene";
export type ConceptType =
  | "tips" | "mistakes" | "transformation" | "trend"
  | "before_after" | "tutorial" | "other";
export type ConceptStatus = "draft" | "in_review" | "published";
export type SlotRole = "hook" | "tip" | "step" | "reveal" | "cta" | "context";
/**
 * Cum se capturează un moment (migrațiile 012 + 013).
 *   video — doar filmare; intră în reel
 *   photo — doar poză; devine postare separată
 *   both  — ambele, la aceeași oprire (before, after, detaliu culoare)
 * Pozele NU intră în reeluri: produc postări foto cu caption propriu.
 */
export type CaptureKind = "video" | "photo" | "both";

/**
 * Migrația 014 — ce POSTĂRI ies dintr-o sesiune.
 *   reel     — montaj video din mai multe momente
 *   carousel — set de imagini (before → detaliu → after)
 *   stories  — clipurile brute, fiecare separat, fără montaj
 */
export type OutputKind = "reel" | "carousel" | "stories";

/**
 * Un moment consumat de un output, cu durata pe care o are AICI.
 * Acelaşi moment are durate diferite în outputuri diferite — de asta durata
 * stă pe legătură, nu pe scenă.
 */
export interface OutputSlot {
  /** `shots.slot_key` — identitate stabilă, nu `shots.id`. */
  slot: string;
  /** Secunde în acest output. Absent = toată captura. */
  sec?: number;

  // ── Excepții peste implicitul postării (migrația 015) ──────────────
  // Toate opționale: absente = se folosește implicitul postării. Stau în
  // jsonb tocmai ca adăugarea altora să nu mai ceară migrație.
  /** Filtru doar pentru acest moment, în această postare. */
  filter?: string;
  /** Tranziția DIN acest moment spre următorul, în această postare. */
  transition?: TransitionId;
  /** Viteză de redare (0,5 = slow-mo). */
  speed?: number;
  motionBlur?: boolean;
  /** Text peste acest moment. Diferă aproape mereu de la o postare la alta. */
  textLayers?: unknown[];
}

export interface OutputRow {
  id: string;
  template_id: string;
  name: string;
  kind: OutputKind;
  /** ORDONAT: ordinea din array e ordinea din montaj. */
  slots: OutputSlot[];
  caption: string | null;
  /** Migrația 015: filtrul implicit al postării. Slot-urile îl pot suprascrie. */
  filter: string | null;
  /** Migrația 015: tranziția implicită între momente. */
  transition: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
/**
 * Legacy enum of well-known patterns. Kept as a suggestion list only —
 * shots.pattern is now a free-form `string | null` and editors can type
 * anything. Use these as autocomplete suggestions in the UI.
 */
export type ShotPattern =
  | "before" | "process" | "suspense" | "reveal" | "reaction" | "confidence";
export type TransitionId =
  | "cut" | "fade" | "flash" | "zoom" | "smoothZoom" | "whipPan"
  | "glitch" | "blur" | "motionBlur" | "slide" | "spin";
export type EffectId =
  | "none" | "sparkle" | "leak" | "bokeh" | "dust"
  | "glow" | "softLight" | "lensFlare";

export interface Profile {
  id: string;
  email: string;
  display_name: string | null;
  role: Role;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  label: string;
  blurb: string | null;
  cover_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TemplateRow {
  id: string;
  title: string;
  promise: string | null;
  emotional_pitch: string | null;
  category_id: string;
  cover_url: string | null;
  /** Reel-ul complet montat (renderReelInBrowser), urcat in `previews`. */
  preview_reel_url: string | null;
  example_video_url: string | null;
  /** Migration 004: which concept this template is a recipe-variant of. */
  concept_id: string | null;
  /** Migration 004: ONE filter for the whole reel (overrides per-scene). */
  global_filter: string | null;
  /** Migration 009: daca e setat, acesta e un draft-copy al template-ului parinte. */
  parent_id: string | null;
  status: TemplateStatus;
  is_recommended: boolean;
  difficulty: Difficulty;
  created_by: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface HowShootItem {
  icon: string;
  label: string;
  detail: string;
}

/** Migration 007: valori fixe pentru etichetele diagramelor. */
export const DIAGRAM_CATEGORIES = ["machiaj", "par", "unghii", "gene", "sprancene", "general"] as const;
export type DiagramCategory = (typeof DIAGRAM_CATEGORIES)[number];

export const DIAGRAM_POSITIONS = ["frontal", "de sus", "lateral", "deasupra zonei de lucru"] as const;
export type DiagramPosition = (typeof DIAGRAM_POSITIONS)[number];

export const DIAGRAM_LIGHTING = ["naturala din fata", "ring light", "doua LED-uri", "laterala"] as const;
export type DiagramLighting = (typeof DIAGRAM_LIGHTING)[number];

export const DIAGRAM_DISTANCES = ["foarte aproape", "la un brat", "la doi pasi"] as const;
export type DiagramDistance = (typeof DIAGRAM_DISTANCES)[number];

/** Migration 007: biblioteca GLOBALA de diagrame vizuale de filmare.
 * Diagrama = imagine generata + etichete pentru filtrare. Refolosibila cross-reel. */
export interface DiagramRow {
  id: string;
  name: string;
  image_url: string;
  category: string;           // DiagramCategory
  position: string | null;    // DiagramPosition
  lighting: string[];         // DiagramLighting[] (poate fi multipla)
  distance: string | null;    // DiagramDistance
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Migration 006: biblioteca de demo-uri VIDEO de tehnica de filmare.
 * Refolosibile intre scene/retete (filmezi ~20 o data, folosesti in sute de scene). */
export interface TechniqueDemoRow {
  id: string;
  name: string;
  description: string | null;
  video_url: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Migration 008: o sursa de lumina cu numarator (ex. Ring light x2). */
export interface LightSource {
  type: 'natural' | 'ring' | 'led' | 'reflector';
  position: 'front' | 'left' | 'right' | 'back' | 'top' | 'bottom';
}

export interface ShotRow {
  id: string;
  template_id: string;
  sort_order: number;
  /** Free-form pattern label. Optional. Suggested values in lib/options.ts. */
  pattern: string | null;
  title: string;
  hook: string | null;
  overlay_text: string | null;
  /** Migrația 010: straturi de text overlay (multi-text). null = folosește overlay_text vechi. */
  text_layers: unknown[] | null;
  /**
   * Migrațiile 012 + 013. `both` = și filmare, și poză la aceeași oprire
   * (before, after, detaliu culoare): filmarea intră în reel, poza devine
   * postare separată cu caption propriu.
   */
  capture_kind: CaptureKind;
  /**
   * Migrația 012. Identitatea STABILĂ a momentului în sesiune ("before",
   * "clatire"). Outputurile referă momentele prin cheia asta, NU prin `id`:
   * publicarea recreează rândurile din `shots` cu id-uri noi.
   * Auto-generată din pattern/poziție, editabilă de parteneră.
   */
  slot_key: string | null;
  recording_duration: number;
  final_usage_duration: number;
  countdown: number;
  transition_type: TransitionId;
  filter_style: string;
  effect: EffectId;
  hands_busy: boolean;
  instructions: string[];
  must_show: string[];
  must_see: string[];
  how_shoot: HowShootItem[];
  example_image_url: string | null;
  /** Migration 004: partner's own clip for this scene (samples bucket). */
  sample_video_url: string | null;
  /** Migration 004: which pool slot fills this scene's on-screen text. */
  text_slot_role: SlotRole | null;
  caption_position: 'top' | 'center' | 'bottom';
  caption_preset: string;
  /** Playback speed for this scene's clip (1.0 = normal, 0.5 = slow motion). */
  playback_speed: number;
  /** Apply motion blur across the entire scene clip (cinematic effect). */
  motion_blur: boolean;
  /** Migration 008: cum tii telefonul. */
  phone_hold: 'hand' | 'tripod' | null;
  /** Migration 008: distanta fata de subiect (termeni umani). */
  shot_distance: 'palm' | 'arm' | 'step' | 'two_steps' | null;
  /** Migration 008: surse de lumina cu numarator. */
  light_sources: LightSource[];
  /** Migration 008: miscarea telefonului (doar cand tii in mana). */
  phone_movement: 'fixed' | 'follow' | 'pan' | 'zoom' | null;
  /** Migration 008: tip subiect (pentru filmare hands-free viitoare). */
  subject_type: 'face' | 'hands' | 'hair' | 'product' | null;
  /** Migration 006: video demo de tehnica din biblioteca (cum se filmeaza). */
  technique_demo_id: string | null;
  /** Migration 006: slot pentru diagrama vizuala (designul vine separat). */
  diagram_url: string | null;
  /** Migration 007: referinta la o diagrama din biblioteca globala (refolosibila). */
  diagram_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── Concept (the "idea of reel", above templates) — migration 004 ──────────
export interface ConceptRow {
  id: string;
  title: string;
  vertical: Vertical;
  /** The reusable FORMAT of the idea (same type across verticals = same shape). */
  concept_type: ConceptType;
  blurb: string | null;
  cover_url: string | null;
  status: ConceptStatus;
  /** Whether a published concept actually appears in the daily feed. */
  is_active: boolean;
  created_by: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Pool item (the substance: tips/hooks/etc.) — migration 004 ─────────────
export interface ConceptPoolItemRow {
  id: string;
  concept_id: string;
  slot_role: SlotRole;
  /** The actual substance — the tip, the hook line, the CTA, ... */
  content: string;
  /** Expert-validated. Only approved items are eligible for the feed. */
  is_approved: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
