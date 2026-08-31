import {
  renderReelInBrowser,
  renderOverlay,
  FILTERS,
  TEXT_PRESETS,
  type ConcatProgress,
  type TextLayer,
} from "@reelcoach/core";
import type { PlannedClip } from "./output-plan";
import { getPhoto } from "./clip-store";
import { renderPhoto, STORY_SIZE } from "./render-photo";

/**
 * Randarea unei povești.
 *
 * O poveste e UN singur moment, pe tot ecranul. Nu e un reel mai scurt: n-are
 * montaj, n-are tranziții, n-are ce lega de ce urmează — următoarea poveste e
 * alt fișier, postat separat.
 *
 * DOUĂ CĂI, după ce a filmat stilista:
 *
 *   poză   → PNG desenat într-o clipă, ca la carusel
 *   filmare → un clip randat, cel mai ieftin reel posibil (fără tranziții,
 *             fără intro, fără Ken Burns)
 *
 * Care din ele se alege NU e o setare: dacă momentul are poză, e poză. Iar
 * momentul are poză exact atunci când partenera a proiectat povestea aia cu o
 * imagine — cererea ei ajunge la stilistă prin `capture_kind`, iar de aici se
 * întoarce ca rezultat. Nimeni nu alege de două ori.
 */
export interface RenderedStory {
  blob: Blob;
  url: string;
  /** Filmare sau imagine — decide extensia și felul partajării. */
  isVideo: boolean;
}

export async function renderStory(
  planned: PlannedClip,
  scenarioId: string,
  onProgress?: (p: ConcatProgress) => void,
): Promise<RenderedStory> {
  const photo = await getPhoto(scenarioId, planned.sceneIdx);

  // Poveste-imagine: aceeași cale ca la carusel, doar alt format.
  if (photo?.blob) {
    const { blob, url } = await renderPhoto(planned, scenarioId, STORY_SIZE);
    return { blob, url, isVideo: false };
  }

  // Poveste-filmare: un singur clip. Tot ce ține de montaj e stins.
  const layers = (planned.textLayers as TextLayer[] | undefined) ?? [];
  const presetId = planned.scene?.captionPreset || "hookBold";
  const overlay =
    layers.length > 0
      ? await renderOverlay({
          textLayers: layers,
          preset: TEXT_PRESETS[presetId] ?? TEXT_PRESETS.hookBold,
          width: STORY_SIZE.w,
          height: STORY_SIZE.h,
        })
      : undefined;

  const blob = await renderReelInBrowser(
    [
      {
        ...planned.clip,
        finalUsageDuration: planned.sec ?? planned.clip.finalUsageDuration,
      },
    ],
    {
      width: STORY_SIZE.w,
      height: STORY_SIZE.h,
      fps: 30,
      filter: FILTERS[(planned.filterId ?? "none") as keyof typeof FILTERS] ?? FILTERS.none,
      filters: [FILTERS[(planned.filterId ?? "none") as keyof typeof FILTERS] ?? undefined],
      effectIds: [planned.effectId],
      effectParams: [planned.fxParams],
      playbackSpeeds: [planned.playbackSpeed],
      motionBlurs: [planned.motionBlur],
      overlays: [overlay],
      // Nimic din ce leagă două momente: o poveste n-are „următorul".
      effects: { transitions: false, kenBurns: false, intro: false },
    },
    onProgress,
  );

  return { blob, url: URL.createObjectURL(blob), isVideo: true };
}
