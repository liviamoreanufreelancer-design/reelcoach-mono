"use client";
/**
 * DerivedShotList — ce ar filma stilista, dedus din variantele construite.
 *
 * Deocamdată DOAR SE AFIȘEAZĂ. Nimic nu se salvează, nimic nu se șterge. E
 * pasul care verifică ipoteza înainte s-o construim: dacă lista arată corect
 * pe variante reale, inversarea direcției e validă; dacă iese ciudată — cadre
 * duplicate, durate care nu se potrivesc — aflăm la o oră de lucru, nu după o
 * migrație care atinge tot.
 *
 * Ce se vede aici e și ce LIPSEȘTE: ordinea de filmare, ce se capturează și
 * instrucțiunile nu se pot deduce din variante, fiindcă sunt proprietăți ale
 * tipului de cadru. Lista le arată prin absență — ăsta e argumentul cel mai
 * concret pentru catalogul global de tipuri de cadru.
 */
import { Camera, Clock } from "lucide-react";
import { deriveShots, estimateFilmingMinutes } from "@/lib/derive-shots";
import type { ReelDesignRow } from "@/lib/db-types";

export default function DerivedShotList({ designs }: { designs: ReelDesignRow[] }) {
  const shots = deriveShots(designs);
  if (shots.length === 0) return null;

  const minutes = estimateFilmingMinutes(shots);
  const single = shots.filter((s) => s.usedBy === 1).length;

  return (
    <section className="card px-5 py-5 mt-2">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
        <h2 className="text-[15px] font-semibold text-[#1F1F1F]">
          Ce ar filma stilista
        </h2>
        <span className="text-[12px] text-[#9A9A9A] inline-flex items-center gap-1.5">
          <Camera className="w-3.5 h-3.5" />
          {shots.length} {shots.length === 1 ? "moment" : "momente"}
          <span className="w-1 h-1 rounded-full bg-[#D8D0F5]" />
          <Clock className="w-3.5 h-3.5" />~{minutes} min
        </span>
      </div>
      <p className="text-[12.5px] text-[#6B6B6B] leading-relaxed mb-4 max-w-[620px]">
        Lista nu e scrisă, e dedusă din {designs.length}{" "}
        {designs.length === 1 ? "variantă" : "variante"}. Un moment intră aici
        pentru că îl cere cel puțin o variantă — deci nu se poate filma degeaba,
        și nu poate lipsi ceva ce o variantă folosește.
      </p>

      <div className="flex flex-col gap-1.5">
        {shots.map((s, i) => (
          <div
            key={s.slot}
            className="flex items-center gap-3 rounded-lg border border-[#E7E3F5] bg-white px-3 py-2"
          >
            <span className="text-[10px] text-[#9A9A9A] tabular-nums w-4">{i + 1}</span>
            <span className="flex-1 min-w-0 text-[13px] text-[#1F1F1F] truncate">
              {s.label}
            </span>
            <span
              title={`Filmează ${s.maxSec}s — cât cere varianta cea mai pretențioasă. Fiecare variantă taie din el cât îi trebuie.`}
              className="text-[11.5px] text-[#6B6B6B] tabular-nums shrink-0"
            >
              {s.maxSec}s
            </span>
            <span
              title={s.designs.join(" · ")}
              className={`text-[10.5px] shrink-0 px-2 py-0.5 rounded-full ${
                s.usedBy > 1
                  ? "bg-[#EDE8FF] text-[#5B34FF]"
                  : "bg-[#F4F4F6] text-[#9A9A9A]"
              }`}
            >
              {s.usedBy === 1 ? "1 variantă" : `${s.usedBy} variante`}
            </span>
          </div>
        ))}
      </div>

      {single > 0 && (
        <p className="text-[11.5px] text-[#9A9A9A] mt-3 leading-relaxed">
          {single} {single === 1 ? "moment e folosit" : "momente sunt folosite"} de o
          singură variantă. Nu e greșit — dar dacă stilista îl filmează și nu
          alege varianta aia, efortul se pierde.
        </p>
      )}

      <p className="text-[11.5px] text-[#9A9A9A] mt-4 pt-3 border-t border-[#E7E3F5] leading-relaxed max-w-[620px]">
        Ce încă NU se poate deduce: ordinea de filmare (e ordinea serviciului,
        nu a unei variante), ce se capturează — filmare sau poză — și
        instrucțiunile. Toate trei aparțin tipului de cadru, nu variantei care
        îl folosește.
      </p>
    </section>
  );
}
