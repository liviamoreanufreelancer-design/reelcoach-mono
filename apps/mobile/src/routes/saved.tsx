/**
 * Favorite — template-urile (idei de reel) salvate de stilista.
 * Purple/light. Citeste din store-ul favorites, mapeaza la template-uri
 * reale, afiseaza aceleasi carduri ca Explore.
 */
import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bookmark, Heart } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { StatusBar } from "@/components/StatusBar";
import { TabBar } from "@/components/TabBar";
import { useTemplates } from "@/data/templates-context";
import { getTemplatesForCategory } from "@/data/catalog";
import type { ReelTemplate } from "@/data/catalog";
import { getFavorites, toggleFavorite } from "@/lib/favorites";

export const Route = createFileRoute("/saved")({
  component: SavedScreen,
});

function SavedScreen() {
  const nav = useNavigate();
  const { categories, allTemplates } = useTemplates();

  // Toate template-urile cunoscute (din categorii + fallback).
  const everyTemplate = useMemo(() => {
    const ids = new Set<string>();
    const out: ReelTemplate[] = [];
    for (const c of categories) {
      for (const t of getTemplatesForCategory(c.id)) {
        if (!ids.has(t.id)) { ids.add(t.id); out.push(t); }
      }
    }
    for (const t of allTemplates) {
      if (!ids.has(t.id)) { ids.add(t.id); out.push(t); }
    }
    return out;
  }, [categories, allTemplates]);

  const [favIds, setFavIds] = useState<string[]>(() => getFavorites());

  const favTemplates = useMemo(
    () => everyTemplate.filter((t) => favIds.includes(t.id)),
    [everyTemplate, favIds],
  );

  const openReel = (t: ReelTemplate) =>
    nav({ to: "/reel/$id", params: { id: t.id } });

  const removeFav = (id: string) => {
    toggleFavorite(id);
    setFavIds(getFavorites());
  };

  return (
    <PhoneShell>
      <div className="relative z-10 flex flex-col h-full bg-[#F8F8FA]">
        <StatusBar />
        {/* Header */}
        <header className="shrink-0 px-[22px] pt-1 pb-2.5">
          <h1 className="font-display font-bold text-[27px] leading-none text-[#1F1F1F]">
            Favorite
          </h1>
        </header>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden pb-[100px]"
          style={{ scrollbarWidth: "none" }}
        >
          {favTemplates.length > 0 ? (
            <div className="grid grid-cols-2 gap-x-3.5 gap-y-5 px-[22px] mt-3">
              {favTemplates.map((t) => (
                <article
                  key={t.id}
                  className="flex flex-col cursor-pointer"
                  onClick={() => openReel(t)}
                >
                  <div className="relative self-stretch">
                    <div
                      className="w-full aspect-[9/16] rounded-[18px] bg-cover bg-center bg-[#EDE8FF]"
                      style={{ backgroundImage: `url(${t.cover})` }}
                    />
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFav(t.id); }}
                      aria-label="Scoate din favorite"
                      className="absolute right-2.5 top-2.5 w-[30px] h-[30px] grid place-items-center rounded-[10px] bg-white/85 backdrop-blur shadow-[0_2px_8px_rgba(0,0,0,.14)] text-[#5B34FF] active:scale-90 transition"
                    >
                      <Bookmark className="w-[15px] h-[15px]" fill="currentColor" />
                    </button>
                  </div>
                  <h4 className="font-display font-bold text-[15.5px] leading-[1.15] text-[#1F1F1F] mt-2.5">
                    {t.title}
                  </h4>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center pt-[90px] px-10">
              <span className="w-[58px] h-[58px] grid place-items-center rounded-[18px] bg-[#EDE8FF] text-[#5B34FF]">
                <Heart className="w-7 h-7" />
              </span>
              <p className="font-display font-bold text-[17px] text-[#1F1F1F] mt-4">
                Niciun favorit încă
              </p>
              <p className="font-body text-[13px] text-[#6B6B6B] mt-1.5 leading-[1.45]">
                Salvează idei de reel din Explorează apăsând pe semnul de carte.
              </p>
            </div>
          )}
        </div>

        <TabBar active="saved" />
      </div>
    </PhoneShell>
  );
}
