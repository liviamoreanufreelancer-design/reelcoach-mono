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
let scratch: HTMLCanvasElement | null = null;
let sctx: CanvasRenderingContext2D | null = null;

export function scratchCtx(width: number, height: number): CanvasRenderingContext2D | null {
  if (!scratch) {
    if (typeof document === "undefined") return null;
    scratch = document.createElement("canvas");
    sctx = scratch.getContext("2d");
  }
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
export function scratchCanvas(): HTMLCanvasElement | null {
  return scratch;
}
