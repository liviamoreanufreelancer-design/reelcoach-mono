/**
 * ShotIcon — line-art SVG icons for each shot pattern.
 *
 * Style: continuous fine lines, champagne stroke, no fill. Hermès/Aesop
 * vibe. Each icon is 64×64 and inherits stroke color from the parent.
 *
 * Patterns:
 *   - before:     client facing camera inside a phone frame
 *   - process:    a hand holding a strand (hands at work)
 *   - suspense:   client from behind with long hair flowing
 *   - reveal:     client with hair in motion (hair flip)
 *   - reaction:   client facing camera with a hint of smile
 *   - confidence: client touching hair with a small sparkle
 */

import type { ShotPatternId } from "@/data/shots";

interface ShotIconProps {
  pattern: ShotPatternId;
  size?: number;
  className?: string;
}

export function ShotIcon({ pattern, size = 64, className = "" }: ShotIconProps) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 100 100",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
  };

  switch (pattern) {
    case "before":
      // Client front-on inside a phone frame — "filmează părul înainte".
      return (
        <svg {...common}>
          <rect x="22" y="6" width="56" height="88" rx="6" />
          <path d="M 50 38 a 9 9 0 1 1 0.001 0" />
          <path d="M 40 36 Q 36 50 38 70" />
          <path d="M 60 36 Q 64 50 62 70" />
          <path d="M 36 70 Q 50 62 64 70 L 64 84 L 36 84 Z" />
          <circle cx="50" cy="10" r="0.8" fill="currentColor" />
        </svg>
      );

    case "process":
      // A hand holding a single strand of hair — work-in-progress.
      return (
        <svg {...common}>
          {/* Hair strand */}
          <path d="M 50 12 Q 48 30 50 50 Q 52 70 50 88" />
          <path d="M 46 14 Q 44 32 46 52" strokeWidth="0.9" opacity="0.7" />
          <path d="M 54 14 Q 56 32 54 52" strokeWidth="0.9" opacity="0.7" />
          {/* Hand — simplified: palm + thumb + index pinching the strand */}
          <path d="M 28 56 Q 32 50 40 52 L 50 56 L 60 52 Q 68 50 72 56 L 72 70 Q 64 76 50 76 Q 36 76 28 70 Z" />
          {/* Pinch detail at center */}
          <circle cx="50" cy="58" r="2" fill="currentColor" />
        </svg>
      );

    case "suspense":
      // Client from behind — head outline + long hair flowing down.
      return (
        <svg {...common}>
          {/* Head from behind (oval) */}
          <ellipse cx="50" cy="26" rx="14" ry="16" />
          {/* Shoulders */}
          <path d="M 30 42 Q 50 38 70 42 L 72 56" />
          {/* Long hair flowing down */}
          <path d="M 34 30 Q 30 50 32 80" />
          <path d="M 40 32 Q 38 55 40 86" />
          <path d="M 50 38 Q 50 60 50 90" />
          <path d="M 60 32 Q 62 55 60 86" />
          <path d="M 66 30 Q 70 50 68 80" />
        </svg>
      );

    case "reveal":
      // Client with hair in motion — hair flip, lines swept to one side.
      return (
        <svg {...common}>
          {/* Head */}
          <circle cx="50" cy="34" r="12" />
          {/* Shoulders */}
          <path d="M 32 48 Q 50 44 68 48 L 70 60" />
          {/* Hair swept dramatically to the right (motion) */}
          <path d="M 42 26 Q 60 18 78 24" />
          <path d="M 40 32 Q 62 26 84 34" />
          <path d="M 40 40 Q 64 38 86 48" />
          <path d="M 42 46 Q 64 50 84 62" />
          {/* Motion lines on the left, suggesting the flip */}
          <path d="M 18 36 L 26 36" strokeWidth="0.8" opacity="0.5" />
          <path d="M 16 42 L 28 42" strokeWidth="0.8" opacity="0.5" />
          <path d="M 18 48 L 26 48" strokeWidth="0.8" opacity="0.5" />
        </svg>
      );

    case "reaction":
      // Client facing camera with a soft smile — eyes + lips visible.
      return (
        <svg {...common}>
          {/* Head with hair frame */}
          <path d="M 36 22 Q 50 12 64 22 Q 70 30 68 44 Q 64 60 50 64 Q 36 60 32 44 Q 30 30 36 22 Z" />
          {/* Eyes — small dashes */}
          <path d="M 42 36 L 44 36" />
          <path d="M 56 36 L 58 36" />
          {/* Soft smile */}
          <path d="M 44 48 Q 50 52 56 48" />
          {/* Shoulders */}
          <path d="M 32 70 Q 50 64 68 70 L 72 84" />
          {/* Hair flowing past shoulders */}
          <path d="M 32 30 Q 28 50 30 78" />
          <path d="M 68 30 Q 72 50 70 78" />
        </svg>
      );

    case "confidence":
      // Client touching hair with a soft sparkle nearby — confidence pose.
      return (
        <svg {...common}>
          {/* Head */}
          <circle cx="46" cy="30" r="12" />
          {/* Hair on the left side */}
          <path d="M 34 28 Q 30 48 32 70" />
          <path d="M 40 26 Q 38 48 40 72" />
          {/* Body */}
          <path d="M 30 46 Q 46 42 58 46 L 62 60" />
          {/* Arm raised, hand near hair */}
          <path d="M 58 46 Q 70 38 76 26" />
          {/* Hand at top of arm */}
          <circle cx="76" cy="24" r="3" />
          {/* Sparkle — 4-point star */}
          <path d="M 84 14 L 84 22 M 80 18 L 88 18" strokeWidth="0.9" />
          <circle cx="84" cy="18" r="0.8" fill="currentColor" />
        </svg>
      );

    default:
      return null;
  }
}
