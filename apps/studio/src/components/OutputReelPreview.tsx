"use client";
/**
 * OutputReelPreview — cum arată O POSTARE, nu tot template-ul.
 *
 * Diferența față de ReelPlayer: acela randează toate scenele unui template, în
 * ordinea lor. Aici randăm exact momentele unei postări, în ordinea ei, cu
 * duratele ei — pentru că același moment apare în mai multe postări, cu ritm
 * diferit ("prima trăsătură": 2s în Transformarea, 3s în Procesul).
 *
 * Stilul se rezolvă în trei trepte, de la specific la general:
 *     slot.filter  →  output.filter  →  fără filtru
 *     slot.transition → output.transition → fade
 * Așa partenera ia o singură decizie per postare și suprascrie doar unde vrea.
 *
 * NU urcă nimic în storage: e o verificare pentru parteneră, nu un artefact.
 * Randarea completă a postărilor se face la export, pe telefon — vezi decizia
 * "nu randa eager" din CLAUDE.md.
 */
import { useRef, useState } from "react";
import { Play, RotateCw, AlertCircle } from "lucide-react";
import {
  renderReelInBrowser,
  renderOverlay,
  FILTERS,
  TEXT_PRESETS,
  type ConcatProgress,
} from "@reelcoach/core";
import type { OutputRow, ShotRow, TransitionId } from "@/lib/db-types";

const W = 1080;
const H = 1920;

export default function OutputReelPreview({
  output,
  shots,
}: {
  output: OutputRow;
  shots: ShotRow[];
}) {
  const [phase, setPhase] = useState<"idle" | "rendering" | "done" | "error">("idle");
  const [pct, setPct] = useState(0);
  const [message, setMessage] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  // Momentele postării, în ORDINEA ei, împerecheate cu scena care le dă footage.
  const resolved = output.slots.map((slot) => ({
    slot,
    shot: shots.find((s) => s.slot_key === slot.slot),
  }));
  const usable = resolved.filter((r) => r.shot?.sample_video_url);
  const missing = resolved.length - usable.length;

  const render = async () => {
    if (usable.length === 0) return;
    setPhase("rendering");
    setPct(0);
    try {
      const clips = [];
      const overlays: (Blob | undefined)[] = [];
      const filters = [];
      const effectIds: (string | undefined)[] = [];
      const transitionTypes: (TransitionId | undefined)[] = [];
      const playbackSpeeds: (number | undefined)[] = [];
      const motionBlurs: (boolean | undefined)[] = [];

      for (let i = 0; i < usable.length; i += 1) {
        const { slot, shot } = usable[i];
        if (!shot) continue;
        setMessage(`Descarc momentul ${i + 1}/${usable.length}…`);
        const res = await fetch(shot.sample_video_url as string);
        const blob = await res.blob();

        clips.push({
          blob,
          duration: shot.recording_duration || 4,
          // Durata din ACEASTĂ postare are prioritate peste cea a scenei.
          finalUsageDuration: slot.sec ?? shot.final_usage_duration ?? undefined,
        });

        // Excepția slotului bate implicitul postării, care bate lipsa lui.
        const fId = slot.filter ?? output.filter ?? "none";
        filters.push(FILTERS[fId as keyof typeof FILTERS] ?? undefined);
        transitionTypes.push(
          (slot.transition ?? output.transition ?? undefined) as TransitionId | undefined,
        );
        playbackSpeeds.push(slot.speed ?? shot.playback_speed ?? 1);
        motionBlurs.push(slot.motionBlur ?? shot.motion_blur ?? false);
        effectIds.push(shot.effect && shot.effect !== "none" ? shot.effect : undefined);

        // Textul: încă de pe scenă. Trece pe slot când construim editorul de text
        // per postare — atunci „ZIUA 1" și „Pasul 2" pot sta peste același cadru.
        if (shot.overlay_text && shot.overlay_text.trim()) {
          const presetId = shot.caption_preset || "hookBold";
          overlays.push(
            await renderOverlay({
              caption: {
                text: shot.overlay_text,
                position: (shot.caption_position || "bottom") as "top" | "center" | "bottom",
                presetId,
              },
              preset: TEXT_PRESETS[presetId] ?? TEXT_PRESETS.hookBold,
              width: W,
              height: H,
            }),
          );
        } else {
          overlays.push(undefined);
        }
      }

      const blob = await renderReelInBrowser(
        clips,
        {
          width: W,
          height: H,
          fps: 24,
          filter: FILTERS[(output.filter || "none") as keyof typeof FILTERS] ?? FILTERS.none,
          filters,
          effectIds,
          transitionTypes,
          playbackSpeeds,
          motionBlurs,
          overlays,
          transitionType: (output.transition ?? "fade") as TransitionId,
        },
        (p: ConcatProgress) => {
          setPct(Math.round(p.pct));
          setMessage(p.message ?? p.phase);
        },
      );

      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      setVideoUrl(url);
      setPhase("done");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
      setPhase("error");
    }
  };

  if (output.slots.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-3 py-1">
      {missing > 0 && (
        <p className="text-[11.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-snug w-full">
          {missing} {missing === 1 ? "moment n-are" : "momente n-au"} clip exemplu — nu
          intră în previzualizare. Încarcă-le la pasul „Momentele".
        </p>
      )}

      {usable.length === 0 ? (
        <p className="text-[12px] text-[#6B6B6B] py-4 text-center">
          Niciun moment cu clip exemplu. Previzualizarea are nevoie de cel puțin unul.
        </p>
      ) : phase === "idle" ? (
        <button
          type="button"
          onClick={render}
          className="btn-glass text-[12.5px] px-5 py-2.5 inline-flex items-center gap-2"
        >
          <Play className="w-4 h-4" /> Vezi cum arată ({usable.length}{" "}
          {usable.length === 1 ? "moment" : "momente"})
        </button>
      ) : phase === "rendering" ? (
        <div className="w-full max-w-[280px] py-6">
          <div className="w-full h-2 rounded-full bg-[#EDE8FF] overflow-hidden mb-2">
            <div className="h-full bg-[#5B34FF] transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-[11.5px] text-[#6B6B6B] text-center tabular-nums">
            {pct}% — {message}
          </p>
        </div>
      ) : phase === "done" && videoUrl ? (
        <>
          <video
            src={videoUrl}
            controls
            autoPlay
            loop
            muted
            playsInline
            className="rounded-2xl bg-black border border-[#5B34FF]/15"
            style={{ width: "220px", aspectRatio: "9 / 16" }}
          />
          <button
            type="button"
            onClick={render}
            className="btn-glass text-[12px] px-4 py-1.5 inline-flex items-center gap-1.5"
          >
            <RotateCw className="w-3.5 h-3.5" /> Randează din nou
          </button>
        </>
      ) : (
        <div className="py-4 text-center">
          <p className="text-[12px] text-rose-600 leading-relaxed mb-2 max-w-[300px] inline-flex items-start gap-1.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {message}
          </p>
          <button type="button" onClick={render} className="btn-glass text-[12px] px-4 py-1.5">
            Încearcă din nou
          </button>
        </div>
      )}
    </div>
  );
}
