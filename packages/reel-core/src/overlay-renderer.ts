import type { TextPreset, TextPosition } from "./text-presets";
import { TEXT_PRESETS } from "./text-presets";

const BASE_W = 1080;
const BASE_H = 1920;

export interface RenderSurface {
  width: number;
  height: number;
  scale: number;
  scaleX: number;
  scaleY: number;
}

/**
 * Caption to render. `text` is the user-edited copy; the preset controls visuals.
 */
export interface Caption {
  text: string;
  position: TextPosition;
  presetId: string;
  /** Optional brand color override for the text fill. Defaults to preset color. */
  color?: string;
}

/**
 * Un strat de text liber pozitionabil pe scena (multi-text overlay).
 * Pleaca de la un preset (font/size/stil de baza) si permite override-uri
 * per instanta: pozitie libera (x/y in 0..1), bold/italic/underline, culoare.
 */
export interface TextLayer {
  id: string;
  text: string;
  /** Presetul de baza (font, size, outline, shadow). */
  presetId: string;
  /** Pozitie libera, fractii din latime/inaltime (0..1). Centrul textului. */
  x: number;
  y: number;
  /** Override-uri de stil per strat. */
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  /** Multiplicator de dimensiune fata de preset (1 = neschimbat). */
  sizeScale?: number;
}

export interface OverlayInputs {
  caption?: Caption;
  preset: TextPreset;
  /** Straturi de text libere (multi-text). Daca setat, inlocuieste caption. */
  textLayers?: TextLayer[];
  /** Optional brand watermark drawn bottom-right ("@handle"). */
  handle?: string;
  /** Optional logo (PNG blob) shown next to handle in watermark. */
  logoBitmap?: ImageBitmap;
  /** Optional output size; defaults to 1080x1920. */
  width?: number;
  height?: number;
}

export function makeSurface(width = BASE_W, height = BASE_H): RenderSurface {
  return {
    width,
    height,
    scale: Math.min(width / BASE_W, height / BASE_H),
    scaleX: width / BASE_W,
    scaleY: height / BASE_H,
  };
}

function makeCanvas(surface: RenderSurface): { canvas: HTMLCanvasElement | OffscreenCanvas; ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D } {
  if (typeof OffscreenCanvas !== "undefined") {
    const c = new OffscreenCanvas(surface.width, surface.height);
    const ctx = c.getContext("2d") as OffscreenCanvasRenderingContext2D;
    return { canvas: c, ctx };
  }
  const c = document.createElement("canvas");
  c.width = surface.width; c.height = surface.height;
  const ctx = c.getContext("2d")!;
  return { canvas: c, ctx };
}

async function canvasToBlob(c: HTMLCanvasElement | OffscreenCanvas): Promise<Blob> {
  if ("convertToBlob" in c) {
    return await (c as OffscreenCanvas).convertToBlob({ type: "image/png" });
  }
  return await new Promise<Blob>((resolve, reject) => {
    (c as HTMLCanvasElement).toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}

/** Sparge un cuvant mai lat decat maxWidth in bucati la nivel de caracter. */
function breakLongWord(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  word: string,
  maxWidth: number,
): string[] {
  const parts: string[] = [];
  let chunk = "";
  for (const ch of word) {
    if (chunk && ctx.measureText(chunk + ch).width > maxWidth) {
      parts.push(chunk);
      chunk = ch;
    } else {
      chunk += ch;
    }
  }
  if (chunk) parts.push(chunk);
  return parts;
}

function wrapLines(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n/)) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (const w of words) {
      // Cuvant mai lung decat un rand intreg: sparge-l pe caractere ca sa NU
      // iasa din cadru (matcheaza word-break:break-word din preview-ul CSS).
      if (ctx.measureText(w).width > maxWidth) {
        if (line) {
          out.push(line);
          line = "";
        }
        const parts = breakLongWord(ctx, w, maxWidth);
        for (let i = 0; i < parts.length - 1; i++) out.push(parts[i]);
        line = parts[parts.length - 1] ?? "";
        continue;
      }
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxWidth && line) {
        out.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) out.push(line);
  }
  return out;
}

function setFont(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  preset: TextPreset,
) {
  ctx.font = `${preset.italic ? "italic " : ""}${preset.weight} ${preset.size}px ${preset.font}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
}

export function drawCaption(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  caption: Caption,
  preset: TextPreset,
  surface: RenderSurface,
) {
  const text = preset.uppercase ? caption.text.toUpperCase() : caption.text;
  const scaledPreset: TextPreset = {
    ...preset,
    size: Math.max(12, Math.round(preset.size * surface.scale)),
    maxWidth: Math.round((preset.maxWidth ?? 880) * surface.scaleX),
    paddingX: Math.round((preset.paddingX ?? 28) * surface.scaleX),
    paddingY: Math.round((preset.paddingY ?? 16) * surface.scaleY),
    radius: Math.round((preset.radius ?? 16) * surface.scale),
    outline: preset.outline
      ? { ...preset.outline, width: Math.max(1, Math.round(preset.outline.width * surface.scale)) }
      : undefined,
  };
  setFont(ctx, scaledPreset);
  const maxW = scaledPreset.maxWidth ?? Math.round(880 * surface.scaleX);
  const lines = wrapLines(ctx, text, maxW - (scaledPreset.paddingX ?? 0) * 2);
  const lh = scaledPreset.size * 1.1;
  const totalH = lh * lines.length;

  // Position
  const cx = surface.width / 2;
  let cy: number;
  switch (caption.position) {
    case "top":    cy = 300 * surface.scaleY + totalH / 2; break;
    case "center": cy = surface.height / 2; break;
    case "bottom": cy = surface.height - 380 * surface.scaleY - totalH / 2; break;
  }

  // Background pill (drawn behind ALL lines as a single rounded rect)
  if (scaledPreset.bg) {
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const padX = scaledPreset.paddingX ?? Math.round(28 * surface.scaleX);
    const padY = scaledPreset.paddingY ?? Math.round(16 * surface.scaleY);
    const bw = widest + padX * 2;
    const bh = totalH + padY * 2;
    const bx = cx - bw / 2;
    const by = cy - bh / 2;
    const r = scaledPreset.radius ?? Math.round(16 * surface.scale);
    ctx.fillStyle = scaledPreset.bg;
    roundRect(ctx, bx, by, bw, bh, r);
    ctx.fill();
  }

  // Letter spacing approximation: not all canvas impls support it; ignore for now.
  // Shadow
  if (scaledPreset.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 18 * surface.scale;
    ctx.shadowOffsetY = 4 * surface.scale;
  } else {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
  }

  // Outline
  if (scaledPreset.outline) {
    ctx.strokeStyle = scaledPreset.outline.color;
    ctx.lineWidth = scaledPreset.outline.width;
    ctx.lineJoin = "round";
    lines.forEach((line, i) => {
      const y = cy - totalH / 2 + lh / 2 + i * lh;
      ctx.strokeText(line, cx, y);
    });
  }

  ctx.fillStyle = caption.color ?? scaledPreset.color;
  lines.forEach((line, i) => {
    const y = cy - totalH / 2 + lh / 2 + i * lh;
    ctx.fillText(line, cx, y);
  });

  // reset shadow
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Deseneaza un singur TextLayer liber pozitionabil. Reutilizeaza logica din
 * drawCaption (wrap, outline, shadow) dar cu pozitie x/y libera + suport
 * bold/italic/underline per strat. Preview = export (aceeasi functie).
 */
export function drawTextLayer(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  layer: TextLayer,
  basePreset: TextPreset,
  surface: RenderSurface,
) {
  if (!layer.text.trim()) return;

  // Override-uri per strat peste presetul de baza.
  const weight = layer.bold ? Math.max(basePreset.weight, 800) : basePreset.weight;
  const italic = layer.italic ?? basePreset.italic;
  const sizeScale = layer.sizeScale ?? 1;

  const preset: TextPreset = {
    ...basePreset,
    weight,
    italic,
    size: Math.max(12, Math.round(basePreset.size * sizeScale * surface.scale)),
    maxWidth: Math.round((basePreset.maxWidth ?? 880) * surface.scaleX),
    outline: basePreset.outline
      ? { ...basePreset.outline, width: Math.max(1, Math.round(basePreset.outline.width * surface.scale)) }
      : undefined,
  };

  const text = preset.uppercase ? layer.text.toUpperCase() : layer.text;
  setFont(ctx, preset);
  const maxW = preset.maxWidth ?? Math.round(880 * surface.scaleX);
  const lines = wrapLines(ctx, text, maxW);
  const lh = preset.size * 1.1;
  const totalH = lh * lines.length;

  // Pozitie libera: x/y sunt fractii 0..1 = centrul textului.
  const cx = layer.x * surface.width;
  const cy = layer.y * surface.height;

  // Fundal pill (badge) — desenat in spatele TUTUROR randurilor, exact ca
  // drawCaption. Doar presetele cu bg (bubblePill, badgeGold) il au. Fara
  // asta, un strat cu font tip badge isi pierdea fundalul la export.
  if (preset.bg) {
    const widest = Math.max(0, ...lines.map((l) => ctx.measureText(l).width));
    const padX = Math.round((basePreset.paddingX ?? 28) * surface.scaleX);
    const padY = Math.round((basePreset.paddingY ?? 16) * surface.scaleY);
    const bw = widest + padX * 2;
    const bh = totalH + padY * 2;
    const r = Math.round((basePreset.radius ?? 16) * surface.scale);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.fillStyle = preset.bg;
    roundRect(ctx, cx - bw / 2, cy - bh / 2, bw, bh, r);
    ctx.fill();
  }

  // Shadow
  if (preset.shadow) {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 18 * surface.scale;
    ctx.shadowOffsetY = 4 * surface.scale;
  } else {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
  }

  // Outline
  if (preset.outline) {
    ctx.strokeStyle = preset.outline.color;
    ctx.lineWidth = preset.outline.width;
    ctx.lineJoin = "round";
    lines.forEach((line, i) => {
      const y = cy - totalH / 2 + lh / 2 + i * lh;
      ctx.strokeText(line, cx, y);
    });
  }

  // Fill
  ctx.fillStyle = layer.color ?? preset.color;
  lines.forEach((line, i) => {
    const y = cy - totalH / 2 + lh / 2 + i * lh;
    ctx.fillText(line, cx, y);
  });

  // Underline (canvas nu are nativ — desenam manual sub fiecare rand)
  if (layer.underline) {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.strokeStyle = layer.color ?? preset.color;
    ctx.lineWidth = Math.max(2, Math.round(preset.size * 0.06));
    lines.forEach((line, i) => {
      const w = ctx.measureText(line).width;
      const y = cy - totalH / 2 + lh / 2 + i * lh + preset.size * 0.42;
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, y);
      ctx.lineTo(cx + w / 2, y);
      ctx.stroke();
    });
  }

  // reset shadow
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
}

/**
 * Deseneaza o lista de TextLayer-e in ordine (primul = cel mai jos).
 */
export function drawTextLayers(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  layers: TextLayer[],
  presetFor: (presetId: string) => TextPreset,
  surface: RenderSurface,
) {
  for (const layer of layers) {
    drawTextLayer(ctx, layer, presetFor(layer.presetId), surface);
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  const rr = Math.min(r, h / 2, w / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawWatermark(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  surface: RenderSurface,
  handle?: string,
  logo?: ImageBitmap,
) {
  if (!handle && !logo) return;
  const padding = 36 * surface.scale;
  const y = surface.height - padding;
  let x = surface.width - padding;
  ctx.save();
  ctx.globalAlpha = 0.85;
  if (handle) {
    const text = handle.startsWith("@") ? handle : `@${handle}`;
    ctx.font = `600 ${Math.max(12, Math.round(26 * surface.scale))}px 'Inter', sans-serif`;
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#FFFFFF";
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 8 * surface.scale;
    ctx.fillText(text, x, y);
    x -= ctx.measureText(text).width + 14 * surface.scale;
  }
  if (logo) {
    const size = 44 * surface.scale;
    ctx.shadowBlur = 0;
    ctx.drawImage(logo, x - size, y - size + 6, size, size);
  }
  ctx.restore();
}

/** Render a single PNG overlay (transparent) for one scene. */
export async function renderOverlay(input: OverlayInputs): Promise<Blob> {
  const surface = makeSurface(input.width, input.height);
  const { canvas, ctx } = makeCanvas(surface);
  ctx.clearRect(0, 0, surface.width, surface.height);
  // textLayers (multi-text) au prioritate; altfel caption vechi. Aceeasi
  // regula ca in renderPreviewFrame (browser-renderer.ts) — preview = export.
  if (input.textLayers && input.textLayers.length > 0) {
    drawTextLayers(
      ctx,
      input.textLayers,
      (id) => TEXT_PRESETS[id] ?? TEXT_PRESETS.hookBold,
      surface,
    );
  } else if (input.caption && input.caption.text.trim()) {
    drawCaption(ctx, input.caption, input.preset, surface);
  }
  drawWatermark(ctx, surface, input.handle, input.logoBitmap);
  return canvasToBlob(canvas);
}

export interface OutroInputs {
  brandName?: string;
  handle?: string;
  phone?: string;
  location?: string;
  logoBitmap?: ImageBitmap;
  primary?: string; // hex
  accent?: string;  // hex
  width?: number;
  height?: number;
}

/** Render outro frame: logo + brand name + handle + CTA. */
export async function renderOutro(input: OutroInputs): Promise<Blob> {
  const surface = makeSurface(input.width, input.height);
  const { canvas, ctx } = makeCanvas(surface);
  // Background gradient (use brand colors if available)
  const grad = ctx.createLinearGradient(0, 0, 0, surface.height);
  grad.addColorStop(0, "#0a0a0a");
  grad.addColorStop(1, input.primary ?? "#1a0f05");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, surface.width, surface.height);

  let cy = surface.height / 2 - 280 * surface.scale;
  if (input.logoBitmap) {
    const s = 280 * surface.scale;
    ctx.drawImage(input.logoBitmap, (surface.width - s) / 2, cy - s / 2, s, s);
    cy += s / 2 + 60 * surface.scale;
  }

  if (input.brandName) {
    ctx.font = `italic 400 ${Math.max(32, Math.round(88 * surface.scale))}px 'Instrument Serif', Georgia, serif`;
    ctx.fillStyle = input.accent ?? "#F4E2B8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(input.brandName, surface.width / 2, cy);
    cy += 110 * surface.scale;
  }

  if (input.handle) {
    const h = input.handle.startsWith("@") ? input.handle : `@${input.handle}`;
    ctx.font = `500 ${Math.max(18, Math.round(40 * surface.scale))}px 'Inter', sans-serif`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(h, surface.width / 2, cy);
    cy += 80 * surface.scale;
  }

  if (input.phone || input.location) {
    ctx.font = `400 ${Math.max(14, Math.round(30 * surface.scale))}px 'Inter', sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    const cta = input.phone ? `Programări: ${input.phone}` : input.location!;
    ctx.fillText(cta, surface.width / 2, cy);
    cy += 60 * surface.scale;
    if (input.phone && input.location) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.font = `400 ${Math.max(12, Math.round(26 * surface.scale))}px 'Inter', sans-serif`;
      ctx.fillText(input.location, surface.width / 2, cy);
    }
  }

  return canvasToBlob(canvas);
}

/** Render intro frame: minimal brand card (logo + name/handle). */
export async function renderIntro(input: OutroInputs): Promise<Blob> {
  const surface = makeSurface(input.width, input.height);
  const { canvas, ctx } = makeCanvas(surface);

  const grad = ctx.createLinearGradient(0, 0, 0, surface.height);
  grad.addColorStop(0, "#0a0a0a");
  grad.addColorStop(0.55, input.primary ?? "#1a0f05");
  grad.addColorStop(1, "#000000");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, surface.width, surface.height);

  // Soft vignette
  const vign = ctx.createRadialGradient(
    surface.width / 2, surface.height / 2, surface.width * 0.2,
    surface.width / 2, surface.height / 2, surface.width * 0.75,
  );
  vign.addColorStop(0, "rgba(0,0,0,0)");
  vign.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = vign;
  ctx.fillRect(0, 0, surface.width, surface.height);

  let cy = surface.height / 2 - 180 * surface.scale;
  if (input.logoBitmap) {
    const s = 320 * surface.scale;
    ctx.drawImage(input.logoBitmap, (surface.width - s) / 2, cy - s / 2, s, s);
    cy += s / 2 + 80 * surface.scale;
  }

  if (input.brandName) {
    ctx.font = `italic 400 ${Math.max(36, Math.round(108 * surface.scale))}px 'Instrument Serif', Georgia, serif`;
    ctx.fillStyle = input.accent ?? "#F4E2B8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(input.brandName, surface.width / 2, cy);
    cy += 120 * surface.scale;
  }

  if (input.handle) {
    const h = input.handle.startsWith("@") ? input.handle : `@${input.handle}`;
    ctx.font = `500 ${Math.max(18, Math.round(38 * surface.scale))}px 'Inter', sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.85)";
    ctx.fillText(h, surface.width / 2, cy);
  }

  return canvasToBlob(canvas);
}

/** Build an ImageBitmap from a logo blob (or null if none). */
export async function logoToBitmap(blob?: Blob): Promise<ImageBitmap | undefined> {
  if (!blob) return undefined;
  try {
    return await createImageBitmap(blob);
  } catch {
    return undefined;
  }
}
