/**
 * ════════════════════════════════════════════════════════════════════
 *  FREEZE + DETAIL ZOOM — cadrul se oprește și se apropie
 * ════════════════════════════════════════════════════════════════════
 *
 * SCOP. Momentul se oprește pe imaginea bună, ține o clipă, apoi se apropie
 * de detaliul care contează. Rezultatul final, nuanța de culoare, luciul.
 * Pauza spune „uită-te aici" mai clar decât orice text.
 *
 * DECIZIA DE TIMP, ȘI DE CE E IMPORTANTĂ. Înghețarea NU lungește reel-ul:
 * mănâncă din durata proprie a momentului. Un moment de 3 secunde cu o
 * înghețare de 1 secundă rămâne de 3 secunde — 2 de mișcare, 1 de oprire.
 *
 * Alternativa (să adauge timp) ar fi însemnat că un reel de 20s devine 26s
 * fără ca partenera să fi cerut asta, iar `sec` din editor n-ar mai fi
 * însemnat nimic. Duratele trebuie să rămână ce scrie în ele.
 *
 * CUM FUNCȚIONEAZĂ. Nu oprește ceasul — oprește avansarea sursei. Clipul își
 * consumă durata mai departe, dar pe ecran rămâne ultimul cadru redat. De
 * asta `freeze()` e o metodă separată de `motion()`: una spune engine-ului
 * să nu mai avanseze filmarea, cealaltă desenează apropierea peste ea.
 *
 * APROPIEREA E MICĂ dinadins — 8% implicit. Un zoom mare pe o imagine oprită
 * arată exact ca efectul de TikTok pe care nu-l vrem: dramatic și ieftin.
 * La 8%, ochiul simte că s-a apropiat, fără să vadă că s-a apropiat.
 *
 * DURATĂ TOTALĂ: 0,8–1,5s de oprire, la finalul momentului.
 *
 * MERGE CEL MAI BINE: pe ultimul moment dinaintea unei tranziții tari, și pe
 * rezultatul final. Pe un moment de proces, oprirea rupe ritmul degeaba.
 */
import type { TransformDef } from "../types";
import { num, str } from "../types";
import { settle, clamp01 } from "../easing";

export const freezeZoom: TransformDef = {
  id: "freezeZoom",
  kind: "transform",
  label: "Freeze + Detail Zoom",
  desc: "Imaginea se oprește la final și se apropie ușor de detaliu.",
  params: {
    hold:   { kind: "number", label: "Cât ține oprirea", min: 0.3, max: 2, step: 0.1, default: 1, unit: "s" },
    zoom:   { kind: "number", label: "Cât se apropie", min: 0.02, max: 0.25, step: 0.01, default: 0.08 },
    focusX: { kind: "number", label: "Spre ce punct — X", min: 0, max: 1, step: 0.01, default: 0.5 },
    focusY: { kind: "number", label: "Spre ce punct — Y", min: 0, max: 1, step: 0.01, default: 0.42 },
    easing: {
      kind: "choice", label: "Cum pornește apropierea", default: "settle",
      options: [
        { value: "settle", label: "Se așază (recomandat)" },
        { value: "linear", label: "Constant" },
      ],
    },
  },

  /** Fereastra de oprire: ultimele `hold` secunde ale momentului. */
  freeze({ localMs, clipMs, params }) {
    const holdMs = num(params, "hold", 1) * 1000;
    return localMs >= Math.max(0, clipMs - holdMs);
  },

  motion({ localMs, clipMs, params }) {
    const holdMs = num(params, "hold", 1) * 1000;
    const amt = num(params, "zoom", 0.08);
    const fx = clamp01(num(params, "focusX", 0.5));
    const fy = clamp01(num(params, "focusY", 0.42));
    const linear = str(params, "easing", "settle") === "linear";

    const start = Math.max(0, clipMs - holdMs);
    if (localMs < start) return { scale: 1, dx: 0, dy: 0 };

    const raw = clamp01((localMs - start) / Math.max(1, holdMs));
    const e = linear ? raw : settle(raw);
    const scale = 1 + amt * e;
    const grow = scale - 1;
    // Centrul apropierii se mută spre punctul ales, ca detaliul să intre în
    // cadru, nu mijlocul geometric.
    return { scale, dx: (0.5 - fx) * grow, dy: (0.5 - fy) * grow };
  },
};
