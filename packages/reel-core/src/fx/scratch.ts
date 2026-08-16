/**
 * O pânză de lucru refolosită, pentru efectele care au nevoie de o mască.
 *
 * Unele efecte (marginea moale de la Split Reveal) nu se pot face direct pe
 * pânza finală: îți trebuie un loc unde compui imaginea cu un gradient de
 * transparență, apoi o pui peste. Un `document.createElement("canvas")` per
 * cadru ar aloca și ar arunca 30 de pânze pe secundă — cel mai sigur mod de a
 * provoca pauze de colectare a gunoiului exact în mijlocul unei tranziții.
 *
 * Aici se ține una singură, redimensionată doar când se schimbă formatul.
 */
type Slot = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null };
const slots = new Map<number, Slot>();

/**
 * `slot` permite unui efect să folosească două pânze deodată — de exemplu una
 * pentru imagine și una pentru masca ei (Hair Sweep). Fără indice, al doilea
 * apel l-ar șterge pe primul.
 */
export function scratchCtx(width: number, height: number, slot = 0): CanvasRenderingContext2D | null {
  let e = slots.get(slot);
  if (!e) {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    e = { canvas, ctx: canvas.getContext("2d") };
    slots.set(slot, e);
  }
  const scratch = e.canvas;
  const sctx = e.ctx;
  if (!sctx) return null;
  if (scratch.width !== width || scratch.height !== height) {
    scratch.width = width;
    scratch.height = height;
  } else {
    sctx.clearRect(0, 0, width, height);
  }
  // Resetăm starea: efectul precedent poate fi lăsat un filtru sau un mod de
  // compoziție, iar o pânză partajată moștenește tot.
  sctx.globalAlpha = 1;
  sctx.globalCompositeOperation = "source-over";
  sctx.filter = "none";
  return sctx;
}

/** Pânza din spatele contextului — pentru `drawImage` înapoi pe cea finală. */
export function scratchCanvas(slot = 0): HTMLCanvasElement | null {
  return slots.get(slot)?.canvas ?? null;
}
