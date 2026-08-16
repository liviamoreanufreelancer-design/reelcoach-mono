/**
 * ════════════════════════════════════════════════════════════════════
 *  SPLIT REVEAL — cadrul nou intră printr-o despărțire curată
 * ════════════════════════════════════════════════════════════════════
 *
 * SCOP. Before/after, două unghiuri ale aceleiași coafuri, comparație de
 * culoare. Ochiul compară cel mai bine când cele două imagini stau alături o
 * clipă, nu când una se stinge peste cealaltă.
 *
 * DE CE NU E O ȘTERGERE OBIȘNUITĂ. Diferența dintre editorial și PowerPoint
 * stă în două detalii:
 *
 *   1. Marginea e MOALE implicit, nu o linie. O muchie tăiată drept citește
 *      ca o formă geometrică pusă peste video; una difuză citește ca lumină.
 *      Linia vizibilă există ca opțiune, dar pornită de la zero.
 *   2. Mișcarea se AȘAZĂ, nu se oprește. Curba `settle` — pornire hotărâtă,
 *      frânare lungă — e ce face despărțirea să pară condusă, nu animată.
 *
 * MECANICA. Marginea moale nu se poate face direct pe pânza finală: se compune
 * pe o pânză de lucru (`scratch`), unde imaginea care intră primește un
 * gradient de transparență prin `destination-in`, apoi se pune peste. Pânza e
 * refolosită, nu creată la fiecare cadru.
 *
 * DURATĂ: 0,5–0,9s. Are nevoie de timp — despărțirea trebuie citită, nu doar
 * observată.
 */
import type { TransitionDef } from "../types";
import { num, str } from "../types";
import { settle, clamp01 } from "../easing";
import { scratchCtx, scratchCanvas } from "../scratch";

export const splitReveal: TransitionDef = {
  id: "splitReveal",
  kind: "transition",
  label: "Split Reveal",
  desc: "Cadrul nou intră printr-o despărțire curată. Bun la before/after.",
  durationMs: 700,
  params: {
    direction: {
      kind: "choice", label: "Direcție", default: "vertical",
      options: [
        { value: "vertical", label: "Pe verticală" },
        { value: "horizontal", label: "Pe orizontală" },
        { value: "diagonal", label: "Diagonal" },
      ],
    },
    softness: { kind: "number", label: "Cât de moale e marginea", min: 0, max: 0.3, step: 0.01, default: 0.09 },
    border:   { kind: "number", label: "Linie vizibilă", min: 0, max: 6, step: 0.5, default: 0, unit: "px" },
  },

  draw({ ctx, from, to, t, width, height, params }) {
    const dir = str(params, "direction", "vertical");
    const soft = clamp01(num(params, "softness", 0.09));
    const border = num(params, "border", 0);

    ctx.drawImage(from, 0, 0, width, height);

    const e = settle(clamp01(t));
    // Pornim și terminăm în afara cadrului, ca marginea moale să nu apară și
    // să nu dispară brusc în interiorul imaginii.
    const pos = -soft + e * (1 + soft * 2);

    const s = scratchCtx(width, height);
    const canvas = scratchCanvas();
    if (!s || !canvas) {
      // Fără pânză de lucru (context indisponibil), tot vrem o tranziție
      // corectă: margine tăiată în loc de nimic.
      ctx.save();
      ctx.beginPath();
      if (dir === "horizontal") ctx.rect(0, 0, width, pos * height);
      else ctx.rect(0, 0, pos * width, height);
      ctx.clip();
      ctx.drawImage(to, 0, 0, width, height);
      ctx.restore();
      return;
    }

    s.drawImage(to, 0, 0, width, height);

    // Gradientul taie imaginea care intră: opac unde a ajuns despărțirea,
    // transparent dincolo de ea.
    let x0 = 0, y0 = 0, x1 = 0, y1 = 0;
    if (dir === "horizontal") { y0 = (pos - soft) * height; y1 = (pos + soft) * height; }
    else if (dir === "diagonal") {
      x0 = (pos - soft) * width; y0 = height;
      x1 = (pos + soft) * width; y1 = 0;
    } else { x0 = (pos - soft) * width; x1 = (pos + soft) * width; }

    const g = s.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "rgba(0,0,0,1)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    s.globalCompositeOperation = "destination-in";
    s.fillStyle = g;
    s.fillRect(0, 0, width, height);

    ctx.drawImage(canvas, 0, 0);

    if (border > 0) {
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = border;
      ctx.beginPath();
      if (dir === "horizontal") {
        ctx.moveTo(0, pos * height); ctx.lineTo(width, pos * height);
      } else if (dir === "diagonal") {
        ctx.moveTo(pos * width, height); ctx.lineTo((pos + soft) * width, 0);
      } else {
        ctx.moveTo(pos * width, 0); ctx.lineTo(pos * width, height);
      }
      ctx.stroke();
      ctx.restore();
    }
  },
};
