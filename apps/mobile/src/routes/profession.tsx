import { createFileRoute, useNavigate, useRouter} from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, Check } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { PROFESSIONS, type Profession } from "@/data/scenarios";
import { setProfession, getProfessionId } from "@/lib/profession";
import { light, success } from "@/lib/haptic";
import { playTap } from "@/lib/ui-sound";

export const Route = createFileRoute("/profession")({
  component: ProfessionPicker,
});

// Imagini placeholder (Unsplash) — se inlocuiesc cu asset-uri locale.
const U = (id: string) => `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;
const PROF_IMG: Record<Profession, string> = {
  par: U("1492106087820-71f1a00d2b11"),
  machiaj: U("1596462502278-27bfdc403348"),
  gene: U("1531746020798-e6953c6e8e04"),
  sprancene: U("1614283233556-f35b0c801ef1"),
  unghii: U("1522337660859-02fbefca4702"),
};
// Pe care le aratam late (par primul, lat).
const WIDE: Partial<Record<Profession, boolean>> = { par: true };

function ProfessionPicker() {
  const nav = useNavigate();
  const router = useRouter();
  const [sel, setSel] = useState<Profession>(() => getProfessionId() ?? "par");

  const goBack = () => {
    if (router.history.canGoBack()) router.history.back();
    else nav({ to: "/" });
  };
  const save = () => {
    success();
    setProfession(sel);
    goBack();
  };

  return (
    <PhoneShell>
      <div className="flex flex-col h-full bg-[#F8F8FA] text-[#1F1F1F]">
        <div className="shrink-0" style={{ height: "max(env(safe-area-inset-top, 56px), 56px)" }} />

        <header className="shrink-0 flex items-center gap-3.5 px-[22px] pb-3">
          <button
            onClick={goBack}
            aria-label="Înapoi"
            className="w-10 h-10 grid place-items-center rounded-full bg-white border border-[#E6E6EA] shadow-[0_4px_14px_-10px_rgba(40,24,110,0.3)] active:scale-95 transition"
          >
            <ChevronLeft className="w-[22px] h-[22px]" strokeWidth={2} />
          </button>
          <span className="font-bold text-[12px] tracking-[1.5px] uppercase text-[#5B34FF]">Astăzi filmezi</span>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-[22px] pb-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <h2 className="font-display font-bold text-[30px] leading-[1.05] mt-1">Alege profesia</h2>

          <div className="grid grid-cols-2 gap-3.5 mt-5">
            {PROFESSIONS.map((p) => {
              const selected = sel === p.id;
              const wide = WIDE[p.id];
              return (
                <button
                  key={p.id}
                  onClick={() => { light(); playTap(); setSel(p.id); }}
                  className={`relative text-left rounded-[18px] overflow-hidden bg-white transition active:scale-[0.98] ${
                    wide ? "col-span-2" : ""
                  } ${selected ? "ring-2 ring-[#5B34FF]" : "ring-1 ring-[#E6E6EA]"}`}
                >
                  <div className={`relative w-full ${wide ? "aspect-[12/5]" : "aspect-[5/4]"}`}>
                    <img src={PROF_IMG[p.id]} alt={p.label} className="absolute inset-0 w-full h-full object-cover" />
                    {selected && (
                      <span className="absolute top-2.5 right-2.5 z-10 w-[26px] h-[26px] rounded-full bg-[#5B34FF] text-white grid place-items-center shadow-[0_4px_10px_-3px_rgba(91,52,255,0.8)]">
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className={`px-3.5 py-3 ${selected ? "bg-[#EDE8FF]" : "bg-white"}`}>
                    <span className="font-display font-bold text-[16px]">{p.label}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-[13px] text-[#6B6B6B] text-center mt-5">Poți schimba oricând.</p>
        </div>

        <div
          className="shrink-0 px-[22px] pt-3 bg-[#F8F8FA] border-t border-[#E6E6EA]/70"
          style={{ paddingBottom: "max(env(safe-area-inset-bottom, 28px), 28px)" }}
        >
          <button
            onClick={save}
            className="w-full h-[58px] rounded-[16px] bg-[#5B34FF] text-white font-bold text-[16px] shadow-[0_12px_26px_-12px_rgba(91,52,255,0.8)] active:scale-[0.98] transition"
          >
            Salvează
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
