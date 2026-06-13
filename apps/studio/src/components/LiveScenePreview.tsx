"use client";
/**
 * LiveScenePreview — scene editor (per-scene only). Preview hero with
 * pause/play + grouped controls (Durată / Text / Aspect / Mișcare). Cover +
 * publish actions now live in the page sidebar, not here. Text group: text
 * input saves overlay_text live; position + style are visual-only until the
 * captions phase adds the columns + engine wiring. "Preview = export."
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { renderPreviewFrame, FILTERS, type FilterId } from "@reelcoach/core";
import { updateShot, updateGlobalFilter, uploadShotSample, uploadCover, uploadExampleImage } from "@/lib/template-actions";
import { TRANSITIONS, FILTERS as FILTER_OPTS, EFFECTS } from "@/lib/options";
import type { ShotRow, TransitionId, EffectId } from "@/lib/db-types";
import ReelPlayer from "./ReelPlayer";

const W = 540;
const H = 960;
const SPEED_PRESETS = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0];
const TEXT_POSITIONS = [
  { id: "top", label: "Sus" },
  { id: "center", label: "Centru" },
  { id: "bottom", label: "Jos" },
];
const TEXT_STYLES = [
  { id: "hookBold", label: "Hook Bold" },
  { id: "luxurySerif", label: "Luxury Serif" },
  { id: "bubblePill", label: "Bubble Pill" },
  { id: "subtitleOutline", label: "Subtitrare" },
  { id: "badgeGold", label: "Badge Gold" },
  { id: "brandSoft", label: "Soft Pink" },
];

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
  const trimSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [hasVideo, setHasVideo] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [reelMode, setReelMode] = useState(false);
  const [reelMounted, setReelMounted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [clipDuration, setClipDuration] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pending, startTransition] = useTransition();

  const shot = shots[selectedIdx];
  const resolvedFilterId = (globalFilter || shot?.filter_style || "none") as FilterId;
  const resolvedEffectId = shot?.effect ?? "none";
  const resolvedSpeed = shot?.playback_speed ?? 1;

  const [trimSec, setTrimSec] = useState<number>(shot?.final_usage_duration ?? 2);
  const [textValue, setTextValue] = useState<string>(shot?.overlay_text ?? "");
  const [textPos, setTextPos] = useState<string>(shot?.caption_position ?? "bottom");
  const [textStyle, setTextStyle] = useState<string>(shot?.caption_preset ?? "hookBold");
  useEffect(() => { setTextPos(shot?.caption_position ?? "bottom"); }, [shot?.id, shot?.caption_position]);
  useEffect(() => { setTextStyle(shot?.caption_preset ?? "hookBold"); }, [shot?.id, shot?.caption_preset]);

  useEffect(() => { setTrimSec(shot?.final_usage_duration ?? 2); }, [shot?.id, shot?.final_usage_duration]);
  useEffect(() => { setTextValue(shot?.overlay_text ?? ""); }, [shot?.id]); // doar la schimbare scena, nu in timp ce tastezi

  const filterRef = useRef(resolvedFilterId);
  const effectRef = useRef(resolvedEffectId);
  const speedRef = useRef(resolvedSpeed);
  const trimRef = useRef(trimSec);
  const textRef = useRef(textValue);
  const posRef = useRef(textPos);
  const styleRef = useRef(textStyle);
  useEffect(() => { filterRef.current = resolvedFilterId; }, [resolvedFilterId]);
  useEffect(() => { effectRef.current = resolvedEffectId; }, [resolvedEffectId]);
  useEffect(() => { speedRef.current = resolvedSpeed; }, [resolvedSpeed]);
  useEffect(() => { trimRef.current = trimSec; }, [trimSec]);
  useEffect(() => { textRef.current = textValue; }, [textValue]);
  useEffect(() => { posRef.current = textPos; }, [textPos]);
  useEffect(() => { styleRef.current = textStyle; }, [textStyle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    let running = true;
    const loop = () => {
      if (!running) return;
      if (video.readyState >= 2) {
        if (video.playbackRate !== speedRef.current) video.playbackRate = speedRef.current;
        const full = video.duration || 4;
        const win = Math.min(trimRef.current || full, full);
        const start = Math.max(0, (full - win) / 2);
        const end = start + win;
        if (!video.paused && (video.currentTime < start || video.currentTime >= end)) {
          try { video.currentTime = start; } catch { /* not ready */ }
        }
        const local = Math.max(0, video.currentTime - start);
        const tNorm = win > 0 ? local / win : 0;
        renderPreviewFrame(canvas, video, {
          filter: FILTERS[filterRef.current] ?? FILTERS.none,
          effectId: effectRef.current,
          tNorm,
          localMs: local * 1000,
          clipMs: win * 1000,
          caption: textRef.current.trim()
            ? { text: textRef.current, position: posRef.current as "top" | "center" | "bottom", presetId: styleRef.current }
            : undefined,
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

  const onMeta = () => {
    const video = videoRef.current;
    if (video && video.duration && isFinite(video.duration)) setClipDuration(video.duration);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
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
      setPaused(false);
    } else {
      video.removeAttribute("src");
      video.load();
      setHasVideo(false);
      setClipDuration(0);
    }
  }, [shot?.id, shot?.sample_video_url]);

  useEffect(() => {
    return () => {
      if (localUrlRef.current) URL.revokeObjectURL(localUrlRef.current);
      if (trimSaveRef.current) clearTimeout(trimSaveRef.current);
      if (textSaveRef.current) clearTimeout(textSaveRef.current);
    };
  }, []);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shot) return;
    const MAX_MB = 50;
    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`Clipul e prea mare (${(file.size / 1024 / 1024).toFixed(0)}MB). Încarcă unul sub ${MAX_MB}MB — pentru un exemplu scurt, un clip de 5-10 secunde la calitate normală e numai bun.`);
      e.target.value = "";
      return;
    }
    const video = videoRef.current;
    if (!video) return;
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
    setPaused(false);

    const fd = new FormData();
    fd.set("sample", file);
    setUploading(true);
    startTransition(async () => {
      try {
        await uploadShotSample(shot.id, templateId, fd);
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

  const onTrimChange = (value: number) => {
    setTrimSec(value);
    if (trimSaveRef.current) clearTimeout(trimSaveRef.current);
    trimSaveRef.current = setTimeout(() => {
      if (!shot) return;
      startTransition(async () => {
        await updateShot(shot.id, templateId, { final_usage_duration: value });
        router.refresh();
      });
    }, 500);
  };

  const onTextChange = (value: string) => {
    setTextValue(value);
    if (textSaveRef.current) clearTimeout(textSaveRef.current);
    textSaveRef.current = setTimeout(() => {
      if (!shot) return;
      // Save quietly — NO router.refresh() (it re-renders mid-typing and wipes input).
      updateShot(shot.id, templateId, { overlay_text: value || null }).catch(() => {});
    }, 600);
  };

  const selectScene = (i: number) => {
    if (localUrlRef.current) { URL.revokeObjectURL(localUrlRef.current); localUrlRef.current = null; }
    setSelectedIdx(i);
    setReelMode(false);
    setPaused(false);
  };

  // Render the CURRENT frame at full 1080x1920 (preview canvas is 540x960 for
  // smooth playback; captures need full resolution so covers/examples are sharp).
  const captureHiRes = (cb: (blob: Blob | null) => void) => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) { cb(null); return; }
    const hi = document.createElement("canvas");
    hi.width = 1080;
    hi.height = 1920;
    renderPreviewFrame(hi, video, {
      filter: FILTERS[filterRef.current] ?? FILTERS.none,
      effectId: effectRef.current,
      caption: textRef.current.trim()
        ? { text: textRef.current, position: posRef.current as "top" | "center" | "bottom", presetId: styleRef.current }
        : undefined,
    });
    hi.toBlob(cb, "image/png");
  };

  const captureCover = () => {
    captureHiRes((blob) => {
      if (!blob) { alert("Nu am putut captura cadrul."); return; }
      const file = new File([blob], `cover-${Date.now()}.png`, { type: "image/png" });
      const fd = new FormData();
      fd.set("cover", file);
      startTransition(async () => {
        await uploadCover(templateId, fd);
        router.refresh();
      });
    });
  };

  const captureExample = () => {
    if (!shot) return;
    captureHiRes((blob) => {
      if (!blob) { alert("Nu am putut captura cadrul."); return; }
      const file = new File([blob], `example-${Date.now()}.png`, { type: "image/png" });
      const fd = new FormData();
      fd.set("example", file);
      startTransition(async () => {
        await uploadExampleImage(shot.id, templateId, fd);
        router.refresh();
      });
    });
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video || !hasVideo) return;
    if (video.paused) { video.play().catch(() => {}); setPaused(false); }
    else { video.pause(); setPaused(true); }
  };

  if (shots.length === 0) {
    return (
      <div className="card p-6 text-center">
        <h2 className="text-[10px] tracking-[0.32em] uppercase text-[#E8D5B5]/85 font-bold mb-2">Editor scenă</h2>
        <p className="text-[12px] text-white/45 leading-relaxed">Adaugă o scenă mai jos pentru a începe.</p>
      </div>
    );
  }

  const trimMax = clipDuration > 0 ? Math.floor(clipDuration * 10) / 10 : 10;

  return (
    <div className="card p-6 sm:p-7">
      {/* Scene tabs */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap mb-6">
        {shots.map((s, i) => {
          const active = i === selectedIdx && !reelMode;
          return (
            <button key={s.id} type="button" onClick={() => selectScene(i)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-medium transition tabular-nums ${active ? "bg-[#E8D5B5] text-[#0F1419]" : "text-white/55 hover:text-white/85"}`}>
              Scena {i + 1}{s.sample_video_url ? " ✓" : ""}
            </button>
          );
        })}
        <span className="w-px h-5 bg-[#E8D5B5]/20 mx-1" />
        <button type="button" onClick={() => { setReelMode(true); setReelMounted(true); }}
          className={`px-4 py-1.5 rounded-full text-[13px] font-semibold transition ${reelMode ? "bg-[#E8D5B5] text-[#0F1419]" : "text-white/55 hover:text-white/85"}`}>
          ▶ Reel
        </button>
        {(pending || uploading) && <span className="text-[9px] tracking-[0.2em] uppercase text-white/40 ml-2">{uploading ? "urc…" : "salvez…"}</span>}
      </div>

      <div className={`grid grid-cols-1 sm:grid-cols-[190px_1fr] gap-7 items-start ${reelMode ? "hidden" : ""}`}>

        {/* LEFT: preview + clip buttons */}
        <div className="flex flex-col gap-2">
          <div className="relative w-full rounded-2xl overflow-hidden bg-black border border-[#E8D5B5]/15" style={{ aspectRatio: "9 / 16" }}>
            <canvas ref={canvasRef} width={W} height={H} className="absolute inset-0 w-full h-full object-cover" />
            <video ref={videoRef} className="hidden" playsInline muted onLoadedMetadata={onMeta} />
            {!hasVideo && (
              <div className="absolute inset-0 flex items-center justify-center text-white/35">
                <span className="text-[12px]">Niciun clip</span>
              </div>
            )}
            {hasVideo && (
              <button type="button" onClick={togglePlay}
                className="absolute bottom-2.5 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 transition">
                {paused ? "▶" : "⏸"}
              </button>
            )}
            <div className="absolute top-2.5 right-2.5 flex flex-col gap-1 items-end">
              <span className="px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-[10px] tracking-[0.1em] uppercase text-[#E8D5B5] font-medium">{resolvedFilterId}</span>
              {resolvedEffectId !== "none" && (<span className="px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-[10px] tracking-[0.1em] uppercase text-[#E8D5B5]/75">{resolvedEffectId}</span>)}
            </div>
          </div>

          <input ref={fileInputRef} type="file" accept="video/*" onChange={onPickFile} disabled={disabled || uploading} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={disabled || uploading}
            className="btn-glass w-full text-[12px] py-2 disabled:opacity-40">
            {hasVideo ? "Schimbă clipul" : "Urcă clip"}
          </button>

          <button type="button" onClick={captureCover} disabled={disabled || !hasVideo}
            className="btn-glass w-full text-[12px] py-2 disabled:opacity-40">
            📷 Salvează cover
          </button>
          <button type="button" onClick={captureExample} disabled={disabled || !hasVideo}
            className="btn-glass w-full text-[12px] py-2 disabled:opacity-40">
            🖼 Salvează cadru ca exemplu scenă
          </button>
        </div>

        {/* RIGHT: grouped controls */}
        <fieldset disabled={disabled} className="disabled:opacity-50 flex flex-col gap-5 min-w-0">
          {/* Durată */}
          <div>
            <div className="text-[10px] tracking-[0.18em] uppercase text-white/40 mb-2">Durată scenă</div>
            <div className="flex items-center gap-3">
              <input type="range" min={1} max={trimMax} step={0.1} value={Math.min(trimSec, trimMax)} onChange={(e) => onTrimChange(Number(e.target.value))} disabled={!hasVideo} className="flex-1 accent-[#E8D5B5] disabled:opacity-40" />
              <span className="text-[14px] text-[#E8D5B5] font-medium tabular-nums min-w-[80px] text-right">{trimSec.toFixed(1)}s{clipDuration > 0 && <span className="text-white/30 font-normal"> / {clipDuration.toFixed(1)}s</span>}</span>
            </div>
          </div>

          {/* Text pe video */}
          <div className="rounded-xl bg-[#E8D5B5]/[0.04] border border-[#E8D5B5]/15 p-3.5">
            <div className="text-[10px] tracking-[0.18em] uppercase text-[#E8D5B5]/85 mb-2.5">✦ Text pe video</div>
            <input type="text" value={textValue} onChange={(e) => onTextChange(e.target.value)} placeholder="Scrie textul scenei…" className="input mb-2.5" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Poziție</label>
                <div className="flex gap-1">
                  {TEXT_POSITIONS.map((p) => (
                    <button key={p.id} type="button" onClick={() => { setTextPos(p.id); saveShot({ caption_position: p.id as "top" | "center" | "bottom" }); }}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] transition ${textPos === p.id ? "bg-[#E8D5B5] text-[#0F1419] font-medium" : "bg-white/[0.04] text-white/55 hover:text-white/80"}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Stil</label>
                <select value={textStyle} onChange={(e) => { setTextStyle(e.target.value); saveShot({ caption_preset: e.target.value }); }} className="input">
                  {TEXT_STYLES.map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
                </select>
              </div>
            </div>
          </div>

          {/* Aspect */}
          <div>
            <div className="text-[10px] tracking-[0.18em] uppercase text-white/40 mb-2">Aspect</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Filtru (tot reel-ul)</label>
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
            </div>
          </div>

          {/* Mișcare */}
          <div>
            <div className="text-[10px] tracking-[0.18em] uppercase text-white/40 mb-2">Mișcare</div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="label">Tranziție</label>
                <select value={shot.transition_type} onChange={(e) => saveShot({ transition_type: e.target.value as TransitionId })} className="input">
                  {TRANSITIONS.map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
                </select>
              </div>
              <div>
                <label className="label">Viteză</label>
                <select value={shot.playback_speed} onChange={(e) => saveShot({ playback_speed: Number(e.target.value) })} className="input">
                  {SPEED_PRESETS.map((v) => (<option key={v} value={v}>{v}×</option>))}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={shot.motion_blur ?? false} onChange={(e) => saveShot({ motion_blur: e.target.checked })} className="w-4 h-4 accent-[#E8D5B5]" />
              <span className="text-[13px] text-white/80">Motion blur</span>
            </label>
          </div>
        </fieldset>
      </div>
      <div className={reelMode ? "" : "hidden"}>
        {reelMounted && <ReelPlayer shots={shots} globalFilter={globalFilter} />}
      </div>
    </div>
  );
}
