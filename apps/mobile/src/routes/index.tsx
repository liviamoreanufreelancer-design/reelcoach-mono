/**
 * Home — landing screen. Purple/light redesign.
 *
 * Logica existentă păstrată (onboarding redirect, in-progress reel,
 * recommended filtrat pe profesie). Design nou: safe-area sus, header
 * greeting, "Continuă filmarea" SAU hero card (când nu e filmare în curs),
 * carousel "Recomandate pentru tine".
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, Menu, Bookmark, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { PhoneShell } from "@/components/PhoneShell";
import { TabBar } from "@/components/TabBar";
import { playTap } from "@/lib/ui-sound";
import { getFavorites, toggleFavorite } from "@/lib/favorites";
import { light } from "@/lib/haptic";
import { getProfessionId } from "@/lib/profession";
import { isOnboardingDone } from "@/lib/brand-store";
import { findInProgressReel } from "@/lib/clip-store";
import {
  getCategoriesForProfession,
  getTemplatesForCategory,
} from "@/data/catalog";
import { useTemplates } from "@/data/templates-context";
import {
  shotCount,
  totalRecordingSeconds,
  totalFinalSeconds,
  type ReelTemplate,
} from "@/data/shots";
import { setSelectedIdeaId, getLastOpenedIdeaId } from "@/lib/selected-idea";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const nav = useNavigate();
  const [inProgress, setInProgress] = useState<{
    template: ReelTemplate;
    sceneCount: number;
  } | null>(null);
  const [recommended, setRecommended] = useState<ReelTemplate[]>([]);
  const [saved, setSaved] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(getFavorites().map((id) => [id, true])),
  );

  const professionId = getProfessionId();
  const allTemplates = useTemplates();
  const getTemplateById = (id: string) => allTemplates.find((t) => t.id === id);

  useEffect(() => {
    if (!isOnboardingDone()) {
      void nav({ to: "/onboarding" });
    } else if (!getProfessionId()) {
      void nav({ to: "/profession" });
    }
  }, [nav]);

  useEffect(() => {
    void (async () => {
      let templateForContinue: ReelTemplate | null = null;
      let scenesDone = 0;
      const ip = await findInProgressReel();
      if (ip) {
        const t = getTemplateById(ip.scenarioId);
        if (t && ip.sceneCount < shotCount(t)) {
          templateForContinue = t;
          scenesDone = ip.sceneCount;
        }
      }
      if (!templateForContinue) {
        const lastId = getLastOpenedIdeaId();
        if (lastId) {
          const t = getTemplateById(lastId);
          if (t) { templateForContinue = t; scenesDone = 0; }
        }
      }
      if (templateForContinue) {
        setInProgress({ template: templateForContinue, sceneCount: scenesDone });
      } else {
        setInProgress(null);
      }

      // Recommended: templates for the user's profession.
      let pool: ReelTemplate[] = [];
      if (professionId) {
        const cats = getCategoriesForProfession(professionId);
        const ids = new Set<string>();
        for (const c of cats) {
          for (const t of getTemplatesForCategory(c.id)) {
            if (!ids.has(t.id)) { ids.add(t.id); pool.push(t); }
          }
        }
      }
      if (pool.length === 0) pool = allTemplates.slice();
      if (templateForContinue) {
        pool = pool.filter((t) => t.id !== templateForContinue!.id);
      }
      setRecommended(pool.slice(0, 8));
    })();
  }, [allTemplates, professionId]);

  const continueReel = () => {
    if (!inProgress) return;
    light(); playTap();
    setSelectedIdeaId(inProgress.template.id);
    nav({ to: "/film" });
  };

  const openReel = (t: ReelTemplate) => {
    light(); playTap();
    nav({ to: "/reel/$id", params: { id: t.id } });
  };

  const toggleSave = (id: string) => {
    const now = toggleFavorite(id);
    setSaved((s) => ({ ...s, [id]: now }));
  };

  // Hero = first recommended (shown big when no in-progress reel).
  const hero = !inProgress ? recommended[0] : null;
  const carousel = hero ? recommended.slice(1) : recommended;

  return (
    <PhoneShell>
      <div className="absolute inset-0 flex flex-col bg-[#F8F8FA]">
        {/* Safe-area spacer — pushes header below iOS status bar */}
        <div style={{ height: "max(env(safe-area-inset-top, 56px), 56px)" }} className="shrink-0" />

        {/* Header */}
        <header className="flex items-center justify-between px-[22px] pt-1 pb-3.5 shrink-0">
          <button
            onClick={() => nav({ to: "/settings" })}
            className="grid place-items-center w-[30px] h-[30px] rounded-[10px] text-[#1F1F1F] active:bg-[#F1F1F4] transition"
            aria-label="Profil și setări"
          >
            <Menu className="w-[22px] h-[22px]" />
          </button>
          <span className="font-display font-bold text-[17px] text-[#1F1F1F] whitespace-nowrap">
            Bună dimineața&nbsp;👋
          </span>
          <button className="relative grid place-items-center w-[30px] h-[30px] rounded-[10px] text-[#1F1F1F] active:bg-[#F1F1F4] transition" aria-label="Notificări">
            <Bell className="w-[21px] h-[21px]" />
            <span className="absolute top-1 right-[5px] w-[7px] h-[7px] rounded-full bg-[#F5B228] border-[1.5px] border-white" />
          </button>
        </header>

        {/* Scroll area */}
        <div className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden pt-2 pb-[100px]" style={{ scrollbarWidth: "none" }}>
          {/* Continuă filmarea */}
          {inProgress && (
            <div className="px-[22px]">
              <h2 className="font-display font-bold text-[17px] text-[#1F1F1F] mt-4 mb-3.5">Continuă filmarea</h2>
              <div className="flex gap-3.5 bg-white border border-[#E6E6EA] rounded-[20px] p-3 shadow-[0_10px_26px_-14px_rgba(40,24,110,.22)]">
                <div
                  className="w-[108px] self-stretch shrink-0 rounded-[14px] bg-cover bg-center bg-[#EDE8FF] min-h-[180px]"
                  style={{ backgroundImage: `url(${inProgress.template.cover})` }}
                />
                <div className="flex-1 min-w-0 flex flex-col py-0.5 pr-0.5">
                  <h3 className="font-display font-bold text-[18px] leading-[1.12] text-[#1F1F1F]">
                    {inProgress.template.title}
                  </h3>
                  {inProgress.template.promise && (
                    <p className="text-[12.5px] text-[#6B6B6B] mt-1.5 font-medium leading-[1.4] line-clamp-3">
                      {inProgress.template.promise}
                    </p>
                  )}
                  <span className="text-[13px] text-[#6B6B6B] mt-2 font-medium">
                    Scena {inProgress.sceneCount + 1} din {shotCount(inProgress.template)}
                  </span>
                  <div className="h-1.5 rounded-full bg-[#EDE8FF] mt-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#5B34FF]"
                      style={{ width: `${Math.round((inProgress.sceneCount / Math.max(shotCount(inProgress.template), 1)) * 100)}%` }}
                    />
                  </div>
                  <button
                    onClick={continueReel}
                    className="mt-3.5 h-[44px] w-full rounded-[13px] bg-[#5B34FF] text-white font-semibold text-[14px] active:scale-[.975] active:brightness-95 transition"
                  >
                    Continuă
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hero card — when no in-progress reel. Poster 9:16 + text lateral */}
          {hero && (
            <div className="px-[22px]">
              <h2 className="font-display font-bold text-[17px] text-[#1F1F1F] mt-4 mb-3.5">Începe de aici</h2>
              <div
                className="flex gap-4 bg-white border border-[#E6E6EA] rounded-[20px] p-3.5 shadow-[0_14px_34px_-16px_rgba(40,24,110,.28)] cursor-pointer"
                onClick={() => openReel(hero)}
              >
                {/* Poster reel 9:16 */}
                <div
                  className="w-[108px] self-stretch shrink-0 rounded-[14px] bg-cover bg-center bg-[#EDE8FF] min-h-[180px]"
                  style={{ backgroundImage: `url(${hero.cover})` }}
                />
                {/* Info lateral */}
                <div className="flex-1 min-w-0 flex flex-col py-0.5">
                  <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#5B34FF]">Recomandat azi</span>
                  <h3 className="font-display font-bold text-[19px] leading-[1.12] text-[#1F1F1F] mt-1.5">
                    {hero.title}
                  </h3>
                  {hero.promise && (
                    <p className="text-[13px] text-[#6B6B6B] mt-2 font-medium leading-[1.45] line-clamp-3">
                      {hero.promise}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-2.5">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#EDE8FF] text-[#5B34FF] text-[11px] font-semibold">{shotCount(hero)} cadre</span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#EDE8FF] text-[#5B34FF] text-[11px] font-semibold">~{Math.round(totalFinalSeconds(hero))}s reel</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); openReel(hero); }}
                    className="mt-3.5 inline-flex items-center justify-center gap-2 h-[44px] w-full rounded-[13px] bg-[#5B34FF] text-white font-semibold text-[14px] active:scale-[.975] transition"
                  >
                    <Play className="w-[15px] h-[15px]" fill="currentColor" />
                    Începe
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Recomandate pentru tine */}
          {carousel.length > 0 && (
            <>
              <div className="px-[22px]">
                <h2 className="font-display font-bold text-[17px] text-[#1F1F1F] mt-7 mb-3.5">Recomandate pentru tine</h2>
              </div>
              <div className="flex gap-3.5 overflow-x-auto px-[22px] pt-0.5 pb-1" style={{ scrollbarWidth: "none" }}>
                {carousel.map((t) => (
                  <article key={t.id} className="shrink-0 w-[156px] cursor-pointer" onClick={() => openReel(t)}>
                    <div className="relative w-[156px] h-[244px]">
                      <div
                        className="w-[156px] h-[244px] rounded-2xl bg-cover bg-center bg-[#EDE8FF]"
                        style={{ backgroundImage: `url(${t.cover})` }}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleSave(t.id); }}
                        aria-label="Salvează"
                        className="absolute right-[9px] bottom-[9px] w-7 h-7 grid place-items-center rounded-[9px] bg-white/80 backdrop-blur shadow-[0_2px_8px_rgba(0,0,0,.12)] transition"
                        style={{ color: saved[t.id] ? "#5B34FF" : "#1F1F1F" }}
                      >
                        <Bookmark className="w-[15px] h-[15px]" fill={saved[t.id] ? "currentColor" : "none"} />
                      </button>
                    </div>
                    <h4 className="font-display font-bold text-[15px] leading-[1.15] text-[#1F1F1F] mt-2.5 line-clamp-2">
                      {t.title}
                    </h4>
                  </article>
                ))}
              </div>
            </>
          )}
        </div>

        <TabBar active="home" />
      </div>
    </PhoneShell>
  );
}
