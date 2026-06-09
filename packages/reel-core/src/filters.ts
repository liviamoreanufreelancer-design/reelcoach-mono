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
 *
 *  Descriptions for the filters exposed in Studio (STUDIO_FILTER_IDS) are in
 *  Romanian, since the partner-facing editor UI is Romanian. The renderer
 *  grading (cssFilter/tint/vignette/highlightBoost) is the real source of
 *  truth and is never changed by copy edits.
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
    desc: "Fără filtru. Claritate maximă.",
    category: "natural",
    cssFilter: "none",
  },
  clean: {
    id: "clean",
    label: "Clean",
    desc: "Corecție subtilă — exact ca în salon.",
    category: "natural",
    cssFilter: "saturate(1.06) contrast(1.04) brightness(1.02)",
    highlightBoost: 0.05,
  },
  daylight: {
    id: "daylight",
    label: "Daylight",
    desc: "Clar și luminos. Lumină naturală de fereastră.",
    category: "natural",
    cssFilter: "saturate(1.1) contrast(1.06) brightness(1.06)",
    tint: { color: "rgba(240, 245, 255, 1)", alpha: 0.06 },
    highlightBoost: 0.06,
  },

  // ── SOFT & BEAUTY ──────────────────────────────────────────────────
  glow: {
    id: "glow",
    label: "Glow",
    desc: "Piele luminoasă, lumină soft. Ideal pentru close-up.",
    category: "soft",
    cssFilter: "saturate(1.12) contrast(1.04) brightness(1.07)",
    tint: { color: "rgba(255, 225, 195, 1)", alpha: 0.08 },
    highlightBoost: 0.12,
  },
  porcelain: {
    id: "porcelain",
    label: "Porcelain",
    desc: "Alb editorial. Piele curată, ridicată, de porțelan.",
    category: "soft",
    cssFilter: "saturate(0.9) contrast(1.08) brightness(1.08)",
    tint: { color: "rgba(248, 238, 230, 1)", alpha: 0.09 },
    highlightBoost: 0.09,
  },
  honey: {
    id: "honey",
    label: "Honey",
    desc: "Auriu cald, tonuri piersică. Pentru blonde și golden hour.",
    category: "soft",
    cssFilter: "saturate(1.18) contrast(1.06) brightness(1.05)",
    tint: { color: "rgba(255, 185, 100, 1)", alpha: 0.10 },
    highlightBoost: 0.10,
  },
  velvet: {
    id: "velvet",
    label: "Velvet",
    desc: "Midtonuri cremoase, negruri soft. Pentru brunete.",
    category: "soft",
    cssFilter: "saturate(1.1) contrast(1.08) brightness(0.99)",
    tint: { color: "rgba(195, 145, 115, 1)", alpha: 0.09 },
    vignette: 0.2,
    highlightBoost: 0.07,
  },
  rose: {
    id: "rose",
    label: "Rose",
    desc: "Căldură roz subtilă. Flatant pe orice ten.",
    category: "soft",
    cssFilter: "saturate(1.08) contrast(1.05) brightness(1.06)",
    tint: { color: "rgba(240, 185, 175, 1)", alpha: 0.09 },
    highlightBoost: 0.09,
  },

  // ── LUXURY ─────────────────────────────────────────────────────────
  champagne: {
    id: "champagne",
    label: "Champagne",
    desc: "Auriu cald cu negruri ridicate. Senzație five-star.",
    category: "luxury",
    cssFilter: "saturate(1.12) contrast(1.12) brightness(1.03)",
    tint: { color: "rgba(232, 213, 181, 1)", alpha: 0.10 },
    vignette: 0.18,
    highlightBoost: 0.13,
  },
  ivory: {
    id: "ivory",
    label: "Ivory",
    desc: "Neutru-rece, alburi soft. Lux editorial curat.",
    category: "luxury",
    cssFilter: "saturate(0.92) contrast(1.1) brightness(1.06)",
    tint: { color: "rgba(245, 240, 232, 1)", alpha: 0.09 },
    vignette: 0.15,
    highlightBoost: 0.08,
  },
  matte: {
    id: "matte",
    label: "Matte",
    desc: "Eleganță desaturată. Fără strălucire, ton pur.",
    category: "luxury",
    cssFilter: "saturate(0.82) contrast(1.15) brightness(1.02)",
    tint: { color: "rgba(215, 205, 195, 1)", alpha: 0.08 },
    vignette: 0.22,
  },
  editorial: {
    id: "editorial",
    label: "Editorial",
    desc: "Contrast high-fashion. Pentru transformări cu impact.",
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
    desc: "Revistă de modă. Contrast puternic, negruri precise.",
    category: "cinematic",
    cssFilter: "saturate(1.18) contrast(1.22) brightness(0.98)",
    tint: { color: "rgba(255, 155, 90, 1)", alpha: 0.09 },
    vignette: 0.28,
    highlightBoost: 0.09,
  },
  moody: {
    id: "moody",
    label: "Moody",
    desc: "Editorial întunecat. Pentru transformări dramatice.",
    category: "cinematic",
    cssFilter: "saturate(1.08) contrast(1.28) brightness(0.94)",
    tint: { color: "rgba(85, 75, 110, 1)", alpha: 0.14 },
    vignette: 0.42,
    highlightBoost: 0.06,
  },
  film: {
    id: "film",
    label: "Film",
    desc: "Căldură analogică, grain, umbre ridicate.",
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
  // `cinema` is exposed in Studio (in STUDIO_FILTER_IDS) so it gets a real
  // Romanian description; the rest stay as non-exposed aliases.
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
  cinema:  { id: "cinema",  label: "Cinema",    desc: "Cinematic cald, portocaliu profund.", category: "cinematic",
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

/**
 * The curated set of filters exposed in the Studio editor's picker (the
 * partner-facing palette). A deliberate ~16, coherent with the midnight +
 * champagne brand — beauty/luxury leaning, drama where it counts. The full
 * FILTERS catalog stays larger for the renderer; Studio just offers this
 * subset. Add an id here and it shows up in the picker (TS validates the id).
 */
export const STUDIO_FILTER_IDS: FilterId[] = [
  // natural
  "none", "clean", "daylight",
  // soft & beauty
  "glow", "porcelain", "honey", "velvet", "rose",
  // luxury
  "champagne", "ivory", "matte", "editorial",
  // cinematic
  "cinema", "moody", "studio", "film",
];

/** The exposed filters as full presets, in STUDIO_FILTER_IDS order. */
export const STUDIO_FILTERS: FilterPreset[] = STUDIO_FILTER_IDS.map((id) => FILTERS[id]);
