import type { Vibe } from "@/lib/brand-store";
import type { TransitionId } from "@reelcoach/core";

export interface StylePack {
  id: Vibe;
  label: string;
  desc: string;
  textPresetId: string;
  transitionId: TransitionId;
  defaultMusicVibe: Vibe;
}

export const STYLE_PACKS: Record<Vibe, StylePack> = {
  luxury: {
    id: "luxury",
    label: "Luxury",
    desc: "Serif gold, fade lent, slow-mo.",
    textPresetId: "luxurySerif",
    transitionId: "fade",
    defaultMusicVibe: "luxury",
  },
  soft: {
    id: "soft",
    label: "Soft",
    desc: "Editorial roz, slide gentle, ritm calm.",
    textPresetId: "brandSoft",
    transitionId: "fade",
    defaultMusicVibe: "soft",
  },
  bold: {
    id: "bold",
    label: "Bold",
    desc: "Sans gros, scale punch, tăieturi seci.",
    textPresetId: "hookBold",
    transitionId: "flash",
    defaultMusicVibe: "bold",
  },
};
