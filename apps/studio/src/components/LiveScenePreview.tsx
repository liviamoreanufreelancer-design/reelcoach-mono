"use client";
/**
 * LiveScenePreview (C.1) — live preview through the shared engine.
 * Upload a video File; a hidden <video> loops it and a <canvas> paints each
 * frame via renderPreviewFrame from @reelcoach/core with the chosen filter +
 * effect. Real grading, not CSS. "Preview = export."
 */
import { useEffect, useRef, useState } from "react";
import {
  renderPreviewFrame,
  FILTERS,
  STUDIO_FILTERS,
  EFFECT_LIST,
  type FilterId,
} from "@reelcoach/core";

const W = 540;
const H = 960;

export default function LiveScenePreview() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const urlRef = useRef<string | null>(null);

  const [hasVideo, setHasVideo] = useState(false);
  const [filterId, setFilterId] = useState<FilterId>("none");
  const [effectId, setEffectId] = useState<string>("none");

  const filterRef = useRef(filterId);
  const effectRef = useRef(effectId);
  useEffect(() => { filterRef.current = filterId; }, [filterId]);
  useEffect(() => { effectRef.current = effectId; }, [effectId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    let running = true;
    const loop = () => {
      if (!running) return;
      if (video.readyState >= 2) {
        const dur = video.duration || 4;
        const tNorm = dur > 0 ? (video.currentTime % dur) / dur : 0;
        renderPreviewFrame(canvas, video, {
          filter: FILTERS[filterRef.current],
          effectId: effectRef.current,
          tNorm,
          localMs: video.currentTime * 1000,
          clipMs: dur * 1000,
        });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [hasVideo]);

  useEffect(() => {
    return () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); };
  }, []);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const video = videoRef.current;
    if (!video) return;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    video.src = url;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.play().catch(() => {});
    setHasVideo(true);
  };

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] tracking-[0.32em] uppercase text-[#E8D5B5]/85 font-bold">
          Preview live (test)
        </h2>
        <span className="text-[9px] tracking-[0.2em] uppercase text-white/40">engine real</span>
      </div>
      <div
        className="relative w-full rounded-xl overflow-hidden bg-black border border-[#E8D5B5]/15 mb-3"
        style={{ aspectRatio: "9 / 16" }}
      >
        <canvas ref={canvasRef} width={W} height={H} className="absolute inset-0 w-full h-full object-cover" />
        {!hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[12px] text-white/40 text-center px-6 leading-relaxed">
              Încarcă un clip pentru a vedea filtrul și efectul aplicate live.
            </p>
          </div>
        )}
        <video ref={videoRef} className="hidden" />
      </div>
      <div className="mb-3">
        <label className="label">Clip de test</label>
        <input type="file" accept="video/*" onChange={onPickFile} className="input" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="label">Filtru</label>
          <select value={filterId} onChange={(e) => setFilterId(e.target.value as FilterId)} className="input">
            {STUDIO_FILTERS.map((f) => (<option key={f.id} value={f.id}>{f.label}</option>))}
          </select>
        </div>
        <div>
          <label className="label">Efect</label>
          <select value={effectId} onChange={(e) => setEffectId(e.target.value)} className="input">
            {EFFECT_LIST.map((fx) => (<option key={fx.id} value={fx.id}>{fx.label}</option>))}
          </select>
        </div>
      </div>
    </div>
  );
}
