import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { CinematicBg } from "@/components/CinematicBg";
import { PhoneShell } from "@/components/PhoneShell";
import {
  getFormat,
  getFormatImage,
  getScenariosByFormat,
  getDifficulty,
  DIFFICULTIES,
  type Difficulty,
  type Format,
  type Scenario,
} from "@/data/scenarios";
import { setSelectedIdeaId } from "@/lib/selected-idea";
import { getProfessionId } from "@/lib/profession";
import { useEffect, useState } from "react";

const VALID: Format[] = [
  "before-after", "glow-up", "bridal", "fear-hook", "luxury",
  "client-reaction", "educational", "clean-girl", "problem-solution",
  "pov", "tutorial", "transformation",
  // Par-specific sub-categories
  "ph-before-after", "ph-glow-up", "ph-blonde", "ph-luxury", "ph-extensions",
  "ph-repair", "ph-mistakes", "ph-balayage", "ph-reactions", "ph-tips",
  "ph-bridal", "ph-trends", "ph-satisfying", "ph-salon-pov",
];

export const Route = createFileRoute("/ideas/$format")({
  component: Ideas,
});

function Ideas() {
  const { format } = useParams({ from: "/ideas/$format" });
  const nav = useNavigate();
  const [profId, setProfId] = useState<ReturnType<typeof getProfessionId>>(null);

  useEffect(() => { setProfId(getProfessionId()); }, []);

  const safe: Format = (VALID as string[]).includes(format)
    ? (format as Format)
    : "before-after";
  const meta = getFormat(safe)!;
  const heroImg = getFormatImage(safe, profId ?? undefined);
  const ideas = getScenariosByFormat(safe, profId ?? undefined);

  const pick = (s: Scenario) => {
    setSelectedIdeaId(s.id);
    nav({ to: "/film" });
  };

  return (
    <PhoneShell>
      <CinematicBg src={heroImg} blur overlay={0.80} kenBurns={false} />

      <div className="relative z-10 flex flex-col h-full px-5 pt-12 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between px-1">
          <BackButton to="/" />
          <span className="text-[10px] tracking-[0.4em] uppercase text-[#E8D5B5] font-semibold">
            {meta.tag}
          </span>
          <span
            className="text-[10px] tracking-[0.3em] text-white/55 uppercase w-14 text-right font-semibold"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {String(ideas.length).padStart(2, "0")} idei
          </span>
        </div>

        {/* Title */}
        <div className="mt-7 px-1">
          <h1 className="h1-lux text-[42px] text-white">
            {meta.label.split(" / ").map((w, idx, arr) => (
              <span key={idx}>
                {idx === arr.length - 1 && arr.length > 1 ? (
                  <em className="italic font-editorial text-[#E8D5B5]">{w}</em>
                ) : (
                  <span>{w}</span>
                )}
                {idx < arr.length - 1 && <span className="text-[#E8D5B5]/60"> / </span>}
              </span>
            ))}
          </h1>
          <p className="mt-2 text-white/60 text-[13px] leading-relaxed max-w-[20rem]">
            Alege o idee și te ducem direct în filmare.
          </p>
        </div>

        {/* Idea list */}
        <div className="mt-6 flex-1 overflow-y-auto -mx-1 px-1 stagger-lux pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {ideas.map((s, i) => {
            const diff = getDifficulty(s);
            return (
            <button
              key={s.id}
              onClick={() => pick(s)}
              className="group w-full text-left glass-lux rounded-3xl overflow-hidden mb-3"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              {s.image && (
                <div className="relative w-full h-36 overflow-hidden">
                  <img
                    src={s.image}
                    alt={s.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                </div>
              )}
              <div className="p-5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {s.keywords.slice(0, 3).map((k) => (
                    <span
                      key={k}
                      className="text-[9px] tracking-[0.25em] uppercase text-[#E8D5B5] font-semibold px-2 py-[3px] rounded-full border border-[#E8D5B5]/25"
                    >
                      {k}
                    </span>
                  ))}
                </div>
                <DifficultyBadge level={diff} />
              </div>

              <h3 className="font-editorial text-[24px] leading-tight text-white mt-3 tracking-[-0.02em]">
                {s.title}
              </h3>
              <p className="text-white/65 text-[13px] italic mt-1.5 leading-snug">
                „{s.hook}"
              </p>
              {s.description && (
                <p className="text-white/55 text-[12px] mt-2 leading-relaxed">
                  {s.description}
                </p>
              )}

              {/* scene chips */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex gap-1.5 flex-wrap">
                  {s.scenes.map((sc, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] tracking-wider text-white/65 px-2 py-1 rounded-md bg-white/[0.04] border border-[#E8D5B5]/15 font-medium"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      Sc {idx + 1} · {sc.duration}s
                    </span>
                  ))}
                </div>
                <ArrowRight className="w-4 h-4 text-[#E8D5B5] group-active:translate-x-0.5 transition-transform shrink-0 ml-2" />
              </div>
              </div>
            </button>
            );
          })}

          {/* AI expand placeholder */}
          <div
            className="w-full rounded-3xl p-4 flex items-center justify-center gap-2 text-white/40 text-[11px] tracking-[0.35em] uppercase border border-dashed border-white/10"
            aria-disabled
          >
            <Sparkles className="w-3.5 h-3.5" />
            Mai multe idei (în curând)
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

function DifficultyBadge({ level }: { level: Difficulty }) {
  const meta = DIFFICULTIES[level];
  const dots = level === "easy" ? 1 : level === "medium" ? 2 : 3;
  const tone =
    level === "easy"
      ? "text-emerald-300/90 border-emerald-300/30"
      : level === "medium"
        ? "text-[#E8D5B5] border-[#E8D5B5]/35"
        : "text-rose-300/90 border-rose-300/35";
  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1.5 text-[9px] tracking-[0.25em] uppercase font-semibold px-2 py-[3px] rounded-full border bg-white/[0.03] ${tone}`}
      title={meta.desc}
    >
      <span className="flex gap-[2px]">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`w-[5px] h-[5px] rounded-full ${
              i < dots ? "bg-current" : "bg-current/20"
            }`}
          />
        ))}
      </span>
      {meta.short}
    </span>
  );
}
