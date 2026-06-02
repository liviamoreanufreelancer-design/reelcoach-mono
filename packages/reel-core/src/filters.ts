/**
 * ════════════════════════════════════════════════════════════════════
 *  BEAUTY-FIRST FILTER SYSTEM — Natural & Luxury Edition
 * ════════════════════════════════════════════════════════════════════
 *
 *  Philosophy: filters should make the work look better, not fake.
 *  Every filter here is tuned for hair, skin, and beauty content.
 *  Intensities are intentionally restrained — luxury is subtle.
 *
 *  Categories:
 *    "natural"  → honest, clean, light correction only
 *    "soft"     → skin & beauty glow, warm and forgiving
 *    "luxury"   → editorial premium, fine grading
 *    "cinematic"→ drama for transformations
 * ════════════════════════════════════════════════════════════════════
 */

export type FilterId =
  // natural
  | "none"
  | "clean"
  | "daylight"
  // soft & beauty
  | "glow"
  | "porcelain"
  | "honey"
  | "velvet"
  | "rose"
  // luxury
  | "champagne"
  | "ivory"
  | "matte"
  | "editorial"
  // cinematic
  | "studio"
  | "moody"
  | "film"
  | "noir"
  // legacy ids kept so old saved state still resolves
  | "warm"
  | "cool"
  | "bw"
  | "vintage"
  | "vivid"
  | "cinema"
  | "pop"
  | "neon";

export type FilterCategory = "natural" | "soft" | "luxury" | "cinematic";

export interface FilterPreset {
  id: FilterId;
  label: string;
  desc: string;
  category: FilterCategory;
  cssFilter: string;
  tint?: { color: string; alpha: number };
  vignette?: number;
  highlightBoost?: number;
}

export const FILTERS: Record<FilterId, FilterPreset> = {
  // ── NATURAL ────────────────────────────────────────────────────────
  none: {
    id: "none",
    label: "Original",
    desc: "No filter. Maximum clarity.",
    category: "natural",
    cssFilter: "none",
  },
  clean: {
    id: "clean",
    label: "Clean",
    desc: "Subtle correction — just like in the salon.",
    category: "natural",
    cssFilter: "saturate(1.06) contrast(1.04) brightness(1.02)",
    highlightBoost: 0.05,
  },
  daylight: {
    id: "daylight",
    label: "Daylight",
    desc: "Crisp and bright. Natural window light feel.",
    category: "natural",
    cssFilter: "saturate(1.1) contrast(1.06) brightness(1.06)",
    tint: { color: "rgba(240, 245, 255, 1)", alpha: 0.06 },
    highlightBoost: 0.06,
  },

  // ── SOFT & BEAUTY ──────────────────────────────────────────────────
  glow: {
    id: "glow",
    label: "Glow",
    desc: "Luminous skin, soft light. Best for close-up.",
    category: "soft",
    cssFilter: "saturate(1.12) contrast(1.04) brightness(1.07)",
    tint: { color: "rgba(255, 225, 195, 1)", alpha: 0.08 },
    highlightBoost: 0.12,
  },
  porcelain: {
    id: "porcelain",
    label: "Porcelain",
    desc: "Editorial white. Lifted, clean, porcelain skin.",
    category: "soft",
    cssFilter: "saturate(0.9) contrast(1.08) brightness(1.08)",
    tint: { color: "rgba(248, 238, 230, 1)", alpha: 0.09 },
    highlightBoost: 0.09,
  },
  honey: {
    id: "honey",
    label: "Honey",
    desc: "Warm gold, peachy tones. For blondes and golden hour.",
    category: "soft",
    cssFilter: "saturate(1.18) contrast(1.06) brightness(1.05)",
    tint: { color: "rgba(255, 185, 100, 1)", alpha: 0.10 },
    highlightBoost: 0.10,
  },
  velvet: {
    id: "velvet",
    label: "Velvet",
    desc: "Creamy midtones, soft blacks. For brunettes.",
    category: "soft",
    cssFilter: "saturate(1.1) contrast(1.08) brightness(0.99)",
    tint: { color: "rgba(195, 145, 115, 1)", alpha: 0.09 },
    vignette: 0.2,
    highlightBoost: 0.07,
  },
  rose: {
    id: "rose",
    label: "Rose",
    desc: "Soft blush warmth. Flattering on all skin tones.",
    category: "soft",
    cssFilter: "saturate(1.08) contrast(1.05) brightness(1.06)",
    tint: { color: "rgba(240, 185, 175, 1)", alpha: 0.09 },
    highlightBoost: 0.09,
  },

  // ── LUXURY ─────────────────────────────────────────────────────────
  champagne: {
    id: "champagne",
    label: "Champagne",
    desc: "Warm gold with lifted blacks. Five-star feel.",
    category: "luxury",
    cssFilter: "saturate(1.12) contrast(1.12) brightness(1.03)",
    tint: { color: "rgba(232, 213, 181, 1)", alpha: 0.10 },
    vignette: 0.18,
    highlightBoost: 0.13,
  },
  ivory: {
    id: "ivory",
    label: "Ivory",
    desc: "Cool-neutral, soft whites. Clean luxury editorial.",
    category: "luxury",
    cssFilter: "saturate(0.92) contrast(1.1) brightness(1.06)",
    tint: { color: "rgba(245, 240, 232, 1)", alpha: 0.09 },
    vignette: 0.15,
    highlightBoost: 0.08,
  },
  matte: {
    id: "matte",
    label: "Matte",
    desc: "Desaturated elegance. No glare, pure tone.",
    category: "luxury",
    cssFilter: "saturate(0.82) contrast(1.15) brightness(1.02)",
    tint: { color: "rgba(215, 205, 195, 1)", alpha: 0.08 },
    vignette: 0.22,
  },
  editorial: {
    id: "editorial",
    label: "Editorial",
    desc: "High-fashion contrast. For transformations that need impact.",
    category: "luxury",
    cssFilter: "saturate(1.15) contrast(1.22) brightness(0.98)",
    tint: { color: "rgba(255, 200, 140, 1)", alpha: 0.08 },
    vignette: 0.28,
    highlightBoost: 0.10,
  },

  // ── CINEMATIC ──────────────────────────────────────────────────────
  studio: {
    id: "studio",
    label: "Studio",
    desc: "Fashion magazine. Strong contrast, precise blacks.",
    category: "cinematic",
    cssFilter: "saturate(1.18) contrast(1.22) brightness(0.98)",
    tint: { color: "rgba(255, 155, 90, 1)", alpha: 0.09 },
    vignette: 0.28,
    highlightBoost: 0.09,
  },
  moody: {
    id: "moody",
    label: "Moody",
    desc: "Dark editorial. For dramatic transformations.",
    category: "cinematic",
    cssFilter: "saturate(1.08) contrast(1.28) brightness(0.94)",
    tint: { color: "rgba(85, 75, 110, 1)", alpha: 0.14 },
    vignette: 0.42,
    highlightBoost: 0.06,
  },
  film: {
    id: "film",
    label: "Film",
    desc: "Analog warmth, grain, lifted shadows.",
    category: "cinematic",
    cssFilter: "saturate(1.04) contrast(1.14) brightness(0.98)",
    tint: { color: "rgba(210, 168, 112, 1)", alpha: 0.12 },
    vignette: 0.35,
    highlightBoost: 0.08,
  },
  noir: {
    id: "noir",
    label: "Noir",
    desc: "Black and white with skin tones preserved.",
    category: "cinematic",
    cssFilter: "saturate(0.15) contrast(1.28) brightness(1.02)",
    tint: { color: "rgba(220, 185, 150, 1)", alpha: 0.06 },
    vignette: 0.38,
  },

  // ── LEGACY ALIASES ─────────────────────────────────────────────────
  warm:    { id: "warm",    label: "Cald",      desc: "—", category: "soft",
             cssFilter: "saturate(1.18) contrast(1.06) brightness(1.05)",
             tint: { color: "rgba(255, 185, 100, 1)", alpha: 0.10 }, highlightBoost: 0.10 },
  cool:    { id: "cool",    label: "Rece",      desc: "—", category: "cinematic",
             cssFilter: "saturate(1.1) contrast(1.1) brightness(0.97)",
             tint: { color: "rgba(85, 145, 220, 1)", alpha: 0.10 } },
  bw:      { id: "bw",      label: "Alb-Negru", desc: "—", category: "cinematic",
             cssFilter: "grayscale(1) contrast(1.22) brightness(1.0)" },
  vintage: { id: "vintage", label: "Vintage",   desc: "—", category: "cinematic",
             cssFilter: "sepia(0.6) saturate(1.15) contrast(1.1)",
             tint: { color: "rgba(195, 140, 75, 1)", alpha: 0.12 }, vignette: 0.35 },
  vivid:   { id: "vivid",   label: "Vivid",     desc: "—", category: "cinematic",
             cssFilter: "saturate(1.55) contrast(1.18) brightness(1.04)" },
  cinema:  { id: "cinema",  label: "Cinema",    desc: "—", category: "cinematic",
             cssFilter: "saturate(1.25) contrast(1.2) brightness(0.97)",
             tint: { color: "rgba(255, 125, 50, 1)", alpha: 0.14 }, vignette: 0.4 },
  pop:     { id: "pop",     label: "Pop",       desc: "—", category: "cinematic",
             cssFilter: "saturate(1.55) contrast(1.18) brightness(1.03)", highlightBoost: 0.10 },
  neon:    { id: "neon",    label: "Neon",      desc: "—", category: "cinematic",
             cssFilter: "saturate(1.45) contrast(1.35) brightness(1.0)",
             tint: { color: "rgba(120, 100, 255, 1)", alpha: 0.10 } },
};

/** Ordered list shown in the UI (legacy aliases excluded). */
export const FILTER_LIST: FilterPreset[] = [
  FILTERS.none,
  FILTERS.clean,
  FILTERS.daylight,
  FILTERS.glow,
  FILTERS.porcelain,
  FILTERS.honey,
  FILTERS.velvet,
  FILTERS.rose,
  FILTERS.champagne,
  FILTERS.ivory,
  FILTERS.matte,
  FILTERS.editorial,
  FILTERS.studio,
  FILTERS.moody,
  FILTERS.film,
  FILTERS.noir,
];

/** Grouped for the UI. */
export const FILTER_GROUPS: { id: FilterCategory; label: string; filters: FilterPreset[] }[] = [
  { id: "natural",   label: "Natural",      filters: [FILTERS.none, FILTERS.clean, FILTERS.daylight] },
  { id: "soft",      label: "Soft & Beauty", filters: [FILTERS.glow, FILTERS.porcelain, FILTERS.honey, FILTERS.velvet, FILTERS.rose] },
  { id: "luxury",    label: "Luxury",        filters: [FILTERS.champagne, FILTERS.ivory, FILTERS.matte, FILTERS.editorial] },
  { id: "cinematic", label: "Cinematic",     filters: [FILTERS.studio, FILTERS.moody, FILTERS.film, FILTERS.noir] },
];
