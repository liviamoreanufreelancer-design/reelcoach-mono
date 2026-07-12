/**
 * ════════════════════════════════════════════════════════════════════
 *  LAYER → CSS — oglindirea unui TextPreset (+ override-uri) in CSS
 * ════════════════════════════════════════════════════════════════════
 *
 *  Un singur loc care traduce un TextPreset + override-urile per strat
 *  (bold/italic/underline/culoare/sizeScale) in stil CSS. Folosit atat de
 *  editorul in-place (SceneTextEditor) cat si de LivePreview, ca ambele sa
 *  arate textul IDENTIC (ecou vizual al canvas-ului de export).
 *
 *  `scale` = latimea reala a preview-ului / 1080 (canvas de baza).
 * ════════════════════════════════════════════════════════════════════
 */

import type { CSSProperties } from "react";
import type { TextPreset } from "@reelcoach/core";

/** Override-uri de stil per strat (peste preset). */
export interface LayerStyleInput {
  color?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  sizeScale?: number;
}

export function layerCss(preset: TextPreset, o: LayerStyleInput, scale: number): CSSProperties {
  const s: CSSProperties = {
    fontFamily: preset.font,
    fontWeight: o.bold ? Math.max(preset.weight, 800) : preset.weight,
    fontStyle: (o.italic ?? preset.italic) ? "italic" : "normal",
    fontSize: `${preset.size * (o.sizeScale ?? 1) * scale}px`,
    lineHeight: 1.1,
    color: o.color ?? preset.color,
    letterSpacing: preset.letterSpacing ? `${preset.letterSpacing * scale}px` : undefined,
    textTransform: preset.uppercase ? "uppercase" : "none",
    textAlign: "center",
    textDecoration: o.underline ? "underline" : "none",
    maxWidth: `${(preset.maxWidth ?? 880) * scale}px`,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  };
  // Fundal pill (badge) — oglindeste drawTextLayer/drawCaption (preview = export).
  if (preset.bg) {
    s.background = preset.bg;
    s.padding = `${(preset.paddingY ?? 16) * scale}px ${(preset.paddingX ?? 28) * scale}px`;
    s.borderRadius = `${(preset.radius ?? 16) * scale}px`;
  }
  if (preset.shadow) s.textShadow = "0 2px 6px rgba(0,0,0,0.55)";
  if (preset.outline) {
    s.WebkitTextStroke = `${preset.outline.width * scale}px ${preset.outline.color}`;
    (s as CSSProperties & { paintOrder?: string }).paintOrder = "stroke fill";
  }
  return s;
}
