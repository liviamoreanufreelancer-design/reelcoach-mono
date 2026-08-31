/**
 * OutputPoster — cartonașul unei postări din pachet.
 *
 * Desenează UN CADRU, nu randează video. Diferența nu e cosmetică: randarea
 * folosește MediaRecorder, care merge în timp real — patru postări ar însemna
 * de patru ori durata reelului, la finalul unei programări, cu clienta încă pe
 * scaun. `renderPreviewFrame` costă milisecunde. Randarea completă se face
 * doar la export, pentru postarea pe care o alege ea (CLAUDE.md, „nu randa
 * eager").
 *
 * Cadrul e desenat cu stilul REZOLVAT al postării (filtru, efect, text), deci
 * cartonașul arată ca rezultatul, nu ca materialul brut.
 *
 * Sursa e un Blob din IndexedDB — local, fără rețea. Handle-ul obiectului se
 * revocă imediat ce cadrul e pe canvas; Blob-ul rămâne neatins în IDB.
 */
import { useEffect, useRef, useState } from "react";
import { renderPreviewFrame, FILTERS } from "@reelcoach/core";
import type { PlannedClip } from "@/lib/output-plan";

const W = 324;
const H = 576;

export function OutputPoster({
  poster,
  aspect = "9 / 16",
}: {
  poster?: PlannedClip;
  /** Forma cartonașului: 9:16 la reel, 4:5 la carusel. */
  aspect?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !poster) return;

    let cancelled = false;
    const url = URL.createObjectURL(poster.clip.blob);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;

    const cleanup = () => {
      video.src = "";
      URL.revokeObjectURL(url);
    };

    const paint = () => {
      if (cancelled) return;
      renderPreviewFrame(canvas, video, {
        filter: FILTERS[poster.filterId as keyof typeof FILTERS] ?? FILTERS.none,
        effectId: poster.scene?.effectId,
        textLayers:
          poster.textLayers && poster.textLayers.length > 0 ? poster.textLayers : undefined,
      });
      setDrawn(true);
      cleanup();
    };

    const onLoaded = () => {
      // Mijlocul clipului: începutul prinde des mâna care apasă butonul.
      const t = (video.duration || 2) / 2;
      video.addEventListener("seeked", paint, { once: true });
      try {
        video.currentTime = t;
      } catch {
        paint();
      }
    };

    video.addEventListener("loadeddata", onLoaded, { once: true });
    video.addEventListener("error", cleanup, { once: true });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [poster]);

  return (
    <div
      style={{ aspectRatio: aspect }}
      className="relative w-full rounded-xl overflow-hidden bg-neutral-800"
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className={`absolute inset-0 w-full h-full transition-opacity duration-200 ${
          drawn ? "opacity-100" : "opacity-0"
        }`}
      />
      {!drawn && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white/80 animate-spin" />
        </div>
      )}
    </div>
  );
}
