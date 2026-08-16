/**
 * Catalogul de tranziții, DERIVAT din registry (fx/registry.ts).
 *
 * Fișierul ăsta nu mai definește nimic — expune ce e înregistrat, în forma
 * pe care o consumă cele două apps. Un efect nou apare aici automat, deci nu
 * mai există riscul ca Studio să ofere ceva ce engine-ul nu randează.
 */
import { TRANSITION_DEFS } from "./fx/registry";
import type { ParamDef } from "./fx/types";

/**
 * Id-urile rămân un tip îngust, nu `string`: aplicațiile le țin în baza de
 * date și le compară, iar o greșeală de scriere trebuie prinsă de compilator.
 * Un efect nou se adaugă aici o dată, lângă fișierul lui.
 */
export type TransitionId =
  | "cut"
  | "fade"
  | "flash"
  | "zoom"
  | "glitch"
  | "blur"
  | "slide"
  | "spin"
  | "whipPan"
  | "smoothZoom"
  | "motionBlur"
  | "zoomThrough"
  | "splitReveal"
  | "whip"
  | "hairSweep";

export interface TransitionPreset {
  id: TransitionId;
  label: string;
  desc: string;
  durationMs: number;
  /** Ce se poate regla la efectul ăsta. Studio generează controalele din el. */
  params?: Record<string, ParamDef>;
}

export const TRANSITION_LIST: TransitionPreset[] = TRANSITION_DEFS.map((d) => ({
  id: d.id as TransitionId,
  label: d.label,
  desc: d.desc,
  durationMs: d.durationMs,
  params: d.params,
}));

export const TRANSITIONS: Record<TransitionId, TransitionPreset> =
  Object.fromEntries(TRANSITION_LIST.map((t) => [t.id, t])) as Record<TransitionId, TransitionPreset>;
