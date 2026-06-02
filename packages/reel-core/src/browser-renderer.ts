import type { ConcatProgress } from "./render-progress";
import type { FilterPreset } from "./filters";
import { FILTERS } from "./filters";
import type { TransitionId } from "./transitions";

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
type LoadedVideo = { video: HTMLVideoElement; cleanup: () => void; duration: number };

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
) {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  // Apply CSS filter to the video draw only.
  const prevFilter = ctx.filter;
  ctx.filter = filter.cssFilter || "none";

  let zoom = 1;
  if (enableKenBurns && variant !== "static") {
    const e = easeInOut(clamp01(t));
    if (variant === "zoom-in") zoom = 1.0 + 0.04 * e;
    else if (variant === "zoom-out") zoom = 1.04 - 0.04 * e;
  }
  drawCover(ctx, source, width, height, zoom);

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

async function loadVideoClip(clip: RenderClipInput, index: number): Promise<LoadedVideo> {
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
    video,
    duration,
    cleanup: () => {
      try { video.pause(); } catch { /* ignore */ }
      video.remove();
      URL.revokeObjectURL(url);
    },
  };
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
  // Scale bitrate with resolution: ~0.12 bits/pixel/frame → great quality at 1080p30.
  const pixels = canvas.width * canvas.height;
  const bitrate = Math.min(24_000_000, Math.max(6_000_000, Math.round(pixels * fps * 0.12)));
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
  const perClipPlaybackSpeeds: (number | undefined)[] = opts.playbackSpeeds ?? [];
  const perClipMotionBlurs: (boolean | undefined)[] = opts.motionBlurs ?? [];

  // DEBUG: log what arrived at the renderer so we can verify the wiring.
  // eslint-disable-next-line no-console
  console.log("[renderer] per-clip data received:", {
    globalFilter: filter.id ?? "?",
    filters: perClipFilters.map((f) => f?.id ?? "(undef)"),
    transitions: perClipTransitions,
    effectIds: opts.effectIds,
    effectsEnabled: opts.effectsEnabled,
  });

  const introMs = effects.intro && opts.introPng ? (opts.introDuration ?? 0.9) * 1000 : 0;
  const outroMs = opts.outroPng ? (opts.outroDuration ?? 1.4) * 1000 : 0;
  const transitionType: TransitionId = opts.transitionType ?? "fade";
  const transMs = effects.transitions ? (opts.transitionDuration ?? 0.25) * 1000 : 0;
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

  const loadedClips: LoadedVideo[] = [];
  for (let i = 0; i < clips.length; i++) {
    onProgress?.({
      phase: "loading",
      pct: Math.round((i / Math.max(1, clips.length)) * 12),
      message: `Pregătesc clipul ${i + 1}/${clips.length}…`,
    });
    loadedClips.push(await loadVideoClip(clips[i], i));
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
    const recordedMs = Math.max(0, c.duration * 1000);
    return Math.max(0, (recordedMs - sourceWindowMs[i]) / 2);
  });
  const clipsTotal = clipDursMs.reduce((a, b) => a + b, 0);
  const transitionsCount = Math.max(0, loadedClips.length - 1);
  const outroOverlap = outroImg && transMs ? transMs : 0;
  const totalMs = introMs + clipsTotal - transitionsCount * transMs + outroMs - outroOverlap;

  const snap = document.createElement("canvas");
  snap.width = width; snap.height = height;
  const snapCtx = snap.getContext("2d")!;

  const incoming = document.createElement("canvas");
  incoming.width = width; incoming.height = height;
  const incomingCtx = incoming.getContext("2d")!;

  // Per-clip motion-blur trail buffers (feedback accumulation). Populated
  // lazily, only for clips where Studio enabled motion blur.
  const prevFrameByClip = new Map<number, HTMLCanvasElement>();

  const { recorder, done } = createRecorder(canvas, fps);
  const variants = loadedClips.map((_, i) => (effects.kenBurns ? pickKenBurns(i) : "static" as KenBurnsVariant));

  const clipStarts: number[] = [];
  let cursor = introMs;
  for (let i = 0; i < loadedClips.length; i++) {
    clipStarts.push(cursor);
    cursor += clipDursMs[i] - (i < loadedClips.length - 1 ? transMs : 0);
  }
  const outroStart = outroImg ? cursor - outroOverlap : Infinity;
  let outroSnapTaken = false;

  let frameIdx = 0;

  try {
    const t0 = performance.now();
    let lastDrawn = -1;

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
            const pct = Math.min(98, 12 + (tMs / totalMs) * 86);
            onProgress?.({
              phase: "encoding",
              pct,
              message: `Randez · ${Math.round((tMs / totalMs) * 100)}%`,
            });
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
    onProgress?.({ phase: "done", pct: 100, message: "Gata" });
    return blob;
  } finally {
    overlayImgs.forEach((o) => o?.cleanup());
    introImg?.cleanup();
    outroImg?.cleanup();
    loadedClips.forEach((c) => c.cleanup());
    canvas.remove();
  }

  function drawClipWithOverlay(idx: number, localMs: number, target: CanvasRenderingContext2D) {
    const lc = loadedClips[idx];
    const tNorm = clamp01(localMs / clipDursMs[idx]);
    // Use per-clip filter if provided, otherwise fall back to the global one.
    // This is the seam that lets each scene have its own filter (champagne
    // on scene 1, cinema on scene 2, warm on scene 3, etc.) as set in
    // Studio rather than one filter applied to the whole reel.
    const clipFilter = perClipFilters[idx] ?? filter;
    drawClipFrame(target, lc.video, width, height, variants[idx], tNorm, effects.kenBurns, clipFilter);
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
        drawPremiumEffect(target, effectId, localMs, clipDursMs[idx], width, height);
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

    if (active !== -1 && nextActive !== -1 && transMs > 0) {
      const start = clipStarts[nextActive];
      const t = clamp01((tMs - start) / transMs);
      ensurePlaying(active, tMs - clipStarts[active]);
      ensurePlaying(nextActive, tMs - clipStarts[nextActive]);
      drawClipWithOverlay(active, tMs - clipStarts[active], snapCtx);
      drawClipWithOverlay(nextActive, tMs - clipStarts[nextActive], incomingCtx);

      // Use per-clip transition (defined on the outgoing clip — i.e. clip
      // `active`'s transition is the one OUT of clip `active` into the next).
      // Falls back to the global transitionType if not specified per-clip.
      const currentTransition = perClipTransitions[active] ?? transitionType;

      if (currentTransition === "flash") {
        // White-flash transition. First half: outgoing clip blown out to
        // white. Second half: incoming clip emerging from white. The eye
        // reads it as a snap, not a fade.
        const halfway = t < 0.5;
        ctx.drawImage(halfway ? snap : incoming, 0, 0);
        const flashAlpha = halfway ? t * 2 : (1 - t) * 2; // 0→1→0
        ctx.save();
        ctx.globalAlpha = Math.min(1, flashAlpha);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      } else if (currentTransition === "zoom") {
        // Zoom-punch: outgoing clip scales up while fading; incoming clip
        // scales DOWN from oversize into place. Gives a snappy, punchy feel.
        const eT = easeInOut(t);
        // Outgoing — scale up + fade out
        ctx.save();
        ctx.globalAlpha = 1 - eT;
        const outScale = 1 + eT * 0.18;
        ctx.translate(width / 2, height / 2);
        ctx.scale(outScale, outScale);
        ctx.drawImage(snap, -width / 2, -height / 2);
        ctx.restore();
        // Incoming — scale from oversize down to natural, fade in
        ctx.save();
        ctx.globalAlpha = eT;
        const inScale = 1.18 - eT * 0.18;
        ctx.translate(width / 2, height / 2);
        ctx.scale(inScale, inScale);
        ctx.drawImage(incoming, -width / 2, -height / 2);
        ctx.restore();
      } else if (currentTransition === "glitch") {
        // RGB-split + scanline glitch. The eye reads chaos, then resolves.
        const eT = t;
        ctx.drawImage(eT < 0.5 ? snap : incoming, 0, 0);
        // RGB channel splits at peak in the middle, ease out toward ends
        const peak = Math.sin(eT * Math.PI); // 0 → 1 → 0
        const offset = Math.round(peak * 22);
        if (offset > 0) {
          ctx.save();
          ctx.globalCompositeOperation = "screen";
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = "rgba(255,0,80,1)";
          ctx.fillRect(offset, 0, width - offset, height);
          ctx.fillStyle = "rgba(0,200,255,1)";
          ctx.fillRect(0, 0, width - offset, height);
          ctx.restore();
          // Scanline jitter — 4-6 horizontal slices shifted
          ctx.save();
          const slices = 5;
          const sliceH = height / slices;
          for (let i = 0; i < slices; i++) {
            const sx = (Math.sin((eT * 12) + i * 1.7) * peak * 18) | 0;
            ctx.drawImage(eT < 0.5 ? snap : incoming,
              0, i * sliceH, width, sliceH,
              sx, i * sliceH, width, sliceH);
          }
          ctx.restore();
        }
      } else if (currentTransition === "blur") {
        // Defocus the outgoing, focus the incoming. Dreamy & soft.
        const eT = easeInOut(t);
        // Outgoing: increasing blur, fading out
        ctx.save();
        ctx.filter = `blur(${eT * 20}px)`;
        ctx.globalAlpha = 1 - eT;
        ctx.drawImage(snap, 0, 0);
        ctx.restore();
        // Incoming: decreasing blur, fading in
        ctx.save();
        ctx.filter = `blur(${(1 - eT) * 20}px)`;
        ctx.globalAlpha = eT;
        ctx.drawImage(incoming, 0, 0);
        ctx.restore();
      } else if (currentTransition === "slide") {
        // Incoming slides in from the right; outgoing pushes off to left.
        const eT = easeInOut(t);
        const shift = eT * width;
        ctx.drawImage(snap, -shift, 0);
        ctx.drawImage(incoming, width - shift, 0);
      } else if (currentTransition === "spin") {
        // Both clips rotate around the centre; outgoing zooms out while
        // incoming zooms in. A 180° swap reads as a fast spin transition.
        const eT = easeInOut(t);
        const angle = eT * Math.PI; // 0 → π (180°)
        // Outgoing — rotate + scale down + fade
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(angle);
        const outScale = 1 - eT * 0.6;
        ctx.scale(outScale, outScale);
        ctx.globalAlpha = 1 - eT;
        ctx.drawImage(snap, -width / 2, -height / 2);
        ctx.restore();
        // Incoming — rotate from -π → 0, scale up + fade in
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate(angle - Math.PI);
        const inScale = 0.4 + eT * 0.6;
        ctx.scale(inScale, inScale);
        ctx.globalAlpha = eT;
        ctx.drawImage(incoming, -width / 2, -height / 2);
        ctx.restore();
      } else if (currentTransition === "cut") {
        // Hard cut — no blend. The timeline still overlaps the two clips by
        // transMs, so we snap from outgoing to incoming at the midpoint of
        // that window. Reads as an instant cut, not a fade.
        ctx.drawImage(t < 0.5 ? snap : incoming, 0, 0);
      } else if (currentTransition === "whipPan") {
        // Whip-pan: fast horizontal swipe with directional motion smear.
        // Outgoing flies off to the left while incoming rushes in from the
        // right, both streaked. Canvas blur() is isotropic, so the smear is
        // built by stacking horizontally-offset copies with falloff alpha.
        const eT = easeInOut(t);
        const smear = Math.sin(t * Math.PI); // 0 → 1 → 0 motion intensity
        const trail = Math.round(width * 0.18 * smear);
        const steps = 5;
        // Outgoing — slides left, faint trailing ghosts behind it.
        for (let k = steps - 1; k >= 0; k--) {
          const f = k / steps;
          ctx.save();
          ctx.globalAlpha = (1 - eT) * (1 - f * 0.7);
          ctx.drawImage(snap, -eT * width - f * trail, 0);
          ctx.restore();
        }
        // Incoming — slides in from the right, trailing ghosts behind it.
        for (let k = steps - 1; k >= 0; k--) {
          const f = k / steps;
          ctx.save();
          ctx.globalAlpha = eT * (1 - f * 0.7);
          ctx.drawImage(incoming, (1 - eT) * width + f * trail, 0);
          ctx.restore();
        }
      } else if (currentTransition === "smoothZoom") {
        // Smooth zoom-through: a gentle, continuous push (unlike the snappy
        // "zoom" punch). Outgoing keeps zooming in and softly defocuses as it
        // fades; incoming settles from a slight over-zoom into place. Dreamy
        // and seamless rather than abrupt.
        const eT = easeInOut(t);
        ctx.save();
        ctx.globalAlpha = 1 - eT;
        ctx.filter = `blur(${eT * 6}px)`;
        const outS = 1 + eT * 0.35;
        ctx.translate(width / 2, height / 2);
        ctx.scale(outS, outS);
        ctx.drawImage(snap, -width / 2, -height / 2);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = eT;
        const inS = 1.15 - eT * 0.15;
        ctx.translate(width / 2, height / 2);
        ctx.scale(inS, inS);
        ctx.drawImage(incoming, -width / 2, -height / 2);
        ctx.restore();
      } else if (currentTransition === "motionBlur") {
        // Motion-blurred dissolve: a cross-fade where both frames carry a
        // small opposing horizontal smear that peaks mid-transition. Distinct
        // from "blur" (defocus) and "whipPan" (full swipe) — this is a soft
        // moving blend, the two clips brushing past each other.
        const eT = easeInOut(t);
        const smear = Math.sin(t * Math.PI);
        const trail = Math.round(width * 0.05 * smear);
        const steps = 4;
        for (let k = steps - 1; k >= 0; k--) {
          const f = k / steps;
          ctx.save();
          ctx.globalAlpha = (1 - eT) * (1 - f * 0.6);
          ctx.drawImage(snap, f * trail, 0);
          ctx.restore();
        }
        for (let k = steps - 1; k >= 0; k--) {
          const f = k / steps;
          ctx.save();
          ctx.globalAlpha = eT * (1 - f * 0.6);
          ctx.drawImage(incoming, -f * trail, 0);
          ctx.restore();
        }
      } else {
        // Default: classic cross-fade.
        ctx.drawImage(snap, 0, 0);
        ctx.save();
        ctx.globalAlpha = easeInOut(t);
        ctx.drawImage(incoming, 0, 0);
        ctx.restore();
      }
      return;
    }

    if (active !== -1) {
      ensurePlaying(active, tMs - clipStarts[active]);
      drawClipWithOverlay(active, tMs - clipStarts[active], ctx);
    }
  }

  function ensurePlaying(idx: number, localMs: number) {
    const lc = loadedClips[idx];
    const speed = speedOf(idx);
    // Seek to: middle-start offset + footage consumed so far. At speed×, each
    // ms of wall-clock consumes `speed` ms of source — this realises both the
    // auto-trim window AND the slow/fast motion via the rate set below.
    const seekSec = Math.max(0, (clipStartOffsetMs[idx] + localMs * speed) / 1000);
    if (lc.video.paused) {
      try { lc.video.currentTime = seekSec; } catch { /* ignore */ }
      try { lc.video.playbackRate = speed; } catch { /* ignore */ }
      lc.video.play().catch(() => { /* ignore */ });
    }
  }
}

/* ════════════════════════════════════════════════════════════════════
 * PREMIUM EFFECTS
 * Pure-canvas effect layer drawn between clip frame and text overlay.
 * Same effects render in the live preview (see LivePreview.tsx) with
 * matching colors / timing for visual consistency.
 * ════════════════════════════════════════════════════════════════════ */

/** Deterministic pseudo-random in [0,1) from integer seed. */
function rand(seed: number): number {
  // simple LCG — stable across frames so element positions don't jitter
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

/**
 * Draw the chosen premium effect on top of the current clip frame.
 * `localMs` is the time INTO the played window of this clip,
 * `clipMs` is its total played length.
 */
function drawPremiumEffect(
  ctx: CanvasRenderingContext2D,
  effectId: string,
  localMs: number,
  clipMs: number,
  width: number,
  height: number,
): void {
  switch (effectId) {
    case "sparkle":   return drawSparkles(ctx, localMs, clipMs, width, height);
    case "leak":      return drawLightLeaks(ctx, localMs, clipMs, width, height);
    case "bokeh":     return drawBokeh(ctx, localMs, clipMs, width, height);
    case "dust":      return drawGoldDust(ctx, localMs, clipMs, width, height);
    // Dedicated frame-derived renderers (no longer aliased):
    //   glow      → real bloom: highlights bloom out of the frame itself
    //   softLight → Orton-style diffusion: dreamy, soft, luminous skin
    //   lensFlare → anamorphic flare: hot core + horizontal streak + ghosts
    case "glow":      return drawGlow(ctx, localMs, clipMs, width, height);
    case "softLight": return drawSoftLight(ctx, localMs, clipMs, width, height);
    case "lensFlare": return drawLensFlare(ctx, localMs, clipMs, width, height);
  }
}

/** Champagne gold for all effect highlights. Match Figma palette. */
const GOLD_LIGHT = "rgba(244, 228, 193, 1)";
const GOLD_WARM  = "rgba(232, 180, 120, 1)";

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, alpha: number) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = GOLD_LIGHT;
  ctx.beginPath();
  // 4-point star: long axes + short axes, diamond pattern
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size * 0.18, cy - size * 0.18);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx + size * 0.18, cy + size * 0.18);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size * 0.18, cy + size * 0.18);
  ctx.lineTo(cx - size, cy);
  ctx.lineTo(cx - size * 0.18, cy - size * 0.18);
  ctx.closePath();
  ctx.fill();
  // soft glow
  ctx.globalAlpha = alpha * 0.35;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 1.4);
  grad.addColorStop(0, "rgba(244,228,193,0.35)");
  grad.addColorStop(0.5, "rgba(244,228,193,0.1)");
  grad.addColorStop(1, "rgba(244,228,193,0)");
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 1.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * Sparkle highlights — 3 very subtle stars. The intent is "noticed on
 * second look", not "look at me". Small, slow cycle, low peak alpha.
 */
function drawSparkles(ctx: CanvasRenderingContext2D, localMs: number, clipMs: number, w: number, h: number) {
  const count = 3;
  for (let i = 0; i < count; i++) {
    // 2-second cycle, well staggered so only one is near-peak at a time.
    const cycleMs = 2000;
    const phase = ((localMs + i * 700) % cycleMs) / cycleMs;
    let alpha: number;
    if (phase < 0.4) alpha = phase / 0.4;
    else if (phase < 0.6) alpha = 1;
    else alpha = 1 - (phase - 0.6) / 0.4;
    if (alpha <= 0) continue;
    const x = (0.2 + rand(i * 7.3) * 0.6) * w;
    const y = (0.2 + rand(i * 11.1) * 0.55) * h;
    // Small stars — 14-22px @ 1080px reference. Half the previous size.
    const size = (14 + rand(i * 3.7) * 8) * (w / 1080);
    drawStar(ctx, x, y, size, alpha * 0.55);
  }
}

/** Light leaks — 1-2 soft warm patches that drift across the frame. */
function drawLightLeaks(ctx: CanvasRenderingContext2D, localMs: number, clipMs: number, w: number, h: number) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const leaks = 2;
  for (let i = 0; i < leaks; i++) {
    // 4-second drift cycle, leaks staggered.
    const cycleMs = 4000;
    const phase = ((localMs + i * 2000) % cycleMs) / cycleMs;
    // Fade in/out at edges.
    let alpha: number;
    if (phase < 0.2) alpha = phase / 0.2;
    else if (phase < 0.8) alpha = 1;
    else alpha = 1 - (phase - 0.8) / 0.2;
    if (alpha <= 0) continue;
    const startX = i === 0 ? -0.15 * w : 0.6 * w;
    const endX = i === 0 ? 0.3 * w : 1.1 * w;
    const cx = startX + (endX - startX) * phase;
    const cy = (i === 0 ? 0.25 : 0.65) * h;
    const radius = 0.35 * w;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(244, 220, 170, ${0.55 * alpha})`);
    grad.addColorStop(0.4, `rgba(232, 180, 110, ${0.25 * alpha})`);
    grad.addColorStop(1, "rgba(232, 180, 110, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Bokeh — 4 soft circles of light pulsing in the background. */
function drawBokeh(ctx: CanvasRenderingContext2D, localMs: number, clipMs: number, w: number, h: number) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const circles = 4;
  // Fixed positions, deterministic per circle.
  const positions = [
    { x: 0.08, y: 0.15, r: 0.13 },
    { x: 0.78, y: 0.62, r: 0.16 },
    { x: 0.85, y: 0.20, r: 0.09 },
    { x: 0.20, y: 0.80, r: 0.11 },
  ];
  for (let i = 0; i < circles; i++) {
    const p = positions[i];
    // 3s pulse cycle, staggered.
    const cycleMs = 3000;
    const phase = ((localMs + i * 800) % cycleMs) / cycleMs;
    // Sine wave from 0.35 to 0.6 alpha, with scale 1.0 to 1.08
    const sineT = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
    const alpha = 0.4 + sineT * 0.22;
    const scale = 1 + sineT * 0.08;
    const cx = p.x * w;
    const cy = p.y * h;
    const radius = p.r * w * scale;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, `rgba(244, 228, 193, ${0.55 * alpha})`);
    grad.addColorStop(0.55, `rgba(232, 180, 120, ${0.2 * alpha})`);
    grad.addColorStop(1, "rgba(232, 180, 120, 0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** Gold dust — tiny particles falling slowly across the frame. */
function drawGoldDust(ctx: CanvasRenderingContext2D, localMs: number, clipMs: number, w: number, h: number) {
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  const particles = 9;
  const fallMs = 3500;
  for (let i = 0; i < particles; i++) {
    const phase = ((localMs + rand(i * 13.7) * fallMs) % fallMs) / fallMs;
    // Fade in/out
    let alpha: number;
    if (phase < 0.15) alpha = phase / 0.15;
    else if (phase < 0.85) alpha = 0.7;
    else alpha = 0.7 * (1 - (phase - 0.85) / 0.15);
    if (alpha <= 0) continue;
    const x = (0.05 + rand(i * 19.1) * 0.9) * w;
    const y = phase * h * 1.1 - 0.05 * h;
    const size = (2 + rand(i * 5.3) * 1.5) * (w / 1080);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = i % 2 === 0 ? GOLD_LIGHT : GOLD_WARM;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ════════════════════════════════════════════════════════════════════
 * DEDICATED FRAME-DERIVED EFFECTS  (glow / softLight / lensFlare)
 * These sample the already-drawn clip frame from `ctx.canvas`, so they
 * react to the actual footage (hair shine, skin highlights) instead of
 * floating decorative gradients. Works in all paths — during transitions
 * the renderer draws onto offscreen canvases and `ctx.canvas` resolves to
 * the correct surface automatically.
 * ════════════════════════════════════════════════════════════════════ */

/**
 * Half-resolution scratch canvas, reused across frames. Frame-derived
 * effects blur a downscaled copy (cheaper + softer) then composite it back
 * upscaled. Recreated only when the output dimensions change.
 */
let _fxScratch: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; w: number; h: number } | null = null;
function getFxScratch(w: number, h: number) {
  const sw = Math.max(2, Math.round(w * 0.5));
  const sh = Math.max(2, Math.round(h * 0.5));
  if (!_fxScratch || _fxScratch.w !== sw || _fxScratch.h !== sh) {
    const c = document.createElement("canvas");
    c.width = sw;
    c.height = sh;
    const cx = c.getContext("2d");
    if (!cx) return null;
    _fxScratch = { canvas: c, ctx: cx, w: sw, h: sh };
  }
  return _fxScratch;
}

/**
 * GLOW — real bloom. Crush the darks and lift the brights in a blurred
 * half-res copy, then `screen`-composite it back so only luminous areas
 * (hair gloss, skin highlights, jewellery) bleed light. Distinct from
 * light-leaks: it comes FROM the subject, not over it.
 */
function drawGlow(ctx: CanvasRenderingContext2D, localMs: number, clipMs: number, w: number, h: number) {
  const s = getFxScratch(w, h);
  if (!s) return;
  s.ctx.clearRect(0, 0, s.w, s.h);
  // contrast() crushes midtones/shadows so the bloom is highlight-only;
  // brightness() pushes the surviving brights; blur() spreads them.
  s.ctx.filter = `contrast(1.7) brightness(1.12) blur(${Math.max(2, Math.round(s.w * 0.018))}px)`;
  s.ctx.drawImage(ctx.canvas, 0, 0, s.w, s.h);
  s.ctx.filter = "none";
  // Subtle breathing across the clip so it feels alive, never static.
  const t = clamp01(localMs / Math.max(1, clipMs));
  const breathe = 0.5 + 0.5 * Math.sin(t * Math.PI); // 0 → 1 → 0
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.20 + 0.10 * breathe;
  ctx.drawImage(s.canvas, 0, 0, s.w, s.h, 0, 0, w, h);
  ctx.restore();
}

/**
 * SOFT LIGHT — Orton-style diffusion. A heavily-blurred copy composited
 * with `soft-light` gives that dreamy editorial haze where skin smooths
 * and highlights bloom gently without blowing out. A faint `screen` pass
 * adds the luminous lift. The luxury "expensive skin" look.
 */
function drawSoftLight(ctx: CanvasRenderingContext2D, localMs: number, clipMs: number, w: number, h: number) {
  const s = getFxScratch(w, h);
  if (!s) return;
  s.ctx.clearRect(0, 0, s.w, s.h);
  s.ctx.filter = `blur(${Math.max(3, Math.round(s.w * 0.03))}px) saturate(1.05)`;
  s.ctx.drawImage(ctx.canvas, 0, 0, s.w, s.h);
  s.ctx.filter = "none";
  ctx.save();
  ctx.globalCompositeOperation = "soft-light";
  ctx.globalAlpha = 0.55;
  ctx.drawImage(s.canvas, 0, 0, s.w, s.h, 0, 0, w, h);
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.10;
  ctx.drawImage(s.canvas, 0, 0, s.w, s.h, 0, 0, w, h);
  ctx.restore();
}

/**
 * LENS FLARE — anamorphic. A hot core drifts slowly across the upper
 * third, throwing a horizontal blue-ish streak (the anamorphic signature)
 * and a few coloured ghosts projected through frame-centre. All on
 * `screen` so it reads as light, not paint.
 */
function drawLensFlare(ctx: CanvasRenderingContext2D, localMs: number, clipMs: number, w: number, h: number) {
  const phase = (localMs % 6000) / 6000;        // slow 6s drift
  const cx = (0.18 + 0.64 * phase) * w;
  const cy = 0.28 * h;
  const pulse = 0.75 + 0.25 * Math.sin(localMs / 550);

  ctx.save();
  ctx.globalCompositeOperation = "screen";

  // Hot core
  const coreR = w * 0.16;
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
  core.addColorStop(0, `rgba(255, 250, 235, ${0.9 * pulse})`);
  core.addColorStop(0.3, `rgba(255, 225, 180, ${0.4 * pulse})`);
  core.addColorStop(1, "rgba(255, 225, 180, 0)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
  ctx.fill();

  // Anamorphic horizontal streak
  const streakLen = w * 0.95;
  const streakH = Math.max(2, h * 0.01);
  const streak = ctx.createLinearGradient(cx - streakLen / 2, cy, cx + streakLen / 2, cy);
  streak.addColorStop(0, "rgba(120, 170, 255, 0)");
  streak.addColorStop(0.5, `rgba(150, 195, 255, ${0.38 * pulse})`);
  streak.addColorStop(1, "rgba(120, 170, 255, 0)");
  ctx.fillStyle = streak;
  ctx.fillRect(cx - streakLen / 2, cy - streakH / 2, streakLen, streakH);

  // Coloured ghosts projected through the centre
  const ccx = w / 2, ccy = h / 2;
  const ghosts: { t: number; r: number; rgb: string }[] = [
    { t: 0.35, r: 0.045, rgb: "255, 210, 150" },
    { t: 0.7, r: 0.06, rgb: "170, 255, 200" },
    { t: 1.05, r: 0.035, rgb: "200, 180, 255" },
  ];
  for (const g of ghosts) {
    const gx = cx + (ccx - cx) * g.t;
    const gy = cy + (ccy - cy) * g.t;
    const r = w * g.r;
    const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    grad.addColorStop(0, `rgba(${g.rgb}, ${0.22 * pulse})`);
    grad.addColorStop(1, `rgba(${g.rgb}, 0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(gx, gy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
