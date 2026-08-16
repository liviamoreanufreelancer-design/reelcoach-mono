/**
 * ════════════════════════════════════════════════════════════════════
 *  FOCUS PULL — obiectivul găsește claritatea
 * ════════════════════════════════════════════════════════════════════
 *
 * SCOP. Cadrul începe ușor moale și se limpezește. Pe textura părului, pe
 * culoare, pe bucle, pe rezultatul final — momentul în care detaliul apare
 * e mai puternic decât detaliul în sine.
 *
 * DE CE NU E „BLUR CARE SCADE". Un obiectiv real nu trece liniar de la
 * neclar la clar: aproape toată schimbarea se petrece în ultima treime a
 * cursei, iar apoi se oprește ferm. Curba `settle` face exact asta. Cu o
 * mișcare liniară, ochiul citește „efect care se stinge", nu „aparat care
 * focalizează".
 *
 * Al doilea detaliu: o micro-apropiere care merge odată cu claritatea.
 * Obiectivele reale își schimbă ușor unghiul când focalizează („focus
 * breathing"). E sub un procent și jumătate, deci nu se vede — dar lipsa ei
 * se simte.
 *
 * COSTUL, ȘI DE CE E UN `transform`. Estomparea intră în lanțul de filtre cu
 * care se desenează oricum cadrul (gradarea automată + filtrul partenerei),
 * deci nu costă nicio desenare în plus. Ca efect de clip ar fi trebuit să
 * redeseneze tot cadrul o dată în plus — pe cel mai scump efect din
 * bibliotecă, exact ce nu-ți permiți.
 *
 * PLAFON. Estomparea maximă e 14px la 1080. Peste, nu mai arată a
 * defocalizare, ci a geam aburit — și costul crește repede.
 *
 * DURATĂ: 0,5–1,2s. Se aplică la începutul clipului.
 *
 * MERGE CEL MAI BINE: pe prim-planuri statice. Pe un cadru care se mișcă
 * deja, claritatea care apare se pierde în mișcare.
 */
import type { TransformDef } from "../types";
import { num } from "../types";
import { settle, clamp01 } from "../easing";

export const focusPull: TransformDef = {
  id: "focusPull",
  kind: "transform",
  label: "Focus Pull",
  desc: "Cadrul pornește moale și se limpezește, ca un obiectiv real.",
  params: {
    startBlur: { kind: "number", label: "Cât de moale pornește", min: 1, max: 14, step: 0.5, default: 7, unit: "px" },
    duration:  { kind: "number", label: "Cât durează focalizarea", min: 0.3, max: 2, step: 0.1, default: 0.9, unit: "s" },
    breath:    { kind: "number", label: "Micro-apropiere", min: 0, max: 0.03, step: 0.005, default: 0.012 },
  },

  motion({ localMs, clipMs, params }) {
    const start = num(params, "startBlur", 7);
    const durMs = Math.max(1, num(params, "duration", 0.9) * 1000);
    const breath = num(params, "breath", 0.012);

    // Progresul focalizării. După fereastră, cadrul e clar și nu mai plătim
    // nimic — `blurPx` 0 înseamnă că filtrul nici nu se adaugă în lanț.
    const p = clamp01(localMs / Math.min(durMs, Math.max(1, clipMs)));
    const e = settle(p);

    return {
      // Apropierea se retrage odată cu claritatea: pornește puțin mai închis
      // și se așază, ca la respirația unui obiectiv.
      scale: 1 + breath * (1 - e),
      dx: 0,
      dy: 0,
      blurPx: start * (1 - e),
    };
  },
};
