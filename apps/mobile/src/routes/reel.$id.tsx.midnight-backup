/**
 * Reel preview screen — shows example video of the reel + title + description
 * + stats, with a sticky "Filmează" CTA at the bottom.
 *
 * Route: /reel/$id  where $id is the template id (e.g. "wow-transformation").
 * Reached from category list (tap a reel card).
 *
 * The video is a placeholder for now — when real example videos are added,
 * replace the placeholder div with an actual <video> element.
 *
 * Tap "Filmează" → /film (skips storyboard, goes directly to filming).
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { BackButton } from "@/components/BackButton";
import { useTemplate } from "@/data/templates-context";
import {
  shotCount,
  totalRecordingSeconds,
  totalFinalSeconds,
} from "@/data/shots";
import { setSelectedIdeaId, markStoryboardSeen } from "@/lib/selected-idea";
import { playSelect, playTap } from "@/lib/ui-sound";
import { light } from "@/lib/haptic";

export const Route = createFileRoute("/reel/$id")({
  component: ReelPreview,
});

function ReelPreview() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return <PhoneShell><div /></PhoneShell>;

  const template = useTemplate(id);

  if (!template) {
    return (
      <PhoneShell>
        <div className="absolute inset-0 bg-[#0a0c0f]" />
        <div className="relative z-10 flex flex-col h-full px-5 pt-12 pb-6">
          <BackButton to="/" />
          <div className="flex-1 flex items-center justify-center text-center">
            <p className="text-white/60">Reel inexistent.</p>
          </div>
        </div>
      </PhoneShell>
    );
  }

  const startFilming = () => {
    light();
    playSelect();
    setSelectedIdeaId(template.id);
    // Mark storyboard as seen — the preview screen replaces it, the user
    // doesn't need to see the carousel storyboard after this.
    markStoryboardSeen(template.id);
    nav({ to: "/film" });
  };

  return (
    <PhoneShell>
      {/* Flat midnight background */}
      <div className="absolute inset-0 z-0 bg-[#0a0c0f]" />
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 8%, rgba(232,213,181,0.08) 0%, transparent 45%)",
        }}
      />

      <div className="relative z-10 flex flex-col h-full pt-12 pb-[92px]">
        {/* Header — back top-left */}
        <div className="px-5">
          <BackButton />
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Video placeholder — 4:5 portrait. Title + stats sit overlaid
              on the lower part of the image with a gradient, so the user
              sees the most important info without scrolling. Description
              and emotional pitch sit BELOW the video, accessible by scroll. */}
          <div
            className="relative w-full rounded-2xl overflow-hidden"
            style={{ aspectRatio: "4 / 5" }}
          >
            {/* Cover image as the "still" of the video */}
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${template.cover})` }}
            />
            {/* Dark overlay so the play button stands out and the bottom
                gradient blends naturally */}
            <div className="absolute inset-0 bg-black/30" />
            {/* Bottom gradient — for title + stats legibility */}
            <div
              className="absolute inset-x-0 bottom-0 h-[55%] pointer-events-none"
              style={{
                background:
                  "linear-gradient(180deg, transparent 0%, rgba(10,12,15,0.55) 45%, rgba(10,12,15,0.95) 100%)",
              }}
            />

            {/* Play button — tappable, centered in upper portion of image
                (offset up because bottom is taken by title block) */}
            <button
              onClick={() => {
                light();
                playTap();
                // TODO: Play example video when real videos exist.
              }}
              className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-[#E8D5B5] flex items-center justify-center shadow-[0_8px_32px_rgba(232,213,181,0.4)] active:scale-95 transition"
              aria-label="Redă exemplul"
            >
              <Play className="w-6 h-6 fill-[#0F1419] text-[#0F1419] translate-x-[2px]" />
            </button>

            {/* "Exemplu" badge — top left */}
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md text-[9px] tracking-[0.25em] uppercase font-bold text-[#E8D5B5]">
                Exemplu
              </span>
            </div>

            {/* Title + stats — overlaid on bottom of video */}
            <div className="absolute left-4 right-4 bottom-4">
              <h1 className="section-head text-[22px] text-white leading-[1.1] mb-2">
                {template.title}
              </h1>
              <div className="flex items-center gap-2.5 text-[10px] tracking-[0.16em] uppercase text-white/70">
                <span>
                  <b className="text-[#E8D5B5] font-bold tabular-nums">
                    {shotCount(template)}
                  </b>{" "}
                  cadre
                </span>
                <span className="text-[#E8D5B5]/40">·</span>
                <span>
                  <b className="text-[#E8D5B5] font-bold tabular-nums">
                    {Math.round(totalRecordingSeconds(template))}s
                  </b>{" "}
                  filmare
                </span>
                <span className="text-[#E8D5B5]/40">·</span>
                <span>
                  <b className="text-[#E8D5B5] font-bold tabular-nums">
                    ~{Math.round(totalFinalSeconds(template))}s
                  </b>{" "}
                  reel
                </span>
              </div>
            </div>
          </div>

          {/* Description + emotional pitch — below the video, scrollable */}
          <div className="mt-6">
            <p className="text-[14px] text-white/75 leading-relaxed">
              {template.promise}
            </p>

            {/* Emotional pitch — if the template has one */}
            {template.emotionalPitch && (
              <div className="mt-6 pt-6 border-t border-[#E8D5B5]/10">
                <p className="text-[10px] tracking-[0.4em] uppercase text-[#E8D5B5]/55 mb-2.5 font-medium">
                  Senzația
                </p>
                <p className="font-editorial italic font-light text-[15px] leading-[1.5] text-white/80">
                  {template.emotionalPitch}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sticky CTA at the bottom — always visible, big champagne button */}
        <div className="absolute bottom-0 inset-x-0 px-5 pb-5 pt-3 bg-gradient-to-t from-[#0a0c0f] via-[#0a0c0f]/95 to-transparent">
          <button
            onClick={startFilming}
            className="w-full h-14 rounded-full bg-gradient-to-r from-[#F4E4C1] via-[#E8D5B5] to-[#D4AF37] text-[#0F1419] font-bold uppercase tracking-[0.16em] text-[13px] shadow-[0_6px_24px_rgba(232,213,181,0.35)] active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-current" />
            Filmează
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
