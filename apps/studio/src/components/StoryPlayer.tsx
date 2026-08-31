"use client";
/**
 * StoryPlayer — o poveste, redată, nu înghețată.
 *
 * Coperta desenează un cadru; aici filmarea chiar rulează. Nu e un moft: o
 * poveste de 4 secunde se judecă pe ritm și pe cum apare textul peste
 * mișcare, iar un cadru fix nu spune nimic despre niciuna.
 *
 * O poveste-imagine stă 5 secunde, ca pe Instagram. Nu e configurabil pentru
 * că nici acolo nu e — o durată pe care rețeaua o impune n-are ce căuta ca
 * decizie a partenerei.
 *
 * DESENUL TRECE PRIN `renderPreviewFrame`, ca peste tot: același filtru,
 * același efect, același text ca la export. Nu e un player de video, e
 * randarea reală, rulată în buclă.
 */
import { useEffect, useRef } from "react";
import { renderPreviewFrame, FILTERS, type TextLayer } from "@reelcoach/core";
import type { Composition, ShotLike } from "@/lib/db-types";
import { isImageUrl } from "@/lib/media-display";

const W = 540;
const H = 960;
/** Cât stă o poveste-imagine. Instagram folosește 5s; nu se reglează. */
export const PHOTO_STORY_SEC = 5;

export default function StoryPlayer({
  output,
  shots,
  index,
  onProgress,
  onDone,
}: {
  output: Composition;
  shots: ShotLike[];
  index: number;
  /** 0→1 în cadrul poveștii curente, pentru bara de sus. */
  onProgress: (p: number) => void;
  /** Povestea s-a terminat — părintele trece la următoarea. */
  onDone: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  // Prin ref, nu prin dependențe: altfel bucla s-ar reporni la fiecare cadru
  // raportat, iar filmarea ar sări de la început la nesfârșit.
  const cbRef = useRef({ onProgress, onDone });
  useEffect(() => { cbRef.current = { onProgress, onDone }; }, [onProgress, onDone]);

  const slot = output.slots[index];
  const shot = shots.find((s) => s.slot_key === slot?.slot);
  const url = shot?.sample_video_url ?? null;
  const isPhoto = isImageUrl(url);
  const filterId = slot?.filter ?? output.filter ?? "none";
  const layers = (slot?.textLayers as TextLayer[] | undefined) ?? [];
  const layersKey = JSON.stringify(layers);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !url) return;

    let stopped = false;
    let started = 0;

    const paint = (source: CanvasImageSource, localMs: number, totalMs: number) => {
      renderPreviewFrame(canvas, source as HTMLVideoElement, {
        filter: FILTERS[filterId as keyof typeof FILTERS] ?? FILTERS.none,
        effectId: shot?.effect ?? undefined,
        localMs,
        clipMs: totalMs,
        tNorm: totalMs > 0 ? localMs / totalMs : 0,
        textLayers: layers.length > 0 ? layers : undefined,
      });
    };

    // ── Imagine: se desenează o dată, ceasul curge separat ──────────────
    if (isPhoto) {
      const img = new Image();
      img.onload = () => {
        if (stopped) return;
        started = performance.now();
        const totalMs = PHOTO_STORY_SEC * 1000;
        const loop = () => {
          if (stopped) return;
          const local = performance.now() - started;
          paint(img, local, totalMs);
          cbRef.current.onProgress(Math.min(1, local / totalMs));
          if (local >= totalMs) { cbRef.current.onDone(); return; }
          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      };
      img.src = url;
      return () => { stopped = true; if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }

    // ── Filmare: rulează, tăiată la durata poveștii ─────────────────────
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const onReady = () => {
      if (stopped) return;
      const full = video.duration || 4;
      // Aceeași fereastră ca la export: mijlocul clipului. Începutul are
      // tremurul de la pornire, sfârșitul ezitarea de la oprire.
      const win = Math.min(slot?.sec ?? full, full);
      const start = Math.max(0, (full - win) / 2);
      try { video.currentTime = start; } catch { /* not ready */ }
      video.playbackRate = slot?.speed ?? 1;
      void video.play().catch(() => {});

      const loop = () => {
        if (stopped) return;
        const local = Math.max(0, (video.currentTime - start) * 1000);
        if (video.readyState >= 2) paint(video, local, win * 1000);
        const p = win > 0 ? local / (win * 1000) : 1;
        cbRef.current.onProgress(Math.min(1, p));
        if (p >= 1) { cbRef.current.onDone(); return; }
        rafRef.current = requestAnimationFrame(loop);
      };
      loop();
    };

    video.addEventListener("loadeddata", onReady, { once: true });
    video.src = url;

    return () => {
      stopped = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, isPhoto, filterId, layersKey, slot?.sec, slot?.speed, shot?.effect, index]);

  return (
    <canvas
      ref={canvasRef}
      width={W}
      height={H}
      className="absolute inset-0 w-full h-full object-cover bg-black"
    />
  );
}
