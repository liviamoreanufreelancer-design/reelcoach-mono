/**
 * ════════════════════════════════════════════════════════════════════
 *  FX — contractele stratului de efecte
 * ════════════════════════════════════════════════════════════════════
 *
 * Un efect e o DEFINIȚIE, nu o ramură dintr-un if. Înainte, cele 19 efecte
 * existente erau un lanț `if/else` de ~200 de linii în mijlocul buclei de
 * randare; fiecare adăugare îngroșa bucla și nimic nu putea fi refolosit sau
 * parametrizat. Cu registry-ul, un efect nou e un fișier care se înregistrează.
 *
 * TREI FELURI, pentru că au nevoie de lucruri diferite:
 *
 *   transition  două cadre (cel care iese, cel care intră) + t 0→1
 *   clip        cadrul deja desenat + timpul local în clip
 *   transform   CUM se desenează cadrul (scară, deplasare) — nu peste el
 *   time        durata cadrului — schimbă timeline-ul, nu desenul
 *
 * Al treilea încă n-are implementare (vine cu Freeze + Detail Zoom); e declarat
 * aici ca să nu fie inventat un al doilea sistem când ajungem la el.
 *
 * BUGETUL. Randarea merge în TIMP REAL prin MediaRecorder: ~41ms per cadru la
 * 24fps, în care intră decodarea video, filtrul, textul, efectul și encodarea.
 * Cadrele pierdute NU se recuperează (măsurat: surse 4K → 9fps → rezultat
 * sacadat). Deci orice `draw` de aici are voie să folosească transformări,
 * compoziții, gradienți și `ctx.filter` — dar NICIODATĂ bucle per-pixel
 * (`getImageData`). Regula asta e limita reală a bibliotecii, nu canvas-ul.
 */

/** Valorile cu care e configurat un efect într-un anumit loc. */
export type FxParams = Record<string, number | string | boolean | undefined>;

/**
 * Descrierea unui parametru. Studio își generează controalele din asta —
 * altfel fiecare efect nou ar cere și cod de interfață, iar la douăzeci de
 * efecte am fi reconstruit exact problema pe care o rezolvăm aici.
 */
export type ParamDef =
  | { kind: "number"; label: string; min: number; max: number; step: number; default: number; unit?: string }
  | { kind: "choice"; label: string; options: { value: string; label: string }[]; default: string }
  | { kind: "toggle"; label: string; default: boolean };

/** Ce primește o tranziție ca să deseneze un cadru. */
export interface TransitionFrame {
  ctx: CanvasRenderingContext2D;
  /** Cadrul clipului care iese. */
  from: CanvasImageSource;
  /** Cadrul clipului care intră. */
  to: CanvasImageSource;
  /** Progresul tranziției, 0 → 1. */
  t: number;
  width: number;
  height: number;
  params: FxParams;
}

/** Ce primește un efect de clip, peste cadrul deja desenat. */
export interface ClipFrame {
  ctx: CanvasRenderingContext2D;
  /** Milisecunde de la începutul ferestrei redate a clipului. */
  localMs: number;
  /** Durata totală redată a clipului. */
  clipMs: number;
  width: number;
  height: number;
  params: FxParams;
}

interface FxBase {
  id: string;
  label: string;
  /** O propoziție, în română — apare în Studio. */
  desc: string;
  params?: Record<string, ParamDef>;
}

export interface TransitionDef extends FxBase {
  kind: "transition";
  /** Cât durează suprapunerea celor două clipuri. */
  durationMs: number;
  draw(f: TransitionFrame): void;
}

export interface ClipEffectDef extends FxBase {
  kind: "clip";
  draw(f: ClipFrame): void;
}

/**
 * Ce mișcare are cadrul în sine.
 *
 * Un efect de clip desenează PESTE cadrul deja pus; ăsta schimbă cum e pus.
 * Fără felul ăsta, „Photo → Motion" ar fi fost imposibil: nu poți face o poză
 * să se miște desenând ceva deasupra ei.
 *
 * Înlocuiește și Ken Burns-ul vechi, care era ±4% ales automat după indexul
 * clipului — nici configurabil, nici alegere a partenerei.
 */
export interface ClipMotion {
  /** 1 = neschimbat. */
  scale: number;
  /** Deplasare, ca fracțiune din lățime/înălțime. 0 = centrat. */
  dx: number;
  dy: number;
  /**
   * Estompare aplicată CADRULUI, în pixeli la 1080 lățime.
   *
   * Stă aici, nu într-un efect de clip, dintr-un motiv de cost: cadrul se
   * desenează oricum printr-un lanț de filtre (gradarea automată + filtrul
   * partenerei), iar o estompare adăugată acolo nu costă nicio desenare în
   * plus. Un efect de clip ar fi trebuit să redeseneze tot cadrul ca să-l
   * poată estompa.
   */
  blurPx?: number;
}

export interface TransformDef extends FxBase {
  kind: "transform";
  motion(f: ClipFrame): ClipMotion;
  /**
   * Dacă imaginea trebuie ÎNGHEȚATĂ la momentul ăsta.
   *
   * Nu oprește timpul — clipul își consumă durata mai departe. Oprește doar
   * avansarea sursei, deci pe ecran rămâne ultimul cadru redat. Așa freeze-ul
   * nu lungește reel-ul: mănâncă din propria lui durată, iar `sec` din editor
   * înseamnă în continuare ce scrie.
   */
  freeze?(f: ClipFrame): boolean;
}

export type FxDef = TransitionDef | ClipEffectDef | TransformDef;

/** Valorile implicite ale unui efect, din schema lui. */
export function defaultParams(def: FxDef): FxParams {
  const out: FxParams = {};
  for (const [key, p] of Object.entries(def.params ?? {})) out[key] = p.default;
  return out;
}

/**
 * Citire tolerantă a unui parametru.
 *
 * Parametrii vin din `slots` (jsonb), deci pot lipsi sau pot fi rămași de la o
 * versiune mai veche a efectului. Un efect n-are voie să crape randarea unui
 * reel pentru că lipsește o valoare — cade pe implicit și merge mai departe.
 */
export function num(params: FxParams, key: string, fallback: number): number {
  const v = params[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
export function str(params: FxParams, key: string, fallback: string): string {
  const v = params[key];
  return typeof v === "string" && v ? v : fallback;
}
