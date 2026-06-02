import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { BackButton } from "@/components/BackButton";
import { CinematicBg } from "@/components/CinematicBg";
import { PhoneShell } from "@/components/PhoneShell";
import {
  FORMATS,
  getFormatsForProfession,
  getProfession,
  type Profession,
} from "@/data/scenarios";
import { getProfessionId } from "@/lib/profession";
import { ProfessionIcon } from "@/components/icons/ProfessionIcon";

export const Route = createFileRoute("/templates")({
  component: Templates,
});

function Templates() {
  const nav = useNavigate();
  const [profId, setProfId] = useState<Profession | null>(null);

  useEffect(() => {
    const p = getProfessionId();
    if (!p) {
      nav({ to: "/profession" });
      return;
    }
    setProfId(p);
  }, [nav]);

  const list = useMemo(
    () => (profId ? getFormatsForProfession(profId) : FORMATS),
    [profId],
  );
  const prof = profId ? getProfession(profId) : null;

  const [i, setI] = useState(0);
  useEffect(() => { setI(0); }, [profId]);

  if (!profId || list.length === 0) return <PhoneShell><div /></PhoneShell>;

  const t = list[i];
  const go = (d: 1 | -1) => setI((p) => (p + d + list.length) % list.length);

  return (
    <PhoneShell>
      <div key={t.id} className="absolute inset-0 animate-fade-in">
        <CinematicBg src={t.img} overlay={0.66} />
      </div>

      <div className="relative z-10 flex flex-col h-full px-7 pt-14 pb-10">
        <div className="flex items-center justify-between">
          <BackButton to="/" />
          <div className="flex gap-1.5">
            {list.map((_, idx) => (
              <span
                key={idx}
                className={`h-[3px] rounded-full transition-all duration-500 ${
                  idx === i ? "w-8 bg-gradient-to-r from-[#F4E4C1] via-[#E8D5B5] to-[#D4AF37]" : "w-4 bg-white/25"
                }`}
              />
            ))}
          </div>
          <span
            className="text-[10px] tracking-[0.3em] text-white/55 uppercase w-14 text-right font-semibold"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {String(i + 1).padStart(2, "0")} / {String(list.length).padStart(2, "0")}
          </span>
        </div>

        {/* Current profession pill — glass-lux with rim */}
        {prof && (
          <button
            onClick={() => nav({ to: "/profession" })}
            className="mt-6 self-start glass-lux rounded-full pl-1.5 pr-4 py-1.5 flex items-center gap-2"
          >
            <span className="w-7 h-7 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-[#E8D5B5]">
              <ProfessionIcon id={prof.id} className="w-4 h-4" />
            </span>
            <span className="text-[12px] text-white/90 font-medium">{prof.label}</span>
            <span className="text-[10px] tracking-[0.25em] uppercase text-[#E8D5B5] font-semibold">schimbă</span>
          </button>
        )}

        <p className="mt-8 text-xs tracking-[0.4em] uppercase font-semibold text-[#E8D5B5]">
          {t.tag}
        </p>

        <div className="mt-auto">
          <h2
            key={t.label}
            className="h1-lux text-[60px] text-white animate-fade-in"
            style={{ animationDuration: "500ms" }}
          >
            {t.label.split(" / ").map((w, idx, arr) => (
              <span key={idx}>
                {idx === arr.length - 1 && arr.length > 1 ? (
                  <em className="italic font-editorial text-[#E8D5B5] not-italic-fix">{w}</em>
                ) : (
                  <span>{w}</span>
                )}
                {idx < arr.length - 1 && <span className="text-[#E8D5B5]/60"> / </span>}
              </span>
            ))}
          </h2>
          <p
            key={t.desc}
            className="mt-4 text-white/75 text-[15px] leading-relaxed max-w-[20rem] animate-fade-in"
          >
            {t.desc}
          </p>

          <div className="mt-8 flex items-center gap-3">
            <button
              onClick={() => go(-1)}
              className="w-14 h-14 rounded-full glass flex items-center justify-center active:scale-95 transition"
              aria-label="Anterior"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button
              onClick={() => nav({ to: "/ideas/$format", params: { format: t.id } })}
              className="flex-1 h-14 rounded-full bg-gradient-to-r from-[#F4E4C1] via-[#E8D5B5] to-[#D4AF37] text-black font-semibold text-base shadow-[0_4px_24px_rgba(244,228,193,0.4)] active:scale-[0.98] transition"
            >
              Vezi ideile
            </button>

            <button
              onClick={() => go(1)}
              className="w-14 h-14 rounded-full glass flex items-center justify-center active:scale-95 transition"
              aria-label="Următor"
            >
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <p className="mt-5 text-center text-[10px] tracking-[0.4em] uppercase text-white/40">
            Glisează sau folosește săgețile
          </p>
        </div>
      </div>
    </PhoneShell>
  );
}
