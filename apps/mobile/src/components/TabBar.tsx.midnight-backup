/**
 * TabBar — bottom navigation for Home, Saved, Profile.
 *
 * Three tabs:
 *   - Home    → fully implemented (the screen this renders on)
 *   - Saved   → placeholder "În curând" for MVP
 *   - Profile → placeholder "În curând" for MVP
 *
 * Glass-blur background, champagne accent on active tab.
 */

import { Link } from "@tanstack/react-router";
import { Home, Heart, User } from "lucide-react";
import { playTap } from "@/lib/ui-sound";

export type TabId = "home" | "saved" | "profile";

interface TabBarProps {
  active: TabId;
}

const TABS: { id: TabId; label: string; icon: typeof Home; href: string }[] = [
  { id: "home", label: "ACASĂ", icon: Home, href: "/" },
  { id: "saved", label: "SALVATE", icon: Heart, href: "/saved" },
  { id: "profile", label: "PROFIL", icon: User, href: "/profile" },
];

export function TabBar({ active }: TabBarProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 h-[80px] bg-[#0F1419]/85 backdrop-blur-xl border-t border-[#E8D5B5]/12 flex items-start justify-around pt-[14px]">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.id}
            to={tab.href}
            onClick={() => playTap()}
            className="flex flex-col items-center gap-1 active:scale-95 transition"
            aria-label={tab.label}
          >
            <Icon
              className="w-[22px] h-[22px]"
              style={{
                color: isActive ? "#E8D5B5" : "rgba(255,255,255,0.4)",
              }}
            />
            <span
              className="text-[9px] tracking-[0.12em] uppercase"
              style={{
                color: isActive ? "#E8D5B5" : "rgba(255,255,255,0.4)",
              }}
            >
              {tab.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
