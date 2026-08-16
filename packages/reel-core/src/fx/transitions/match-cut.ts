/**
 * ════════════════════════════════════════════════════════════════════
 *  MATCH CUT — două compoziții devin una
 * ════════════════════════════════════════════════════════════════════
 *
 * SCOP. Mâna e în același loc, capul e în același loc, părul ocupă aceeași
 * zonă — iar tăietura devine invizibilă. Privitorul vede transformarea, nu
 * efectul: „cum s-au legat cadrele astea două atât de bine?"
 *
 * CE FACE CODUL ȘI CE NU. Potrivirea a două compoziții e o decizie de montaj,
 * nu una automată: ca s-o detecteze singur, codul ar trebui să analizeze
 * imaginea, ceea ce nu încape în bugetul de timp real. Deci partenera declară
 * punctul de potrivire pe FIECARE clip, iar efectul face restul — aliniază
 * cele două puncte, apoi le lasă să se desprindă lin. Inteligența e a ei;
 * codul doar ascunde diferența rămasă.
 *
 * De asta sunt DOUĂ puncte, nu unul. Cu un singur punct n-ai ce alinia: știi
 * unde e mâna în primul cadru, dar nu și în al doilea.
 *
 * MECANICA. La t=0, cadrul care intră e translatat și scalat astfel încât
 * punctul lui să cadă exact peste punctul celuilalt. Până la t=1 se întoarce
 * la poziția lui naturală. Amestecul e SCURT și centrat pe mijloc (nu liniar
 * pe toată durata) — un match cut bun se simte ca o tăietură, nu ca un fade;
 * amestecul e doar acolo cât să ascundă neconcordanța.
 *
 * DURATĂ: 0,3–0,7s. Peste, încetează să mai fie tăietură.
 *
 * MERGE CEL MAI BINE: pe același subiect, două momente diferite — before →
 * after, mâna care aplică → mâna care aranjează. Pe subiecte diferite n-are
 * ce potrivi și devine un dissolve scump.
 */
import type { TransitionDef } from "../types";
import { num } from "../types";
import { easeInOut, settle, clamp01, peak, px } from "../easing";

export const matchCut: TransitionDef = {
  id: "matchCut",
  kind: "transition",
  label: "Match Cut",
  desc: "Două compoziții aliniate: tăietura devine invizibilă.",
  durationMs: 480,
  params: {
    fromX: { kind: "number", label: "Punct pe cadrul care iese — X", min: 0, max: 1, step: 0.01, default: 0.5 },
    fromY: { kind: "number", label: "Punct pe cadrul care iese — Y", min: 0, max: 1, step: 0.01, default: 0.5 },
    toX:   { kind: "number", label: "Punct pe cadrul care intră — X", min: 0, max: 1, step: 0.01, default: 0.5 },
    toY:   { kind: "number", label: "Punct pe cadrul care intră — Y", min: 0, max: 1, step: 0.01, default: 0.5 },
    scale: { kind: "number", label: "Apropiere în timpul legăturii", min: 1, max: 1.4, step: 0.01, default: 1.06 },
    blur:  { kind: "number", label: "Estompare la mijloc", min: 0, max: 8, step: 0.5, default: 2, unit: "px" },
  },

  draw({ ctx, from, to, t, width, height, params }) {
    const fx = clamp01(num(params, "fromX", 0.5));
    const fy = clamp01(num(params, "fromY", 0.5));
    const tx = clamp01(num(params, "toX", 0.5));
    const ty = clamp01(num(params, "toY", 0.5));
    const zoom = num(params, "scale", 1.06);
    const soft = num(params, "blur", 2);

    const e = settle(t);
    // Cât de mult mai trebuie mutat cadrul care intră ca punctele să coincidă.
    // Scade spre 0: la final stă unde îi e locul.
    const offX = (fx - tx) * width * (1 - e);
    const offY = (fy - ty) * height * (1 - e);

    // Apropierea culminează la mijloc, pe amândouă cadrele deodată. Mișcarea
    // comună e ce leagă cele două imagini — dacă doar unul se mișcă, se vede
    // tăietura.
    const z = 1 + (zoom - 1) * peak(t);
    const blurPx = soft > 0 ? px(width, soft * peak(t)) : 0;

    const drawAligned = (
      img: CanvasImageSource, alpha: number, ax: number, ay: number, dx: number, dy: number,
    ) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      if (blurPx > 0.15) ctx.filter = `blur(${blurPx}px)`;
      // Deplasarea e deja în prima translație; imaginea se desenează la
      // origine, altfel s-ar anula singură.
      ctx.translate(ax * width + dx, ay * height + dy);
      ctx.scale(z, z);
      ctx.translate(-ax * width, -ay * height);
      ctx.drawImage(img, 0, 0, width, height);
      ctx.restore();
    };

    // Amestec scurt, centrat: 0 până la 35%, 1 după 65%. Între ele, trecerea.
    const mix = easeInOut(clamp01((t - 0.35) / 0.3));

    drawAligned(from, 1, fx, fy, 0, 0);
    if (mix > 0.002) drawAligned(to, mix, tx, ty, offX, offY);
  },
};
