/**
 * ════════════════════════════════════════════════════════════════════
 *  WHIP PAN — o singură mișcare de aparat, nu două cadre care alunecă
 * ════════════════════════════════════════════════════════════════════
 *
 * NU E UN EFECT NOU. `whipPan` există printre cele 11 istorice. Ăsta îl
 * înlocuiește cu versiunea parametrizată: patru direcții în loc de una,
 * intensitate și estompare reglabile, și o mișcare mai apropiată de o cameră
 * reală. Vechiul rămâne în bibliotecă pentru reelurile deja publicate.
 *
 * CE ÎL FACE SĂ PARĂ CAMERĂ, NU DOUĂ DREPTUNGHIURI:
 *
 *   1. Dâra e direcțională. `ctx.filter` blur e izotrop — împrăștie egal în
 *      toate direcțiile, adică arată a defocalizare, nu a mișcare. Dâra reală
 *      se construiește din copii decalate pe axa mișcării, cu opacitate
 *      descrescătoare. Ăsta e și motivul pentru care efectul costă mai mult
 *      decât celelalte: sunt mai multe desenări per cadru.
 *
 *   2. Cadrul se comprimă ușor pe axa mișcării, la viteză maximă. O cameră
 *      rotită rapid „strânge" imaginea; fără asta, mișcarea pare o glisare.
 *
 *   3. Amândouă cadrele merg în ACEEAȘI direcție. Dacă al doilea vine din
 *      partea opusă, ochiul citește două mișcări, nu una continuată.
 *
 * DURATĂ: 0,25–0,6s. E singurul efect din bibliotecă unde viteza mare e
 * intenția, nu un compromis.
 *
 * MERGE CEL MAI BINE: între momente cu energie — schimbarea de unghi, trecerea
 * de la proces la rezultat. Pe două cadre calme pare gratuit.
 */
import type { TransitionDef } from "../types";
import { num, str } from "../types";
import { easeInOut, peak, clamp01 } from "../easing";

export const whipPan: TransitionDef = {
  id: "whip",
  kind: "transition",
  label: "Whip Pan",
  desc: "O singură mișcare rapidă de aparat leagă cele două cadre.",
  durationMs: 380,
  params: {
    direction: {
      kind: "choice", label: "Direcție", default: "left",
      options: [
        { value: "left", label: "Spre stânga" },
        { value: "right", label: "Spre dreapta" },
        { value: "up", label: "În sus" },
        { value: "down", label: "În jos" },
      ],
    },
    intensity: { kind: "number", label: "Cât de departe fuge cadrul", min: 0.6, max: 1.6, step: 0.05, default: 1 },
    smear:     { kind: "number", label: "Lungimea dârei", min: 0, max: 0.35, step: 0.01, default: 0.18 },
    squeeze:   { kind: "number", label: "Comprimarea la viteză maximă", min: 0, max: 0.18, step: 0.01, default: 0.06 },
  },

  draw({ ctx, from, to, t, width, height, params }) {
    const dir = str(params, "direction", "left");
    const power = num(params, "intensity", 1);
    const smearAmt = num(params, "smear", 0.18);
    const squeeze = num(params, "squeeze", 0.06);

    const vertical = dir === "up" || dir === "down";
    // Semnul: încotro pleacă imaginea care iese.
    const sign = dir === "left" || dir === "up" ? -1 : 1;
    const span = (vertical ? height : width) * power;

    const e = easeInOut(clamp01(t));
    const v = peak(t);                       // viteza: 0 → 1 → 0
    const trail = Math.round((vertical ? height : width) * smearAmt * v);
    const steps = 5;

    // Comprimarea pe axa mișcării — cameră rotită rapid, nu imagine glisată.
    const sx = vertical ? 1 : 1 - squeeze * v;
    const sy = vertical ? 1 - squeeze * v : 1;

    const drawSmeared = (img: CanvasImageSource, base: number, alpha: number) => {
      for (let k = steps - 1; k >= 0; k--) {
        const f = k / steps;
        const back = base - sign * f * trail;
        ctx.save();
        ctx.globalAlpha = alpha * (1 - f * 0.72);
        ctx.translate(width / 2, height / 2);
        ctx.scale(sx, sy);
        ctx.translate(-width / 2, -height / 2);
        ctx.drawImage(img, vertical ? 0 : back, vertical ? back : 0, width, height);
        ctx.restore();
      }
    };

    // Cel care iese fuge; cel care intră vine din aceeași parte, continuând
    // mișcarea în loc s-o contrazică.
    drawSmeared(from, sign * e * span, 1 - e);
    drawSmeared(to, sign * (e - 1) * span, e);
  },
};
