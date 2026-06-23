/**
 * TabBar — bottom navigation. Purple/light design system.
 *   Acasă / Explorează / Favorite / Reelurile mele
 */
import { Link } from "@tanstack/react-router";
import { Home, Search, Film, Heart } from "lucide-react";
import { playTap } from "@/lib/ui-sound";

export type TabId = "home" | "explore" | "reels" | "saved";

interface TabBarProps {
  active: TabId;
}

const TABS: { id: TabId; label: string; icon: typeof Home; href: string }[] = [
  { id: "home", label: "Acasă", icon: Home, href: "/" },
  { id: "explore", label: "Explorează", icon: Search, href: "/explore" },
  { id: "reels", label: "Reelurile mele", icon: Film, href: "/my-reels" },
  { id: "saved", label: "Favorite", icon: Heart, href: "/saved" },
];

export function TabBar({ active }: TabBarProps) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-30 flex justify-around items-stretch px-2 pt-2.5 pb-[22px] border-t border-[#E6E6EA] bg-white">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.id}
            to={tab.href}
            onClick={() => playTap()}
            className="flex-1 flex flex-col items-center gap-[5px] active:scale-95 transition"
            aria-label={tab.label}
            style={{ color: isActive ? "#5B34FF" : "#6B6B6B" }}
          >
            <Icon className="w-[22px] h-[22px]" />
            <span className="text-[10.5px] font-semibold tracking-[0.1px]">
              {tab.label}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
