import { renderPreviewFrame, FILTERS, type TextLayer } from "@reelcoach/core";
import type { PlannedClip } from "./output-plan";
import { getPhoto, type StoredPhoto } from "./clip-store";

/**
 * Randarea unei postări-imagine.
 *
 * ════════════════════════════════════════════════════════════════════
 *  DE CE E ALTĂ CALE DECÂT REEL-UL, ȘI DE CE E O VESTE BUNĂ
 * ════════════════════════════════════════════════════════════════════
 *
 * Un reel se randează în TIMP REAL prin MediaRecorder: 20 de secunde de reel
 * costă 20 de secunde de așteptare, iar cadrele pierdute nu se recuperează.
 * O imagine n-are timp. Se desenează o dată și se scoate ca fișier — patru
 * poze costă milisecunde, nu minute.
 *
 * Consecința pentru produs: caruselul e practic gratis la finalul programării,
 * exact când stilista n-are răbdare. De asta merită scos primul dintre cele
 * trei rezultate care lipseau.
 *
 * FORMATUL e 1080×1350 — 4:5, portretul de Instagram și Facebook. Același
 * raport ca în editorul partenerei, deci ce a văzut ea e ce iese.
 *
 * SURSA e poza, dacă momentul a fost fotografiat. Dacă n-a fost — un moment
 * marcat doar „filmare" ajuns totuși într-un carusel — se cade pe un cadru
 * din filmare. Iese mai slab (un cadru extras din video e mai moale decât o
 * poză), dar iese: mai bine un carusel imperfect decât niciunul.
 */
/** Postare-imagine: 4:5, portretul de Instagram și Facebook. */
export const PHOTO_SIZE = { w: 1080, h: 1350 };
/** Poveste: 9:16, ecranul întreg. */
export const STORY_SIZE = { w: 1080, h: 1920 };

/** Cât așteptăm după un cadru de video înainte să renunțăm la el. */
const SEEK_TIMEOUT_MS = 4000;

export interface RenderedPhoto {
  blob: Blob;
  /** Pentru afișare imediată; se revocă de apelant. */
  url: string;
}

/**
 * Desenează un moment ca postare-imagine.
 *
 * Trece prin `renderPreviewFrame`, ca tot restul — deci filtrul, efectul și
 * textul arată identic cu ce a văzut partenera. „Preview = export" ține și
 * aici, doar că exportul e un PNG, nu un MP4.
 */
export async function renderPhoto(
  planned: PlannedClip,
  scenarioId: string,
  size: { w: number; h: number } = PHOTO_SIZE,
): Promise<RenderedPhoto> {
  const canvas = document.createElement("canvas");
  canvas.width = size.w;
  canvas.height = size.h;

  const source = await loadSource(planned, scenarioId);
  try {
    renderPreviewFrame(canvas, source.el as HTMLVideoElement, {
      filter: FILTERS[planned.filterId as keyof typeof FILTERS] ?? FILTERS.none,
      effectId: planned.effectId,
      textLayers:
        planned.textLayers && planned.textLayers.length > 0
          ? (planned.textLayers as TextLayer[])
          : undefined,
    });
  } finally {
    source.cleanup();
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    // PNG, nu JPEG: textul partenerei are muchii curate, iar un JPEG la
    // calitate mare nu e mai mic decât un PNG pe imagini cu text peste.
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Nu am putut scoate imaginea."))), "image/png");
  });

  return { blob, url: URL.createObjectURL(blob) };
}

/** Poza momentului dacă există; altfel un cadru din filmarea lui. */
async function loadSource(
  planned: PlannedClip,
  scenarioId: string,
): Promise<{ el: HTMLImageElement | HTMLVideoElement; cleanup: () => void }> {
  const photo: StoredPhoto | undefined = await getPhoto(scenarioId, planned.sceneIdx);

  if (photo?.blob) {
    const url = URL.createObjectURL(photo.blob);
    const img = new Image();
    img.src = url;
    await img.decode().catch(() => {});
    return { el: img, cleanup: () => URL.revokeObjectURL(url) };
  }

  // Fără poză: un cadru din mijlocul filmării. Mai moale decât o poză, dar
  // un carusel imperfect bate un carusel inexistent.
  const url = URL.createObjectURL(planned.clip.blob);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  await new Promise<void>((resolve) => {
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    const onLoaded = () => {
      const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
      if (dur === 0) { finish(); return; }
      video.addEventListener("seeked", finish, { once: true });
      try { video.currentTime = dur / 2; } catch { finish(); }
    };
    video.addEventListener("loadeddata", onLoaded, { once: true });
    video.addEventListener("error", finish, { once: true });
    window.setTimeout(finish, SEEK_TIMEOUT_MS);
  });

  return {
    el: video,
    cleanup: () => { video.removeAttribute("src"); video.load(); URL.revokeObjectURL(url); },
  };
}
