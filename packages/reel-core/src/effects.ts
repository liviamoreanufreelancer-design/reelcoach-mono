/**
 * Premium visual effects catalog — the single source of truth for the
 * frame overlays the renderer can draw (see drawPremiumEffect in
 * browser-renderer.ts). Both apps derive their effect pickers from this,
 * so the UI can never offer an effect the engine doesn't actually render.
 */

export type EffectId =
  | "none"
  | "sparkle"
  | "leak"
  | "bokeh"
  | "dust"
  | "glow"
  | "softLight"
  | "lensFlare";

export interface EffectPreset {
  id: EffectId;
  label: string;
  desc: string;
}

export const EFFECTS: Record<EffectId, EffectPreset> = {
  none:      { id: "none",      label: "Fără efect", desc: "Niciun overlay." },
  sparkle:   { id: "sparkle",   label: "Sparkle",    desc: "Sclipiri aurii — transformări lux, momente de reveal." },
  leak:      { id: "leak",      label: "Light leak", desc: "Pete calde care plutesc, cinematic vintage soft." },
  bokeh:     { id: "bokeh",     label: "Bokeh",      desc: "Pete blurate, dreamy, profunzime de câmp." },
  dust:      { id: "dust",      label: "Particule",  desc: "Particule fine de aur căzând lent în lumină." },
  glow:      { id: "glow",      label: "Glow",       desc: "Bloom real — highlight-urile strălucesc din cadru." },
  softLight: { id: "softLight", label: "Soft light", desc: "Difuzie Orton — piele luminoasă, soft, dreamy." },
  lensFlare: { id: "lensFlare", label: "Lens flare", desc: "Reflexie anamorfică — miez fierbinte + dâră orizontală." },
};

export const EFFECT_LIST: EffectPreset[] = [
  EFFECTS.none,
  EFFECTS.sparkle,
  EFFECTS.glow,
  EFFECTS.softLight,
  EFFECTS.lensFlare,
  EFFECTS.leak,
  EFFECTS.bokeh,
  EFFECTS.dust,
];
