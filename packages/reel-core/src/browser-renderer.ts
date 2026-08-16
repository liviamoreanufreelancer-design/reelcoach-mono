import type { ConcatProgress } from "./render-progress";
import type { FilterPreset } from "./filters";
import { FILTERS } from "./filters";
import type { TransitionId } from "./transitions";
import type { FxParams, ClipMotion } from "./fx/types";
import { findTransition, findClipEffect, findTransform } from "./fx/registry";
import { drawPremiumEffect } from "./fx/effects/legacy";
import { fadeTransition } from "./fx/transitions/legacy";
import { drawCaption, drawTextLayers, makeSurface, type Caption, type TextLayer } from "./overlay-renderer";
import { TEXT_PRESETS } from "./text-presets";

/**
 * App-agnostic clip input contract for the renderer. Any source — the mobile
 * IndexedDB `StoredClip`, a Studio `File` upload, etc. — only needs to provide
 * these fields. The renderer never reaches into app-specific types, so the
 * same engine runs unchanged in both apps (this is the reel-core boundary).
 *   blob               the video data (a File is a Blob, so uploads fit directly)
 *   duration           recorded length, in seconds
 *   finalUsageDuration optional auto-trim target (kept from the middle)
 */
export interface RenderClipInput {
  blob: Blob;
  duration: number;
  finalUsageDuration?: number;
}

export interface SimpleEffects {
  /** Soft cross-fade between scenes (250ms). */
  transitions?: boolean;
  /** Very subtle Ken Burns (1.0 → 1.04). */
  kenBurns?: boolean;
  /** Brand intro card (1s + 250ms fade). */
  intro?: boolean;
}

export interface BrowserRenderOptions {
  overlays?: (Blob | undefined)[];
  introPng?: Blob;
  outroPng?: Blob;
  outroDuration?: number;
  introDuration?: number;
  transitionDuration?: number;
  /** Which transition style to use between scenes. Defaults to fade. */
  transitionType?: TransitionId;
  /**
   * Per-clip transition type. Indexed by clip order — clip i's transition is
   * the one OUT of clip i (to clip i+1). Falls back to `transitionType` if
   * the per-clip value is undefined.
   */
  transitionTypes?: (TransitionId | undefined)[];
  /**
   * Parametrii tranziției care IESE din clipul i (punct de zoom, direcție,
   * intensitate). Stau în `slots` ca jsonb, deci un efect nou nu cere
   * migrație. Absenți = implicitele efectului.
   */
  transitionParams?: (FxParams | undefined)[];
  /** Parametrii efectului de clip, la fel. */
  effectParams?: (FxParams | undefined)[];
  width?: number;
  height?: number;
  fps?: number;
  effects?: SimpleEffects;
  /** Color filter applied to each clip frame (does not affect overlays). */
  filter?: FilterPreset;
  /**
   * Per-clip color filter. Indexed by clip order. Each clip can have its
   * own filter (e.g. clip 0 = champagne, clip 1 = cinema). Falls back to
   * the global `filter` if a per-clip value is undefined.
   */
  filters?: (FilterPreset | undefined)[];
  /**
   * Per-clip premium effect ids ("sparkle"/"leak"/"bokeh"/"dust"/"none").
   * Indexed by clip order. Use `effectsEnabled: false` to disable all.
   */
  effectIds?: (string | undefined)[];
  /** Master switch — when false, no effects render even if effectIds set. */
  effectsEnabled?: boolean;
  /**
   * Per-clip playback speed (1.0 = normal, 0.5 = slow motion, 2.0 = fast).
   * Affects how long the clip plays in the final reel: slow motion makes
   * the clip last longer; fast forward shortens it.
   */
  playbackSpeeds?: (number | undefined)[];
  /**
   * Per-clip motion blur flag. When true, applies a frame-blending effect
   * to the clip for a cinematic motion-heavy look.
   */
  motionBlurs?: (boolean | undefined)[];
}

type LoadedImage = { image: CanvasImageSource; cleanup: () => void };

/**
 * Un moment capturat, gata de desenat. Poate fi o FILMARE sau o POZĂ.
 *
 * Pozele sunt momente de sine stătătoare (before, after, detaliu de culoare) —
 * un cadru extras dintr-un video iese neclar, de asta se capturează separat.
 *
 * `source` e ce se desenează (identic pentru ambele — `drawCover`/`getDims`
 * tratează deja și video, și imagine). `video` e prezent DOAR la filmări:
 * pozele n-au redare, seek, decodor sau pre-roll, deci tot codul care le
 * atinge trebuie să verifice întâi.
 */
type LoadedClip = {
  source: CanvasImageSource;
  video: HTMLVideoElement | null;
  duration: number;
  cleanup: () => void;
};

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function getOutputMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "video/mp4;codecs=avc1.640034", // H.264 High @ L5.2 (1080p+)
    "video/mp4;codecs=avc1.4d4034", // H.264 Main @ L5.2
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((mime) => MediaRecorder.isTypeSupported(mime));
}

function getDims(source: CanvasImageSource): { w: number; h: number } {
  const c = source as HTMLVideoElement & HTMLImageElement & ImageBitmap & HTMLCanvasElement;
  return {
    w: c.videoWidth || c.naturalWidth || c.width,
    h: c.videoHeight || c.naturalHeight || c.height,
  };
}

type KenBurnsVariant = "zoom-in" | "zoom-out" | "static";
function pickKenBurns(idx: number): KenBurnsVariant {
  const v: KenBurnsVariant[] = ["zoom-in", "static", "zoom-out", "static"];
  return v[idx % v.length];
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  zoom = 1,
) {
  const { w: sw, h: sh } = getDims(source);
  if (!sw || !sh) return;
  const baseScale = Math.max(width / sw, height / sh);
  const scale = baseScale * zoom;
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (width - dw) / 2;
  const dy = (height - dh) / 2;
  ctx.drawImage(source, dx, dy, dw, dh);
}

function drawContain(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
) {
  const { w: sw, h: sh } = getDims(source);
  if (!sw || !sh) return;
  const s = Math.min(width / sw, height / sh);
  const dw = sw * s, dh = sh * s;
  ctx.drawImage(source, (width - dw) / 2, (height - dh) / 2, dw, dh);
}

function drawClipFrame(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  width: number,
  height: number,
  variant: KenBurnsVariant,
  t: number,
  enableKenBurns: boolean,
  filter: FilterPreset,
  /**
   * Mișcarea cerută de un efect de tip `transform` (ex. Photo → Motion).
   * Când e prezentă, bate Ken Burns-ul automat: unul e alegerea partenerei,
   * celălalt e o valoare aleasă după indexul clipului.
   */
  motion?: ClipMotion,
) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  // Apply CSS filter to the video draw only.
  // "Auto-enhance" subtil aplicat mereu (look CapCut fara AI): contrast + saturatie
  // + luminozitate usoara. Se compune cu filtrul partenerei (CSS filters se inlantuie).
  const prevFilter = ctx.filter;
  const ENHANCE = "contrast(1.08) saturate(1.12) brightness(1.02)";
  const partnerFilter = filter.cssFilter && filter.cssFilter !== "none" ? filter.cssFilter : "";
  // Estomparea cerută de un transform (Focus Pull) se adaugă în ACELAȘI lanț,
  // deci nu costă nicio desenare în plus. Sub 0,1px n-o mai punem: un filtru
  // inutil în lanț tot forțează o trecere de compunere.
  const blur = motion?.blurPx && motion.blurPx > 0.1
    ? `blur(${((motion.blurPx * width) / 1080).toFixed(2)}px)`
    : "";
  ctx.filter = `${ENHANCE} ${partnerFilter} ${blur}`.trim();

  let zoom = 1;
  if (motion) {
    zoom = motion.scale;
  } else if (enableKenBurns && variant !== "static") {
    const e = easeInOut(clamp01(t));
    if (variant === "zoom-in") zoom = 1.0 + 0.04 * e;
    else if (variant === "zoom-out") zoom = 1.04 - 0.04 * e;
  }
  if (motion && (motion.dx !== 0 || motion.dy !== 0)) {
    // Deplasarea e în fracțiuni de cadru, ca efectul să nu știe rezoluția.
    ctx.save();
    ctx.translate(motion.dx * width, motion.dy * height);
    drawCover(ctx, source, width, height, zoom);
    ctx.restore();
  } else {
    drawCover(ctx, source, width, height, zoom);
  }

  ctx.filter = prevFilter;

  // Optional tint
  if (filter.tint) {
    ctx.save();
    ctx.globalAlpha = filter.tint.alpha;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = filter.tint.color;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // Optional vignette
  if (filter.vignette && filter.vignette > 0) {
    ctx.save();
    const g = ctx.createRadialGradient(
      width / 2, height / 2, width * 0.4,
      width / 2, height / 2, width * 0.85,
    );
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${filter.vignette})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  // Optional hair-gloss / highlight boost — soft white overlay using
  // "screen" composite. This only affects brighter areas (where hair
  // shine and skin highlights live), leaving shadows untouched.
  // Approximates a highlight boost without face/hair detection.
  if (filter.highlightBoost && filter.highlightBoost > 0) {
    ctx.save();
    ctx.globalAlpha = filter.highlightBoost;
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = "rgba(255, 250, 240, 1)";
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}

// ---------- Asset loaders ----------

async function loadImage(blob?: Blob): Promise<LoadedImage | undefined> {
  if (!blob) return undefined;
  if (typeof createImageBitmap !== "undefined") {
    try {
      const bm = await createImageBitmap(blob);
      return { image: bm, cleanup: () => bm.close() };
    } catch { /* ignore */ }
  }
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("Nu pot decoda imaginea."));
  });
  return { image: img, cleanup: () => URL.revokeObjectURL(url) };
}

/**
 * Încarcă un moment capturat, filmare sau poză, după tipul blob-ului.
 * Necunoscut sau lipsă → tratat ca filmare (comportamentul de dinainte).
 */
async function loadClip(clip: RenderClipInput, index: number): Promise<LoadedClip> {
  if (clip.blob?.type?.startsWith("image/")) return loadPhotoClip(clip, index);
  return loadVideoClip(clip, index);
}

/** Poză: fără redare, fără decodor. Durata e cea cerută de montaj. */
async function loadPhotoClip(clip: RenderClipInput, index: number): Promise<LoadedClip> {
  const loaded = await loadImage(clip.blob);
  if (!loaded) throw new Error(`Nu pot citi poza ${index + 1}.`);
  // O poză n-are durată proprie: cât stă pe ecran e decizie de montaj.
  const duration = Math.max(0.3, clip.finalUsageDuration || clip.duration || 2);
  return { source: loaded.image, video: null, duration, cleanup: loaded.cleanup };
}

async function loadVideoClip(clip: RenderClipInput, index: number): Promise<LoadedClip> {
  const url = URL.createObjectURL(clip.blob);
  const video = document.createElement("video");
  video.src = url;
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  video.setAttribute("muted", "");
  video.setAttribute("playsinline", "");
  Object.assign(video.style, {
    position: "fixed", left: "-9999px", top: "0",
    width: "1px", height: "1px", opacity: "0.001", pointerEvents: "none",
  });
  document.body.appendChild(video);

  await new Promise<void>((res, rej) => {
    const onMeta = () => { video.removeEventListener("loadedmetadata", onMeta); res(); };
    video.addEventListener("loadedmetadata", onMeta);
    video.onerror = () => rej(new Error(`Nu pot citi clipul ${index + 1}.`));
  });

  const duration = Math.max(0.3, video.duration || clip.duration || 0.3);
  return {
    source: video,
    video,
    duration,
    cleanup: () => {
      try { video.pause(); } catch { /* ignore */ }
      video.remove();
      URL.revokeObjectURL(url);
    },
  };
}

/**
 * Pre-încălzește un clip: caută poziția de start și așteaptă până când există
 * un cadru DECODAT acolo.
 *
 * Fără asta, primele cadre ale fiecărei scene ieșeau NEGRE: `loadVideoClip`
 * aștepta doar `loadedmetadata` (readyState 1 = fără cadru), iar `ensurePlaying`
 * seta `currentTime` și chema `play()` — ambele asincrone — după care se desena
 * imediat. `drawImage` pe un video fără cadru decodat pictează negru. Se vedea
 * ca un flash negru înainte de fiecare scenă, la orice tranziție.
 */
function primeClip(video: HTMLVideoElement, seekSec: number): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      video.removeEventListener("seeked", finish);
      video.removeEventListener("loadeddata", finish);
      clearTimeout(timer);
      resolve();
    };
    // Plasă de siguranță: dacă browserul nu emite niciun eveniment (fișier
    // ciudat, codec lent), mergem mai departe în loc să blocăm exportul.
    const timer = setTimeout(finish, 2500);
    video.addEventListener("seeked", finish);
    video.addEventListener("loadeddata", finish);
    try {
      video.currentTime = seekSec;
    } catch {
      finish();
      return;
    }
    // Dacă era deja exact la poziția cerută ȘI are cadru, "seeked" nu mai vine.
    if (video.readyState >= 2 && Math.abs(video.currentTime - seekSec) < 0.05) finish();
  });
}

function createRenderCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  Object.assign(canvas.style, {
    position: "fixed", left: "-9999px", top: "0",
    width: "1px", height: "1px", opacity: "0.001", pointerEvents: "none",
  });
  document.body.appendChild(canvas);
  return canvas;
}

function createRecorder(canvas: HTMLCanvasElement, fps: number) {
  if (typeof canvas.captureStream !== "function") {
    throw new Error("Browserul tău nu poate exporta video direct din editor.");
  }
  if (typeof MediaRecorder === "undefined") {
    throw new Error("Browserul tău nu suportă export video din editor.");
  }
  const mimeType = getOutputMimeType();
  const stream = canvas.captureStream(fps);
  // Scale bitrate with resolution: ~0.30 bits/pixel/frame → premium quality at 1080p.
  // Higher target because iOS MediaRecorder compresses more aggressively than requested.
  const pixels = canvas.width * canvas.height;
  const bitrate = Math.min(30_000_000, Math.max(12_000_000, Math.round(pixels * fps * 0.30)));
  const chunks: BlobPart[] = [];
  const recorder = mimeType
    ? new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitrate })
    : new MediaRecorder(stream, { videoBitsPerSecond: bitrate });

  recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onerror = (event) =>
      reject((event as ErrorEvent).error ?? new Error("Exportul video a eșuat."));
    recorder.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      resolve(new Blob(chunks, { type: mimeType ?? (recorder.mimeType || "video/webm") }));
    };
  });

  recorder.start(250);
  return { recorder, done };
}

// ---------- Main ----------

export async function renderReelInBrowser(
  clips: RenderClipInput[],
  opts: BrowserRenderOptions = {},
  onProgress?: (p: ConcatProgress) => void,
): Promise<Blob> {
  const width = opts.width ?? 540;
  const height = opts.height ?? 960;
  const fps = opts.fps ?? 24;
  const frameDur = 1000 / fps;
  const effects: Required<SimpleEffects> = {
    transitions: true,
    kenBurns: true,
    intro: true,
    ...(opts.effects ?? {}),
  };
  const filter = opts.filter ?? FILTERS.none;
  // Per-clip filters: each scene can have its own filter (champagne, cinema,
  // warm, etc.) as set in Studio. Falls back to the global filter for any
  // clip that doesn't specify one.
  const perClipFilters: (FilterPreset | undefined)[] = opts.filters ?? [];
  // Per-clip transitions and other dimensions — wired up similarly.
  const perClipTransitions: (TransitionId | undefined)[] = opts.transitionTypes ?? [];
  const transitionParams: (FxParams | undefined)[] = opts.transitionParams ?? [];
  const effectParams: (FxParams | undefined)[] = opts.effectParams ?? [];
  const perClipPlaybackSpeeds: (number | undefined)[] = opts.playbackSpeeds ?? [];
  const perClipMotionBlurs: (boolean | undefined)[] = opts.motionBlurs ?? [];


  const introMs = effects.intro && opts.introPng ? (opts.introDuration ?? 0.9) * 1000 : 0;
  const outroMs = opts.outroPng ? (opts.outroDuration ?? 1.4) * 1000 : 0;
  const transitionType: TransitionId = opts.transitionType ?? "fade";
  /** Vezi comentariul de la drawClipWithOverlay: unde se duce timpul. */
  const cost = { clip: 0, trans: 0, overlay: 0 };

  const transMs = effects.transitions ? (opts.transitionDuration ?? 0.25) * 1000 : 0;

  /**
   * Durata tranziției care IESE din clipul `i`.
   *
   * Era o singură valoare pentru tot reel-ul, deși fiecare tranziție își
   * declară durata în catalog. Consecința: un Zoom Through gândit pentru
   * 560ms rula în 250ms — la 30fps, 7 cadre în loc de 17. Mișcarea nu era
   * „rapidă", era SĂRITĂ, și exact tranzițiile cu mișcare multă (zoom, spin,
   * whip) sufereau cel mai tare, fiindcă au cel mai mult de parcurs.
   *
   * Acum fiecare tranziție rulează cât a fost proiectată. Valoarea globală
   * rămâne implicitul, pentru clipurile care n-au una proprie.
   */
  const transMsAt = (i: number): number => {
    if (!effects.transitions) return 0;
    const id = perClipTransitions[i];
    const def = id ? findTransition(id) : undefined;
    return def ? def.durationMs : transMs;
  };
  const effectsEnabled = opts.effectsEnabled ?? true;
  const effectIds = opts.effectIds ?? [];

  const canvas = createRenderCanvas(width, height);
  const ctxOrNull = canvas.getContext("2d", { alpha: false });
  if (!ctxOrNull) throw new Error("Nu pot porni canvas-ul pentru export.");
  const ctx: CanvasRenderingContext2D = ctxOrNull;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";

  onProgress?.({ phase: "loading", pct: 0, message: "Pregătesc exportul…" });

  const overlayImgs = await Promise.all((opts.overlays ?? []).map((b) => loadImage(b)));
  const introImg = await loadImage(opts.introPng);
  const outroImg = await loadImage(opts.outroPng);

  const loadedClips: LoadedClip[] = [];
  for (let i = 0; i < clips.length; i++) {
    onProgress?.({
      phase: "loading",
      pct: Math.round((i / Math.max(1, clips.length)) * 12),
      message: `Pregătesc clipul ${i + 1}/${clips.length}…`,
    });
    loadedClips.push(await loadClip(clips[i], i));
  }

  // ── Auto-trim ─────────────────────────────────────────────────────
  // Each clip plays for `finalUsageDuration` seconds (the spec's "auto-trim
  // the best parts"), taken from the MIDDLE of the recording — the start
  // has setup wobble and the end has stop-anxiety, so the middle is the
  // most stable cadre. If a clip has no finalUsageDuration the whole clip
  // plays (legacy behaviour, zero regression).
  // Per-clip playback speed (slow-mo / fast-mo) from Studio. Undefined or
  // <= 0 resolves to 1× → byte-identical to legacy behaviour (zero regression).
  const speedOf = (i: number) => {
    const s = perClipPlaybackSpeeds[i];
    return typeof s === "number" && s > 0 ? Math.max(0.25, Math.min(4, s)) : 1;
  };
  // Footage actually consumed from each recording — the auto-trim window taken
  // from the MIDDLE. Independent of playback speed (same content either way).
  const sourceWindowMs = loadedClips.map((c, i) => {
    const recordedMs = Math.max(300, c.duration * 1000);
    const targetSec = clips[i]?.finalUsageDuration;
    if (!targetSec || targetSec <= 0) return recordedMs;
    return Math.min(recordedMs, Math.max(300, targetSec * 1000));
  });
  // ON-SCREEN duration = footage window ÷ speed. At 0.5× the same footage
  // lingers twice as long (true slow-motion); at 2× it plays in half the time.
  const clipDursMs = loadedClips.map((_, i) => sourceWindowMs[i] / speedOf(i));
  const clipStartOffsetMs = loadedClips.map((c, i) => {
    // Poză: nu există „mijloc" de decupat și nici unde să cauți. Mereu 0 —
    // ceea ce face automat și pre-roll-ul zero (nu are ce porni în avans).
    if (!c.video) return 0;
    const recordedMs = Math.max(0, c.duration * 1000);
    return Math.max(0, (recordedMs - sourceWindowMs[i]) / 2);
  });
  const clipsTotal = clipDursMs.reduce((a, b) => a + b, 0);
  const transitionsCount = Math.max(0, loadedClips.length - 1);
  const outroOverlap = outroImg && transMs ? transMs : 0;
  // Suprapunerile diferă acum de la o tranziție la alta, deci se însumează.
  let overlapTotal = 0;
  for (let i = 0; i < transitionsCount; i++) overlapTotal += transMsAt(i);
  const totalMs = introMs + clipsTotal - overlapTotal + outroMs - outroOverlap;

  // ── Bugetul de decodoare video ────────────────────────────────────────
  // WebKit poate decoda doar câteva videouri simultan, iar randarea merge în
  // TIMP REAL: dacă bucla nu ține pasul, cadrele se pierd definitiv.
  // De aceea ținem în viață doar clipurile de pe ecran (cel activ + cel care
  // intră în tranziție) și îl pregătim din timp doar pe următorul.
  const primed = loadedClips.map(() => false);

  // ── Pre-roll ──────────────────────────────────────────────────────────
  // Pornirea unui <video> pus pe pauză NU e instantanee: decodorul are nevoie
  // de zeci-sute de ms. Dacă chemăm play() exact când scena intră pe ecran,
  // bucla desenează același cadru până pornește redarea — se vede ca un blocaj
  // la începutul fiecărei scene (exact ce a rămas după ce am scăpat de negru).
  //
  // Soluție: pornim redarea cu PREROLL_MS înainte, căutând înapoi cu exact cât
  // va avansa videoul în acest timp. Când scena intră, rulează deja ȘI e la
  // poziția corectă. Posibil doar dacă există spațiu înaintea ferestrei de trim
  // (offset > 0); altfel rămâne comportamentul de dinainte, fără regres.
  const PREROLL_MS = 500;
  const prerolled = loadedClips.map(() => false);

  /**
   * Cu cât timp real putem porni clipul mai devreme (0 = fără spațiu).
   * Limitat de DOUĂ resurse: cât material există înaintea ferestrei de trim,
   * și cât timp real există înainte ca scena să intre pe ecran (pentru prima
   * scenă fără intro, al doilea e zero — nu ai unde s-o pornești mai devreme).
   */
  const prerollLeadMs = (idx: number) =>
    Math.max(0, Math.min(
      PREROLL_MS,
      clipStartOffsetMs[idx] / speedOf(idx),
      clipStarts[idx],
    ));

  /** Poziția din sursă (sec) de unde începe redarea clipului, cu tot cu pre-roll. */
  const startPosSec = (idx: number) =>
    Math.max(0, clipStartOffsetMs[idx] - prerollLeadMs(idx) * speedOf(idx)) / 1000;

  /**
   * Clipul aflat ACUM în fereastra lui de pre-roll (-1 dacă niciunul).
   *
   * Întoarce clipul indiferent dacă a fost deja pornit — altfel, la cadrul
   * următor după pornire, `releaseInactive` l-ar pune imediat pe pauză
   * (nu e nici activ, nici următorul) și pre-roll-ul n-ar folosi la nimic.
   * Pornirea efectivă e protejată separat, în `startPreroll`.
   */
  const prerollTarget = (tMs: number) => {
    for (let i = 0; i < loadedClips.length; i++) {
      const lead = prerollLeadMs(i);
      if (lead <= 0) continue;
      if (tMs >= clipStarts[i] - lead && tMs < clipStarts[i]) return i;
    }
    return -1;
  };

  /**
   * Pornește redarea în avans. NU caută nimic: poziția e deja cea corectă,
   * fixată de pre-încălzire (`startPosSec`). Un seek aici ar arunca exact
   * cadrul decodat pe care ne bazăm.
   */
  const startPreroll = (idx: number) => {
    if (idx < 0 || prerolled[idx]) return;
    prerolled[idx] = true;
    const lc = loadedClips[idx];
    if (!lc.video) return; // poză: nimic de pornit
    try { lc.video.playbackRate = speedOf(idx); } catch { /* ignore */ }
    lc.video.play().catch(() => { /* ignore */ });
  };

  /**
   * Pre-încălzește un clip la poziția lui de pornire — DEVREME, cu o scenă
   * înainte, și pentru TOATE clipurile.
   *
   * Cele două mecanisme sunt separate intenționat: pre-încălzirea (devreme)
   * garantează că există un cadru decodat, deci niciodată negru; pre-roll-ul
   * (târziu) pornește redarea, deci niciodată înghețat. Când erau legate,
   * clipurile cu offset mic pierdeau garanția cadrului și primeau un pre-roll
   * prea scurt ca seek-ul să apuce să termine — adică exact negru.
   */
  const primeAhead = (idx: number) => {
    if (idx < 0 || idx >= loadedClips.length || primed[idx]) return;
    primed[idx] = true;
    // Fire-and-forget: are la dispoziție toată durata clipului curent.
    const v = loadedClips[idx].video;
    if (!v) return; // poză: deja decodată la încărcare
    void primeClip(v, startPosSec(idx));
  };

  /** Oprește clipurile care nu mai sunt pe ecran, ca să elibereze decodoare. */
  const releaseInactive = (keepA: number, keepB: number, keepC: number) => {
    for (let i = 0; i < loadedClips.length; i++) {
      if (i === keepA || i === keepB || i === keepC) continue;
      const v = loadedClips[i].video;
      if (!v) continue; // poză: nu ocupă decodor
      if (!v.paused) {
        try { v.pause(); } catch { /* ignore */ }
      }
    }
  };

  const snap = document.createElement("canvas");
  snap.width = width; snap.height = height;
  const snapCtx = snap.getContext("2d")!;

  const incoming = document.createElement("canvas");
  incoming.width = width; incoming.height = height;
  const incomingCtx = incoming.getContext("2d")!;

  // Per-clip motion-blur trail buffers (feedback accumulation). Populated
  // lazily, only for clips where Studio enabled motion blur.
  const prevFrameByClip = new Map<number, HTMLCanvasElement>();

  const variants = loadedClips.map((_, i) => (effects.kenBurns ? pickKenBurns(i) : "static" as KenBurnsVariant));

  const clipStarts: number[] = [];
  let cursor = introMs;
  for (let i = 0; i < loadedClips.length; i++) {
    clipStarts.push(cursor);
    cursor += clipDursMs[i] - (i < loadedClips.length - 1 ? transMsAt(i) : 0);
  }
  const outroStart = outroImg ? cursor - outroOverlap : Infinity;
  let outroSnapTaken = false;

  // Pre-încălzirea trebuie să vină DUPĂ `clipStarts` — `startPosSec` depinde de
  // el prin `prerollLeadMs`. Prima scenă are nevoie de cadru înainte de primul
  // frame randat; restul se pregătesc din mers, cu o scenă în avans.
  onProgress?.({ phase: "loading", pct: 13, message: "Pregătesc prima scenă…" });
  if (loadedClips.length > 0) {
    primed[0] = true;
    const v0 = loadedClips[0].video;
    if (v0) await primeClip(v0, startPosSec(0));
    primeAhead(1);
  }

  let frameIdx = 0;

  // Prima scenă nu are "scenă anterioară" în care să fie pre-rolată. Dacă nu
  // există intro, o pornim exact înainte de buclă, ca să nu înceapă înghețată.
  // (Cu intro, o prinde pre-roll-ul normal în timpul acestuia.)
  if (introMs === 0 && loadedClips.length > 0) {
    prerolled[0] = true;
    const first = loadedClips[0].video;
    if (first) {
      try { first.playbackRate = speedOf(0); } catch { /* ignore */ }
      first.play().catch(() => { /* ignore */ });
    }
  }

  // Desenăm primul cadru ÎNAINTE de a porni recorderul.
  //
  // `createRecorder` cheamă `recorder.start()` pe loc, dar primul `drawAt` vine
  // abia pe următorul macrotask — plus costul lui real, care pe surse 4K trece
  // de 100ms. Până atunci canvasul nu a fost desenat NICIODATĂ, iar un canvas
  // proaspăt cu `alpha:false` e NEGRU. Exact acele cadre ajungeau la începutul
  // reel-ului. Desenând întâi, recorderul pornește peste o imagine validă.
  drawAt(0);

  const { recorder, done } = createRecorder(canvas, fps);

  try {
    const t0 = performance.now();
    let lastDrawn = -1;
    // Raportarea progresului e THROTTLED. Inainte se chema la fiecare cadru
    // desenat: in mobile asta inseamna setProgress() -> re-render React al
    // intregului ecran de editare, de 30 de ori pe secunda, exact in timpul
    // randarii in timp real. Concura cu bucla pentru main thread => cadre
    // desenate tarziu => captureStream captura acelasi continut de doua ori
    // => video sacadat. La 200ms UI-ul arata la fel de fluid, dar costa ~6x mai putin.
    let lastProgressMs = -Infinity;

    await new Promise<void>((resolve, reject) => {
      const tick = () => {
        try {
          const tMs = performance.now() - t0;
          if (tMs >= totalMs) {
            drawAt(totalMs - 1);
            resolve();
            return;
          }
          if (tMs - lastDrawn >= frameDur * 0.9) {
            drawAt(tMs);
            lastDrawn = tMs;
            frameIdx++;
            if (tMs - lastProgressMs >= 200) {
              lastProgressMs = tMs;
              const pct = Math.min(98, 12 + (tMs / totalMs) * 86);
              onProgress?.({
                phase: "encoding",
                pct,
                message: `Randez · ${Math.round((tMs / totalMs) * 100)}%`,
              });
            }
          }
          setTimeout(tick, frameDur / 2);
        } catch (err) { reject(err); }
      };
      setTimeout(tick, 0);
    });

    onProgress?.({ phase: "reading", pct: 99, message: "Finalizez video-ul…" });
    await wait(150);
    recorder.stop();
    const blob = await done;
    // Cadre efectiv desenate vs. tinta. Randarea e in TIMP REAL: daca bucla nu
    // tine pasul, captureStream capteaza acelasi continut de doua ori si
    // rezultatul e sacadat. Numarul asta spune daca sacadarea vine de aici
    // (fps efectiv mult sub tinta) sau din altceva (encoder, bitrate, device).
    const elapsedSec = Math.max(0.001, (performance.now() - t0) / 1000);
    console.log(
      `[render] ${frameIdx} cadre in ${elapsedSec.toFixed(1)}s = ` +
      `${(frameIdx / elapsedSec).toFixed(1)} fps efectiv (tinta ${fps}) · ` +
      `${width}x${height} · ${loadedClips.length} scene`,
    );
    // Defalcarea pe faze: ms totali si ms per cadru. Suma lor sub durata
    // totala inseamna ca restul s-a dus in decodare/encodare, nu in desen.
    const per = (v: number) => (v / Math.max(1, frameIdx)).toFixed(1);
    console.log(
      `[render] buget/cadru: clip ${per(cost.clip)}ms · tranzitie ${per(cost.trans)}ms · ` +
      `total desen ${per(cost.clip + cost.trans)}ms din ${(1000 / fps).toFixed(1)}ms disponibili`,
    );
    onProgress?.({ phase: "done", pct: 100, message: "Gata" });
    return blob;
  } finally {
    overlayImgs.forEach((o) => o?.cleanup());
    introImg?.cleanup();
    outroImg?.cleanup();
    loadedClips.forEach((c) => c.cleanup());
    canvas.remove();
  }

  /**
   * Unde se duce timpul, pe faze.
   *
   * Randarea merge in timp real, deci un cadru pierdut nu se recupereaza. Cand
   * fps-ul efectiv scade, singura intrebare utila e CE anume a depasit bugetul
   * — decodarea si gradarea clipului, tranzitia, sau textul. Fara cifrele
   * astea am fi reparat pe ghicite, ceea ce am si facut o data (trei runde de
   * presupuneri pe cadrele negre, cauza era alta).
   *
   * Costul masurarii: doua apeluri performance.now() per faza, sub o
   * microsecunda. Ramane pornit permanent — la zeci de efecte, intrebarea
   * "cat ma costa asta" se pune la fiecare.
   */
  function drawClipWithOverlay(idx: number, localMs: number, target: CanvasRenderingContext2D) {
    const _t0 = performance.now();
    try {
      return drawClipWithOverlayInner(idx, localMs, target);
    } finally {
      cost.clip += performance.now() - _t0;
    }
  }

  function drawClipWithOverlayInner(idx: number, localMs: number, target: CanvasRenderingContext2D) {
    const lc = loadedClips[idx];
    const tNorm = clamp01(localMs / clipDursMs[idx]);
    // Use per-clip filter if provided, otherwise fall back to the global one.
    // This is the seam that lets each scene have its own filter (champagne
    // on scene 1, cinema on scene 2, warm on scene 3, etc.) as set in
    // Studio rather than one filter applied to the whole reel.
    const clipFilter = perClipFilters[idx] ?? filter;
    // Un singur selector în Studio: dacă id-ul e o transformare, schimbă cum
    // se desenează cadrul; dacă e efect de clip, se pune peste (mai jos).
    const fxId = effectIds[idx];
    const transform = fxId ? findTransform(fxId) : undefined;
    const motion = transform
      ? transform.motion({
          ctx: target, localMs, clipMs: clipDursMs[idx], width, height,
          params: effectParams[idx] ?? {},
        })
      : undefined;
    drawClipFrame(target, lc.source, width, height, variants[idx], tNorm, effects.kenBurns, clipFilter, motion);
    // Per-clip motion blur: a decaying feedback trail of the CLIP FRAME only,
    // captured before effects/overlay so text captions and sparkles never
    // ghost. Off unless Studio enabled it for this scene → zero regression.
    if (perClipMotionBlurs[idx]) {
      const prev = prevFrameByClip.get(idx);
      if (prev) {
        target.save();
        target.globalAlpha = 0.35; // trail strength; decays over ~3 frames
        target.drawImage(prev, 0, 0, width, height);
        target.restore();
      }
      let buf = prevFrameByClip.get(idx);
      if (!buf) {
        buf = document.createElement("canvas");
        buf.width = width;
        buf.height = height;
        prevFrameByClip.set(idx, buf);
      }
      const bctx = buf.getContext("2d");
      if (bctx) {
        bctx.clearRect(0, 0, width, height);
        bctx.drawImage(target.canvas, 0, 0, width, height);
      }
    }
    // Premium effect overlay: between the clip frame and the text caption.
    // The text caption MUST stay on top so the hook stays readable.
    if (effectsEnabled) {
      const effectId = effectIds[idx];
      if (effectId && effectId !== "none") {
        // Întâi registry-ul (efectele noi, parametrizate); dacă id-ul nu e
        // acolo, cade pe catalogul istoric din drawPremiumEffect.
        // Transformările s-au aplicat deja, la desenarea cadrului — aici nu
        // mai au ce căuta, altfel s-ar desena de două ori.
        const fx = findTransform(effectId) ? undefined : findClipEffect(effectId);
        if (fx) {
          fx.draw({
            ctx: target,
            localMs,
            clipMs: clipDursMs[idx],
            width,
            height,
            params: effectParams[idx] ?? {},
          });
        } else if (!findTransform(effectId)) {
          drawPremiumEffect(target, effectId, localMs, clipDursMs[idx], width, height);
        }
      }
    }
    const ov = overlayImgs[idx];
    if (ov) target.drawImage(ov.image, 0, 0, width, height);
  }

  function drawAt(tMs: number) {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, width, height);

    // ---- Intro ----
    // Intro fades in (200ms), holds, then fades out to black. The first
    // clip is NOT previewed during the intro fade-out — it appears via
    // the normal single-clip path at tMs >= introMs, so it receives the
    // exact same filter compositing as every other clip. Mixing alpha
    // compositing with filter tint/vignette during fade-out subtly
    // shifted the first clip's appearance — keep paths consistent.
    if (introMs > 0 && tMs < introMs) {
      let alpha = 1;
      if (tMs < 200) alpha = easeInOut(tMs / 200);
      else if (tMs > introMs - transMs && transMs > 0) {
        const o = clamp01((tMs - (introMs - transMs)) / transMs);
        alpha = 1 - easeInOut(o);
      }
      if (introImg) {
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(introImg.image, 0, 0, width, height);
        ctx.restore();
      }
      return;
    }

    // ---- Outro cross-fade ----
    if (outroImg && tMs >= outroStart) {
      const localT = tMs - outroStart;
      const fadeT = clamp01(localT / Math.max(1, transMs || 400));
      if (!outroSnapTaken) {
        const lastIdx = loadedClips.length - 1;
        if (lastIdx >= 0) {
          drawClipWithOverlay(lastIdx, clipDursMs[lastIdx] - 1, snapCtx);
        }
        outroSnapTaken = true;
      }
      ctx.drawImage(snap, 0, 0);
      ctx.save();
      ctx.globalAlpha = easeInOut(fadeT);
      ctx.drawImage(outroImg.image, 0, 0, width, height);
      ctx.restore();
      return;
    }

    // ---- Active clip(s) ----
    let active = -1, nextActive = -1;
    for (let i = 0; i < loadedClips.length; i++) {
      const start = clipStarts[i];
      const end = start + clipDursMs[i];
      if (tMs >= start && tMs < end) {
        if (active === -1) active = i;
        else nextActive = i;
      }
    }

    // Tine in redare DOAR clipurile de pe ecran, si pregateste-l pe urmatorul.
    // Fara asta, fiecare clip pornit ramanea in redare pana la finalul
    // exportului: la scena 8 rulau 8 videouri 1080p simultan, bucla de randare
    // (in timp real) nu mai tinea pasul => filmari sacadate, iar decodoarele
    // WebKit se epuizau => ultimele scene ieseau negre.
    const preIdx = prerollTarget(tMs);
    releaseInactive(active, nextActive, preIdx);
    startPreroll(preIdx);
    primeAhead((nextActive !== -1 ? nextActive : active) + 1);

    const activeTransMs = active !== -1 ? transMsAt(active) : 0;
    if (active !== -1 && nextActive !== -1 && activeTransMs > 0) {
      const start = clipStarts[nextActive];
      const t = clamp01((tMs - start) / activeTransMs);
      ensurePlaying(active, tMs - clipStarts[active]);
      ensurePlaying(nextActive, tMs - clipStarts[nextActive]);
      drawClipWithOverlay(active, tMs - clipStarts[active], snapCtx);
      drawClipWithOverlay(nextActive, tMs - clipStarts[nextActive], incomingCtx);

      // Use per-clip transition (defined on the outgoing clip — i.e. clip
      // `active`'s transition is the one OUT of clip `active` into the next).
      // Falls back to the global transitionType if not specified per-clip.
      const currentTransition = perClipTransitions[active] ?? transitionType;

      // Registry: efectul se caută, nu se ramifică. Definițiile stau în
      // fx/transitions/*, iar `fade` e plasa de siguranță — un id necunoscut
      // (efect șters, date mai vechi) trebuie să dea o tranziție corectă, nu
      // un cadru negru.
      const def = findTransition(currentTransition) ?? fadeTransition;
      const _tt = performance.now();
      def.draw({
        ctx,
        from: snap,
        to: incoming,
        t,
        width,
        height,
        params: transitionParams[active] ?? {},
      });
      cost.trans += performance.now() - _tt;
      return;
    }

    if (active !== -1) {
      const localMs = tMs - clipStarts[active];
      // Înghețare: oprim avansarea sursei, nu ceasul. Clipul își consumă
      // durata mai departe, dar pe ecran rămâne ultimul cadru redat — deci
      // freeze-ul nu lungește reel-ul, mănâncă din durata lui.
      if (isFrozen(active, localMs)) pauseClip(active);
      else ensurePlaying(active, localMs);
      drawClipWithOverlay(active, localMs, ctx);
    }
  }

  /** Cere transformului clipului dacă imaginea trebuie oprită acum. */
  function isFrozen(idx: number, localMs: number): boolean {
    const t = findTransform(effectIds[idx]);
    if (!t?.freeze) return false;
    return t.freeze({
      ctx, localMs, clipMs: clipDursMs[idx], width, height,
      params: effectParams[idx] ?? {},
    });
  }

  function pauseClip(idx: number) {
    const v = loadedClips[idx]?.video;
    if (v && !v.paused) v.pause();
  }

  function ensurePlaying(idx: number, localMs: number) {
    const lc = loadedClips[idx];
    const speed = speedOf(idx);
    // Seek to: middle-start offset + footage consumed so far. At speed×, each
    // ms of wall-clock consumes `speed` ms of source — this realises both the
    // auto-trim window AND the slow/fast motion via the rate set below.
    const seekSec = Math.max(0, (clipStartOffsetMs[idx] + localMs * speed) / 1000);
    if (!lc.video) return; // poză: statică, nimic de redat
    if (lc.video.paused) {
      // NU re-căuta dacă suntem deja practic acolo. Pre-încălzirea a decodat
      // un cadru fix la poziția de start; un seek nou (fie și de câțiva ms,
      // fiindcă localMs nu e niciodată exact 0) l-ar arunca și primul cadru
      // al scenei ar ieși negru — exact bug-ul pe care îl reparăm.
      if (Math.abs(lc.video.currentTime - seekSec) > 0.15) {
        try { lc.video.currentTime = seekSec; } catch { /* ignore */ }
      }
      try { lc.video.playbackRate = speed; } catch { /* ignore */ }
      lc.video.play().catch(() => { /* ignore */ });
    }
  }
}

/**
 * Draw a SINGLE preview frame onto a canvas, reusing the exact same drawing
 * code as the export path (drawClipFrame + drawPremiumEffect). This is the
 * "preview = export" guarantee: Studio's live preview and the final MP4 are
 * produced by identical pixels, never a CSS approximation.
 *
 * Meant to be called every animation frame from a requestAnimationFrame loop
 * in the UI, with `video` being an uploaded clip that is playing. The UI owns
 * playback (video.currentTime, loop, speed); this just paints the current
 * video frame with the chosen filter + effect.
 */
export interface PreviewFrameOptions {
  /** Filter grading to apply (champagne, cinema, etc.). Defaults to none. */
  filter?: FilterPreset;
  /** Premium effect overlay id (sparkle/glow/lensFlare/...). "none"/undefined = no overlay. */
  effectId?: string;
  /** Normalized position 0..1 within the clip (drives Ken Burns easing). Default 0. */
  tNorm?: number;
  /** Elapsed ms within the clip (drives time-based effects). Default 0. */
  localMs?: number;
  /** Total clip duration in ms (effect timing reference). Default 4000. */
  clipMs?: number;
  /** Ken Burns zoom. Off by default for preview (the video itself moves). */
  kenBurns?: boolean;
  /** Optional caption overlay (text + position + preset id). Drawn last, same as export. */
  caption?: Caption;
  /** Straturi de text libere (multi-text overlay). Daca setat, inlocuieste caption. */
  textLayers?: TextLayer[];
}

export function renderPreviewFrame(
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  opts: PreviewFrameOptions = {},
): void {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;
  // High-quality scaling — without this a 4K source drawn onto the canvas
  // looks soft (browser defaults to fast/medium scaling). Matches the reel renderer.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const width = canvas.width;
  const height = canvas.height;
  const filter = opts.filter ?? FILTERS.none;
  const tNorm = opts.tNorm ?? 0;
  const kenBurns = opts.kenBurns ?? false;

  // Same frame-draw as export: grading + tint + vignette + highlight boost.
  drawClipFrame(ctx, video, width, height, "static", tNorm, kenBurns, filter);

  // Same premium effect overlay as export.
  const effectId = opts.effectId;
  if (effectId && effectId !== "none") {
    drawPremiumEffect(ctx, effectId, opts.localMs ?? 0, opts.clipMs ?? 4000, width, height);
  }
  // Overlay text — textLayers (multi-text) au prioritate; altfel caption vechi.
  // Aceleasi functii ca la export, deci preview = export.
  const surface = makeSurface(width, height);
  if (opts.textLayers && opts.textLayers.length > 0) {
    drawTextLayers(
      ctx,
      opts.textLayers,
      (id) => TEXT_PRESETS[id] ?? TEXT_PRESETS.hookBold,
      surface,
    );
  } else {
    const caption = opts.caption;
    if (caption && caption.text.trim()) {
      const preset = TEXT_PRESETS[caption.presetId] ?? TEXT_PRESETS.hookBold;
      drawCaption(ctx, caption, preset, surface);
    }
  }
}
