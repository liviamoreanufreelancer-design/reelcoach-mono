/**
 * Reel Details — pre-filming screen. Purple/light design.
 * Cover + stats + description + scene list + sticky "Începe filmarea".
 *
 * Route: /reel/$id (template id). Reached from Home / Explore.
 * Tap "Începe filmarea" → /film.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bookmark, Play, Eye, Heart, Clock, BarChart3, ChevronRight, ChevronLeft, Share2, Layers } from "lucide-react";
import { Share } from "@capacitor/share";
import { PhoneShell } from "@/components/PhoneShell";
import { useTemplate } from "@/data/templates-context";
import {
  shotCount,
  totalFinalSeconds,
  type ReelTemplate,
} from "@/data/shots";
import { setSelectedIdeaId, markStoryboardSeen } from "@/lib/selected-idea";
import { playSelect, playTap } from "@/lib/ui-sound";
import { light } from "@/lib/haptic";

export const Route = createFileRoute("/reel/$id")({
  component: ReelPreview,
});

const DIFF_LABEL: Record<string, string> = { easy: "Ușor", medium: "Mediu", hard: "Avansat" };

function fmtMMSS(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * ReelClipPlayer — reda clipurile exemplu ale scenelor la rand (story-style).
 * Auto-play: scena 1 -> 2 -> 3 -> reia. Scenele fara clip sunt sarite.
 * Tap pe video = pauza/play.
 */
function ReelVideoPlayer({
  src,
  caption,
}: {
  src: string;
  caption?: string;
}) {
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || !v.duration) return;
    setProgress((v.currentTime / v.duration) * 100);
  };
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { void v.play().catch(() => undefined); setPaused(false); }
    else { v.pause(); setPaused(true); }
  };
  return (
    <div className="absolute inset-0 bg-black" onClick={togglePlay}>
      <video
        ref={videoRef}
        src={src}
        autoPlay
        loop
        muted
        playsInline
        onTimeUpdate={onTimeUpdate}
        className="absolute inset-0 w-full h-full object-contain"
      />
      <div
        className="absolute left-[14px] right-[14px] z-[5]"
        style={{ top: "max(calc(env(safe-area-inset-top, 56px) + 6px), 62px)" }}
      >
        <div className="h-[3px] rounded-full bg-white/35 overflow-hidden">
          <div className="h-full rounded-full bg-white" style={{ width: `${progress}%` }} />
        </div>
      </div>
      {paused && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[4] w-[54px] h-[54px] rounded-full bg-black/35 backdrop-blur grid place-items-center border border-white/50">
          <Play className="w-[24px] h-[24px] text-white ml-[2px]" fill="currentColor" />
        </div>
      )}
    </div>
  );
}
function ReelPreview() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setReady(true); }, []);
  if (!ready) return <PhoneShell><div /></PhoneShell>;

  const template = useTemplate(id);
  if (!template) {
    return (
      <PhoneShell>
        <div className="absolute inset-0 flex flex-col bg-[#F8F8FA]">
          <div style={{ height: "max(env(safe-area-inset-top, 56px), 56px)" }} />
          <button onClick={() => nav({ to: "/" })} className="m-4 w-[40px] h-[40px] grid place-items-center rounded-full bg-white border border-[#E6E6EA] text-[#1F1F1F]">
            <ArrowLeft className="w-[20px] h-[20px]" />
          </button>
          <div className="flex-1 flex items-center justify-center">
            <p className="text-[#6B6B6B]">Reel inexistent.</p>
          </div>
        </div>
      </PhoneShell>
    );
  }

  const startFilming = () => {
    light();
    playSelect();
    setSelectedIdeaId(template.id);
    markStoryboardSeen(template.id);
    nav({ to: "/film" });
  };

  const shareTemplate = async () => {
    light();
    playTap();
    try {
      await Share.share({
        title: template.title,
        text: `Vezi șablonul „${template.title}" în Reel Coach.`,
        dialogTitle: "Partajează șablonul",
      });
    } catch {
      // Anulat de utilizator sau share indisponibil — ignoram.
    }
  };

  // Flatten scenes from sections.
  const scenes = template.sections.flatMap((sec) => sec.shots);
  // Clipurile exemplu pentru player (scenele fara clip sunt sarite).
  const previewUrl = template.previewReelUrl;
  const hasReel = Boolean(previewUrl);
  // Caption afisat peste video — overlay-ul primei scene, sau titlul.
  const reelCaption = scenes.find((s) => s.overlayText?.trim())?.overlayText || template.title;
  const totalSec = Math.round(totalFinalSeconds(template));
  const diff = template.difficulty ?? "easy";
  const description = template.emotionalPitch || template.promise || "";

  // Demo stats (small, believable numbers).
  const stats = [
    { Icon: Eye, value: "24", label: "Vizualizări" },
    { Icon: Heart, value: "8", label: "Aprecieri" },
    { Icon: Clock, value: fmtMMSS(totalSec), label: "Durată" },
    { Icon: BarChart3, value: DIFF_LABEL[diff], label: "Dificultate" },
  ];

  // Layout full-screen cu player (cand exista clipuri exemplu).
  if (hasReel && previewUrl) {
    return (
      <PhoneShell>
        <div className="absolute inset-0 bg-black">
          <ReelVideoPlayer src={previewUrl} caption={reelCaption} />

          {/* Chevron minimal sus-stanga */}
          <button
            onClick={() => nav({ to: "/" })}
            aria-label="Înapoi"
            className="absolute z-[10] left-[10px] p-2 text-white active:scale-90 transition"
            style={{ top: "max(calc(env(safe-area-inset-top, 56px) + 14px), 70px)", filter: "drop-shadow(0 1px 3px rgba(0,0,0,.5))" }}
          >
            <ChevronLeft className="w-[28px] h-[28px]" strokeWidth={2.4} />
          </button>

          {/* Gradient jos pentru lizibilitate */}
          <div
            className="absolute left-0 right-0 bottom-0 z-[7] pointer-events-none"
            style={{ height: "230px", background: "linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.4) 45%, transparent 100%)" }}
          />

          {/* Coloana dreapta — Salvează + Share */}
          <div className="absolute right-[12px] z-[9] flex flex-col items-center gap-[22px]" style={{ bottom: "150px" }}>
            <button
              onClick={() => setSaved((v) => !v)}
              aria-label="Salvează"
              className="flex flex-col items-center gap-[5px] active:scale-90 transition"
              style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,.6))" }}
            >
              <Bookmark className="w-[30px] h-[30px] text-white" fill={saved ? "currentColor" : "none"} strokeWidth={2} />
              <span className="text-white text-[11px] font-semibold">Salvează</span>
            </button>
            <button
              onClick={shareTemplate}
              aria-label="Partajează"
              className="flex flex-col items-center gap-[5px] active:scale-90 transition"
              style={{ filter: "drop-shadow(0 1px 3px rgba(0,0,0,.6))" }}
            >
              <Share2 className="w-[29px] h-[29px] text-white" strokeWidth={2} />
              <span className="text-white text-[11px] font-semibold">Share</span>
            </button>
          </div>

          {/* Meta jos-stanga: durata + scene (fara titlu) */}
          <div className="absolute left-[16px] z-[9]" style={{ bottom: "96px", right: "70px" }}>
            <div className="flex gap-[14px] text-white/90 text-[13px]" style={{ textShadow: "0 1px 3px rgba(0,0,0,.5)" }}>
              <span className="flex items-center gap-[5px]"><Clock className="w-[14px] h-[14px]" strokeWidth={2} />{fmtMMSS(totalSec)}</span>
              <span className="flex items-center gap-[5px]"><Layers className="w-[14px] h-[14px]" strokeWidth={2} />{shotCount(template)} scene</span>
            </div>
          </div>

          {/* Buton lat jos */}
          <div className="absolute left-0 right-0 bottom-0 z-[9] px-[16px]" style={{ paddingBottom: "max(env(safe-area-inset-bottom, 30px), 30px)" }}>
            <button
              onClick={startFilming}
              className="w-full h-[54px] rounded-[14px] bg-[#5B34FF] text-white font-bold text-[16px] flex items-center justify-center gap-[10px] shadow-[0_12px_28px_-10px_rgba(91,52,255,.8)] transition active:scale-[.98]"
            >
              <span className="w-[24px] h-[24px] rounded-full bg-white grid place-items-center">
                <span className="w-[12px] h-[12px] rounded-full bg-[#FF3B30]" />
              </span>
              Începe filmarea
            </button>
          </div>
        </div>
      </PhoneShell>
    );
  }

  // Fallback: cover static + lista (cand nicio scena n-are clip).
  return (
    <PhoneShell>
      <div className="absolute inset-0 flex flex-col bg-[#F8F8FA]">
        {/* Safe-area spacer — cover starts below iOS status bar */}
        <div style={{ height: "max(env(safe-area-inset-top, 56px), 56px)" }} className="shrink-0 bg-[#F8F8FA]" />
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-[104px]" style={{ scrollbarWidth: "none" }}>
          {/* Cover with overlaid controls */}
          <div className="relative w-full aspect-[4/5] bg-[#EDE8FF]">
            <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${template.cover})` }} />
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/35 to-transparent" />

            <button
              onClick={() => nav({ to: "/" })}
              aria-label="Înapoi"
              className="absolute left-[18px] top-[14px] grid place-items-center w-[40px] h-[40px] rounded-full bg-white/90 backdrop-blur text-[#1F1F1F] shadow-[0_3px_12px_rgba(0,0,0,.18)] transition active:scale-90"
            >
              <ArrowLeft className="w-[20px] h-[20px]" />
            </button>
            <button
              onClick={() => setSaved((s) => !s)}
              aria-label="Salvează"
              className="absolute right-[18px] top-[14px] grid place-items-center w-[40px] h-[40px] rounded-full bg-white/90 backdrop-blur shadow-[0_3px_12px_rgba(0,0,0,.18)] transition active:scale-90"
              style={{ color: saved ? "#5B34FF" : "#1F1F1F" }}
            >
              <Bookmark className="w-[19px] h-[19px]" fill={saved ? "currentColor" : "none"} />
            </button>

            <button
              aria-label="Redă"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[68px] h-[68px] grid place-items-center rounded-full bg-white/95 text-[#5B34FF] shadow-[0_10px_30px_-6px_rgba(40,24,110,.5)] transition active:scale-95"
            >
              <Play className="w-[26px] h-[26px] ml-[3px]" fill="currentColor" />
            </button>
          </div>

          {/* Body */}
          <div className="px-[22px]">
            <h1 className="font-display font-bold text-[26px] leading-[1.12] text-[#1F1F1F] mt-[18px]">{template.title}</h1>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2 mt-[18px]">
              {stats.map(({ Icon, value, label }) => (
                <div key={label} className="flex flex-col items-center text-center gap-[6px] rounded-[14px] bg-white border border-[#E6E6EA] py-[12px] px-1 shadow-[0_4px_14px_-12px_rgba(40,24,110,.3)]">
                  <span className="h-[17px] flex items-center justify-center">
                    <Icon className="w-[16px] h-[16px] text-[#5B34FF]" strokeWidth={1.9} />
                  </span>
                  <span className="font-display font-bold text-[15px] leading-none text-[#1F1F1F]">{value}</span>
                  <span className="text-[10.5px] text-[#6B6B6B] leading-none">{label}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            {description && (
              <p className="text-[14px] leading-[1.55] text-[#1F1F1F]/90 mt-[16px]" style={{ textWrap: "pretty" }}>
                {description}
              </p>
            )}

            {/* Scenele */}
            <div className="flex items-baseline justify-between mt-[28px]">
              <h2 className="font-display font-bold text-[18px] text-[#1F1F1F]">Scenele</h2>
              <span className="text-[12.5px] font-medium text-[#6B6B6B]">{shotCount(template)} scene · ~{totalSec} sec</span>
            </div>

            <div className="flex flex-col gap-[10px] mt-[14px]">
              {scenes.map((s, i) => {
                const dur = s.finalUsageDuration ?? s.recordingDuration ?? 0;
                const bg = s.exampleImageUrl || template.cover;
                return (
                  <article key={s.id ?? i} className="flex items-center gap-[13px] rounded-[16px] bg-white border border-[#E6E6EA] p-[10px] shadow-[0_4px_14px_-12px_rgba(40,24,110,.3)] transition active:scale-[.99]">
                    <div className="relative shrink-0">
                      <div className="w-[46px] h-[66px] rounded-[11px] bg-cover bg-center bg-[#EDE8FF]" style={{ backgroundImage: `url(${bg})` }} />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[22px] h-[22px] grid place-items-center rounded-full bg-white/90 backdrop-blur font-display font-bold text-[12px] text-[#5B34FF] shadow-[0_2px_6px_rgba(0,0,0,.15)]">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-display font-bold text-[14.5px] leading-[1.15] text-[#1F1F1F] truncate">{s.title}</h4>
                      {dur > 0 && (
                        <span className="flex items-center gap-1 mt-[5px] text-[12px] text-[#6B6B6B] font-medium">
                          <Clock className="w-[12px] h-[12px]" />{dur} sec
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-[18px] h-[18px] text-[#6B6B6B]/60 shrink-0" />
                  </article>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sticky CTA */}
        <div className="shrink-0 px-[22px] pt-3 pb-[26px] bg-[#F8F8FA]/95 backdrop-blur border-t border-[#E6E6EA]">
          <button
            onClick={startFilming}
            className="w-full h-[54px] rounded-[16px] bg-[#5B34FF] text-white font-bold text-[16px] tracking-[.2px] shadow-[0_12px_26px_-10px_rgba(91,52,255,.7)] transition active:scale-[.98]"
          >
            Începe filmarea
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
