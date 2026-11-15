/**
 * framing-advice — din casete instabile, un verdict stabil.
 *
 * PROBLEMA 1, observată pe device: caseta de la Vision tremură. Fiecare cadru
 * e analizat independent, fără urmărire între cadre, iar saliency e grosieră.
 *
 * Caseta nu e produsul. Produsul e un CUVÂNT, iar un cuvânt poate fi perfect
 * stabil chiar dacă numărul din spate sare — prin medie alunecătoare, zonă
 * moartă și histereză.
 *
 * PROBLEMA 2, prinsă de Liv pe device: mărimea nu e destul. O jumătate de față
 * și o față lipită de marginea de jos umpleau amândouă cât trebuie, și appul
 * zicea „bun". Mărimea spune cât de aproape e, nu dacă subiectul e ÎN cadru.
 *
 * De asta verdictul e o SCARĂ DE PRIORITĂȚI, nu o singură comparație:
 *
 *   1. tăiat de margine  — nu intră tot; orice altceva e irelevant
 *   2. decentrat          — e în cadru, dar nu unde trebuie
 *   3. prea mic / prea mare
 *   4. bun
 *
 * Ordinea contează: un sfat despre mărime, dat când subiectul e tăiat, trimite
 * stilista în direcția greșită.
 *
 * PROBLEMA 3, din aceleași cifre: zona moartă era absolută. ±8 puncte la ținta
 * 72 e ±11% relativ, rezonabil. ±8 la ținta 18 e ±44% — adică „bun" pe un
 * interval de la 10 la 26. De aia zicea bun când era prea departe. Acum e
 * proporțională cu ținta.
 */

export type Advice = "clipped" | "offcenter" | "closer" | "good" | "farther";

/** Cât umple subiectul cadrul, pe înălțime, per distanță cerută. */
export const SUBJECT_FILL = { palm: 88, arm: 72, step: 54, two_steps: 40 } as const;

/**
 * Pentru fețe ținta e alta: caseta feței e mult mai mică decât subiectul. La
 * distanța de un braț capul umple vreo treime din înălțime, nu trei sferturi.
 * Comparată cu ținta subiectului, pastila ar cere „mai aproape" la infinit pe
 * o față perfect încadrată.
 */
export const FACE_FILL = { palm: 55, arm: 34, step: 18, two_steps: 11 } as const;

export type Distance = keyof typeof SUBJECT_FILL;

/** Zona bună, ca fracțiune din țintă. Proporțională, nu absolută. */
const DEAD_FRACTION = 0.18;
/** Ieșirea din „bun" cere mai mult decât intrarea — altfel pâlpâie la limită. */
const EXIT_FRACTION = 0.28;
/** Oricât de mică e ținta, sub atât nu coborâm: altfel devine imposibil de nimerit. */
const MIN_ZONE = 3;

/** Cât de aproape de margine înseamnă „tăiat". Fracțiune din cadru. */
const EDGE = 0.02;
/** Cât poate fi decentrat pe orizontală și pe verticală, înainte să conteze. */
const OFF_X = 0.13;
const OFF_Y = 0.16;
/** Centrul pe care îl țintim. Puțin peste mijloc, ca în chenarul de pe ecran. */
const AIM_Y = 0.46;

/** Cadre fără detecție pe care le ignorăm înainte să stingem sfatul. */
const MISS_TOLERANCE = 3;
/** Greutatea citirii noi în medie. Mai mic = mai calm, dar mai lent. */
const ALPHA = 0.35;

export interface Reading {
  x: number;
  y: number;
  width: number;
  height: number;
  source: "face" | "salient";
}

export interface AdviceState {
  /**
   * Caseta NETEZITĂ, nu cea din cadrul curent. Toate verificările — tăiere,
   * centrare, mărime — se fac pe ea.
   *
   * Netezeam doar mărimea, iar poziția o verificam pe cadrul brut. Un singur
   * cadru aberant, cu caseta umflată până la margini, făcea verdictul să sară
   * pe „nu intră tot" și înapoi. Pâlpâit, din aceeași cauză ca prima dată:
   * o decizie luată pe o citire, nu pe o tendință.
   */
  box: { x: number; y: number; width: number; height: number } | null;
  /** Umplerea netezită, în procente. Derivată din `box.height`. */
  fill: number | null;
  advice: Advice | null;
  misses: number;
}

export const initialAdvice: AdviceState = { box: null, fill: null, advice: null, misses: 0 };

export function nextAdvice(
  prev: AdviceState,
  reading: Reading | null,
  distance: Distance,
): AdviceState {
  if (reading === null) {
    const misses = prev.misses + 1;
    if (misses > MISS_TOLERANCE) return initialAdvice;
    return { ...prev, misses };
  }

  const target = reading.source === "face" ? FACE_FILL[distance] : SUBJECT_FILL[distance];

  // Caseta netezită: fiecare latură își urmează propria tendință. Prima citire
  // trece neschimbată, altfel ar porni din zero și ar urca spre subiect.
  const ease = (was: number, now: number) => was + ALPHA * (now - was);
  const box = prev.box === null
    ? { x: reading.x, y: reading.y, width: reading.width, height: reading.height }
    : {
        x: ease(prev.box.x, reading.x),
        y: ease(prev.box.y, reading.y),
        width: ease(prev.box.width, reading.width),
        height: ease(prev.box.height, reading.height),
      };
  const fill = box.height * 100;

  // ── 1 · Tăiat de margine. Întâi, fiindcă orice sfat despre mărime dat acum
  //        ar trimite în direcția greșită: subiectul nu e întreg în cadru.
  const touchesEdge =
    box.x <= EDGE ||
    box.y <= EDGE ||
    box.x + box.width >= 1 - EDGE ||
    box.y + box.height >= 1 - EDGE;
  if (touchesEdge) return { box, fill, advice: "clipped", misses: 0 };

  // ── 2 · Decentrat. E în cadru, dar nu unde trebuie.
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  if (Math.abs(cx - 0.5) > OFF_X || Math.abs(cy - AIM_Y) > OFF_Y) {
    return { box, fill, advice: "offcenter", misses: 0 };
  }

  // ── 3 · Mărimea, abia acum. Zona e proporțională cu ținta, iar ieșirea din
  //        „bun" e mai largă decât intrarea.
  const frac = prev.advice === "good" ? EXIT_FRACTION : DEAD_FRACTION;
  const zone = Math.max(MIN_ZONE, target * frac);
  const diff = fill - target;

  let advice: Advice;
  if (Math.abs(diff) <= zone) advice = "good";
  else if (diff < 0) advice = "closer";
  else advice = "farther";

  return { box, fill, advice, misses: 0 };
}

export const ADVICE_LABEL: Record<Advice, string> = {
  clipped: "Nu intră tot",
  offcenter: "Centrează",
  closer: "Mai aproape",
  farther: "Mai departe",
  good: "Bun",
};

export const ADVICE_ARROW: Record<Advice, string> = {
  clipped: "⤢ ",
  offcenter: "⊕ ",
  closer: "↑ ",
  farther: "↓ ",
  good: "✓ ",
};
