/**
 * ════════════════════════════════════════════════════════════════════
 *  LUXURY LIGHT SWEEP — lumină care alunecă peste păr
 * ════════════════════════════════════════════════════════════════════
 *
 * SCOP. Senzația de reclamă de beauty: o lumină de studio trece controlat
 * peste o suprafață lucioasă. NU e lens flare, nu e blitz, nu e sclipici.
 *
 * CUM ARATĂ. O bandă diagonală, lată și foarte moale, traversează cadrul o
 * singură dată. Intensitatea ei crește și scade (`peak`), deci nu apare și nu
 * dispare brusc — nici la intrarea, nici la ieșirea din cadru.
 *
 * DOUĂ DECIZII CARE FAC DIFERENȚA ÎNTRE „scump" ȘI „ieftin":
 *
 *   1. Compoziția e `soft-light`, nu `screen`. `screen` adaugă lumină peste
 *      tot, inclusiv în umbre — de aici aspectul spălăcit al efectelor de
 *      social media. `soft-light` luminează ce e deja luminos și lasă umbrele
 *      în pace, adică se comportă ca lumina reală pe o suprafață lucioasă.
 *      Părul închis rămâne închis; doar luciul lui răspunde.
 *
 *   2. Opacitatea implicită e 0,22. Pare puțin și trebuie să pară puțin.
 *      Cerința produsului e ca footage-ul să rămână eroul; dacă cineva poate
 *      numi efectul când îl vede, e prea tare.
 *
 * DURATĂ RECOMANDATĂ: 0,4–0,9s, o singură trecere pe clip.
 *
 * CÂND MERGE CEL MAI BINE: pe păr proaspăt aranjat, lucios, în plan mediu sau
 * prim-plan. Pe mat (mâini, unelte, fundal) practic nu se vede — și e corect
 * să nu se vadă.
 *
 * COST. Un gradient și un dreptunghi per cadru. Cel mai ieftin din bibliotecă.
 */
import type { ClipEffectDef } from "../types";
import { num, str } from "../types";
import { peak, clamp01 } from "../easing";

/** Alb neutru-cald: lumină de studio, nu bec galben, nu LED albastru. */
const WARM = { r: 255, g: 246, b: 232 };
const COOL = { r: 236, g: 244, b: 255 };

export const lightSweep: ClipEffectDef = {
  id: "lightSweep",
  kind: "clip",
  label: "Light Sweep",
  desc: "O lumină de studio alunecă o dată peste cadru. Foarte discretă.",
  params: {
    direction: {
      kind: "choice", label: "Direcție", default: "diagonal",
      options: [
        { value: "diagonal", label: "Diagonal" },
        { value: "horizontal", label: "Orizontal" },
        { value: "vertical", label: "Vertical" },
      ],
    },
    startAt: {
      kind: "number", label: "Când începe", min: 0, max: 0.9, step: 0.05, default: 0.15,
    },
    duration: {
      kind: "number", label: "Cât durează trecerea", min: 0.2, max: 1.4, step: 0.05, default: 0.7, unit: "s",
    },
    opacity: {
      kind: "number", label: "Intensitate", min: 0.05, max: 0.6, step: 0.01, default: 0.22,
    },
    width: {
      kind: "number", label: "Lățimea benzii", min: 0.1, max: 0.8, step: 0.05, default: 0.34,
    },
    temperature: {
      kind: "choice", label: "Temperatura luminii", default: "warm",
      options: [
        { value: "warm", label: "Caldă" },
        { value: "cool", label: "Rece" },
      ],
    },
  },

  draw({ ctx, localMs, clipMs, width, height, params }) {
    const startAt = num(params, "startAt", 0.15);
    const durSec = num(params, "duration", 0.7);
    const maxAlpha = num(params, "opacity", 0.22);
    const bandW = num(params, "width", 0.34);
    const dir = str(params, "direction", "diagonal");
    const tint = str(params, "temperature", "warm") === "cool" ? COOL : WARM;

    // Fereastra în care trece lumina, raportată la durata clipului.
    const startMs = startAt * clipMs;
    const spanMs = Math.max(1, durSec * 1000);
    const p = (localMs - startMs) / spanMs;
    if (p <= 0 || p >= 1) return; // în afara ferestrei nu desenăm nimic

    const strength = peak(clamp01(p)) * maxAlpha;
    if (strength <= 0.002) return;

    // Banda pornește complet în afara cadrului și iese complet — altfel s-ar
    // vedea marginea ei apărând din senin în mijlocul imaginii.
    const travel = 1 + bandW * 2;
    const pos = -bandW + p * travel;

    let x0 = 0, y0 = 0, x1 = 0, y1 = 0;
    if (dir === "horizontal") {
      x0 = pos * width; y0 = 0; x1 = (pos + bandW) * width; y1 = 0;
    } else if (dir === "vertical") {
      x0 = 0; y0 = pos * height; x1 = 0; y1 = (pos + bandW) * height;
    } else {
      // Diagonala urcă spre dreapta — direcția în care cade lumina în
      // majoritatea saloanelor (fereastră laterală, ring light în lateral).
      x0 = pos * width; y0 = height;
      x1 = (pos + bandW) * width; y1 = height - bandW * height * 1.6;
    }

    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    const c = (a: number) => `rgba(${tint.r},${tint.g},${tint.b},${a})`;
    // Cinci opriri, nu trei: cu trei, muchia benzii se citește ca o dungă.
    g.addColorStop(0, c(0));
    g.addColorStop(0.32, c(strength * 0.35));
    g.addColorStop(0.5, c(strength));
    g.addColorStop(0.68, c(strength * 0.35));
    g.addColorStop(1, c(0));

    ctx.save();
    // Vezi comentariul de sus: soft-light, nu screen.
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  },
};
