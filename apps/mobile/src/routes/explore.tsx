/**
 * Explore — discovery screen. Purple/light design.
 * Search + vertical filters + 2-column grid of reel cards.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Search, Bookmark, Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PhoneShell } from "@/components/PhoneShell";
import { TabBar } from "@/components/TabBar";
import { playTap } from "@/lib/ui-sound";
import { getFavorites, toggleFavorite } from "@/lib/favorites";
import { light } from "@/lib/haptic";
import { getProfessionId } from "@/lib/profession";
import {
  getCategoriesForProfession,
  getTemplatesForCategory,
} from "@/data/catalog";
import { useTemplates } from "@/data/templates-context";
import { totalFinalSeconds, type ReelTemplate } from "@/data/shots";

export const Route = createFileRoute("/explore")({
  component: Explore,
});

const DIFF_LABEL: Record<string, string> = {
  easy: "Ușor",
  medium: "Mediu",
  hard: "Avansat",
};
const DIFF_DOT: Record<string, string> = {
  easy: "#22C55E",
  medium: "#F5B228",
  hard: "#5B34FF",
};

function fmtTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function Explore() {
  const nav = useNavigate();
  const allTemplates = useTemplates();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("Toate");
  const [saved, setSaved] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(getFavorites().map((id) => [id, true])),
  );

  const professionId = getProfessionId();

  // Build filter list from the profession's categories.
  const categories = professionId ? getCategoriesForProfession(professionId) : [];
  const filters = useMemo(
    () => ["Toate", ...categories.map((c) => c.label)],
    [categories],
  );

  // All templates for this profession (across its categories).
  const professionTemplates = useMemo(() => {
    if (!professionId) return allTemplates;
    const ids = new Set<string>();
    const out: ReelTemplate[] = [];
    for (const c of categories) {
      for (const t of getTemplatesForCategory(c.id)) {
        if (!ids.has(t.id)) { ids.add(t.id); out.push(t); }
      }
    }
    return out.length > 0 ? out : allTemplates;
  }, [allTemplates, professionId, categories]);

  // Apply category filter + search.
  const list = useMemo(() => {
    let l = professionTemplates;
    if (filter !== "Toate") {
      const cat = categories.find((c) => c.label === filter);
      if (cat) {
        const tids = new Set(getTemplatesForCategory(cat.id).map((t) => t.id));
        l = l.filter((t) => tids.has(t.id));
      }
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      l = l.filter((t) => t.title.toLowerCase().includes(q));
    }
    return l;
  }, [professionTemplates, filter, query, categories]);

  const openReel = (t: ReelTemplate) => {
    light(); playTap();
    nav({ to: "/reel/$id", params: { id: t.id } });
  };
  const toggleSave = (id: string) => {
    const now = toggleFavorite(id);
    setSaved((s) => ({ ...s, [id]: now }));
  };

  return (
    <PhoneShell>
      <div className="absolute inset-0 flex flex-col bg-[#F8F8FA]">
        <div style={{ height: "max(env(safe-area-inset-top, 56px), 56px)" }} className="shrink-0" />

        {/* Header */}
        <header className="px-[22px] pt-1 pb-1 shrink-0">
          <h1 className="font-display font-bold text-[27px] leading-none text-[#1F1F1F]">Explorează</h1>
        </header>

        {/* Scroll area */}
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden pb-[100px]" style={{ scrollbarWidth: "none" }}>
          {/* Search */}
          <div className="px-[22px] mt-3.5">
            <div className="flex items-center gap-2.5 h-[48px] rounded-[15px] bg-white border border-[#E6E6EA] px-4 shadow-[0_4px_14px_-10px_rgba(40,24,110,.25)]">
              <Search className="w-[19px] h-[19px] text-[#6B6B6B] shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ce filmezi azi?"
                className="flex-1 min-w-0 bg-transparent outline-none text-[14.5px] text-[#1F1F1F] placeholder:text-[#6B6B6B]/80"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2 overflow-x-auto px-[22px] mt-3.5 shrink-0" style={{ scrollbarWidth: "none" }}>
            {filters.map((f) => {
              const on = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => { playTap(); setFilter(f); }}
                  className="shrink-0 h-[34px] px-[15px] rounded-full font-semibold text-[13px] whitespace-nowrap transition active:scale-[.97]"
                  style={
                    on
                      ? { background: "#5B34FF", color: "#fff" }
                      : { background: "#fff", color: "#1F1F1F", border: "1px solid #E6E6EA" }
                  }
                >
                  {f}
                </button>
              );
            })}
          </div>

          {/* Grid */}
          {list.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-3.5 gap-y-5 px-[22px] mt-5">
              {list.map((t) => {
                const diff = t.difficulty ?? "easy";
                return (
                  <article key={t.id} className="flex flex-col cursor-pointer" onClick={() => openReel(t)}>
                    <div className="relative self-stretch">
                      <div
                        className="w-full aspect-[9/16] rounded-[18px] bg-cover bg-center bg-[#EDE8FF]"
                        style={{ backgroundImage: `url(${t.cover})` }}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSave(t.id); }}
                        aria-label="Salvează"
                        className="absolute right-2.5 top-2.5 w-[30px] h-[30px] grid place-items-center rounded-[10px] bg-white/85 backdrop-blur shadow-[0_2px_8px_rgba(0,0,0,.14)] transition active:scale-90"
                        style={{ color: saved[t.id] ? "#5B34FF" : "#1F1F1F" }}
                      >
                        <Bookmark className="w-[15px] h-[15px]" fill={saved[t.id] ? "currentColor" : "none"} />
                      </button>
                    </div>
                    <h4 className="font-display font-bold text-[15.5px] leading-[1.15] text-[#1F1F1F] mt-2.5 line-clamp-2">
                      {t.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-[6px] text-[12px] text-[#6B6B6B] font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="w-[7px] h-[7px] rounded-full" style={{ background: DIFF_DOT[diff] }} />
                        {DIFF_LABEL[diff]}
                      </span>
                      <span className="w-[3px] h-[3px] rounded-full bg-[#E6E6EA]" />
                      <span className="flex items-center gap-1">
                        <Clock className="w-[13px] h-[13px]" />
                        {fmtTime(totalFinalSeconds(t))}
                      </span>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="px-[22px] mt-16 text-center">
              <p className="text-[14px] text-[#6B6B6B]">Niciun reel găsit. Încearcă alt filtru.</p>
            </div>
          )}
        </div>

        <TabBar active="explore" />
      </div>
    </PhoneShell>
  );
}
