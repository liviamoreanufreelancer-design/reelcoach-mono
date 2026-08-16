/**
 * ════════════════════════════════════════════════════════════════════
 *  EDITORIAL FRAME — semnătura grafică, nu o ramă
 * ════════════════════════════════════════════════════════════════════
 *
 * SCOP. Aceeași filmare arată altfel dacă are în jurul ei disciplina unei
 * pagini de revistă. Nu adaugă nimic la imagine; adaugă intenție.
 *
 * REGULA CARE ÎL SEPARĂ DE UN STICKER DE INSTAGRAM: linia trebuie să fie la
 * limita vizibilului. Grosime sub un pixel la 1080, opacitate 0,3. Dacă o
 * observi înainte să observi părul, e prea tare. De asta implicitul e
 * „colțuri", nu „ramă": patru semne scurte sugerează un cadru fără să
 * închidă imaginea într-o cutie.
 *
 * Apare și dispare lin, pe primele și ultimele câteva zecimi. O ramă care
 * apare instantaneu se citește ca element de interfață, nu ca tratament.
 *
 * DURATĂ: de la o jumătate de secundă până la tot clipul.
 *
 * MERGE CEL MAI BINE: pe rezultatul final și pe prim-planuri liniștite. Pe
 * cadre cu mișcare multă se pierde, și e în regulă să se piardă.
 */
import type { ClipEffectDef } from "../types";
import { num, str } from "../types";
import { clamp01, px } from "../easing";

export const editorialFrame: ClipEffectDef = {
  id: "editorialFrame",
  kind: "clip",
  label: "Editorial Frame",
  desc: "Cadru grafic discret, ca într-o revistă. Aproape invizibil.",
  params: {
    style: {
      kind: "choice", label: "Stil", default: "corners",
      options: [
        { value: "corners", label: "Colțuri" },
        { value: "frame", label: "Ramă completă" },
        { value: "crop", label: "Linii de încadrare" },
      ],
    },
    inset:     { kind: "number", label: "Distanță de la margine", min: 0.02, max: 0.14, step: 0.005, default: 0.055 },
    thickness: { kind: "number", label: "Grosime", min: 0.5, max: 3, step: 0.25, default: 1, unit: "px" },
    opacity:   { kind: "number", label: "Intensitate", min: 0.05, max: 0.8, step: 0.05, default: 0.3 },
    fade:      { kind: "number", label: "Apariție / dispariție", min: 0, max: 1.2, step: 0.05, default: 0.4, unit: "s" },
  },

  draw({ ctx, localMs, clipMs, width, height, params }) {
    const style = str(params, "style", "corners");
    const inset = num(params, "inset", 0.055);
    const thick = num(params, "thickness", 1);
    const maxA = num(params, "opacity", 0.3);
    const fadeMs = num(params, "fade", 0.4) * 1000;

    // Apariție și dispariție lină. Fără ele, rama „clipește" la tăieturi.
    let a = maxA;
    if (fadeMs > 0) {
      const inA = clamp01(localMs / fadeMs);
      const outA = clamp01((clipMs - localMs) / fadeMs);
      a = maxA * Math.min(inA, outA);
    }
    if (a <= 0.004) return;

    const m = inset * width;
    const x0 = m, y0 = m, x1 = width - m, y1 = height - m;

    ctx.save();
    ctx.globalAlpha = a;
    ctx.strokeStyle = "rgba(255,255,255,0.92)";
    ctx.lineWidth = Math.max(0.5, px(width, thick));
    ctx.beginPath();

    if (style === "frame") {
      ctx.rect(x0, y0, x1 - x0, y1 - y0);
    } else if (style === "crop") {
      // Linii care ies din cadru, ca semnele de tăiere de la tipar.
      const len = (x1 - x0) * 0.16;
      ctx.moveTo(x0, y0 - len * 0.4); ctx.lineTo(x0, y0 + len);
      ctx.moveTo(x1, y1 + len * 0.4); ctx.lineTo(x1, y1 - len);
      ctx.moveTo(x0 - len * 0.25, y1); ctx.lineTo(x0 + len, y1);
      ctx.moveTo(x1 + len * 0.25, y0); ctx.lineTo(x1 - len, y0);
    } else {
      // Colțuri: patru semne scurte. Sugerează cadrul fără să-l închidă.
      const len = Math.min(x1 - x0, y1 - y0) * 0.09;
      ctx.moveTo(x0, y0 + len); ctx.lineTo(x0, y0); ctx.lineTo(x0 + len, y0);
      ctx.moveTo(x1 - len, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + len);
      ctx.moveTo(x1, y1 - len); ctx.lineTo(x1, y1); ctx.lineTo(x1 - len, y1);
      ctx.moveTo(x0 + len, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - len);
    }

    ctx.stroke();
    ctx.restore();
  },
};
