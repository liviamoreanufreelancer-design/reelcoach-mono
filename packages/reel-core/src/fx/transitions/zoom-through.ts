/**
 * ════════════════════════════════════════════════════════════════════
 *  ZOOM THROUGH — camera intră în subiect
 * ════════════════════════════════════════════════════════════════════
 *
 * SCOP. Prim-plan pe păr → camera pătrunde în textură → scena următoare
 * începe din interiorul imaginii. Trecerea nu e o suprapunere, e o mișcare
 * de aparat continuată dincolo de cadru.
 *
 * CUM ARATĂ. Cadrul care iese se apropie accelerat spre un punct ales, se
 * înmoaie ușor și se stinge exact când mișcarea e cea mai rapidă. Cadrul care
 * intră vine dinspre supradimensionare spre poziția lui, în jurul ACELUIAȘI
 * punct. Continuitatea punctului e tot secretul: dacă cele două zoom-uri au
 * centre diferite, ochiul vede două mișcări lipite, nu una singură.
 *
 * DE CE E CONFIGURABIL PUNCTUL. Partenera trebuie să poată pune pătrunderea
 * peste păr, mâini, unealtă sau detaliul de culoare — locul contează mai mult
 * decât intensitatea. Un zoom centrat pe mijlocul geometric intră aproape
 * mereu în locul greșit, fiindcă subiectul e rareori în mijloc.
 *
 * DURATĂ RECOMANDATĂ: 0,4–0,8s. Sub 0,4 nu se citește ca mișcare de aparat,
 * ci ca tăietură; peste 0,8 devine un efect, adică se vede.
 *
 * CÂND MERGE CEL MAI BINE: din prim-plan în prim-plan. Dintr-un plan larg
 * într-altul larg, pătrunderea n-are în ce intra și pare doar o mărire.
 *
 * COST. Două desenări transformate + un blur mic. Ieftin.
 */
import type { TransitionDef } from "../types";
import { num } from "../types";
import { accelerate, settle, clamp01, px } from "../easing";

export const zoomThrough: TransitionDef = {
  id: "zoomThrough",
  kind: "transition",
  label: "Zoom Through",
  desc: "Camera pătrunde în detaliu și iese în scena următoare.",
  durationMs: 560,
  params: {
    intensity: {
      kind: "number", label: "Cât de adânc intră",
      min: 1.2, max: 3.5, step: 0.1, default: 2.1,
    },
    focusX: {
      kind: "number", label: "Punct — stânga/dreapta",
      min: 0, max: 1, step: 0.01, default: 0.5,
    },
    focusY: {
      kind: "number", label: "Punct — sus/jos",
      min: 0, max: 1, step: 0.01, default: 0.42,
    },
    softness: {
      kind: "number", label: "Înmuiere la viteză maximă",
      min: 0, max: 14, step: 0.5, default: 5, unit: "px",
    },
  },

  draw({ ctx, from, to, t, width, height, params }) {
    const depth = num(params, "intensity", 2.1);
    const fx = clamp01(num(params, "focusX", 0.5));
    const fy = clamp01(num(params, "focusY", 0.42));
    const soft = num(params, "softness", 5);

    // Punctul de pătrundere, în pixeli. (`cx/cy`, nu `px` — `px()` e
    // convertorul de unități din fx/easing.ts.)
    const cx = fx * width;
    const cy = fy * height;

    // Cadrul care IESE: accelerează spre punct. Accelerarea (nu easeInOut) e
    // ce face mișcarea să pară că trece PRIN imagine, nu că se oprește în ea.
    const a = accelerate(t);
    const outScale = 1 + (depth - 1) * a;
    ctx.save();
    ctx.globalAlpha = 1 - a;
    if (soft > 0) ctx.filter = `blur(${px(width, a * soft)}px)`;
    // Scalăm în jurul punctului ales: translatăm punctul în origine, scalăm,
    // îl punem la loc. Fără asta, zoom-ul ar fi mereu pe centrul geometric.
    ctx.translate(cx, cy);
    ctx.scale(outScale, outScale);
    ctx.translate(-cx, -cy);
    ctx.drawImage(from, 0, 0, width, height);
    ctx.restore();

    // Cadrul care INTRĂ: se așază din supradimensionare, în jurul aceluiași
    // punct. `settle` frânează lung — mișcarea se odihnește, nu se oprește.
    const s = settle(t);
    const inScale = depth - (depth - 1) * s;
    ctx.save();
    ctx.globalAlpha = s;
    if (soft > 0) ctx.filter = `blur(${px(width, (1 - s) * soft * 0.6)}px)`;
    ctx.translate(cx, cy);
    ctx.scale(inScale, inScale);
    ctx.translate(-cx, -cy);
    ctx.drawImage(to, 0, 0, width, height);
    ctx.restore();
  },
};
