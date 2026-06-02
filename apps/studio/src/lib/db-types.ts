/**
 * Manually maintained types matching Supabase schema. Update this whenever
 * the migration SQL changes (we don't use supabase-codegen yet to keep
 * the build simple — just edit this file when adding columns).
 */

export type Role = "admin" | "editor";
export type TemplateStatus = "draft" | "published";
export type Difficulty = "easy" | "medium" | "hard";
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
  example_video_url: string | null;
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

export interface ShotRow {
  id: string;
  template_id: string;
  sort_order: number;
  /** Free-form pattern label. Optional. Suggested values in lib/options.ts. */
  pattern: string | null;
  title: string;
  hook: string | null;
  overlay_text: string | null;
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
  /** Playback speed for this scene's clip (1.0 = normal, 0.5 = slow motion). */
  playback_speed: number;
  /** Apply motion blur across the entire scene clip (cinematic effect). */
  motion_blur: boolean;
  created_at: string;
  updated_at: string;
}
