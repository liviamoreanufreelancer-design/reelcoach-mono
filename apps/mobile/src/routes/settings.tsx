import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ChevronLeft, ChevronRight, Camera,
  Box, Briefcase, Crown, Bell, Info, Shield,
} from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { useBrand } from "@/hooks/useBrand";
import { getProfessionId } from "@/lib/profession";
import { getProfession } from "@/data/scenarios";
import { listMyReels } from "@/lib/my-reels";
import { playTap } from "@/lib/ui-sound";
import { light } from "@/lib/haptic";

export const Route = createFileRoute("/settings")({
  component: SettingsScreen,
});

function SettingsScreen() {
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

  const goto = (to: string) => { light(); playTap(); nav({ to }); };

  return (
    <PhoneShell>
      <div className="flex flex-col h-full bg-[#F8F8FA] text-[#1F1F1F]">
        <div className="shrink-0" style={{ height: "max(env(safe-area-inset-top, 56px), 56px)" }} />

        {/* Header cu buton inapoi */}
        <header className="shrink-0 flex items-center gap-3.5 px-[22px] pb-3">
          <button
            onClick={() => nav({ to: "/" })}
            aria-label="Înapoi"
            className="w-10 h-10 grid place-items-center rounded-full bg-white border border-[#E6E6EA] shadow-[0_4px_14px_-10px_rgba(40,24,110,0.3)] active:scale-95 transition"
          >
            <ChevronLeft className="w-[22px] h-[22px]" strokeWidth={2} />
          </button>
          <h1 className="font-display font-bold text-[27px] leading-none tracking-[0.2px]">Profil</h1>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* Card identitate: cover + avatar + nume */}
          <div className="px-[22px]">
            <section className="bg-white rounded-[22px] border border-[#E6E6EA] overflow-hidden shadow-[0_1px_3px_rgba(20,20,40,0.04)]">
              <div className="relative h-[130px] bg-[#EDE8FF]">
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
                      onClick={() => goto("/settings-brand-edit")}
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

            {/* Card abonament */}
            <section className="mt-4 bg-[#EDE8FF] rounded-[18px] p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-[16px] leading-none">Plan Gratuit</p>
                <p className="mt-1.5 text-[12.5px] text-[#6B6B6B] leading-none">3 reeluri pe lună</p>
              </div>
              <button
                onClick={() => goto("/settings-subscription")}
                className="shrink-0 whitespace-nowrap flex items-center gap-1.5 bg-[#5B34FF] text-white text-[13px] font-semibold px-3.5 h-[40px] rounded-[13px] active:scale-[0.97] transition"
              >
                Vezi Premium <span className="text-[14px]">👑</span>
              </button>
            </section>

            {/* Card statistici */}
            <section className="mt-4 bg-white rounded-[18px] border border-[#E6E6EA] py-5 flex items-stretch">
              <Stat num={stats ? String(stats.create) : "—"} label="Reeluri create" />
              <div className="w-px bg-[#E6E6EA] my-1" />
              <Stat num={stats ? String(stats.postate) : "—"} label="Postate" />
              <div className="w-px bg-[#E6E6EA] my-1" />
              <Stat num={stats ? String(stats.ciorne) : "—"} label="Ciorne" />
            </section>
          </div>

          {/* Grup Cont */}
          <Group title="Cont">
            <Row Icon={Box} label="Brand (logo, nume, culori)" onClick={() => goto("/settings-brand-edit")} />
            <Row Icon={Briefcase} label="Profesia" onClick={() => goto("/profession")} />
            <Row Icon={Crown} label="Abonament" last onClick={() => goto("/settings-subscription")} />
          </Group>

          {/* Grup Aplicație */}
          <Group title="Aplicație">
            <Row Icon={Bell} label="Notificări" onClick={() => goto("/settings")} />
            <Row Icon={Info} label="Despre ReelCoach" onClick={() => goto("/settings")} />
            <Row Icon={Shield} label="Termeni și confidențialitate" last onClick={() => goto("/settings")} />
          </Group>

          <div className="flex flex-col items-center mt-9 gap-2.5">
            <button className="font-semibold text-[15px] text-[#E5484D] active:opacity-60 transition">
              Deconectare
            </button>
            <span className="text-[12.5px] text-[#6B6B6B]/70">v1.0</span>
          </div>
        </div>
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

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-[22px] mt-6">
      <h2 className="font-bold text-[12px] tracking-[1.2px] uppercase text-[#6B6B6B] px-1 mb-2.5">{title}</h2>
      <div className="bg-white rounded-[18px] border border-[#E6E6EA] overflow-hidden shadow-[0_4px_18px_-14px_rgba(40,24,110,0.22)]">
        {children}
      </div>
    </section>
  );
}

function Row({ Icon, label, last, onClick }: { Icon: typeof Box; label: string; last?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3.5 px-4 h-[58px] text-left active:bg-[#F8F8FA] transition ${last ? "" : "border-b border-[#E6E6EA]"}`}
    >
      <span className="w-[38px] h-[38px] shrink-0 grid place-items-center rounded-[12px] bg-[#EDE8FF] text-[#5B34FF]">
        <Icon className="w-5 h-5" strokeWidth={1.8} />
      </span>
      <span className="flex-1 min-w-0 font-semibold text-[15px]">{label}</span>
      <ChevronRight className="w-[19px] h-[19px] text-[#6B6B6B]/55 shrink-0" strokeWidth={2} />
    </button>
  );
}
