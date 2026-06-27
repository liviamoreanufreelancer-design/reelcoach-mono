import type { TextPreset, TextPosition } from "./text-presets";

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

export interface OverlayInputs {
  caption?: Caption;
  preset: TextPreset;
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

function wrapLines(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const out: string[] = [];
  for (const para of text.split(/\n/)) {
    const words = para.split(/\s+/);
    let line = "";
    for (const w of words) {
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
  if (input.caption && input.caption.text.trim()) {
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
