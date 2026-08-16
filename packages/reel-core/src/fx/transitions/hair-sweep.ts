/**
 * ════════════════════════════════════════════════════════════════════
 *  HAIR SWEEP — mișcarea părului dezvăluie cadrul următor
 * ════════════════════════════════════════════════════════════════════
 *
 * SCOP. Părul traversează cadrul, iar când îl umple devine el însuși
 * trecerea. Privitorul trebuie să simtă că mișcarea a cauzat tranziția, nu
 * că peste ea s-a pus un efect.
 *
 * ── DE CE NU E O MASCĂ REALĂ ────────────────────────────────────────
 *
 * Decuparea părului cadru cu cadru cere segmentare, adică analiză de imagine
 * la 30 de cadre pe secundă în WKWebView. E aceeași categorie cu „real-time
 * camera coaching", respinsă motivat: nu e un efect, e o rescriere spre nativ.
 *
 * ── CE FACE ÎN SCHIMB, ȘI DE CE NU E UN COMPROMIS SLAB ───────────────
 *
 * Marginea dezvăluirii nu e o linie dreaptă: e împinsă înainte de zonele
 * ÎNCHISE ale cadrului care iese și ținută în loc de cele deschise. Cum părul
 * e masa închisă la culoare care traversează cadrul, **el conduce efectiv
 * dezvăluirea** — fără nicio segmentare, fiindcă efectul citește imaginea în
 * loc s-o presupună.
 *
 * Asta îl face și singurul efect din bibliotecă care se descurcă pe orice
 * filmare, fără ca partenera să declare ceva dinainte. Vezi regula din
 * fx/types.ts: un efect n-are voie să presupună ce e în cadru. Ăsta nu
 * presupune — se uită.
 *
 * ── MECANICA ────────────────────────────────────────────────────────
 *
 * Masca se compune din două straturi, pe o pânză de lucru:
 *   1. un gradient care se deplasează — poziția în timp
 *   2. luminozitatea cadrului care iese, adunată peste el („lighter")
 * Suma trece printr-un contrast puternic, care o transformă într-o margine
 * aproape binară, dar zdrențuită după forma părului.
 *
 * Zero bucle per-pixel: patru desenări și două filtre CSS. Costă mai mult
 * decât celelalte tranziții, dar numai în cele ~0,6 secunde cât ține.
 *
 * ── ONESTITATE ──────────────────────────────────────────────────────
 *
 * E singurul efect din bibliotecă cu risc VIZUAL, nu tehnic. Pe un cadru cu
 * contrast bun între păr și fundal arată ca o mască adevărată. Pe unul plat
 * — păr blond pe perete alb — se apropie de o ștergere obișnuită moale.
 * Parametrul „cât conduce imaginea" reglează exact asta: la 0 e o ștergere
 * moale curată, care rămâne o tranziție corectă.
 *
 * DURATĂ: 0,4–0,8s.
 * MERGE CEL MAI BINE: unde chiar trece păr prin cadru — mișcarea părului,
 * întoarcerea capului, dezvăluirea finală.
 */
import type { TransitionDef } from "../types";
import { num, str } from "../types";
import { easeInOut, clamp01 } from "../easing";
import { scratchCtx, scratchCanvas } from "../scratch";

export const hairSweep: TransitionDef = {
  id: "hairSweep",
  kind: "transition",
  label: "Hair Sweep",
  desc: "Zonele închise ale cadrului conduc dezvăluirea. Pe păr, arată natural.",
  durationMs: 620,
  params: {
    direction: {
      kind: "choice", label: "Dinspre", default: "left",
      options: [
        { value: "left", label: "Stânga" },
        { value: "right", label: "Dreapta" },
        { value: "up", label: "Jos în sus" },
        { value: "down", label: "Sus în jos" },
      ],
    },
    lead:     { kind: "number", label: "Cât conduce imaginea", min: 0, max: 1, step: 0.05, default: 0.55 },
    softness: { kind: "number", label: "Cât de moale e marginea", min: 0.02, max: 0.35, step: 0.01, default: 0.14 },
  },

  draw({ ctx, from, to, t, width, height, params }) {
    const dir = str(params, "direction", "left");
    const lead = clamp01(num(params, "lead", 0.55));
    const soft = clamp01(num(params, "softness", 0.14));

    ctx.drawImage(from, 0, 0, width, height);

    const mask = scratchCtx(width, height, 1);
    const maskCanvas = scratchCanvas(1);
    const comp = scratchCtx(width, height, 0);
    const compCanvas = scratchCanvas(0);

    const e = easeInOut(clamp01(t));
    const pos = -soft + e * (1 + soft * 2);

    if (!mask || !maskCanvas || !comp || !compCanvas) {
      // Fără pânze de lucru rămâne o dezvăluire moale simplă — tot o
      // tranziție corectă, doar fără contribuția imaginii.
      ctx.save();
      ctx.globalAlpha = e;
      ctx.drawImage(to, 0, 0, width, height);
      ctx.restore();
      return;
    }

    // ── 1. Poziția în timp: gradientul care se deplasează ──────────────
    let x0 = 0, y0 = 0, x1 = 0, y1 = 0;
    if (dir === "up")        { y0 = (pos + soft) * height; y1 = (pos - soft) * height; }
    else if (dir === "down") { y0 = (pos - soft) * height; y1 = (pos + soft) * height; }
    else if (dir === "right"){ x0 = (1 - pos + soft) * width; x1 = (1 - pos - soft) * width; }
    else                     { x0 = (pos - soft) * width; x1 = (pos + soft) * width; }

    const g = mask.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(1, "#000000");
    mask.fillStyle = g;
    mask.fillRect(0, 0, width, height);

    // ── 2. Imaginea împinge marginea: zonele ÎNCHISE trec mai devreme ──
    // `invert` face părul (închis) să devină alb, iar "lighter" adună — deci
    // acolo unde e păr, suma trece pragul mai repede. Asta e tot trucul.
    if (lead > 0.01) {
      mask.save();
      mask.globalCompositeOperation = "lighter";
      mask.globalAlpha = lead;
      mask.filter = "grayscale(1) invert(1) contrast(1.4)";
      mask.drawImage(from, 0, 0, width, height);
      mask.restore();
    }

    // ── 3. Contrast puternic: suma devine o margine aproape binară ─────
    // Un filtru nu se poate aplica peste conținut existent, deci pânza se
    // desenează pe ea însăși prin filtru.
    mask.save();
    mask.globalCompositeOperation = "copy";
    mask.filter = "contrast(7) brightness(1.05)";
    mask.drawImage(maskCanvas, 0, 0);
    mask.restore();

    // ── 4. Cadrul care intră, decupat cu masca ─────────────────────────
    comp.drawImage(to, 0, 0, width, height);
    comp.globalCompositeOperation = "destination-in";
    comp.drawImage(maskCanvas, 0, 0);

    ctx.drawImage(compCanvas, 0, 0);
  },
};
