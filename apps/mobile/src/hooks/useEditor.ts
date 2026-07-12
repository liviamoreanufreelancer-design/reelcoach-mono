import { useEffect, useState, useCallback } from "react";
import { get, set } from "idb-keyval";
import type { TextPosition } from "@reelcoach/core";
import type { Vibe } from "@/lib/brand-store";
import type { FilterId } from "@reelcoach/core";
import type { TransitionId } from "@reelcoach/core";

export interface CaptionState {
  text: string;
  position: TextPosition;
  /** Culoare text optionala (default = brand.primary). */
  color?: string;
}

/** "original" = pastreaza fontul setat in Studio per scena; altfel suprascrie cu vibe. */
export type StyleId = Vibe | "original";

export interface EditorState {
  scenarioId: string;
  captions: CaptionState[];
  styleId: StyleId;
  filterId: FilterId;
  /** Optional override for transition. If null, use the style pack's default. */
  transitionId: TransitionId | null;
  trackId: string | null; // null = no music
  /** Master switch for the premium per-shot effects (sparkle/leak/bokeh/dust). */
  effectsEnabled: boolean;
  /**
   * Editarile IN-PLACE ale stilistei pe straturile de text ale partenerei.
   * Structura: sceneIdx -> { layerId -> textNou }. Stilista schimba DOAR
   * continutul (cuvintele); designul (font/pozitie/culoare) ramane al
   * partenerei. Salvat LOCAL pe device — nu modifica template-ul din Studio.
   */
  layerTextEdits?: Record<number, Record<string, string>>;
  updatedAt: number;
}

const key = (scenarioId: string) => `editor:state:${scenarioId}`;

export function useEditor(scenarioId: string, defaults: { captions: CaptionState[]; vibe: Vibe }) {
  const [state, setState] = useState<EditorState | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = (await get(key(scenarioId))) as EditorState | undefined;
      if (cancelled) return;
      setState(
        stored
          ? {
              ...stored,
              filterId: stored.filterId ?? "none",
              transitionId: stored.transitionId ?? null,
              effectsEnabled: stored.effectsEnabled ?? true,
              layerTextEdits: stored.layerTextEdits ?? {},
            }
          : {
              scenarioId,
              captions: defaults.captions,
              styleId: "original",
              filterId: "none",
              transitionId: null,
              trackId: null,
              effectsEnabled: true,
              layerTextEdits: {},
              updatedAt: Date.now(),
            },
      );
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenarioId]);

  const persist = useCallback(
    async (next: EditorState) => {
      setState(next);
      await set(key(scenarioId), next);
    },
    [scenarioId],
  );

  const updateCaption = useCallback(
    (idx: number, patch: Partial<CaptionState>) => {
      if (!state) return;
      const captions = state.captions.map((c, i) => (i === idx ? { ...c, ...patch } : c));
      void persist({ ...state, captions, updatedAt: Date.now() });
    },
    [state, persist],
  );

  /**
   * Editare in-place a stilistei pe un strat de text al partenerei. Schimba
   * DOAR textul (`.text`); pastreaza tot designul. Salvat local per reel.
   */
  const updateLayerText = useCallback(
    (sceneIdx: number, layerId: string, text: string) => {
      if (!state) return;
      const prev = state.layerTextEdits ?? {};
      const forScene = { ...(prev[sceneIdx] ?? {}), [layerId]: text };
      const layerTextEdits = { ...prev, [sceneIdx]: forScene };
      void persist({ ...state, layerTextEdits, updatedAt: Date.now() });
    },
    [state, persist],
  );

  const setStyle = useCallback(
    (styleId: StyleId) => {
      if (!state) return;
      void persist({ ...state, styleId, updatedAt: Date.now() });
    },
    [state, persist],
  );

  const setTrack = useCallback(
    (trackId: string | null) => {
      if (!state) return;
      void persist({ ...state, trackId, updatedAt: Date.now() });
    },
    [state, persist],
  );

  const setFilter = useCallback(
    (filterId: FilterId) => {
      if (!state) return;
      void persist({ ...state, filterId, updatedAt: Date.now() });
    },
    [state, persist],
  );

  const setTransition = useCallback(
    (transitionId: TransitionId | null) => {
      if (!state) return;
      void persist({ ...state, transitionId, updatedAt: Date.now() });
    },
    [state, persist],
  );

  const setEffectsEnabled = useCallback(
    (effectsEnabled: boolean) => {
      if (!state) return;
      void persist({ ...state, effectsEnabled, updatedAt: Date.now() });
    },
    [state, persist],
  );

  return {
    state,
    updateCaption,
    updateLayerText,
    setStyle,
    setTrack,
    setFilter,
    setTransition,
    setEffectsEnabled,
  };
}
