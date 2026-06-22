import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Box, Briefcase, Crown, Bell, Info, Shield } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { playTap } from "@/lib/ui-sound";
import { light } from "@/lib/haptic";

export const Route = createFileRoute("/settings")({
  component: SettingsScreen,
});

function SettingsScreen() {
  const nav = useNavigate();
  const goto = (to: string) => { light(); playTap(); nav({ to }); };

  return (
    <PhoneShell>
      <div className="flex flex-col h-full bg-[#F8F8FA] text-[#1F1F1F]">
        <div className="shrink-0" style={{ height: "max(env(safe-area-inset-top, 56px), 56px)" }} />

        <header className="shrink-0 flex items-center gap-3.5 px-[22px] pb-3.5">
          <button
            onClick={() => nav({ to: "/profile" })}
            aria-label="Înapoi"
            className="w-10 h-10 grid place-items-center rounded-full bg-white border border-[#E6E6EA] shadow-[0_4px_14px_-10px_rgba(40,24,110,0.3)] active:scale-95 transition"
          >
            <ChevronLeft className="w-[22px] h-[22px]" strokeWidth={2} />
          </button>
          <h1 className="font-display font-bold text-[27px] leading-none tracking-[0.2px]">Setări</h1>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <Group title="Cont">
            <Row Icon={Box} label="Brand (logo, nume, culori)" onClick={() => goto("/settings/brand-edit")} />
            <Row Icon={Briefcase} label="Profesia" onClick={() => goto("/profession")} />
            <Row Icon={Crown} label="Abonament" last onClick={() => goto("/settings/subscription")} />
          </Group>

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

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-[22px] mt-6 first:mt-1">
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
