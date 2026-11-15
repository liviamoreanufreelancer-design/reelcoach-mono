/**
 * framing-advice — din casete instabile, un verdict stabil.
 *
 * PROBLEMA OBSERVATĂ PE DEVICE: caseta de la Vision tremură. Fiecare cadru e
 * analizat independent, fără urmărire între cadre, iar saliency e grosieră —
 * deci la două cadre pe secundă fiecare casetă nouă e un salt vizibil.
 *
 * DAR CASETA NU E PRODUSUL. Produsul e un cuvânt: „mai aproape", „bun", „mai
 * departe". Iar un cuvânt poate fi perfect stabil chiar dacă numărul din
 * spatele lui tremură, dacă trec trei lucruri:
 *
 *   1. MEDIE ALUNECĂTOARE pe cât umple subiectul. Un cadru aberant mută media
 *      cu o treime din diferență, nu cu toată.
 *
 *   2. ZONĂ MOARTĂ în jurul țintei. Fără ea, o oscilație de două procente
 *      lângă prag ar face pastila să clipească între „bun" și „mai aproape".
 *
 *   3. HISTEREZĂ: odată ajuns la „bun", zona se lărgește. Ieșirea din verdictul
 *      bun cere o abatere mai mare decât intrarea în el. Altfel, exact la
 *      limită, pastila ar pâlpâi.
 *
 * Plus RĂBDARE LA RATĂRI: un cadru fără detecție nu stinge sfatul. Vision
 * ratează ocazional, și o pastilă care dispare și reapare e mai rea decât una
 * care rămâne o jumătate de secundă în urmă.
 */

export type Advice = "closer" | "good" | "farther";

/** Cât umple subiectul cadrul, pe înălțime, per distanță cerută. */
export const SUBJECT_FILL = { palm: 88, arm: 72, step: 54, two_steps: 40 } as const;

/**
 * Pentru fețe ținta e ALTA, și e important.
 *
 * Caseta de față e mult mai mică decât subiectul: la distanța de un braț,
 * capul umple vreo treime din înălțimea cadrului, nu trei sferturi. Dacă aș
 * compara caseta feței cu ținta subiectului, appul ar cere „mai aproape" la
 * nesfârșit, inclusiv când încadrarea e perfectă.
 *
 * Valorile sunt prima estimare, de calibrat pe device — de asta afișajul de
 * test arată și numărul brut.
 */
export const FACE_FILL = { palm: 55, arm: 34, step: 18, two_steps: 11 } as const;

export type Distance = keyof typeof SUBJECT_FILL;

/** Cât de departe de țintă e încă „bun". Procente din înălțimea cadrului. */
const DEAD_ZONE = 8;
/** Cât trebuie să se abată ca să PIARDĂ verdictul bun. Mai mult decât să-l câștige. */
const EXIT_ZONE = 13;
/** Cadre fără detecție pe care le ignorăm înainte să stingem sfatul. */
const MISS_TOLERANCE = 3;

export interface AdviceState {
  /** Media alunecătoare a umplerii, în procente. `null` înainte de prima citire. */
  fill: number | null;
  advice: Advice | null;
  misses: number;
}

export const initialAdvice: AdviceState = { fill: null, advice: null, misses: 0 };

/** Greutatea citirii noi în medie. Mai mic = mai calm, dar mai lent. */
const ALPHA = 0.35;

export function nextAdvice(
  prev: AdviceState,
  reading: { fillPercent: number; source: "face" | "salient" } | null,
  distance: Distance,
): AdviceState {
  if (reading === null) {
    const misses = prev.misses + 1;
    // Peste toleranță: uităm tot, ca să nu rămână un sfat vechi pe ecran la
    // un moment complet diferit.
    if (misses > MISS_TOLERANCE) return initialAdvice;
    return { ...prev, misses };
  }

  const target = reading.source === "face" ? FACE_FILL[distance] : SUBJECT_FILL[distance];
  const fill = prev.fill === null ? reading.fillPercent : prev.fill + ALPHA * (reading.fillPercent - prev.fill);
  const diff = fill - target;

  // Zona de ieșire e mai largă decât cea de intrare: o dată „bun", rămâne bun
  // până se abate serios. Asta oprește pâlpâitul exact la limită.
  const zone = prev.advice === "good" ? EXIT_ZONE : DEAD_ZONE;

  let advice: Advice;
  if (Math.abs(diff) <= zone) advice = "good";
  else if (diff < 0) advice = "closer";
  else advice = "farther";

  return { fill, advice, misses: 0 };
}

export const ADVICE_LABEL: Record<Advice, string> = {
  closer: "Mai aproape",
  good: "Bun",
  farther: "Mai departe",
};
