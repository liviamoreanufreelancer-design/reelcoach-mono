import type { ShotType } from "./db-types";

/**
 * Verticalele momentelor.
 *
 * Trei valori, nu două: `before`, `dezvăluirea`, `reacția` și `after` apar în
 * amândouă, iar asta e chiar motivul pentru care catalogul e mic — 23 de
 * momente acoperă 23 de servicii tocmai fiindcă cele comune nu se dublează.
 * O împărțire strictă în două ar fi cerut `before-păr` și `before-machiaj`,
 * adică exact duplicarea pe care catalogul există s-o evite.
 */
export type Vertical = "par" | "machiaj" | "ambele";

export const VERTICALS: { id: Vertical; label: string; hint: string }[] = [
  { id: "par", label: "Păr", hint: "doar la coafură" },
  { id: "machiaj", label: "Machiaj", hint: "doar la makeup" },
  { id: "ambele", label: "Amândouă", hint: "apare peste tot" },
];

/** Verticala unui moment. Necunoscut => „ambele": mai bine vizibil peste tot. */
export function verticalOf(t: Pick<ShotType, "family">): Vertical {
  return t.family === "par" || t.family === "machiaj" ? t.family : "ambele";
}

/**
 * Momentele dintr-o verticală.
 *
 * Cele partajate apar în AMBELE: când construiești o variantă de balayage,
 * „before" trebuie să fie în lista de păr, nu într-un al treilea loc pe care
 * trebuie să-ți amintești să-l deschizi.
 *
 * E același rând de date afișat de două ori, nu două copii — modifici într-un
 * folder, se schimbă și în celălalt. De asta partajatele poartă o etichetă:
 * ca să se vadă că schimbarea le atinge pe amândouă.
 */
export function inVertical<T extends Pick<ShotType, "family">>(types: T[], v: Vertical | "all"): T[] {
  if (v === "all") return types;
  return types.filter((t) => {
    const own = verticalOf(t);
    return own === v || own === "ambele";
  });
}
