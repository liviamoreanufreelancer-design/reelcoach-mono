import { createFileRoute, Link } from "@tanstack/react-router";
import { User, ArrowLeft } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { StatusBar } from "@/components/StatusBar";
import { TabBar } from "@/components/TabBar";
import { CinematicBg } from "@/components/CinematicBg";
import intro from "@/assets/salon-intro.jpg";

export const Route = createFileRoute("/profile")({
  component: ProfileScreen,
});

function ProfileScreen() {
  return (
    <PhoneShell>
      <CinematicBg src={intro} overlay={0.85} />
      <div className="relative z-10 flex flex-col h-full px-7 pb-[100px]">
        <StatusBar />

        <div className="mt-6 flex items-center justify-between">
          <Link
            to="/"
            className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md border border-white/15 flex items-center justify-center text-white/85 active:scale-95"
            aria-label="Înapoi"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <p className="text-[11px] tracking-[0.3em] uppercase text-[#E8D5B5]/85 font-medium">
            Profil
          </p>
          <div className="w-9" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <div className="w-16 h-16 rounded-full bg-[#E8D5B5]/10 border border-[#E8D5B5]/20 flex items-center justify-center mb-5">
            <User className="w-7 h-7 text-[#E8D5B5]" />
          </div>
          <h1 className="font-editorial text-[26px] text-[#F4E4C1] leading-tight">
            În curând
          </h1>
          <p className="text-white/60 text-sm leading-relaxed mt-3 max-w-[18rem]">
            Aici vei vedea reel-urile pe care le-ai creat și statisticile
            tale de filmare.
          </p>
        </div>
      </div>
      <TabBar active="profile" />
    </PhoneShell>
  );
}
