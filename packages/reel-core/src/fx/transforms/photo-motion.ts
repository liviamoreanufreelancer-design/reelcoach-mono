/**
 * ════════════════════════════════════════════════════════════════════
 *  PHOTO → MOTION — poza devine parte din film
 * ════════════════════════════════════════════════════════════════════
 *
 * SCOP. ReelCoach cere intenționat și poze, nu doar filmări: rezultatul final,
 * before/after, prim-planul de culoare — un cadru extras din video iese
 * neclar. Dar o poză pusă ca atare într-un reel se citește ca diapozitiv, iar
 * ritmul se rupe exact la momentul cel mai important.
 *
 * Efectul ăsta o face să pară filmată în aceeași secvență.
 *
 * DE CE NU E KEN BURNS. Ken Burns e o mișcare de prezentare: pornește, merge
 * constant, se oprește când se termină slide-ul. Diferența e în trei detalii:
 *
 *   1. Mișcarea SE AȘAZĂ (curba `settle`), nu merge liniar. O cameră pe stativ
 *      care se apropie încetinește la final; una automată nu.
 *   2. Amplitudinea e mică — 6% implicit, nu 20%. Peste ~10% ochiul vede
 *      mișcarea în loc de subiect.
 *   3. Punctul se alege. Ken Burns-ul de dinainte era ±4% ales AUTOMAT după
 *      indexul clipului, deci se apropia la fel de des de bărbie ca de păr.
 *
 * FEL NOU DE EFECT. Nu desenează nimic: schimbă cum e desenat cadrul. De asta
 * există `kind: "transform"` — un efect de clip pune ceva PESTE imagine, iar o
 * poză nu poate fi făcută să se miște desenând deasupra ei.
 *
 * Merge și pe filmări, nu doar pe poze — dar acolo e rareori nevoie: filmarea
 * are deja mișcarea ei.
 *
 * DURATĂ: 1–2,5s. Are nevoie de timp; sub o secundă, mișcarea lentă nu se
 * citește deloc.
 */
import type { TransformDef } from "../types";
import { num, str } from "../types";
import { settle, clamp01 } from "../easing";

export const photoMotion: TransformDef = {
  id: "photoMotion",
  kind: "transform",
  label: "Photo → Motion",
  desc: "Poza capătă o mișcare fină de aparat, ca să nu pară diapozitiv.",
  params: {
    move: {
      kind: "choice", label: "Mișcare", default: "in",
      options: [
        { value: "in", label: "Apropiere" },
        { value: "out", label: "Depărtare" },
        { value: "panLeft", label: "Panoramare stânga" },
        { value: "panRight", label: "Panoramare dreapta" },
        { value: "rise", label: "Urcare lentă" },
      ],
    },
    amount: { kind: "number", label: "Cât de mult", min: 0.02, max: 0.16, step: 0.01, default: 0.06 },
    focusX: { kind: "number", label: "Spre ce punct — X", min: 0, max: 1, step: 0.01, default: 0.5 },
    focusY: { kind: "number", label: "Spre ce punct — Y", min: 0, max: 1, step: 0.01, default: 0.42 },
  },

  motion({ localMs, clipMs, params }) {
    const kind = str(params, "move", "in");
    const amt = num(params, "amount", 0.06);
    const fx = clamp01(num(params, "focusX", 0.5));
    const fy = clamp01(num(params, "focusY", 0.42));

    const e = settle(clamp01(localMs / Math.max(1, clipMs)));

    if (kind === "panLeft" || kind === "panRight") {
      // Panoramarea cere o supradimensionare constantă, altfel ar intra
      // marginile în cadru pe măsură ce imaginea se deplasează.
      const dir = kind === "panLeft" ? -1 : 1;
      return { scale: 1 + amt, dx: dir * amt * 0.5 * (e - 0.5), dy: 0 };
    }
    if (kind === "rise") {
      return { scale: 1 + amt, dx: 0, dy: -amt * 0.5 * (e - 0.5) };
    }

    // Apropiere / depărtare spre punctul ales. Deplasarea mută centrul
    // scalării spre punct, ca apropierea să intre în subiect, nu în mijloc.
    const scale = kind === "out" ? 1 + amt - amt * e : 1 + amt * e;
    const grow = scale - 1;
    return { scale, dx: (0.5 - fx) * grow, dy: (0.5 - fy) * grow };
  },
};
