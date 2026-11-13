/**
 * /promisiune — cincisprezece secunde, înainte de orice efort.
 *
 * Motivația vine din raportul efort/rezultat arătat ÎNAINTE. Fără ecranul
 * ăsta, la momentul 6 din 8 se întreabă de ce mai face asta.
 *
 * APARE DOAR LA PORNIRE, nu la reluare. Șase locuri din app duceau spre
 * filmare, dar patru sunt reluări — continuă o sesiune, refilmează o scenă,
 * reia după export. Acolo întrebarea „merită?" nu se mai pune, iar un ecran
 * în plus ar fi doar o atingere în plus. Vin prin aici doar cele două porniri
 * reale: alegerea unui șablon și alegerea unei idei.
 *
 * O imagine, două cifre, o propoziție. Aveam aici o listă de momente scrisă
 * mărunt și era prea mult de studiat pentru un ecran care se citește în trei
 * secunde, cu clienta pe scaun.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { getSelectedScenario } from "@/lib/selected-idea";
import { getSessionMode, setSessionMode, type SessionMode } from "@/lib/session-mode";
import { playSelect, playTap } from "@/lib/ui-sound";
import { light } from "@/lib/haptic";

export const Route = createFileRoute("/promisiune")({
  component: Promisiune,
});

function Promisiune() {
  const nav = useNavigate();
  const [scenario] = useState(() => getSelectedScenario());
  const [mode, setMode] = useState<SessionMode>(() => getSessionMode());

  const { momente, minute, primesti } = useMemo(() => {
    const scenes = scenario.scenes ?? [];
    const secunde = scenes.reduce((s, sc) => s + (sc.duration || 0), 0);

    // Numărăm rezultatele pe feluri, fiindcă sunt lucruri diferite — un
    // carusel nu e un reel mai slab. Fără `outputs` (șabloane dinainte de
    // migrația 014) e comportamentul vechi: un reel din toate scenele.
    const outs = scenario.outputs ?? [];
    const n = (k: string) => outs.filter((o) => o.kind === k).length;
    const reels = outs.length > 0 ? n("reel") : 1;
    const carusele = n("carousel");
    const povesti = n("stories");

    const parts = [
      reels > 0 ? `${reels} ${reels === 1 ? "reel" : "reeluri"}` : null,
      carusele > 0 ? `${carusele} ${carusele === 1 ? "carusel" : "carusele"}` : null,
      povesti > 0 ? `${povesti} ${povesti === 1 ? "poveste" : "povești"}` : null,
    ].filter(Boolean) as string[];

    return {
      momente: scenes.length,
      // Timpul de filmat, nu durata reelului: rotunjit în sus, minim un minut,
      // ca să nu promită „0 minute" la un scenariu scurt.
      minute: Math.max(1, Math.round(secunde / 60)),
      primesti:
        parts.length <= 1
          ? parts[0] ?? "un reel"
          : `${parts.slice(0, -1).join(", ")} și ${parts[parts.length - 1]}`,
    };
  }, [scenario]);

  const pick = (m: SessionMode) => {
    if (m === mode) return;
    light();
    playTap();
    setMode(m);
    setSessionMode(m);
  };

  const start = () => {
    light();
    playSelect();
    nav({ to: "/film" });
  };

  return (
    <PhoneShell>
      <div className="absolute inset-0 bg-neutral-950 text-white overflow-hidden flex flex-col">
        {/* Imaginea serviciului, pe toată lățimea. Cadrul ei cel mai bun dintr-o
            sesiune anterioară ar fi mai puternic — e a ei, și e dovada că
            lucrul funcționează — dar până atunci imaginea șablonului. */}
        <div className="relative h-[34%] shrink-0">
          {scenario.image ? (
            <img src={scenario.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-b from-neutral-800 to-neutral-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/10 to-neutral-950/40" />
          <button
            type="button"
            onClick={() => nav({ to: "/" })}
            className="absolute top-[calc(env(safe-area-inset-top)+16px)] left-5 w-9 h-9 grid place-items-center rounded-full bg-black/40 backdrop-blur-sm active:bg-black/60 transition ease-rc duration-200"
            aria-label="Înapoi"
          >
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>
        </div>

        <div className="flex-1 min-h-0 px-5 pb-[calc(env(safe-area-inset-bottom)+24px)] flex flex-col">
          <h1 className="text-[24px] font-semibold leading-tight mt-5 mb-6">{scenario.title}</h1>

          {/* Două cifre mari, despărțite de o linie. Cât costă, nu ce iese —
              aia vine dedesubt. */}
          <div className="flex items-start">
            <div className="flex-1">
              <span className="block text-[38px] font-semibold leading-none tabular-nums">{momente}</span>
              <span className="block text-[11px] text-white/55 mt-2 leading-snug">
                momente
                <br />
                de filmat
              </span>
            </div>
            <div className="flex-1 pl-4 border-l border-white/10">
              <span className="block text-[38px] font-semibold leading-none tabular-nums">{minute}</span>
              <span className="block text-[11px] text-white/55 mt-2 leading-snug">
                minute
                <br />
                în total
              </span>
            </div>
          </div>

          <div className="h-px bg-white/10 my-6" />

          <p className="text-[14px] leading-relaxed font-light">
            Primești <span className="font-medium">{primesti}</span>.
          </p>

          <div className="mt-auto pt-6">
            {/* Modul e despre ce zi are, nu despre cât știe. Ultima alegere se
                ține minte, deci de obicei nu atinge nimic aici. */}
            <div
              className="flex gap-1 p-1 border border-white/10 rounded-full mb-3"
              role="group"
              aria-label="Mod de filmare"
            >
              {(["ghidat", "rapid"] as SessionMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => pick(m)}
                  aria-pressed={mode === m}
                  className={`flex-1 h-9 rounded-full text-[13px] font-medium transition ease-rc duration-200 ${
                    mode === m ? "bg-white/15 text-white" : "text-white/50"
                  }`}
                >
                  {m === "ghidat" ? "Ghidat" : "Rapid"}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={start}
              className="w-full h-12 rounded-full bg-white text-neutral-950 text-[14px] font-semibold active:scale-[0.98] transition ease-rc duration-200"
            >
              Începem
            </button>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
