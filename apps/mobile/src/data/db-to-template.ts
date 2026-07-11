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
// Etichete RO pentru variabilele de filmare (migrația 008).
const HOLD_LABEL: Record<string, string> = { hand: "În mână", tripod: "Pe stativ" };
const DIST_LABEL: Record<string, string> = { palm: "La o palmă", arm: "La un braț", step: "La un pas", two_steps: "La doi pași" };
const MOVE_LABEL: Record<string, string> = { fixed: "Fix", follow: "Urmărire", pan: "Panoramare", zoom: "Zoom" };
const LIGHT_LABEL: Record<string, string> = { natural: "Lumină naturală", ring: "Ring light", led: "LED-uri", reflector: "Reflector" };
const LIGHT_POS_LABEL: Record<string, string> = { front: "Față", left: "Stânga", right: "Dreapta", back: "Spate", top: "Sus", bottom: "Jos" };

type HowShootItem = { icon: string; label: string; detail: string };

/**
 * Construiește lista de instrucțiuni de filmare din variabilele structurate
 * (migrația 008) pe care partenera le setează în Studio. Dacă scena nu are
 * variabile 008, întoarce null și se folosește vechiul how_shoot.
 */
function buildHowShootFrom008(row: DbShotRow): HowShootItem[] | null {
  const items: HowShootItem[] = [];

  if (row.phone_hold) {
    items.push({ icon: "phone-vertical", label: "Telefon", detail: HOLD_LABEL[row.phone_hold] ?? row.phone_hold });
  }
  if (row.shot_distance) {
    items.push({ icon: "distance", label: "Distanță", detail: DIST_LABEL[row.shot_distance] ?? row.shot_distance });
  }
  // Mișcarea are sens doar când telefonul e ținut în mână.
  if (row.phone_movement && row.phone_hold === "hand") {
    items.push({ icon: "move", label: "Mișcare", detail: MOVE_LABEL[row.phone_movement] ?? row.phone_movement });
  }
  // Câte un rând pentru fiecare sursă de lumină.
  if (row.light_sources && row.light_sources.length > 0) {
    for (const l of row.light_sources) {
      items.push({
        icon: "light",
        label: LIGHT_LABEL[l.type] ?? "Lumină",
        detail: LIGHT_POS_LABEL[l.position ?? "front"] ?? "Față",
      });
    }
  }
  if (row.recording_duration) {
    items.push({ icon: "duration", label: "Durată", detail: `${row.recording_duration} secunde` });
  }

  return items.length > 0 ? items : null;
}

function dbShotToShot(row: DbShotRow): Shot {
  return {
    id: row.id,
    // pattern is now free-form text. The mobile resolveShot() will fall back
    // to GENERIC_PATTERN defaults if it's not one of the well-known ids.
    pattern: (row.pattern ?? "before") as ShotPatternId,
    title: row.title,
    hook: row.hook ?? undefined,
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
    howShoot: buildHowShootFrom008(row) ?? row.how_shoot ?? undefined,
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
