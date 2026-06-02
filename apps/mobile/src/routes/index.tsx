/**
 * Home — landing screen.
 *
 * Structure (from Canva mockup):
 *   - Full-bleed background image
 *   - Header card with logo (champagne badge)
 *   - Title block over image: "Ce filmăm azi?" + subtitle
 *   - Glass cards: "Continuă" (if in-progress reel exists) + "Recomandat"
 *   - Big champagne CTA: "Începe reel nou"
 *   - Tab bar: Acasă / Salvate / Profil
 *
 * First-time users: CTA → /onboarding (profession picker)
 * Returning users: CTA → /catalog
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Search, Play } from "lucide-react";
import { useEffect, useState } from "react";
import { PhoneShell } from "@/components/PhoneShell";
import { StatusBar } from "@/components/StatusBar";
import { TabBar } from "@/components/TabBar";
import { playTap } from "@/lib/ui-sound";
import { light } from "@/lib/haptic";
import { getProfessionId } from "@/lib/profession";
import { ProfessionLabel } from "@/components/ProfessionLabel";
import { isOnboardingDone } from "@/lib/brand-store";
import { findInProgressReel } from "@/lib/clip-store";
import { getCategoriesForProfession } from "@/data/catalog";
import { useTemplates } from "@/data/templates-context";
import {
  shotCount,
  totalRecordingSeconds,
  totalFinalSeconds,
  type ReelTemplate,
} from "@/data/shots";
import { setSelectedIdeaId, getLastOpenedIdeaId } from "@/lib/selected-idea";
import logoUrl from "@/assets/logo-light.svg";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  const nav = useNavigate();
  const [inProgress, setInProgress] = useState<{
    template: ReelTemplate;
    sceneCount: number;
  } | null>(null);
  const [recommended, setRecommended] = useState<ReelTemplate | null>(null);

  // Categories for the active profession — shown as a horizontal carousel.
  const professionId = getProfessionId();
  const categories = professionId ? getCategoriesForProfession(professionId) : [];

  // Reactive list of templates (seed + Supabase, merges automatically).
  const allTemplates = useTemplates();
  const getTemplateById = (id: string) => allTemplates.find((t) => t.id === id);

  // First-time users haven't completed brand setup yet — send them to
  // onboarding first (brand is shared across professions, so it's the
  // foundation). After brand → profession picker → back to Home.
  useEffect(() => {
    if (!isOnboardingDone()) {
      void nav({ to: "/onboarding" });
    } else if (!getProfessionId()) {
      // Brand done but no profession for this session — pick one.
      void nav({ to: "/profession" });
    }
  }, [nav]);

  // Look for an in-progress reel OR a recently-opened template.
  // Show "Continuă" if EITHER:
  //   - the user has saved clips for a template (mid-filming)
  //   - the user opened a template recently but hasn't filmed yet
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

      // Fallback: no clips saved, but a template was opened recently.
      if (!templateForContinue) {
        const lastId = getLastOpenedIdeaId();
        if (lastId) {
          const t = getTemplateById(lastId);
          if (t) {
            templateForContinue = t;
            scenesDone = 0;
          }
        }
      }

      if (templateForContinue) {
        setInProgress({ template: templateForContinue, sceneCount: scenesDone });
      }

      // Daily rotation through templates. Same template every day for the
      // same user — feels intentional, not random.
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) /
          86400000,
      );
      const idx = dayOfYear % allTemplates.length;
      const rec = allTemplates[idx];
      // If the recommended is the one in progress, pick the next.
      if (templateForContinue && rec.id === templateForContinue.id) {
        setRecommended(
          allTemplates[(idx + 1) % allTemplates.length] ?? rec,
        );
      } else {
        setRecommended(rec);
      }
    })();
  }, [allTemplates]);

  const startNew = () => {
    light();
    playTap();
    // Onboarding is done by the time the user sees Home (see redirect above).
    nav({ to: "/" });
  };

  const continueReel = () => {
    if (!inProgress) return;
    light();
    playTap();
    setSelectedIdeaId(inProgress.template.id);
    nav({ to: "/film" });
  };

  const openRecommended = () => {
    if (!recommended) return;
    light();
    playTap();
    nav({ to: "/reel/$id", params: { id: recommended.id } });
  };

  return (
    <PhoneShell>
      {/* Flat midnight background — content does the talking, not decor.
          Subtle radial warm glow at top so the logo doesn't sit on pure
          black, but no full-bleed image or Ken Burns motion. */}
      <div className="absolute inset-0 z-0 bg-[#0a0c0f]" />
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 8%, rgba(232,213,181,0.08) 0%, transparent 45%)",
        }}
      />

      <div className="relative z-10 flex flex-col h-full pb-[88px]">
        <StatusBar />

        {/* Top bar — FREE badge left, logo center, search right.
            All three vertically centered on the same row, sized so the
            logo dominates but doesn't overflow the row. */}
        <div className="relative px-5 mt-8 flex items-center h-[72px]">
          {/* FREE badge — left */}
          <div className="inline-flex items-center px-3.5 h-9 rounded-full bg-[#E8D5B5]/15 border border-[#E8D5B5]/30">
            <span className="text-[11px] tracking-[0.18em] uppercase font-bold text-[#E8D5B5]">
              Free
            </span>
          </div>

          {/* Logo — centered, 72px height (matches header row) */}
          <img
            src={logoUrl}
            alt="Reel Coach"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[72px] w-auto"
            draggable={false}
          />

          {/* Search — right */}
          <button
            type="button"
            onClick={() => playTap()}
            className="ml-auto w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center active:scale-95 transition"
            aria-label="Caută"
          >
            <Search className="w-[18px] h-[18px] text-[#E8D5B5]" />
          </button>
        </div>

        {/* Profession context — quiet row under the header */}
        <div className="px-5 mt-3">
          <ProfessionLabel />
        </div>

        {/* Scrollable content — hero, Continuă (if exists), and the
            full grid of categories. Header + profession label above
            stay fixed; everything below scrolls together. */}
        <div className="px-5 mt-6 flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

          {/* Hero card — recommended template, big, with CTA on image */}
          {recommended && (
            <button
              onClick={openRecommended}
              className="relative w-full rounded-2xl overflow-hidden active:scale-[0.98] transition text-left"
              style={{ aspectRatio: "16 / 13" }}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${recommended.cover})` }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 0%, transparent 30%, rgba(10,12,15,0.75) 75%, rgba(10,12,15,0.98) 100%)",
                }}
              />

              {/* Badge — top left */}
              <div className="absolute top-3.5 left-3.5 bg-white/95 text-[#0F1419] text-[9px] font-bold tracking-[0.15em] uppercase px-2.5 py-1.5 rounded-full">
                Recomandat
              </div>

              {/* Content — bottom */}
              <div className="absolute left-3.5 right-3.5 bottom-3.5">
                <p className="section-head text-[22px] text-white leading-[1.05] mb-1">
                  {recommended.title}
                </p>
                <p className="text-[11.5px] text-white/65 mb-3 leading-snug">
                  {shotCount(recommended)} cadre · {Math.round(totalRecordingSeconds(recommended))}s filmare · ~{Math.round(totalFinalSeconds(recommended))}s reel
                </p>
                <div className="inline-flex items-center gap-1.5 bg-[#E8D5B5] text-[#0F1419] px-4 py-2 rounded-full text-[11.5px] font-bold tracking-[0.06em]">
                  <Play className="w-3 h-3 fill-current" />
                  Începe
                </div>
              </div>
            </button>
          )}

          {/* Continuă — appears between hero and grid only when reel in progress */}
          {inProgress && (
            <div className="mt-7">
              <p className="section-head text-[15px] text-white mb-2.5">Continuă</p>
              <button
                onClick={continueReel}
                className="w-full text-left bg-white/[0.04] border border-[#E8D5B5]/15 rounded-[14px] p-2.5 flex gap-2.5 items-center active:scale-[0.98] transition"
              >
                <div
                  className="w-12 h-12 rounded-[10px] shrink-0 bg-cover bg-center"
                  style={{ backgroundImage: `url(${inProgress.template.cover})` }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-white truncate">
                    {inProgress.template.title}
                  </p>
                  <p className="text-[10px] text-white/50 mt-0.5">
                    <span className="text-[#E8D5B5]">
                      {inProgress.sceneCount} din {shotCount(inProgress.template)} cadre
                    </span>
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#E8D5B5]/65 shrink-0" />
              </button>
            </div>
          )}

          {/* Explorează — 2-column grid, scrolls with the rest of the page. */}
          {categories.length > 0 && (
            <div className="mt-7 pb-6">
              <div className="flex items-baseline justify-between mb-2.5">
                <p className="section-head text-[15px] text-white">Explorează</p>
                <span className="text-[10px] tracking-[0.2em] uppercase text-[#E8D5B5]/55">
                  {categories.length} categorii
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      light();
                      playTap();
                      nav({ to: `/category/${cat.id}` });
                    }}
                    className="relative rounded-[14px] overflow-hidden active:scale-[0.97] transition"
                    style={{ aspectRatio: "4 / 5" }}
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${cat.cover ?? ""})` }}
                    />
                    <div
                      className="absolute inset-0"
                      style={{
                        background:
                          "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.85) 100%)",
                      }}
                    />
                    <span className="absolute inset-x-0 bottom-0 px-3 pb-2.5 text-left text-[13px] font-bold text-white leading-tight">
                      {cat.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <TabBar active="home" />
    </PhoneShell>
  );
}
