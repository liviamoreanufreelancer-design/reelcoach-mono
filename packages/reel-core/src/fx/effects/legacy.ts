/**
 * ════════════════════════════════════════════════════════════════════
 *  Cele 8 efecte de clip istorice, mutate din bucla de randare
 * ════════════════════════════════════════════════════════════════════
 *
 * Codul de desen e NESCHIMBAT — mutare mecanică, ca reelurile publicate să
 * arate identic. S-au mutat aici din două motive:
 *
 *   1. `browser-renderer.ts` avea 1449 de linii, din care ~330 erau desen de
 *      efecte care n-avea ce căuta lângă bucla de timing.
 *   2. Ca `effects.ts` să poată fi DERIVAT integral din registry. Cât timp
 *      opt efecte trăiau în afara lui, existau două liste — exact ce am spus
 *      că nu vrem.
 *
 * N-au parametri: au fost scrise cu valori fixate. Se parametrizează una câte
 * una, când o cere un caz real.
 */
import type { ClipEffectDef } from "../types";
import { clamp01 } from "../easing";

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

// ─────────────────────────────────────────────────────────────────────
//  LIVE PREVIEW  (C.0)
// ─────────────────────────────────────────────────────────────────────

/** Ambalajul de registry peste desenul de mai sus. */
function legacyEffect(id: string, label: string, desc: string): ClipEffectDef {
  return {
    id, kind: "clip", label, desc,
    draw: ({ ctx, localMs, clipMs, width, height }) =>
      drawPremiumEffect(ctx, id, localMs, clipMs, width, height),
  };
}

export const sparkleEffect = legacyEffect("sparkle", "Sparkle", "Sclipiri aurii — transformări lux, momente de reveal.");
export const leakEffect = legacyEffect("leak", "Light leak", "Pete calde care plutesc, cinematic vintage soft.");
export const bokehEffect = legacyEffect("bokeh", "Bokeh", "Pete blurate, dreamy, profunzime de câmp.");
export const dustEffect = legacyEffect("dust", "Particule", "Particule fine de aur căzând lent în lumină.");
export const glowEffect = legacyEffect("glow", "Glow", "Bloom real — highlight-urile strălucesc din cadru.");
export const softLightEffect = legacyEffect("softLight", "Soft light", "Difuzie Orton — piele luminoasă, soft, dreamy.");
export const lensFlareEffect = legacyEffect("lensFlare", "Lens flare", "Reflexie anamorfică — miez fierbinte + dâră orizontală.");

export { drawPremiumEffect };
