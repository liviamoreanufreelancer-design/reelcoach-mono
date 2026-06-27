/**
 * ProfessionLabel — minimal editorial label showing the active profession.
 *
 * Replaces the gaming-style chip with a quiet, premium typographic
 * treatment: small uppercase label + thin divider + tappable "Schimbă"
 * affordance. No emojis, no pill background — just type on background.
 *
 * Used on Home, on Category screens, anywhere we need to remind the user
 * what profession they're filming for and offer to switch it.
 */

import { useNavigate } from "@tanstack/react-router";
import { PROFESSIONS } from "@/data/scenarios";
import { getProfessionId } from "@/lib/profession";
import { light } from "@/lib/haptic";
import { playTap } from "@/lib/ui-sound";

interface ProfessionLabelProps {
  /** Visual variant — "light" for dark backgrounds, "dark" for light backgrounds. */
  tone?: "light" | "dark";
  /** Optional className for layout (margins, etc). */
  className?: string;
}

export function ProfessionLabel({ tone = "light", className = "" }: ProfessionLabelProps) {
  const nav = useNavigate();
  const id = getProfessionId();
  const profession = id ? PROFESSIONS.find((p) => p.id === id) : null;

  if (!profession) return null;

  const palette =
    tone === "light"
      ? {
          primary: "text-[#EDE8FF]",
          secondary: "text-[#EDE8FF]/55",
          divider: "bg-[#5B34FF]/30",
        }
      : {
          primary: "text-[#0F1419]",
          secondary: "text-[#0F1419]/55",
          divider: "bg-[#0F1419]/30",
        };

  return (
    <button
      onClick={() => {
        light();
        playTap();
        nav({ to: "/profession" });
      }}
      className={`inline-flex items-center gap-2.5 active:opacity-70 transition ${className}`}
      aria-label="Schimbă profesia"
    >
      <span
        className={`text-[10px] tracking-[0.32em] uppercase font-medium ${palette.primary}`}
      >
        {profession.label}
      </span>
      <span className={`block w-px h-2.5 ${palette.divider}`} aria-hidden />
      <span
        className={`text-[9px] tracking-[0.25em] uppercase ${palette.secondary}`}
      >
        Schimbă
      </span>
    </button>
  );
}
