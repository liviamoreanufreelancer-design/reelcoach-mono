import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Camera, ChevronRight, AlignLeft, Repeat, Heart, Settings as SettingsIcon,
} from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { TabBar } from "@/components/TabBar";
import { useBrand } from "@/hooks/useBrand";
import { getProfessionId } from "@/lib/profession";
import { getProfession } from "@/data/scenarios";
import { listMyReels } from "@/lib/my-reels";
import { playTap } from "@/lib/ui-sound";
import { light } from "@/lib/haptic";

export const Route = createFileRoute("/profile")({
  component: ProfileScreen,
});

function ProfileScreen() {
  const nav = useNavigate();
  const { brand, logoUrl } = useBrand();
  const [stats, setStats] = useState<{ create: number; postate: number; ciorne: number } | null>(null);

  useEffect(() => {
    listMyReels().then((reels) => {
      setStats({
        create: reels.length,
        postate: reels.filter((r) => r.status === "posted").length,
        ciorne: reels.filter((r) => r.status === "draft").length,
      });
    });
  }, []);

  const name = brand?.name?.trim() || "Salonul tău";
  const handle = brand?.handle?.trim();
  const initial = (brand?.name?.trim()?.[0] ?? "S").toUpperCase();

  const profId = getProfessionId();
  const profLabel = profId ? getProfession(profId)?.label : null;

  const goto = (to: string) => {
    light();
    playTap();
    nav({ to });
  };

  return (
    <PhoneShell>
      <div className="flex flex-col h-full bg-[#F8F8FA] text-[#1F1F1F]">
        {/* Safe-area sus */}
        <div
          className="shrink-0"
          style={{ height: "max(env(safe-area-inset-top, 56px), 56px)" }}
        />

        {/* Header */}
        <header className="shrink-0 px-5 pt-1 pb-3">
          <h1 className="font-display font-bold text-[28px] leading-none">Profil</h1>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-5 pb-[100px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Cover + avatar */}
          <section className="bg-white rounded-[22px] border border-[#E6E6EA] overflow-hidden shadow-[0_1px_3px_rgba(20,20,40,0.04)]">
            <div className="relative h-[150px] bg-[#EDE8FF]">
              {logoUrl ? (
                <img alt="" className="w-full h-full object-cover" src={logoUrl} />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#EDE8FF] to-[#DCD3FF]" />
              )}
              <div className="absolute -bottom-9 left-4">
                <div className="relative">
                  <div className="w-[78px] h-[78px] rounded-full bg-[#EDE8FF] border-4 border-white flex items-center justify-center shadow-[0_2px_8px_rgba(20,20,40,0.12)]">
                    <span className="font-display font-bold text-[34px] text-[#5B34FF] leading-none">{initial}</span>
                  </div>
                  <button
                    onClick={() => goto("/settings/brand-edit")}
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#5B34FF] border-2 border-white flex items-center justify-center text-white shadow"
                    aria-label="Editează"
                  >
                    <Camera className="w-3 h-3" strokeWidth={2} />
                  </button>
                </div>
              </div>
            </div>
            <div className="pt-11 px-4 pb-4">
              <h2 className="font-display font-bold text-[22px] leading-none">{name}</h2>
              <div className="mt-1.5 flex items-center gap-2">
                {handle && <span className="text-[13.5px] text-[#6B6B6B]">@{handle}</span>}
                {profLabel && (
                  <span className="px-2.5 py-[3px] rounded-full bg-[#EDE8FF] text-[#5B34FF] text-[11px] font-semibold leading-none">
                    {profLabel}
                  </span>
                )}
              </div>
            </div>
          </section>

          {/* Abonament */}
          <section className="mt-4 bg-[#EDE8FF] rounded-[18px] p-4 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-[16px] leading-none">Plan Gratuit</p>
              <p className="mt-1.5 text-[12.5px] text-[#6B6B6B] leading-none">3 reeluri pe lună</p>
            </div>
            <button
              onClick={() => goto("/settings/subscription")}
              className="shrink-0 whitespace-nowrap flex items-center gap-1.5 bg-[#5B34FF] text-white text-[13px] font-semibold px-3.5 h-[40px] rounded-[13px] active:scale-[0.97] transition"
            >
              Vezi Premium <span className="text-[14px]">👑</span>
            </button>
          </section>

          {/* Statistici */}
          <section className="mt-4 bg-white rounded-[18px] border border-[#E6E6EA] py-5 flex items-stretch">
            <Stat num={stats ? String(stats.create) : "—"} label="Reeluri create" />
            <div className="w-px bg-[#E6E6EA] my-1" />
            <Stat num={stats ? String(stats.postate) : "—"} label="Postate" />
            <div className="w-px bg-[#E6E6EA] my-1" />
            <Stat num={stats ? String(stats.ciorne) : "—"} label="Ciorne" />
          </section>

          {/* Meniu */}
          <section className="mt-4 bg-white rounded-[18px] border border-[#E6E6EA] overflow-hidden divide-y divide-[#F0F0F3]">
            <Row icon={<AlignLeft className="w-[19px] h-[19px]" strokeWidth={1.7} />} label="Editează brand" onClick={() => goto("/settings/brand-edit")} />
            <Row icon={<Repeat className="w-[19px] h-[19px]" strokeWidth={1.7} />} label="Schimbă profesia" onClick={() => goto("/profession")} />
            <Row icon={<Heart className="w-[19px] h-[19px]" strokeWidth={1.7} />} label="Abonament" onClick={() => goto("/settings/subscription")} />
            <Row icon={<SettingsIcon className="w-[19px] h-[19px]" strokeWidth={1.7} />} label="Setări" onClick={() => goto("/settings")} />
          </section>
        </main>

        <TabBar active="profile" />
      </div>
    </PhoneShell>
  );
}

function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center">
      <span className="font-display font-bold text-[28px] leading-none tabular-nums">{num}</span>
      <span className="mt-1.5 text-[12px] leading-tight text-[#6B6B6B] text-center px-1">{label}</span>
    </div>
  );
}

function Row({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3.5 px-4 py-3.5 active:bg-[#F8F8FA] transition-colors">
      <span className="w-9 h-9 rounded-[11px] bg-[#EDE8FF] flex items-center justify-center text-[#5B34FF] shrink-0">
        {icon}
      </span>
      <span className="flex-1 text-left text-[15px] font-medium">{label}</span>
      <ChevronRight className="w-[18px] h-[18px] text-[#C4C4CC]" />
    </button>
  );
}
