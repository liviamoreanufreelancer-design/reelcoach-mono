import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { PhoneShell } from "@/components/PhoneShell";
import { PROFESSIONS, type Profession } from "@/data/scenarios";
import { setProfession } from "@/lib/profession";
import { setEquipment, type EquipmentId } from "@/lib/equipment";
import { markOnboardingDone } from "@/lib/brand-store";
import { light, success } from "@/lib/haptic";
import {
  ChevronLeft, ArrowRight, Check, Sparkles, Users, Film as FilmIcon,
  Sun, Lightbulb, Aperture, Camera,
} from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
});

/* ---------- date ---------- */

// Mapare specialitate -> Profession real. Imaginile sunt placeholder
// (Unsplash) — se inlocuiesc cu asset-uri locale ulterior.
const U = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;

const SPECIALTIES: { id: Profession; label: string; img: string; wide?: boolean }[] = [
  { id: "par",       label: "Păr",       img: U("1492106087820-71f1a00d2b11") },
  { id: "machiaj",   label: "Machiaj",   img: U("1596462502278-27bfdc403348") },
  { id: "gene",      label: "Gene",      img: U("1531746020798-e6953c6e8e04") },
  { id: "sprancene", label: "Sprâncene", img: U("1614283233556-f35b0c801ef1") },
  { id: "unghii",    label: "Unghii",    img: U("1522337660859-02fbefca4702"), wide: true },
];

const WELCOME_IMG = U("1562322140-8baeececf3df"); // placeholder pana la video

const SETUPS: { id: EquipmentId; label: string; note: string; Icon: typeof Sun }[] = [
  { id: "window", label: "Lumină naturală", note: "Lumină de la fereastră", Icon: Sun },
  { id: "ring",   label: "Ring light",      note: "Perfect pentru close-up", Icon: Aperture },
  { id: "led",    label: "Becuri LED",      note: "Lumină controlată",       Icon: Lightbulb },
  { id: "studio", label: "Setup studio",    note: "Setup profesional",       Icon: Camera },
];

const PERKS = [
  "Ghidaj pas cu pas la filmare",
  "Poziții de lumină și cameră",
  "Montaj de reel profesional",
  "Postezi cu încredere",
];

const TOTAL = 4;

/* ---------- ecran principal ---------- */

function Onboarding() {
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [anim, setAnim] = useState(0);
  const [specialty, setSpecialty] = useState<Profession>("par");
  const [setups, setSetups] = useState<EquipmentId[]>(["window"]);

  const toggleSetup = (id: EquipmentId) =>
    setSetups((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const go = useCallback((n: number) => {
    light();
    setAnim((a) => a + 1);
    setStep(n);
  }, []);
  const next = () => go(Math.min(step + 1, TOTAL - 1));
  const back = () => {
    if (step === 0) return;
    go(Math.max(step - 1, 0));
  };

  const finish = () => {
    success();
    setProfession(specialty);
    setEquipment(setups);
    markOnboardingDone();
    nav({ to: "/" });
  };

  const onCta = step === TOTAL - 1 ? finish : next;
  const ctaLabel = step === TOTAL - 1 ? "Începe" : "Continuă";

  return (
    <PhoneShell>
      <div className="flex flex-col h-full bg-white">
        <div key={anim} className="flex-1 min-h-0 flex flex-col animate-fade-in">
          {step === 0 ? (
            <ScreenWelcome />
          ) : (
            <>
              <div
                className="shrink-0"
                style={{ height: "max(env(safe-area-inset-top, 56px), 56px)" }}
              />
              <NavBar step={step} onBack={back} />
              {step === 1 && <ScreenSpecialty value={specialty} onChange={setSpecialty} />}
              {step === 2 && <ScreenSetup value={setups} onToggle={toggleSetup} />}
              {step === 3 && <ScreenDone />}
            </>
          )}
        </div>
        <CTA label={ctaLabel} onCta={onCta} />
      </div>
    </PhoneShell>
  );
}

/* ---------- componente comune ---------- */

function NavBar({ step, onBack }: { step: number; onBack: () => void }) {
  return (
    <div className="shrink-0 px-5 flex items-center justify-between">
      <button
        onClick={onBack}
        className="grid place-items-center w-10 h-10 -ml-2 rounded-full text-[#1F1F1F] active:bg-black/5 transition"
        aria-label="Înapoi"
      >
        <ChevronLeft className="w-6 h-6" strokeWidth={2} />
      </button>
      <span className="text-[#6B6B6B] text-[15px] font-semibold tabular-nums tracking-wide">
        {step + 1} / {TOTAL}
      </span>
    </div>
  );
}

function CTA({ label, onCta }: { label: string; onCta: () => void }) {
  return (
    <div
      className="shrink-0 px-[22px] pt-3.5"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom, 22px), 22px)" }}
    >
      <button
        onClick={onCta}
        className="w-full h-[58px] rounded-[16px] bg-[#5B34FF] text-white font-semibold text-[16px] tracking-tight flex items-center justify-center relative shadow-[0_12px_26px_-10px_rgba(91,52,255,0.7)] active:scale-[0.985] transition"
      >
        <span>{label}</span>
        <span className="absolute right-5">
          <ArrowRight className="w-5 h-5" strokeWidth={2} />
        </span>
      </button>
    </div>
  );
}

function Heading({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <h1 className={`font-display font-bold text-[#1F1F1F] text-[29px] leading-[1.1] tracking-[-0.01em] ${className}`}>
      {children}
    </h1>
  );
}

function Para({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-[#6B6B6B] text-[15px] leading-[1.45] mt-2 ${className}`}>{children}</p>;
}

/* ---------- ecran 1: Welcome ---------- */

function ScreenWelcome() {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* TODO: aici vine VIDEO-ul de intro. Acum = poster placeholder. */}
      <div className="relative w-full flex-1 min-h-[320px]">
        <img src={WELCOME_IMG} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/45 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent pointer-events-none" />
        <div
          className="absolute left-5 flex items-center gap-2 text-white"
          style={{ top: "max(env(safe-area-inset-top, 56px), 56px)" }}
        >
          <span className="text-[#5B34FF]"><Sparkles className="w-[22px] h-[22px]" /></span>
          <div className="font-display font-extrabold leading-[0.84] text-[20px] tracking-tight">
            <div>REEL</div>
            <div className="text-[#5B34FF]">COACH</div>
          </div>
        </div>
      </div>

      <div className="shrink-0 flex flex-col bg-white -mt-6 rounded-t-[28px] relative z-10 px-6 pt-7 pb-1">
        <Heading className="text-[31px]">
          Creează conținut<br />beauty <span className="text-[#5B34FF]">mai bun.</span>
        </Heading>
        <Para>Învață exact cum filmează top creatorii beauty reels-urile lor.</Para>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <StatCard Icon={Users} number="256" label="Creatori" />
          <StatCard Icon={FilmIcon} number="600+" label="Reeluri create" />
        </div>
      </div>
    </div>
  );
}

function StatCard({ Icon, number, label }: { Icon: typeof Users; number: string; label: string }) {
  return (
    <div className="rounded-[16px] bg-[#F8F8FA] border border-[#E6E6EA] px-4 py-3.5">
      <span className="text-[#5B34FF]"><Icon className="w-5 h-5" /></span>
      <div className="mt-2 font-display font-extrabold text-[#1F1F1F] text-[22px] leading-none tabular-nums">{number}</div>
      <div className="text-[#6B6B6B] text-[12.5px] mt-1">{label}</div>
    </div>
  );
}

/* ---------- ecran 2: Specialitate ---------- */

function ScreenSpecialty({ value, onChange }: { value: Profession; onChange: (p: Profession) => void }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col px-6 pt-3">
      <Heading>
        Alege-ți<br /><span className="text-[#5B34FF]">specialitatea</span>
      </Heading>
      <Para>Personalizăm conținutul pentru munca ta.</Para>
      <div className="mt-5 grid grid-cols-2 gap-3">
        {SPECIALTIES.map((s) => (
          <SpecialtyCard
            key={s.id}
            label={s.label}
            img={s.img}
            wide={s.wide}
            on={value === s.id}
            onClick={() => { light(); onChange(s.id); }}
          />
        ))}
      </div>
    </div>
  );
}

function SpecialtyCard({
  label, img, wide, on, onClick,
}: { label: string; img: string; wide?: boolean; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative rounded-[18px] overflow-hidden border-2 bg-white flex flex-col transition active:scale-[0.98] ${
        on ? "border-[#5B34FF]" : "border-[#E6E6EA]"
      } ${wide ? "col-span-2" : ""}`}
    >
      <div className="relative w-full" style={{ aspectRatio: wide ? "16 / 7" : "5 / 4" }}>
        <img src={img} alt={label} className="absolute inset-0 w-full h-full object-cover" />
        {on && (
          <span className="absolute top-2.5 right-2.5 grid place-items-center w-6 h-6 rounded-full bg-[#5B34FF] text-white shadow-md">
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
          </span>
        )}
      </div>
      <div className={`py-2.5 text-center font-display font-semibold text-[16px] ${on ? "text-[#5B34FF]" : "text-[#1F1F1F]"}`}>
        {label}
      </div>
    </button>
  );
}

/* ---------- ecran 3: Echipament ---------- */

function ScreenSetup({ value, onToggle }: { value: EquipmentId[]; onToggle: (id: EquipmentId) => void }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col px-6 pt-3">
      <Heading>
        Ce <span className="text-[#5B34FF]">echipament</span> ai?
      </Heading>
      <Para>Bifează tot ce ai — adaptăm ghidul la echipamentul tău.</Para>
      <div className="mt-5 mb-1 flex-1 min-h-0 flex flex-col gap-3">
        {SETUPS.map(({ id, label, note, Icon }) => {
          const on = value.includes(id);
          return (
            <button
              key={id}
              onClick={() => { light(); onToggle(id); }}
              className={`relative flex-1 min-h-[70px] flex items-center gap-4 rounded-[18px] px-4 border-2 transition active:scale-[0.99] ${
                on ? "border-[#5B34FF] bg-[#EDE8FF]" : "border-[#E6E6EA] bg-white"
              }`}
            >
              <span className="grid place-items-center w-9 h-9 shrink-0 text-[#5B34FF]">
                <Icon className="w-7 h-7" strokeWidth={1.7} />
              </span>
              <div className="flex-1 text-left">
                <div className="font-display font-semibold text-[17px] text-[#1F1F1F] leading-tight">{label}</div>
                <div className="text-[#6B6B6B] text-[13.5px] mt-0.5">{note}</div>
              </div>
              <span
                className={`grid place-items-center w-6 h-6 rounded-[7px] shrink-0 transition-colors ${
                  on ? "bg-[#5B34FF] text-white" : "border-2 border-[#E6E6EA] text-transparent"
                }`}
              >
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- ecran 4: Gata ---------- */

function ScreenDone() {
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center px-6 pt-3 text-center">
      <div className="grid place-items-center w-[76px] h-[76px] rounded-full bg-[#EDE8FF] text-[#5B34FF]">
        <Sparkles className="w-[34px] h-[34px]" />
      </div>
      <Heading className="mt-4">
        Ești <span className="text-[#5B34FF]">gata!</span>
      </Heading>
      <Para className="max-w-[17rem]">Hai să creăm conținut care aduce mai mulți clienți.</Para>

      <div className="flex-1" />

      <div className="w-full flex flex-col gap-3.5 pb-2">
        {PERKS.map((p) => (
          <div key={p} className="flex items-center gap-3 text-left">
            <span className="grid place-items-center w-[22px] h-[22px] rounded-full bg-[#5B34FF] text-white shrink-0">
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            </span>
            <span className="text-[#1F1F1F] text-[15px] font-medium">{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
