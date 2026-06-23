import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronLeft, Check } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";

export const Route = createFileRoute("/settings-subscription")({
  component: SubscriptionScreen,
});

const PLANS = [
  {
    name: "Gratuit",
    price: "0 lei",
    period: "/lună",
    benefits: ["3 reeluri pe lună", "Toate template-urile de bază"],
  },
  {
    name: "Pro",
    price: "49 lei",
    period: "/lună",
    recommended: true,
    benefits: ["Reeluri nelimitate", "Template-uri premium", "Fără watermark"],
  },
  {
    name: "Studio",
    price: "99 lei",
    period: "/lună",
    benefits: ["Tot ce include Pro", "Branding complet", "Suport prioritar", "Acces timpuriu la funcții noi"],
  },
];

function SubscriptionScreen() {
  const nav = useNavigate();
  return (
    <PhoneShell>
      <div className="flex flex-col h-full bg-[#F8F8FA] text-[#1F1F1F]">
        <div className="shrink-0" style={{ height: "max(env(safe-area-inset-top, 56px), 56px)" }} />

        <header className="shrink-0 flex items-center gap-3.5 px-[22px] pb-3">
          <button
            onClick={() => nav({ to: "/settings" })}
            aria-label="Înapoi"
            className="w-10 h-10 grid place-items-center rounded-full bg-white border border-[#E6E6EA] shadow-[0_4px_14px_-10px_rgba(40,24,110,0.3)] active:scale-95 transition"
          >
            <ChevronLeft className="w-[22px] h-[22px]" strokeWidth={2} />
          </button>
          <h1 className="font-display font-bold text-[27px] leading-none tracking-[0.2px]">Abonament</h1>
        </header>

        <div className="flex-1 overflow-y-auto overflow-x-hidden px-[22px] pb-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <h2 className="font-display font-bold text-[30px] leading-[1.05] tracking-[0.2px] mt-1">Alege planul tău</h2>
          <p className="text-[15px] text-[#6B6B6B] mt-2">Mai multe reeluri, mai mulți clienți.</p>

          <div className="flex flex-col gap-5 mt-6">
            {PLANS.map((p) => (
              <PlanCard key={p.name} {...p} />
            ))}
          </div>

          <p className="text-[12px] leading-[1.5] text-[#6B6B6B]/80 text-center mt-7">
            Plățile se reînnoiesc automat. Anulează oricând.
          </p>
          <div className="flex justify-center mt-2">
            <button className="font-semibold text-[13px] text-[#5B34FF] underline underline-offset-2 active:opacity-60 transition">
              Restituie achizițiile
            </button>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

function PlanCard({
  name, price, period, benefits, recommended,
}: { name: string; price: string; period: string; benefits: string[]; recommended?: boolean }) {
  return (
    <div
      className={`relative bg-white rounded-[20px] p-5 ${
        recommended
          ? "border-2 border-[#5B34FF] shadow-[0_14px_34px_-18px_rgba(91,52,255,0.5)]"
          : "border border-[#E6E6EA] shadow-[0_4px_18px_-14px_rgba(40,24,110,0.22)]"
      }`}
    >
      {recommended && (
        <span className="absolute -top-3 right-5 px-3 py-1 rounded-full bg-[#F5B228] text-[#1F1F1F] font-bold text-[11px] tracking-[0.3px] shadow-[0_4px_10px_-4px_rgba(245,178,40,0.7)]">
          Recomandat
        </span>
      )}

      <span className="font-display font-bold text-[15px] tracking-[1.5px] uppercase">{name}</span>

      <div className="flex items-baseline gap-1.5 mt-2">
        <span className="font-display font-bold text-[34px] leading-none">{price}</span>
        <span className="text-[14px] text-[#6B6B6B]">{period}</span>
      </div>

      <ul className="flex flex-col gap-2.5 mt-4">
        {benefits.map((b, i) => (
          <li key={i} className="flex items-start gap-2.5">
            <span className="mt-[2px] w-[18px] h-[18px] shrink-0 grid place-items-center rounded-full bg-[#EDE8FF] text-[#5B34FF]">
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
            </span>
            <span className="text-[13.5px] leading-[1.35] text-[#6B6B6B]">{b}</span>
          </li>
        ))}
      </ul>

      <button
        className={`w-full h-[48px] rounded-[14px] mt-5 font-bold text-[15px] active:scale-[0.98] transition ${
          recommended
            ? "bg-[#5B34FF] text-white shadow-[0_10px_22px_-12px_rgba(91,52,255,0.8)]"
            : "bg-white text-[#5B34FF] border-[1.5px] border-[#5B34FF]"
        }`}
      >
        Alege
      </button>
    </div>
  );
}
