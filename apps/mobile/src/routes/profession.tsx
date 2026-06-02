/**
 * Profession picker — pick what you're filming today.
 *
 * Editorial minimal layout:
 *   - "ASTĂZI FILMEZI" small label + clean title
 *   - 5 typographic rows, one per profession (no icons, no scroll)
 *   - Each row: label + tag, divided by a thin line
 *   - Tap a row to set the active profession and go Home
 *
 * Returning to Home after pick — Home is the always-on landing.
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { BackButton } from "@/components/BackButton";
import { CinematicBg } from "@/components/CinematicBg";
import { PhoneShell } from "@/components/PhoneShell";
import { StatusBar } from "@/components/StatusBar";
import { PROFESSIONS, type Profession } from "@/data/scenarios";
import { setProfession } from "@/lib/profession";
import { light, success } from "@/lib/haptic";
import intro from "@/assets/salon-intro.jpg";

export const Route = createFileRoute("/profession")({
  component: ProfessionPicker,
});

function ProfessionPicker() {
  const nav = useNavigate();

  const pick = (p: Profession) => {
    success();
    setProfession(p);
    nav({ to: "/" });
  };

  return (
    <PhoneShell>
      <CinematicBg src={intro} blur overlay={0.85} kenBurns={false} />

      <div className="relative z-10 flex flex-col h-full px-6 pt-12 pb-7">
        <div className="px-1"><StatusBar /></div>

        <div className="flex items-center justify-between">
          <BackButton to="/" />
          <span className="text-[10px] tracking-[0.4em] uppercase text-[#E8D5B5] font-semibold">
            Profesia
          </span>
          <span className="w-10" />
        </div>

        {/* Editorial label + clean title — no italic, no flourish. */}
        <div className="mt-12">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#E8D5B5]/75 font-medium">
            Astăzi filmezi
          </p>
          <h1 className="font-editorial mt-2 text-[40px] text-white leading-[1.0] tracking-[-0.01em]">
            Alege profesia.
          </h1>
        </div>

        {/* Typographic list — 5 rows, no scroll, no icons. */}
        <ul className="mt-12 flex flex-col">
          {PROFESSIONS.map((p, i) => (
            <li key={p.id}>
              <button
                onClick={() => { light(); pick(p.id); }}
                className="group w-full text-left flex items-baseline py-5 active:opacity-60 transition border-t border-white/[0.08]"
                style={i === PROFESSIONS.length - 1 ? { borderBottom: "1px solid rgba(255,255,255,0.08)" } : undefined}
              >
                <span className="font-editorial text-[28px] text-white tracking-[-0.01em] leading-none">
                  {p.label}
                </span>
                <span className="ml-auto text-[10px] tracking-[0.32em] uppercase text-[#E8D5B5]/55 font-medium">
                  {p.tag}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <p className="mt-auto text-center text-[10px] tracking-[0.4em] uppercase text-white/35">
          Poți schimba mai târziu
        </p>
      </div>
    </PhoneShell>
  );
}
