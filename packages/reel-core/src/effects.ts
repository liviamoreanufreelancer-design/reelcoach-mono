/**
 * Catalogul de efecte de clip, DERIVAT din registry (fx/registry.ts).
 *
 * Nu mai definește nimic — expune ce e înregistrat. Regula scrisă aici de la
 * început („UI-ul nu poate oferi un efect pe care engine-ul nu-l randează")
 * e acum structurală, nu o convenție de respectat manual.
 */
import { CLIP_EFFECT_DEFS, TRANSFORM_DEFS } from "./fx/registry";
import type { ParamDef } from "./fx/types";

/**
 * Id-urile rămân un tip îngust, nu `string`: aplicațiile le țin în baza de
 * date, iar o greșeală de scriere trebuie prinsă de compilator.
 */
export type EffectId =
  | "none"
  | "sparkle"
  | "leak"
  | "bokeh"
  | "dust"
  | "glow"
  | "softLight"
  | "lensFlare"
  | "lightSweep"
  | "editorialFrame"
  | "photoMotion";

export interface EffectPreset {
  id: EffectId;
  label: string;
  desc: string;
  /** Ce se poate regla. Studio generează controalele din el. */
  params?: Record<string, ParamDef>;
}

const NONE: EffectPreset = { id: "none", label: "Fără efect", desc: "Niciun overlay." };

export const EFFECT_LIST: EffectPreset[] = [
  NONE,
  // Transformările apar în același selector: pentru parteneră e tot „un efect
  // pe momentul ăsta", iar engine-ul decide unde se aplică.
  ...[...CLIP_EFFECT_DEFS, ...TRANSFORM_DEFS].map((d) => ({
    id: d.id as EffectId,
    label: d.label,
    desc: d.desc,
    params: d.params,
  })),
];

export const EFFECTS: Record<EffectId, EffectPreset> =
  Object.fromEntries(EFFECT_LIST.map((e) => [e.id, e])) as Record<EffectId, EffectPreset>;
