import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { CinematicBg } from "@/components/CinematicBg";
import { PhoneShell } from "@/components/PhoneShell";
import bg from "@/assets/par-cat/stock/before-after.jpg";

export const Route = createFileRoute("/editing")({
  component: Editing,
});

function Editing() {
  const nav = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => nav({ to: "/edit" }), 4800);
    return () => clearTimeout(t);
  }, [nav]);

  return (
    <PhoneShell>
      <CinematicBg src={bg} blur overlay={0.8} kenBurns={false} />

      {/* Soft warm glow behind the title. */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 42%, rgba(232,213,181,0.10) 0%, rgba(232,213,181,0) 55%)",
        }}
      />

      <div className="relative z-10 h-full flex flex-col">
        {/* Concentric breathing rings — calm, premium presence. */}
        <div className="flex justify-center" style={{ marginTop: "22%" }}>
          <div className="relative w-[72px] h-[72px]">
            <span
              className="absolute inset-0 rounded-full border border-[#E8D5B5]/25"
              style={{ animation: "breathe 3s ease-in-out infinite" }}
            />
            <span
              className="absolute inset-[14px] rounded-full border border-[#E8D5B5]/45"
              style={{ animation: "breathe 3s ease-in-out infinite 0.5s" }}
            />
            <span
              className="absolute inset-[28px] rounded-full bg-[#E8D5B5]"
              style={{ opacity: 0.7 }}
            />
          </div>
        </div>

        {/* Step kicker + two-line serif title — single dominant element. */}
        <div className="flex flex-col items-center text-center px-7 mt-14">
          <p className="text-[10px] tracking-[0.4em] uppercase text-[#E8D5B5]/65 font-medium">
            Pasul · 02
          </p>
          <h1
            className="font-editorial text-white mt-5"
            style={{ fontSize: "34px", lineHeight: 1.05, letterSpacing: "-0.02em" }}
          >
            E timpul să
          </h1>
          <h1
            className="font-editorial italic text-[#E8D5B5] mt-1"
            style={{ fontSize: "34px", lineHeight: 1.05, letterSpacing: "-0.02em" }}
          >
            edităm
          </h1>
        </div>

        {/* Lower third: thin shimmer line. */}
        <div className="mt-auto flex flex-col items-center pb-20">
          <div className="relative w-[44%] h-px bg-[#E8D5B5]/10 overflow-hidden rounded-full">
            <div
              className="absolute inset-y-0 w-1/2"
              style={{
                background:
                  "linear-gradient(90deg, transparent, #E8D5B5, transparent)",
                animation: "shimmer-line 2.4s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1);    opacity: 0.55; }
          50%      { transform: scale(1.08); opacity: 0.95; }
        }
        @keyframes shimmer-line {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(220%); }
        }
      `}</style>
    </PhoneShell>
  );
}
