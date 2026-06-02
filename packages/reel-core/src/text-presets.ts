export type TextAnimation = "fade" | "scale" | "slideUp" | "none";
export type TextPosition = "top" | "center" | "bottom";

export interface TextPreset {
  id: string;
  label: string;
  font: string;             // CSS font-family
  weight: number;
  italic?: boolean;
  size: number;             // px @ 1080w canvas
  color: string;            // hex
  bg?: string;              // pill background, hex w/ alpha
  outline?: { color: string; width: number };
  shadow?: boolean;
  letterSpacing?: number;
  uppercase?: boolean;
  animation: TextAnimation;
  paddingX?: number;
  paddingY?: number;
  radius?: number;
  maxWidth?: number;        // px, wrap width (default 880)
}

export const TEXT_PRESETS: Record<string, TextPreset> = {
  hookBold: {
    id: "hookBold",
    label: "Hook Bold",
    font: "'Inter', system-ui, sans-serif",
    weight: 900,
    size: 92,
    color: "#FFFFFF",
    shadow: true,
    outline: { color: "#000000", width: 6 },
    letterSpacing: -1,
    animation: "scale",
    maxWidth: 920,
  },
  luxurySerif: {
    id: "luxurySerif",
    label: "Luxury Serif",
    font: "'Instrument Serif', Georgia, serif",
    weight: 400,
    italic: true,
    size: 96,
    color: "#F4E2B8",
    shadow: true,
    letterSpacing: -2,
    animation: "fade",
    maxWidth: 920,
  },
  bubblePill: {
    id: "bubblePill",
    label: "Bubble Pill",
    font: "'Inter', system-ui, sans-serif",
    weight: 700,
    size: 56,
    color: "#000000",
    bg: "#FFFFFF",
    paddingX: 36,
    paddingY: 20,
    radius: 999,
    animation: "slideUp",
    maxWidth: 820,
  },
  subtitleOutline: {
    id: "subtitleOutline",
    label: "Subtitrare",
    font: "'Inter', system-ui, sans-serif",
    weight: 700,
    size: 52,
    color: "#FFFFFF",
    outline: { color: "#000000", width: 5 },
    animation: "fade",
    maxWidth: 900,
  },
  badgeGold: {
    id: "badgeGold",
    label: "Badge Gold",
    font: "'Inter', system-ui, sans-serif",
    weight: 800,
    size: 44,
    color: "#1a1208",
    bg: "#E5C892",
    paddingX: 32,
    paddingY: 16,
    radius: 14,
    uppercase: true,
    letterSpacing: 4,
    animation: "fade",
  },
  brandSoft: {
    id: "brandSoft",
    label: "Soft Pink",
    font: "'Fraunces', Georgia, serif",
    weight: 500,
    size: 84,
    color: "#FFFFFF",
    shadow: true,
    animation: "slideUp",
    maxWidth: 900,
  },
};

export const DEFAULT_TEXT_PRESET = "hookBold";
