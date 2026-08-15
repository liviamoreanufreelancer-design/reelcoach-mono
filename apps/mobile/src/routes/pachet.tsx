/**
 * /pachet — ce are stilista la sfârșitul programării.
 *
 * Ecranul ăsta e momentul „wow" al produsului: nu un reel, ci un PACHET. A
 * filmat opt momente în trei ore, distrată, cu clienta pe scaun — aici vede
 * pentru prima oară ce a ieșit din ele.
 *
 * REGULI DE LIMBAJ (din CLAUDE.md, „Sfârșitul"):
 *
 *   Numărătoarea merge ÎN SUS, fără numitor. „Ai 3 reeluri", nu „3 din 5" și
 *   niciodată un procent. Un numitor îi spune că a eșuat când n-a eșuat —
 *   cinci din opt momente filmate nu e o notă de 62%, e material pentru două
 *   postări pe care nu le avea dimineață.
 *
 *   NICIODATĂ ZERO. O postare căreia îi lipsesc momente iese mai scurtă, nu
 *   dispare. Regula nu e programată separat: rezultă din legături, fiindcă
 *   `planOutput` sare peste sloturile nefilmate.
 *
 *   Ce lipsește se spune ca un CÂȘTIG, nu ca o restanță: „Mai filmează
 *   reacția → încă un reel."
 *
 * NIMIC NU SE RANDEAZĂ AICI. Cartonașele sunt cadre desenate, nu video-uri.
 * Randarea merge în timp real, deci patru postări ar costa de patru ori
 * durata reelului — la finalul programării, când nu are minutul ăla.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Film, Camera } from "lucide-react";
import { PhoneShell } from "@/components/PhoneShell";
import { OutputPoster } from "@/components/OutputPoster";
import { getSelectedScenario, getSelectedIdeaId } from "@/lib/selected-idea";
import { listClips, type StoredClip } from "@/lib/clip-store";
import { summarizeOutputs, bestNextMoment, type OutputStatus } from "@/lib/output-plan";
import { playTap } from "@/lib/ui-sound";
import { light } from "@/lib/haptic";

export const Route = createFileRoute("/pachet")({
  component: Pachet,
});

function Pachet() {
  const nav = useNavigate();
  const [scenario] = useState(() => getSelectedScenario());
  const [scenarioId] = useState(() => getSelectedIdeaId());
  const [clips, setClips] = useState<StoredClip[] | null>(null);

  useEffect(() => {
    listClips(scenarioId).then(setClips);
  }, [scenarioId]);

  // Doar reelurile deocamdată: caruselul și story-urile n-au încă editor în
  // Studio, deci n-ar avea ce arăta aici. Cartonașul lor apare când apare și
  // conținutul — nu punem locuri goale care promit ce nu vine.
  const all: OutputStatus[] = clips ? summarizeOutputs(scenario, clips) : [];
  const reels = all.filter((s) => s.output.kind === "reel");
  const next = bestNextMoment(scenario, reels);

  const open = (st: OutputStatus) => {
    light();
    playTap();
    nav({ to: "/edit", search: { output: st.output.id } });
  };

  const backToFilming = () => {
    light();
    playTap();
    nav({ to: "/film" });
  };

  // Șablon fără postări definite (cele vechi, cele bundlate): pachetul n-are
  // sens, e un singur reel. Trimitem direct în editare, ca înainte.
  useEffect(() => {
    if (clips && (scenario.outputs?.length ?? 0) === 0) {
      nav({ to: "/edit", replace: true });
    }
  }, [clips, scenario.outputs, nav]);

  return (
    <PhoneShell>
      <div className="absolute inset-0 bg-neutral-950 text-white overflow-y-auto">
        <div className="px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-8">
          <button
            type="button"
            onClick={() => nav({ to: "/" })}
            className="w-9 h-9 -ml-1 grid place-items-center rounded-full bg-white/10 mb-5"
            aria-label="Înapoi"
          >
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>

          {clips === null ? (
            <p className="text-white/50 text-[14px] py-10">Adun ce ai filmat…</p>
          ) : reels.length === 0 ? (
            <NothingYet onFilm={backToFilming} />
          ) : (
            <>
              {/* Titlul: cat ai, nu cat iti lipseste */}
              <h1 className="text-[26px] font-semibold leading-tight">
                Ai {reels.length} {reels.length === 1 ? "reel" : "reeluri"}.
              </h1>
              <p className="text-white/55 text-[14px] mt-1.5 leading-relaxed">
                Din {clips.length} {clips.length === 1 ? "moment filmat" : "momente filmate"}.
                Alege unul și îl exportă.
              </p>

              <div className="grid grid-cols-2 gap-3.5 mt-6">
                {reels.map((st) => (
                  <PackageCard key={st.output.id} status={st} onClick={() => open(st)} />
                ))}
              </div>

              {/* Ce lipseste, spus ca un castig */}
              {next && (
                <button
                  type="button"
                  onClick={backToFilming}
                  className="w-full mt-5 text-left rounded-2xl bg-white/[0.07] border border-white/10 px-4 py-3.5 active:bg-white/10 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 shrink-0 grid place-items-center rounded-full bg-white/10">
                      <Camera className="w-[17px] h-[17px]" strokeWidth={1.8} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-medium leading-snug">
                        Mai filmează {next.title.toLowerCase()}
                      </span>
                      <span className="block text-[12.5px] text-white/50 mt-0.5">
                        → încă {next.unlocks} {next.unlocks === 1 ? "reel" : "reeluri"}
                      </span>
                    </span>
                  </div>
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </PhoneShell>
  );
}

function PackageCard({ status, onClick }: { status: OutputStatus; onClick: () => void }) {
  const { output, complete, filmed, total } = status;
  return (
    <button type="button" onClick={onClick} className="text-left active:opacity-80 transition">
      <div className="relative">
        <OutputPoster poster={status.poster} />
        {!complete && (
          // Nu "3/5" pe cartonas — doar semnalul ca e mai scurt decat a fost
          // gandit. Detaliul util (ce anume sa filmeze) e in bara de jos.
          <span className="absolute top-2 left-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-sm text-white/85">
            mai scurt
          </span>
        )}
      </div>
      <div className="mt-2">
        <div className="text-[13.5px] font-medium leading-tight truncate">{output.name}</div>
        <div className="text-[11.5px] text-white/45 mt-0.5 inline-flex items-center gap-1">
          <Film className="w-3 h-3" strokeWidth={1.8} />
          {complete ? `${total} momente` : `${filmed} din ${total} filmate`}
        </div>
      </div>
    </button>
  );
}

function NothingYet({ onFilm }: { onFilm: () => void }) {
  return (
    <div className="py-14 text-center">
      <h1 className="text-[22px] font-semibold leading-tight">Încă n-ai filmat nimic.</h1>
      <p className="text-white/55 text-[14px] mt-2 leading-relaxed">
        Primul moment e destul ca să apară ceva aici.
      </p>
      <button
        type="button"
        onClick={onFilm}
        className="mt-6 px-6 py-3 rounded-full bg-white text-neutral-950 text-[14px] font-medium"
      >
        Începe filmarea
      </button>
    </div>
  );
}
