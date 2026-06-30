/**
 * ════════════════════════════════════════════════════════════════════
 *  DB → ReelTemplate Adapter
 * ════════════════════════════════════════════════════════════════════
 *
 *  Converts a Supabase template + its shots into the mobile app's
 *  `ReelTemplate` domain type (see shots.ts).
 *
 *  Why an adapter:
 *    - DB schema is flat (one row per shot, sort_order column for order)
 *    - Mobile schema is structured (template → sections → shots)
 *    - DB uses snake_case (camera_distance), mobile uses camelCase
 *    - DB has fields the mobile doesn't care about (created_by, updated_at)
 *
 *  This file is the one seam between Supabase and the mobile domain.
 *  If you migrate to a different backend, this is the only file to rewrite.
 * ════════════════════════════════════════════════════════════════════
 */

import type {
  ReelTemplate,
  Shot,
  Section,
  ShotPatternId,
} from "./shots";
import type { Profession } from "./scenarios";
import type { FilterId } from "@reelcoach/core";
import type { TransitionId } from "@reelcoach/core";
import type { EffectId } from "./shots";
import type { DbTemplateRow, DbShotRow } from "./supabase-client";

/**
 * Convert one template row + its shot rows into a ReelTemplate.
 * Shots must already be sorted by sort_order.
 */
export function dbToReelTemplate(
  template: DbTemplateRow,
  shots: DbShotRow[],
): ReelTemplate {
  const cover = template.cover_url ?? FALLBACK_COVER;

  // Convert each shot row → Shot domain object.
  const mobileShots: Shot[] = shots.map((row) => dbShotToShot(row));

  // Group shots into one "main" section for now. Future: support multiple
  // sections per template (e.g. "Setup" + "Main" + "Closing") via a DB column.
  const section: Section = {
    id: "main",
    title: "Toate cadrele",
    shots: mobileShots,
  };

  return {
    id: template.id,
    title: template.title,
    promise: template.promise ?? "",
    emotionalPitch: template.emotional_pitch ?? undefined,
    previewReelUrl: template.preview_reel_url ?? undefined,
    difficulty: template.difficulty ?? "easy",
    cover,
    // Studio uses category_id to mean the leaf category (Subcategory in mobile
    // terms). The mobile catalog binds templates by subcategoryId.
    subcategoryId: template.category_id,
    professions: ["par"] as Profession[],
    sections: [section],
  };
}

/** Convert one DB shot row → mobile Shot. */
function dbShotToShot(row: DbShotRow): Shot {
  return {
    id: row.id,
    // pattern is now free-form text. The mobile resolveShot() will fall back
    // to GENERIC_PATTERN defaults if it's not one of the well-known ids.
    pattern: (row.pattern ?? "before") as ShotPatternId,
    title: row.title,
    instructions: row.instructions ?? [],
    mustShow: row.must_show ?? undefined,
    handsBusy: row.hands_busy,
    recordingDuration: row.recording_duration,
    finalUsageDuration: row.final_usage_duration,
    countdown: row.countdown,
    overlayText: row.overlay_text ?? undefined,
    transitionType: row.transition_type as TransitionId,
    filterStyle: row.filter_style as FilterId,
    effect: row.effect as EffectId,
    mustSee: row.must_see ?? undefined,
    howShoot: row.how_shoot ?? undefined,
    playbackSpeed: row.playback_speed ?? undefined,
    motionBlur: row.motion_blur ?? undefined,
    exampleImageUrl: row.example_image_url ?? undefined,
    sampleVideoUrl: row.sample_video_url ?? undefined,
    diagramUrl: row.diagram?.image_url ?? undefined,
    captionPreset: row.caption_preset ?? undefined,
  };
}

/**
 * Fallback cover image URL used when a template in the DB has no cover.
 * Could be a generic gradient or the home-bg image hosted on Supabase Storage.
 * For now we leave it pointing at a placeholder — TODO: bundle a default.
 */
const FALLBACK_COVER =
  "https://qzbknlkxpteliocwjwvm.supabase.co/storage/v1/object/public/covers/_fallback.jpg";
