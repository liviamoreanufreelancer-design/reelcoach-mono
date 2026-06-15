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
  example_video_url: string | null;
  status: "draft" | "published";
  is_recommended: boolean;
  difficulty: "easy" | "medium" | "hard";
  published_at: string | null;
  updated_at: string;
}

export interface DbShotRow {
  id: string;
  template_id: string;
  sort_order: number;
  pattern: string | null;
  title: string;
  hook: string | null;
  overlay_text: string | null;
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
  diagram_id: string | null;
  /** Join cu diagrams pe diagram_id — diagrama de filmare (refolosibila). */
  diagram: { image_url: string } | null;
  playback_speed: number;
  motion_blur: boolean;
}
