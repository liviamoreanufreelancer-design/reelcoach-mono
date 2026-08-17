/**
 * SessionShotList — ce filmează stilista la serviciul ăsta.
 *
 * NU E UN EDITOR. E o listă.
 *
 * Înainte, pasul ăsta oferea zece controale — filtru, tranziție, viteză,
 * motion blur, text, copertă, încărcare de filmare — niciunul dintre care nu
 * mai avea efect aici. Stilul stă pe reel, textul pe momentul reelului,
 * filmarea de probă în Materiale, instrucțiunile în catalog. Două modele
 * coexistau în același ecran, iar partenera n-avea cum să ghicească ce contează.
 *
 * Acum sesiunea e exact ce e: CARE REZULTATE INTRĂ. Restul se deduce.
 *
 * ZERO SUPRASCRIERI, deliberat. Dacă un moment ar trebui filmat altfel la un
 * serviciu, nu e același moment — se desparte tipul (`before-păr` vs
 * `before-machiaj`), nu se suprascrie aici. Două locuri pentru același adevăr
 * înseamnă că peste șase luni nimeni nu mai știe care e cel viu.
 */
import Link from "next/link";
import { Video, Images, Camera, ExternalLink } from "lucide-react";
import type { ShotRow } from "@/lib/db-types";

const KIND = {
  video: { Icon: Video, label: "filmare" },
  photo: { Icon: Images, label: "poză" },
  both: { Icon: Camera, label: "filmare + poză" },
} as const;

export default function SessionShotList({ shots }: { shots: ShotRow[] }) {
  if (shots.length === 0) {
    return (
      <div className="card px-6 py-9 text-center">
        <p className="text-[14px] font-medium text-[#1F1F1F]">Nimic de filmat încă.</p>
        <p className="text-[13px] text-[#6B6B6B] mt-1.5 leading-relaxed max-w-[440px] mx-auto">
          Importă rezultate la pasul <strong>Rezultate</strong> — lista se
          completează singură din momentele pe care le cer.
        </p>
      </div>
    );
  }

  const totalSec = shots.reduce((s, x) => s + (x.recording_duration ?? 0), 0);
  const noHook = shots.filter((s) => !s.hook).length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[13px] text-[#6B6B6B] leading-relaxed max-w-[620px]">
        Lista nu se scrie — se deduce din rezultatele importate. Ordinea, durata
        și ce se capturează vin din ce cer ele. Instrucțiunile se schimbă în{" "}
        <Link href="/dashboard/momente" className="text-[#5B34FF] hover:underline">
          Momente
        </Link>
        , o singură dată pentru toate serviciile.
      </p>

      {noHook > 0 && (
        <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-snug">
          {noHook} {noHook === 1 ? "moment n-are" : "momente n-au"} instrucțiuni de
          filmare. Stilista le va vedea goale pe telefon — se completează în{" "}
          <Link href="/dashboard/momente" className="underline">Momente</Link>.
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        {shots.map((s, i) => {
          const kind = KIND[s.capture_kind] ?? KIND.video;
          return (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-lg border border-[#E7E3F5] bg-white px-3.5 py-2.5"
            >
              <span className="text-[10px] text-[#9A9A9A] tabular-nums w-4 shrink-0">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13.5px] text-[#1F1F1F] leading-tight truncate">
                  {s.title}
                </span>
                <span className="block text-[11.5px] text-[#9A9A9A] leading-tight mt-0.5 truncate">
                  {s.hook || "fără instrucțiuni"}
                </span>
              </span>
              <span
                title={kind.label}
                className="shrink-0 inline-flex items-center gap-1 text-[11px] text-[#6B6B6B]"
              >
                <kind.Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
                {kind.label}
              </span>
              <span className="shrink-0 text-[11.5px] text-[#6B6B6B] tabular-nums w-10 text-right">
                {s.recording_duration}s
              </span>
              <Link
                href="/dashboard/momente"
                aria-label={`Editează „${s.title}" în Momente`}
                title="Editează în Momente"
                className="shrink-0 text-[#C9C0E8] hover:text-[#5B34FF] transition"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          );
        })}
      </div>

      <p className="text-[11.5px] text-[#9A9A9A] leading-relaxed">
        {shots.length} {shots.length === 1 ? "moment" : "momente"} · ~
        {Math.max(1, Math.round(totalSec / 60 + shots.length * 0.4))} minute de
        filmare, răspândite pe durata serviciului.
      </p>
    </div>
  );
}
