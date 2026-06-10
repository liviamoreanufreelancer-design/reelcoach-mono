"use client";
/**
 * LiveScenePreview (Faza 2.2) — live preview + compact editor + persistent
 * footage. Footage uploads to Supabase `samples` and is reloaded per scene
 * from sample_video_url, so it survives refresh. "Preview = export."
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renderPreviewFrame, FILTERS, type FilterId } from "@reelcoach/core";
import { updateShot, updateGlobalFilter, uploadShotSample } from "@/lib/template-actions";
import { TRANSITIONS, FILTERS as FILTER_OPTS, EFFECTS } from "@/lib/options";
import type { ShotRow, TransitionId, EffectId } from "@/lib/db-types";

const W = 540;
const H = 960;
const SPEED_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0];

export default function LiveScenePreview({
  templateId,
  shots,
  globalFilter,
  disabled,
}: {
  templateId: string;
  shots: ShotRow[];
  globalFilter: string | null;
  disabled: boolean;
}) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rafRef = useRef<number | null>(null);
  const localUrlRef = useRef<string | null>(null);

  const [hasVideo, setHasVideo] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  const shot = shots[selectedIdx];
  const resolvedFilterId = (globalFilter || shot?.filter_style || "none") as FilterId;
  const resolvedEffectId = shot?.effect ?? "none";
  const resolvedSpeed = shot?.playback_speed ?? 1;

  const filterRef = useRef(resolvedFilterId);
  const effectRef = useRef(resolvedEffectId);
  const speedRef = useRef(resolvedSpeed);
  useEffect(() => { filterRef.current = resolvedFilterId; }, [resolvedFilterId]);
  useEffect(() => { effectRef.current = resolvedEffectId; }, [resolvedEffectId]);
  useEffect(() => { speedRef.current = resolvedSpeed; }, [resolvedSpeed]);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    let running = true;
    const loop = () => {
      if (!running) return;
      if (video.readyState >= 2) {
        if (video.playbackRate !== speedRef.current) video.playbackRate = speedRef.current;
        const dur = video.duration || 4;
        const tNorm = dur > 0 ? (video.currentTime % dur) / dur : 0;
        renderPreviewFrame(canvas, video, {
          filter: FILTERS[filterRef.current] ?? FILTERS.none,
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
  }, []);

  // When the selected scene changes (or its saved footage), load the persisted
  // sample from Supabase so each scene shows its own clip across refreshes.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // A freshly-picked local file takes priority until the page revalidates.
    if (localUrlRef.current) return;
    const saved = shot?.sample_video_url;
    if (saved) {
      video.src = saved;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      video.play().catch(() => {});
      setHasVideo(true);
    } else {
      video.removeAttribute("src");
      video.load();
      setHasVideo(false);
    }
  }, [shot?.id, shot?.sample_video_url]);

  useEffect(() => {
    return () => { if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current); };
  }, []);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shot) return;
    const video = videoRef.current;
    if (!video) return;

    // 1) Instant local preview (no crossOrigin for blob URLs).
    if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
    const url = URL.createObjectURL(file);
    localUrlRef.current = url;
    video.crossOrigin = "";
    video.src = url;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.play().catch(() => {});
    setHasVideo(true);

    // 2) Persist to Supabase `samples` in the background.
    const fd = new FormData();
    fd.set("sample", file);
    setUploading(true);
    startTransition(async () => {
      try {
        await uploadShotSample(shot.id, templateId, fd);
        // After save, drop the local URL so the persisted one is used on refresh.
        if (localUrlRef.current) { URL.revokeObjectURL(localUrlRef.current); localUrlRef.current = null; }
        router.refresh();
      } finally {
        setUploading(false);
      }
    });
  };

  const saveShot = (patch: Parameters<typeof updateShot>[2]) => {
    if (!shot) return;
    startTransition(async () => {
      await updateShot(shot.id, templateId, patch);
      router.refresh();
    });
  };
  const saveFilter = (filterId: string) => {
    startTransition(async () => {
      await updateGlobalFilter(templateId, filterId);
      router.refresh();
    });
  };

  if (shots.length === 0) {
    return (
      <div className="card p-4 sm:p-5">
        <h2 className="text-[10px] tracking-[0.32em] uppercase text-[#E8D5B5]/85 font-bold mb-3">Preview live</h2>
        <p className="text-[12px] text-white/45 leading-relaxed">Adauga o scena pentru a vedea preview-ul si a edita reteta.</p>
      </div>
    );
  }

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] tracking-[0.32em] uppercase text-[#E8D5B5]/85 font-bold">Preview & reteta</h2>
        {(pending || uploading) && <span className="text-[9px] tracking-[0.2em] uppercase text-white/45">{uploading ? "urc footage…" : "salvez…"}</span>}
      </div>

      {shots.length > 1 && (
        <div className="mb-3">
          <label className="label">Scena</label>
          <select value={selectedIdx} onChange={(e) => { localUrlRef.current && URL.revokeObjectURL(localUrlRef.current); localUrlRef.current = null; setSelectedIdx(Number(e.target.value)); }} className="input">
            {shots.map((s, i) => (<option key={s.id} value={i}>{i + 1}. {s.title || "Fara titlu"}{s.sample_video_url ? " ✓" : ""}</option>))}
          </select>
        </div>
      )}

      {/* Live preview — 9:16 */}
      <div className="relative w-full rounded-xl overflow-hidden bg-black border border-[#E8D5B5]/15 mb-3" style={{ aspectRatio: "9 / 16" }}>
        <canvas ref={canvasRef} width={W} height={H} className="absolute inset-0 w-full h-full object-cover" />
        <video ref={videoRef} className="hidden" playsInline muted />
        {!hasVideo && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-[12px] text-white/40 text-center px-6 leading-relaxed">Incarca un clip pentru aceasta scena.</p>
          </div>
        )}
        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
          <span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[10px] tracking-[0.15em] uppercase text-[#E8D5B5] font-semibold">{resolvedFilterId}</span>
          {resolvedEffectId !== "none" && (<span className="px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[10px] tracking-[0.15em] uppercase text-[#E8D5B5]/80">{resolvedEffectId}</span>)}
        </div>
      </div>

      {/* Upload */}
      <div className="mb-3">
        <label className="label">Clip pentru aceasta scena</label>
        <input type="file" accept="video/*" onChange={onPickFile} disabled={disabled || uploading} className="input" />
      </div>

      {/* Compact 2-col control grid */}
      <fieldset disabled={disabled} className="disabled:opacity-50">
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="label">Filtru (reel)</label>
            <select value={resolvedFilterId} onChange={(e) => saveFilter(e.target.value)} className="input">
              {FILTER_OPTS.map((f) => (<option key={f.id} value={f.id}>{f.label}</option>))}
            </select>
          </div>
          <div>
            <label className="label">Efect</label>
            <select value={shot.effect} onChange={(e) => saveShot({ effect: e.target.value as EffectId })} className="input">
              {EFFECTS.map((e) => (<option key={e.id} value={e.id}>{e.label}</option>))}
            </select>
          </div>
          <div>
            <label className="label">Tranzitie</label>
            <select value={shot.transition_type} onChange={(e) => saveShot({ transition_type: e.target.value as TransitionId })} className="input">
              {TRANSITIONS.map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
            </select>
          </div>
          <div>
            <label className="label">Viteza</label>
            <select value={shot.playback_speed} onChange={(e) => saveShot({ playback_speed: Number(e.target.value) })} className="input">
              {SPEED_PRESETS.map((v) => (<option key={v} value={v}>{v}×</option>))}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer mt-3 pt-3 border-t border-[#E8D5B5]/10">
          <input type="checkbox" checked={shot.motion_blur ?? false} onChange={(e) => saveShot({ motion_blur: e.target.checked })} className="w-4 h-4 accent-[#E8D5B5]" />
          <span className="text-[12px] text-white/85">Motion blur <span className="text-white/45">(scena)</span></span>
        </label>
      </fieldset>
    </div>
  );
}
