import type { TextLayer } from "@reelcoach/core";
/**
 * Supabase client for the mobile reel app.
 *
 * Read-only: the app only fetches *published* templates. RLS on the
 * Supabase side enforces that anon users can only see published rows.
 * No authentication — the anon key is fine to ship publicly.
 *
 * The URL and key are exposed as Vite env vars (must be prefixed with VITE_).
 * Set them in `.env`:
 *   VITE_SUPABASE_URL=https://qzbknlkxpteliocwjwvm.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJhbG...
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// In dev or when env vars are missing, log a clear warning instead of crashing.
// The app falls back to the bundled seed template (wow-transformation) so it
// still works offline / without configuration.
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
    "Mobile app will fall back to bundled seed templates only.",
  );
}

/** True if the Supabase client is configured (env vars present). */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

/**
 * Lazy-initialized Supabase client. Returns null when env vars are missing
 * so callers can degrade gracefully (use bundled seed templates).
 */
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        // No authentication for the mobile app — read-only public access.
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;

/**
 * Raw row types matching the Supabase schema (one-to-one with the DB columns).
 * These are deliberately decoupled from the mobile app's domain types
 * (ReelTemplate, Shot, Scene) — the adapter in db-to-template.ts maps between
 * them. If the DB schema changes, only the adapter needs updates.
 */
export interface DbTemplateRow {
  id: string;
  title: string;
  promise: string | null;
  emotional_pitch: string | null;
  category_id: string;
  cover_url: string | null;
  preview_reel_url: string | null;
  status: "draft" | "published";
  is_recommended: boolean;
  difficulty: "easy" | "medium" | "hard";
  published_at: string | null;
  updated_at: string;
}

/**
 * Cum se capturează un moment (migrațiile 012 + 013).
 *   video — doar filmare; intră în reel
 *   photo — doar poză; devine postare separată
 *   both  — ambele, la aceeași oprire (before, after, detaliu culoare)
 */
export type CaptureKind = "video" | "photo" | "both";

/** O sursă de lumină pe scenă (migrația 008). */
export interface LightSource {
  type: "natural" | "ring" | "led" | "reflector";
  position: "front" | "left" | "right" | "back" | "top" | "bottom";
}

/**
 * Un moment in compozitia unei postari (migratia 015). Ordinea din array e
 * ordinea din montaj. Referinta e `slot`, un slot_key — NU un shots.id:
 * publicarea recreeaza momentele cu id-uri noi, deci un id ar rupe legatura.
 */
export interface DbOutputSlot {
  slot: string;
  sec?: number;
  /** Exceptii peste implicitele postarii. Absente = se foloseste postarea. */
  filter?: string;
  transition?: string;
  speed?: number;
  motionBlur?: boolean;
  textLayers?: TextLayer[];
  /** Efectul ales pe acest moment, in aceasta postare (registry-ul din core). */
  effect?: string;
  /** Reglajele efectelor, pe id: { zoomThrough: { focusX: 0.3 } }. */
  fxParams?: Record<string, Record<string, number | string | boolean>>;
}

/**
 * O postare care iese din sesiune (migratiile 014-016). Un sablon nu mai
 * inseamna un reel: aceleasi momente filmate dau mai multe rezultate.
 */
export interface DbOutputRow {
  id: string;
  template_id: string;
  name: string;
  kind: "reel" | "carousel" | "stories";
  slots: DbOutputSlot[];
  caption: string | null;
  /** Implicitele de stil ale postarii; slot-urile le pot suprascrie. */
  filter: string | null;
  transition: string | null;
  /** Migratia 016: slot_key-ul momentului care da cadrul de coperta. */
  cover_slot: string | null;
  sort_order: number;
}

/**
 * Migrația 021 + 024 — catalogul de tipuri de cadru. Ce se filmează o dată se
 * descrie o dată: o corectură aici se vede în toate scenariile care folosesc
 * tipul, fără ca partenera să le atingă.
 */
export interface DbShotTypeRow {
  id: string;
  name: string;
  family: string | null;
  hook: string | null;
  instructions: string[] | null;
  phone_hold: "hand" | "tripod" | null;
  shot_distance: "palm" | "arm" | "step" | "two_steps" | null;
  phone_movement: "fixed" | "follow" | "pan" | "zoom" | null;
  light_sources: LightSource[] | null;
  capture_kind: CaptureKind | null;
  example_image_url: string | null;
}

export interface DbShotRow {
  id: string;
  template_id: string;
  sort_order: number;
  pattern: string | null;
  title: string;
  hook: string | null;
  overlay_text: string | null;
  /** Migrația 010: straturi de text overlay (multi-text). */
  text_layers: TextLayer[] | null;
  /**
   * Migrațiile 012 + 013. `both` = stilista filmează ȘI fotografiază la
   * aceeași oprire. Filmarea intră în reel, poza devine postare separată.
   */
  capture_kind: CaptureKind;
  /** Migrația 012: identitatea stabilă a momentului în sesiune. */
  slot_key: string | null;
  /**
   * Migrația 024: tipul de cadru din catalog. Variabilele de filmare se CITESC
   * din el; coloanele de mai jos sunt suprascrieri — null înseamnă „moștenește".
   */
  shot_type_id: string | null;
  /** Join cu shot_types pe shot_type_id. Sursa variabilelor, când există. */
  shot_type: DbShotTypeRow | null;
  recording_duration: number;
  final_usage_duration: number;
  countdown: number;
  transition_type: string;
  filter_style: string;
  effect: string;
  hands_busy: boolean;
  instructions: string[] | null;
  must_show: string[] | null;
  must_see: string[] | null;
  how_shoot: { icon: string; label: string; detail: string }[] | null;
  example_image_url: string | null;
  sample_video_url: string | null;
  diagram_id: string | null;
  /** Join cu diagrams pe diagram_id — diagrama de filmare (refolosibila). */
  diagram: { image_url: string } | null;
  playback_speed: number;
  motion_blur: boolean;
  caption_preset: string | null;
  /** Migrația 008: variabile de filmare structurate. */
  phone_hold: "hand" | "tripod" | null;
  shot_distance: "palm" | "arm" | "step" | "two_steps" | null;
  phone_movement: "fixed" | "follow" | "pan" | "zoom" | null;
  light_sources: LightSource[] | null;
  subject_type: string | null;
}
