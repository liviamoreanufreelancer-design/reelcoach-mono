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
  SessionOutput,
  Shot,
  Section,
  ShotPatternId,
} from "./shots";
import type { Profession } from "./scenarios";
import type { FilterId } from "@reelcoach/core";
import type { TransitionId } from "@reelcoach/core";
import type { EffectId } from "./shots";
import type { DbTemplateRow, DbShotRow, DbOutputRow } from "./supabase-client";
// Cover fallback bundlat (offline-safe). Inainte era un URL catre bucket-ul
// Supabase (`covers/_fallback.jpg`) care lipsea => 404 in consola.
import fallbackCover from "@/assets/template-luxury.jpg";

/**
 * Convert one template row + its shot rows into a ReelTemplate.
 * Shots must already be sorted by sort_order.
 */
export function dbToReelTemplate(
  template: DbTemplateRow,
  shots: DbShotRow[],
  outputs: DbOutputRow[] = [],
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
    // Postarile sesiunii. Lista goala devine `undefined`, ca sa se distinga
    // "sablon fara rezultate definite" de "sablon vechi, un singur reel".
    outputs: outputs.length > 0 ? outputs.map(dbOutputToSessionOutput) : undefined,
  };
}

/** Convert one DB output row -> mobile SessionOutput. */
function dbOutputToSessionOutput(row: DbOutputRow): SessionOutput {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    // `slots` vine din jsonb; daca e null/gresit tipat, nu vrem sa crape
    // filmarea — o postare fara momente e doar o postare care nu se poate face.
    slots: Array.isArray(row.slots) ? row.slots : [],
    caption: row.caption ?? undefined,
    filter: row.filter ?? undefined,
    transition: row.transition ?? undefined,
    coverSlot: row.cover_slot ?? undefined,
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
 * Migrația 024 — momentul citește din tipul de cadru, cu suprascrieri.
 *
 * Regula, într-o propoziție: valoarea momentului câștigă dacă există, altfel
 * se moștenește din tip. `null` pe moment nu înseamnă „gol", înseamnă
 * „la fel ca tipul" — de asta nu se poate folosi `??` direct pe rând.
 *
 * Fără pasul ăsta, catalogul rămâne un loc de unde se COPIAZĂ, iar o corectură
 * a partenerei trebuie repetată în fiecare scenariu care folosește tipul.
 */
function withShotType(row: DbShotRow): DbShotRow {
  const t = row.shot_type;
  if (!t) return row;
  return {
    ...row,
    hook: row.hook ?? t.hook,
    instructions: row.instructions && row.instructions.length > 0 ? row.instructions : t.instructions,
    phone_hold: row.phone_hold ?? t.phone_hold,
    shot_distance: row.shot_distance ?? t.shot_distance,
    phone_movement: row.phone_movement ?? t.phone_movement,
    light_sources:
      row.light_sources && row.light_sources.length > 0 ? row.light_sources : t.light_sources,
    example_image_url: row.example_image_url ?? t.example_image_url,
    // `capture_kind` are NOT NULL cu implicit 'video' pe shots, deci nu se poate
    // deosebi „nesetat" de „video". Tipul câștigă doar când momentul e pe implicit:
    // un before se capturează la fel indiferent ce variantă îl cere.
    capture_kind: row.capture_kind === "video" && t.capture_kind ? t.capture_kind : row.capture_kind,
  };
}

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

function dbShotToShot(rawRow: DbShotRow): Shot {
  const row = withShotType(rawRow);
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
    textLayers: row.text_layers ?? undefined,
    captureKind: row.capture_kind ?? "video",
    slotKey: row.slot_key ?? undefined,
  };
}

/** Cover folosit cand un template din DB n-are cover_url — asset bundlat. */
const FALLBACK_COVER = fallbackCover;
