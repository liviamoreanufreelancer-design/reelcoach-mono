/**
 * output-plan — ce momente intră într-o postare, în ce ordine, cu ce stil.
 *
 * Până acum exportul avea o singură presupunere: reel-ul = toate clipurile
 * filmate, în ordinea scenelor, fiecare cu stilul scenei lui. Modelul de
 * sesiune o rupe — aceleași momente dau mai multe postări, fiecare cu altă
 * ordine, alt ritm și alt stil. „Mișcarea părului" e ultima în Procesul și
 * PRIMA în Rezultatul; un stil ținut pe moment n-ar putea fi corect în ambele.
 *
 * Fișierul ăsta e singurul loc unde se răspunde la întrebarea. Randarea
 * primește o listă gata rezolvată și nu mai știe nimic despre postări.
 *
 * REZOLVAREA STILULUI, de la specific la general:
 *     slot  →  postare  →  moment
 * Adică: excepția pe care partenera a pus-o pe acest moment din această
 * postare bate implicitul postării, care bate ce era pe moment. Aceeași
 * ordine ca în Studio (OutputReelPreview) — dacă cele două s-ar despărți,
 * preview-ul partenerei ar minți.
 *
 * LEGĂTURA e prin `slotKey`, nu prin index sau id. Publicarea recreează
 * momentele cu id-uri noi, iar ordinea scenelor nu e ordinea postării.
 */
import type { Scenario, Scene } from "@/data/scenarios";
import type { SessionOutput } from "@/data/shots";
import type { StoredClip } from "@/lib/clip-store";
import type { TextLayer, TransitionId } from "@reelcoach/core";

/** Un clip filmat, gata de randat, cu stilul deja rezolvat. */
export interface PlannedClip {
  clip: StoredClip;
  scene: Scene;
  /** Indexul scenei — cheia pentru captions/layerTextEdits din starea locală. */
  sceneIdx: number;
  /** Cât ține în ACEASTĂ postare. Lipsă = durata momentului. */
  sec?: number;
  filterId?: string;
  transitionType?: TransitionId;
  playbackSpeed?: number;
  motionBlur?: boolean;
  /** Textul partenerei pentru acest moment în această postare. */
  textLayers?: TextLayer[];
  /** Efectul ales pe slot; cade pe cel al momentului dacă lipsește. */
  effectId?: string;
  /** Reglajele efectului ales. Absente = implicitele lui din registry. */
  fxParams?: Record<string, number | string | boolean>;
  /** Reglajele tranziției care iese din acest moment. */
  transitionParams?: Record<string, number | string | boolean>;
}

/**
 * Momentele filmate ale unei postări, în ordinea ei.
 *
 * Sloturile nefilmate se sar în tăcere — asta E regula „niciodată zero":
 * dacă stilista a filmat 5 din 8 momente, postările care au tot ce le trebuie
 * ies întregi, iar restul ies mai scurte în loc să nu iasă deloc.
 */
export function planOutput(
  scenario: Scenario,
  output: SessionOutput,
  clips: StoredClip[],
): PlannedClip[] {
  // Indexăm o dată: slotKey → (scenă, index). Postările au aceleași momente
  // de mai multe ori, deci nu vrem o căutare liniară per slot.
  const bySlot = new Map<string, { scene: Scene; idx: number }>();
  scenario.scenes.forEach((scene, idx) => {
    if (scene.slotKey) bySlot.set(scene.slotKey, { scene, idx });
  });
  const clipByScene = new Map<number, StoredClip>();
  for (const c of clips) clipByScene.set(c.sceneIdx, c);

  const planned: PlannedClip[] = [];
  for (const slot of output.slots) {
    const found = bySlot.get(slot.slot);
    if (!found) continue; // momentul nu mai există în șablon
    const clip = clipByScene.get(found.idx);
    if (!clip) continue; // nefilmat încă

    planned.push({
      clip,
      scene: found.scene,
      sceneIdx: found.idx,
      sec: slot.sec ?? found.scene.finalUsageDuration,
      filterId: slot.filter ?? output.filter ?? found.scene.filterId,
      transitionType: (slot.transition ?? output.transition ?? found.scene.transitionType) as
        | TransitionId
        | undefined,
      playbackSpeed: slot.speed ?? found.scene.playbackSpeed,
      motionBlur: slot.motionBlur ?? found.scene.motionBlur,
      textLayers: (slot.textLayers as TextLayer[] | undefined) ?? found.scene.textLayers,
      // Efectul e o decizie de compoziție (ține de postare), nu o proprietate
      // a materialului filmat — deci slotul bate momentul, ca la filtru.
      effectId: slot.effect ?? found.scene.effectId,
      fxParams: slot.effect ? slot.fxParams?.[slot.effect] : undefined,
      transitionParams: slot.transition ? slot.fxParams?.[slot.transition] : undefined,
    });
  }
  return planned;
}

/**
 * Comportamentul de dinaintea modelului de sesiune: toate clipurile filmate,
 * în ordinea scenelor, cu stilul scenei. Rămâne calea pentru șabloanele vechi
 * și pentru cele bundlate, care n-au postări definite.
 */
export function planAllScenes(scenario: Scenario, clips: StoredClip[]): PlannedClip[] {
  return clips.map((clip) => {
    const scene = scenario.scenes[clip.sceneIdx];
    return {
      clip,
      scene,
      sceneIdx: clip.sceneIdx,
      sec: scene?.finalUsageDuration,
      filterId: scene?.filterId,
      transitionType: scene?.transitionType as TransitionId | undefined,
      playbackSpeed: scene?.playbackSpeed,
      motionBlur: scene?.motionBlur,
      textLayers: scene?.textLayers,
      effectId: scene?.effectId,
    };
  });
}

/**
 * Postarea pe care o randăm acum.
 *
 * Cât timp nu există ecranul de pachet (unde stilista alege dintre cartonașe),
 * exportul face un singur reel. Îl luăm pe primul definit de parteneră; dacă
 * șablonul n-are postări, întoarcem null și se folosește `planAllScenes`.
 */
export function pickDefaultReel(scenario: Scenario): SessionOutput | null {
  return scenario.outputs?.find((o) => o.kind === "reel" && o.slots.length > 0) ?? null;
}

// ════════════════════════════════════════════════════════════════════
//  PACHETUL — ce are stilista la sfârșitul programării
// ════════════════════════════════════════════════════════════════════

/** Starea unei postări față de ce s-a filmat efectiv. */
export interface OutputStatus {
  output: SessionOutput;
  /** Câte momente ale postării au clip. */
  filmed: number;
  /** Câte cere în total. */
  total: number;
  /** Toate momentele filmate — postarea iese exact cum a gândit-o partenera. */
  complete: boolean;
  /** slotKey-urile care lipsesc, în ordinea postării. */
  missing: string[];
  /** Clipul din care se desenează cartonașul. */
  poster?: PlannedClip;
}

/**
 * Ce se poate face acum, din ce s-a filmat.
 *
 * Regula „NICIODATĂ ZERO": o postare cu măcar un moment filmat rămâne în
 * pachet. Iese mai scurtă decât a gândit-o partenera, dar iese. Doar
 * postările fără niciun moment filmat dispar — n-ar avea din ce se face.
 *
 * Ordinea: întâi cele întregi. Stilista vede ce e gata, nu ce-i lipsește.
 */
export function summarizeOutputs(
  scenario: Scenario,
  clips: StoredClip[],
): OutputStatus[] {
  const outputs = scenario.outputs ?? [];
  const filmedSlots = new Set<string>();
  const bySceneIdx = new Set(clips.map((c) => c.sceneIdx));
  scenario.scenes.forEach((scene, idx) => {
    if (scene.slotKey && bySceneIdx.has(idx)) filmedSlots.add(scene.slotKey);
  });

  const list: OutputStatus[] = [];
  for (const output of outputs) {
    if (output.slots.length === 0) continue;
    const missing = output.slots.filter((s) => !filmedSlots.has(s.slot)).map((s) => s.slot);
    const filmed = output.slots.length - missing.length;
    if (filmed === 0) continue; // n-are din ce se face
    const planned = planOutput(scenario, output, clips);
    list.push({
      output,
      filmed,
      total: output.slots.length,
      complete: missing.length === 0,
      missing,
      // Coperta aleasă de parteneră, dacă momentul ei e filmat; altfel primul.
      poster: planned.find((pl) => pl.scene.slotKey === output.coverSlot) ?? planned[0],
    });
  }

  return list.sort((a, b) => Number(b.complete) - Number(a.complete));
}

/**
 * Ce moment ar aduce cel mai mult dacă s-ar mai filma.
 *
 * Numărătoarea merge ÎN SUS, fără numitor: nu „ai 3 din 5", ci „mai filmează
 * reacția → încă două postări". Un procent i-ar spune că a eșuat când n-a
 * eșuat — vezi CLAUDE.md, „Sfârșitul".
 *
 * Întoarce null când nu mai e nimic de câștigat dintr-un singur moment.
 */
export function bestNextMoment(
  scenario: Scenario,
  statuses: OutputStatus[],
): { slotKey: string; title: string; unlocks: number } | null {
  const gain = new Map<string, number>();
  for (const st of statuses) {
    // Doar postările cărora le lipsește EXACT un moment devin întregi
    // filmându-l. Altfel promitem un rezultat care tot nu apare.
    if (st.missing.length !== 1) continue;
    const key = st.missing[0];
    gain.set(key, (gain.get(key) ?? 0) + 1);
  }
  let best: { slotKey: string; unlocks: number } | null = null;
  for (const [slotKey, unlocks] of gain) {
    if (!best || unlocks > best.unlocks) best = { slotKey, unlocks };
  }
  if (!best) return null;
  const scene = scenario.scenes.find((s) => s.slotKey === best.slotKey);
  return { slotKey: best.slotKey, title: scene?.hook || scene?.tag || "un moment", unlocks: best.unlocks };
}

/** Postarea cerută prin URL; null dacă lipsește sau nu mai există. */
export function findOutput(scenario: Scenario, outputId?: string): SessionOutput | null {
  if (!outputId) return null;
  return scenario.outputs?.find((o) => o.id === outputId) ?? null;
}
