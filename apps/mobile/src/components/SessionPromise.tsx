/**
 * SessionPromise — ce primești, înainte să începi.
 *
 * Cincisprezece secunde, înaintea oricărui efort. E pasul 2 din traseul
 * stilistei (CLAUDE.md, VIZIUNEA) și perechea ecranului de pachet: pachetul
 * arată ce a primit, ăsta îi spune de ce merită.
 *
 * Fără el, la momentul 6 din 8 — obosită, cu clienta vorbind — se întreabă ce
 * caută acolo. Motivația vine din raportul efort/rezultat arătat ÎNAINTE, nu
 * din nimic altceva.
 *
 * De asta rezultatul e uriaș pe ecran, iar efortul e o linie mică sub el.
 * Ordinea contează: mai întâi ce câștigă, apoi ce dă. Invers ar fi o listă de
 * sarcini. Postările se numesc pe nume — „Transformarea", „Procesul" — fiindcă
 * trei nume sunt concrete într-un fel în care „3 reeluri" nu e.
 *
 * Estimarea de timp e deliberat aproximativă (~), și deliberat generoasă:
 * ~30s per moment acoperă și așezatul telefonului, nu doar secundele filmate.
 * O estimare optimistă care se dovedește falsă costă mai mult decât una vagă.
 */
import { Film, Clock, Camera } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import type { Scenario } from "@/data/scenarios";

/** Secunde de om per moment: așezat telefonul, filmat, verificat. */
const SECONDS_PER_MOMENT = 30;

export function SessionPromise({
  scenario,
  onStart,
  onBack,
}: {
  scenario: Scenario;
  onStart: () => void;
  onBack: () => void;
}) {
  const moments = scenario.scenes.length;
  const reels = (scenario.outputs ?? []).filter((o) => o.kind === "reel");
  const minutes = Math.max(1, Math.round((moments * SECONDS_PER_MOMENT) / 60));

  return (
    <PhoneShell>
      <div className="absolute inset-0 bg-neutral-950 text-white overflow-hidden">
        {/* Coperta, estompata in fundal — atmosfera, nu informatie */}
        {scenario.image && (
          <>
            <img
              src={scenario.image}
              alt=""
              aria-hidden
              className="absolute inset-x-0 top-0 h-[58%] w-full object-cover opacity-55"
            />
            <div className="absolute inset-x-0 top-0 h-[58%] bg-gradient-to-b from-neutral-950/35 via-neutral-950/55 to-neutral-950" />
          </>
        )}

        <div className="relative h-full flex flex-col px-6 pt-[calc(env(safe-area-inset-top)+18px)] pb-[calc(env(safe-area-inset-bottom)+20px)]">
          <button
            type="button"
            onClick={onBack}
            className="self-start text-[13px] text-white/60 -ml-1 px-1 py-1"
          >
            ← Înapoi
          </button>

          <div className="flex-1 min-h-0 flex flex-col justify-end pb-7">
            <p className="text-[11px] tracking-[0.28em] uppercase text-white/45">
              {scenario.title}
            </p>

            {/* EROUL: ce primeste. Cifra mare, nu un rand de text mic. */}
            <div className="mt-3 flex items-end gap-3">
              <span className="font-display text-[76px] leading-[0.85] tracking-[-0.045em] text-white">
                {reels.length}
              </span>
              <span className="pb-2">
                <span className="block text-[22px] font-semibold leading-tight">
                  {reels.length === 1 ? "reel" : "reeluri"}
                </span>
                <span className="block text-[13px] text-white/50 leading-tight mt-0.5">
                  dintr-o singură clientă
                </span>
              </span>
            </div>

            {/* Numele lor — trei nume sunt concrete cum "3 reeluri" nu e */}
            {reels.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {reels.map((o) => (
                  <span
                    key={o.id}
                    className="inline-flex items-center gap-1.5 text-[12.5px] rounded-full bg-white/[0.08] border border-white/10 px-3 py-1.5"
                  >
                    <Film className="w-3.5 h-3.5 text-white/50" strokeWidth={1.8} />
                    {o.name}
                  </span>
                ))}
              </div>
            )}

            {/* Efortul: mic, sub rezultat. Ordinea inversa ar fi o lista de sarcini. */}
            <div className="mt-7 pt-5 border-t border-white/10 flex items-center gap-5 text-white/55">
              <span className="inline-flex items-center gap-2 text-[13.5px]">
                <Camera className="w-4 h-4" strokeWidth={1.8} />
                {moments} {moments === 1 ? "moment" : "momente"}
              </span>
              <span className="w-1 h-1 rounded-full bg-white/25" />
              <span className="inline-flex items-center gap-2 text-[13.5px]">
                <Clock className="w-4 h-4" strokeWidth={1.8} />~{minutes}{" "}
                {minutes === 1 ? "minut" : "minute"}
              </span>
            </div>

            <p className="mt-3 text-[13px] text-white/40 leading-relaxed">
              Filmezi pe parcursul programării, câte puțin. Nu trebuie făcute
              toate odată.
            </p>
          </div>

          <button
            type="button"
            onClick={onStart}
            className="shrink-0 w-full h-14 rounded-full bg-white text-neutral-950 text-[15px] font-semibold active:scale-[0.985] transition"
          >
            Începem
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}
