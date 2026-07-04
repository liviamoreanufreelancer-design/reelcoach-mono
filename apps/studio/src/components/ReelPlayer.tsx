"use client";
/**
 * ReelPlayer — renders the FULL reel via the engine (renderReelInBrowser):
 * per-scene footage + global filter + per-scene effect/transition/speed/blur
 * + caption overlays. Shows progress, then loops the MP4. Used by the "Reel"
 * tab in the editor. "Preview = export" — this IS the export.
 */
import { useEffect, useRef, useState } from "react";
import { setPreviewReelUrl } from "@/lib/template-actions";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  renderReelInBrowser,
  renderOverlay,
  FILTERS,
  TEXT_PRESETS,
  type ConcatProgress,
} from "@reelcoach/core";
import type { ShotRow, TransitionId } from "@/lib/db-types";

const W = 1080;
const H = 1920;

export default function ReelPlayer({
  shots,
  globalFilter,
  templateId,
}: {
  shots: ShotRow[];
  globalFilter: string | null;
  templateId: string;
}) {
  const [phase, setPhase] = useState<"idle" | "rendering" | "done" | "error">("idle");
  const [pct, setPct] = useState(0);
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const startedRef = useRef(false);
  const uploadedRef = useRef(false);

  const withFootage = shots.filter((s) => s.sample_video_url);
  const missingCount = shots.length - withFootage.length;

  useEffect(() => {
    return () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); };
  }, []);

  const render = async () => {
    if (startedRef.current) return;
    startedRef.current = true;
    setPhase("rendering");
    setPct(0);
    try {
      const clips = [];
      const overlays: (Blob | undefined)[] = [];
      const filters: (undefined)[] = [];
      const effectIds: (string | undefined)[] = [];
      const transitionTypes: (TransitionId | undefined)[] = [];
      const playbackSpeeds: (number | undefined)[] = [];
      const motionBlurs: (boolean | undefined)[] = [];

      for (let i = 0; i < withFootage.length; i += 1) {
        const shot = withFootage[i];
        setMessage(`Descarc scena ${i + 1}…`);
        const res = await fetch(shot.sample_video_url as string);
        const blob = await res.blob();
        clips.push({
          blob,
          duration: shot.recording_duration || 4,
          finalUsageDuration: shot.final_usage_duration || undefined,
        });
        filters.push(undefined);
        effectIds.push(shot.effect && shot.effect !== "none" ? shot.effect : undefined);
        transitionTypes.push(shot.transition_type);
        playbackSpeeds.push(shot.playback_speed || 1);
        motionBlurs.push(shot.motion_blur || false);

        if (shot.overlay_text && shot.overlay_text.trim()) {
          setMessage(`Generez textul scenei ${i + 1}…`);
          const presetId = shot.caption_preset || "hookBold";
          const ov = await renderOverlay({
            caption: {
              text: shot.overlay_text,
              position: (shot.caption_position || "bottom") as "top" | "center" | "bottom",
              presetId,
            },
            preset: TEXT_PRESETS[presetId] ?? TEXT_PRESETS.hookBold,
            width: W,
            height: H,
          });
          overlays.push(ov);
        } else {
          overlays.push(undefined);
        }
      }

      const gFilter = FILTERS[(globalFilter || "none") as keyof typeof FILTERS] ?? FILTERS.none;
      const blob = await renderReelInBrowser(
        clips,
        { width: W, height: H, fps: 24, filter: gFilter, filters, effectIds, transitionTypes, playbackSpeeds, motionBlurs, overlays },
        (p: ConcatProgress) => { setPct(Math.round(p.pct)); setMessage(p.message ?? p.phase); },
      );

      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setVideoUrl(url);
      setPhase("done");
      // Auto-urcare: urcam reel-ul DIRECT din browser in storage (video prea mare
      // pentru body-ul unei server action), apoi salvam doar URL-ul prin server action.
      if (!uploadedRef.current) {
        uploadedRef.current = true;
        try {
          const sb = getSupabaseBrowserClient();
          const path = `${templateId}/reel-${Date.now()}.mp4`;
          const { error: upErr } = await sb.storage
            .from("previews")
            .upload(path, blob, { contentType: "video/mp4", upsert: true });
          if (upErr) throw upErr;
          const { data: pub } = sb.storage.from("previews").getPublicUrl(path);
          await setPreviewReelUrl(templateId, pub.publicUrl);
        } catch (e) {
          uploadedRef.current = false;
          console.error("[reel-preview] urcare esuata:", e);
        }
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  };

  // Auto-start rendering when the tab mounts (if footage exists).
  useEffect(() => {
    if (withFootage.length > 0 && phase === "idle") render();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rerender = () => { startedRef.current = false; setPhase("idle"); render(); };

  if (withFootage.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-[13px] text-[#6B6B6B] leading-relaxed max-w-[300px]">
          Adaugă cel puțin un clip pe o scenă ca să vezi reel-ul.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {phase === "rendering" && (
        <div className="w-full max-w-[280px] py-10">
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden mb-3">
            <div className="h-full bg-[#5B34FF] transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[12px] text-[#6B6B6B] text-center tabular-nums">{pct}% — {message}</p>
        </div>
      )}

      {phase === "done" && videoUrl && (
        <>
          <video src={videoUrl} controls autoPlay loop muted playsInline
            className="rounded-2xl bg-black border border-[#5B34FF]/15" style={{ width: "240px", aspectRatio: "9 / 16" }} />
          {missingCount > 0 && (
            <p className="text-[11px] text-amber-300/80">{missingCount} {missingCount === 1 ? "scenă nu are" : "scene nu au"} clip — randate doar cele cu footage.</p>
          )}
          <div className="flex gap-2">
            <a href={videoUrl} download="reel.mp4" className="btn-champagne text-[12px] px-5 py-2 inline-flex items-center gap-2">
              ⬇ Descarcă reel-ul
            </a>
            <button type="button" onClick={rerender} className="btn-glass text-[12px] px-5 py-2">
              ↻ Reîmprospătează
            </button>
          </div>
        </>
      )}

      {phase === "error" && (
        <div className="py-8 text-center">
          <p className="text-[12px] text-rose-300 leading-relaxed mb-3 max-w-[300px]">Eroare: {message}</p>
          <button type="button" onClick={rerender} className="btn-glass text-[12px] px-5 py-2">Încearcă din nou</button>
        </div>
      )}
    </div>
  );
}
