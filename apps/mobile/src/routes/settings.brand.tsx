import { createFileRoute, Link } from "@tanstack/react-router";
import { PhoneShell } from "@/components/PhoneShell";
import { BackButton } from "@/components/BackButton";

export const Route = createFileRoute("/settings/brand")({
  component: BrandSettings,
});

function BrandSettings() {
  return (
    <PhoneShell>
      <div className="relative z-10 flex flex-col h-full px-6 pt-12 pb-6 bg-background">
        <div className="flex items-center justify-between">
          <BackButton />
          <span className="text-[10px] tracking-[0.4em] uppercase text-[#E8D5B5] font-semibold">
            Setări brand
          </span>
          <span className="w-10" />
        </div>
        <div className="mt-6 flex-1 flex items-center justify-center text-center">
          <div>
            <p className="text-white/70 text-sm">Editează logo, nume, culori și stilul brandului tău.</p>
            <Link
              to="/settings/brand-edit"
              className="mt-5 inline-flex h-12 px-6 rounded-full bg-gradient-to-r from-[#F4E4C1] via-[#E8D5B5] to-[#D4AF37] text-black text-sm font-semibold items-center"
            >
              Editează brand
            </Link>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
