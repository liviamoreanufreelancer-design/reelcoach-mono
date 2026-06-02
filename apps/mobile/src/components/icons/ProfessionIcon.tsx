import type { Profession } from "@/data/scenarios";

type Props = { id: Profession; className?: string };

const stroke = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ProfessionIcon({ id, className }: Props) {
  switch (id) {
    case "par":
      // Brush + flowing hair lines
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden>
          <g {...stroke}>
            <path d="M8 6c4 4 6 9 6 14s-1 5-1 5" />
            <path d="M13 5c4 5 6 10 6 15" />
            <path d="M18 6c3 5 5 9 5 14" />
            <path d="M9 27h14" />
            <rect x="11" y="22" width="10" height="4" rx="1.6" />
          </g>
        </svg>
      );
    case "machiaj":
      // Lipstick
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden>
          <g {...stroke}>
            <path d="M12 4l6 2-1.5 6h-5L10 6l2-2z" />
            <rect x="10" y="12" width="9" height="4" rx="1" />
            <rect x="9.5" y="16" width="10" height="12" rx="2" />
            <path d="M9.5 22h10" />
          </g>
        </svg>
      );
    case "unghii":
      // Hand with polished nail
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden>
          <g {...stroke}>
            <path d="M8 20c0-4 2-7 4-7s4 3 4 7" />
            <path d="M16 18c0-3 2-5 4-5s4 2 4 5" />
            <path d="M8 20v6c0 1 1 2 2 2h12c1 0 2-1 2-2v-6" />
            <path d="M11 13l1-7" />
            <ellipse cx="12" cy="13" rx="2" ry="1.5" fill="currentColor" stroke="none" />
          </g>
        </svg>
      );
    case "gene":
      // Eye with long lashes
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden>
          <g {...stroke}>
            <path d="M4 18c4-5 8-7 12-7s8 2 12 7" />
            <circle cx="16" cy="18" r="3.2" />
            <path d="M6 12l1 2" />
            <path d="M10 9l1 2.5" />
            <path d="M16 8v3" />
            <path d="M22 9l-1 2.5" />
            <path d="M26 12l-1 2" />
          </g>
        </svg>
      );
    case "sprancene":
      // Brow arch + stars
      return (
        <svg viewBox="0 0 32 32" className={className} aria-hidden>
          <g {...stroke}>
            <path d="M5 18c5-7 17-7 22 0" strokeWidth="2.2" />
            <path d="M8 22h16" />
            <path d="M24 8l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="currentColor" stroke="none" />
          </g>
        </svg>
      );
  }
}
