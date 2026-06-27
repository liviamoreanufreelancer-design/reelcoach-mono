/**
 * Templates list for a single category.
 *
 * Route: /category/$id
 * Reached from Home → tap on a category card.
 *
 * Layout: category title at top, then a single-column scrollable list of
 * large template cards (16:13 aspect, same height as Home's hero card).
 * Each card shows a representative image + title + description.
 * Tap a card → /reel/$id (preview screen with example video + Filmează).
 */

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { BackButton } from "@/components/BackButton";
import { getCategory } from "@/data/catalog";
import { useTemplatesForCategory } from "@/data/templates-context";
import { playSelect } from "@/lib/ui-sound";
import { light } from "@/lib/haptic";

export const Route = createFileRoute("/category/$id")({
  component: CategoryTemplates,
});

function CategoryTemplates() {
  const { id } = Route.useParams();
  const nav = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (!ready) return <PhoneShell><div /></PhoneShell>;

  const category = getCategory(id);
  const templates = useTemplatesForCategory(id);

  if (!category) {
    return (
      <PhoneShell>
        <div className="absolute inset-0 bg-[#0a0c0f]" />
        <div className="relative z-10 flex flex-col h-full px-5 pt-12 pb-6">
          <BackButton to="/" />
          <div className="flex-1 flex items-center justify-center text-center">
            <p className="text-white/60">Categorie inexistentă.</p>
          </div>
        </div>
      </PhoneShell>
    );
  }

  const pick = (templateId: string) => {
    playSelect();
    light();
    nav({ to: "/reel/$id", params: { id: templateId } });
  };

  return (
    <PhoneShell>
      {/* Flat midnight background — content does the talking */}
      <div className="absolute inset-0 z-0 bg-[#0a0c0f]" />
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 8%, rgba(232,213,181,0.08) 0%, transparent 45%)",
        }}
      />

      <div className="relative z-10 flex flex-col h-full pt-12 pb-6">
        {/* Header — back + category label */}
        <div className="flex items-center justify-between px-5">
          <BackButton to="/" />
          <span className="text-[10px] tracking-[0.4em] uppercase text-[#EDE8FF] font-semibold">
            {category.label}
          </span>
          <span className="w-10" />
        </div>

        {/* Title block */}
        <div className="px-5 mt-8 mb-5">
          <p className="text-[10px] tracking-[0.32em] uppercase text-[#EDE8FF]/70 mb-2">
            Idei de reel
          </p>
          <h1 className="h1-lux text-[36px] text-white">{category.label}</h1>
          <p className="section-sub mt-2 text-sm max-w-[20rem]">
            {category.blurb}
          </p>
        </div>

        {/* Scrollable list of reel cards */}
        <div className="flex-1 overflow-y-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {templates.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center px-4 py-12">
              <div className="w-14 h-14 rounded-full bg-[#5B34FF]/10 border border-[#5B34FF]/20 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-[#EDE8FF]" />
              </div>
              <p className="text-[14px] text-white/70 leading-snug max-w-[16rem]">
                Idei pentru {category.label.toLowerCase()} vin în curând.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => pick(t.id)}
                  className="relative w-full rounded-2xl overflow-hidden active:scale-[0.98] transition text-left"
                  style={{ aspectRatio: "16 / 13" }}
                >
                  {/* Cover image */}
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${t.cover})` }}
                  />
                  {/* Gradient for legibility */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, transparent 0%, transparent 35%, rgba(10,12,15,0.75) 75%, rgba(10,12,15,0.98) 100%)",
                    }}
                  />
                  {/* Title + description */}
                  <div className="absolute left-4 right-4 bottom-4">
                    <p className="section-head text-[20px] text-white leading-tight mb-1.5">
                      {t.title}
                    </p>
                    <p className="text-[12px] text-white/65 leading-snug line-clamp-2">
                      {t.promise}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </PhoneShell>
  );
}
