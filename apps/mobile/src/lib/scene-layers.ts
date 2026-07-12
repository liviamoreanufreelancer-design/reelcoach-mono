/**
 * ════════════════════════════════════════════════════════════════════
 *  SCENE LAYERS — model unificat pentru textul de pe reel
 * ════════════════════════════════════════════════════════════════════
 *
 *  Textul partenerei (Studio) vine ca `scene.textLayers` (multi-strat,
 *  pozitie libera, font/culoare fixate de partenera). Stilista editeaza
 *  DOAR continutul (`.text`) — editarile ei stau local in
 *  `EditorState.layerTextEdits` (vezi useEditor).
 *
 *  `effectiveLayers` combina cele doua: layerele partenerei cu textul
 *  suprascris de stilista acolo unde exista o editare. Aceeasi functie
 *  hraneste PREVIEW-ul si EXPORT-ul → preview = export.
 * ════════════════════════════════════════════════════════════════════
 */

import type { Scene } from "@/data/scenarios";
import type { TextLayer } from "@reelcoach/core";

/** True daca scena are straturi de text de la partenera. */
export function sceneHasLayers(scene: Scene): boolean {
  return !!(scene.textLayers && scene.textLayers.length > 0);
}

/**
 * Straturile efective pentru o scena: layerele partenerei cu `.text`
 * suprascris de editarile locale ale stilistei (`edits`: layerId -> text).
 * Nu muteaza intrarile — intoarce copii doar acolo unde textul difera.
 */
export function effectiveLayers(
  scene: Scene,
  edits: Record<string, string> | undefined,
): TextLayer[] {
  const base = scene.textLayers ?? [];
  if (!edits) return base;
  return base.map((l) =>
    edits[l.id] !== undefined && edits[l.id] !== l.text ? { ...l, text: edits[l.id] } : l,
  );
}
