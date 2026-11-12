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
import { ArrowLeft, Film, Images, Layers, Camera } from "lucide-react";
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

  // Toate trei felurile au acum unde duce. Nimic nu se mai ascunde.
  const ready: OutputStatus[] = clips ? summarizeOutputs(scenario, clips) : [];
  const next = bestNextMoment(scenario, ready);

  const reels = ready.filter((s) => s.output.kind === "reel").length;
  const albums = ready.filter((s) => s.output.kind === "carousel").length;
  const series = ready.filter((s) => s.output.kind === "stories").length;

  /**
   * „Ai 3 reeluri, 1 carusel și 5 povești."
   *
   * Numărate separat, fiindcă sunt lucruri diferite — un carusel nu e un reel
   * mai slab. Și numărate ÎN SUS, fără numitor: vezi comentariul de sus.
   */
  const parts = [
    reels > 0 ? `${reels} ${reels === 1 ? "reel" : "reeluri"}` : null,
    albums > 0 ? `${albums} ${albums === 1 ? "carusel" : "carusele"}` : null,
    series > 0 ? `${series} ${series === 1 ? "serie de povești" : "serii de povești"}` : null,
  ].filter(Boolean) as string[];
  const summary =
    parts.length <= 1
      ? parts[0] ?? ""
      : `${parts.slice(0, -1).join(", ")} și ${parts[parts.length - 1]}`;

  const open = (st: OutputStatus) => {
    light();
    playTap();
    // Fiecare fel are altă cale de ieșire: reel-ul se randează în timp real,
    // caruselul se desenează într-o clipă. Nu e același ecran.
    if (st.output.kind === "carousel") nav({ to: "/carusel", search: { output: st.output.id } });
    else if (st.output.kind === "stories") nav({ to: "/povesti", search: { output: st.output.id } });
    else nav({ to: "/edit", search: { output: st.output.id } });
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
            className="w-9 h-9 -ml-1 grid place-items-center rounded-full bg-white/10 mb-5 active:bg-white/20 transition ease-rc duration-200"
            aria-label="Înapoi"
          >
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>

          {clips === null ? (
            <p className="text-white/50 text-[14px] py-10">Adun ce ai filmat…</p>
          ) : ready.length === 0 ? (
            <NothingYet onFilm={backToFilming} />
          ) : (
            <>
              {/* Titlul: cat ai, nu cat iti lipseste */}
              {/* Numărătoarea merge în sus, fără numitor — vezi comentariul
                  de sus. Caruselele se numără separat: sunt alt fel de
                  postare, nu un reel mai slab. */}
              <h1 className="text-[26px] font-semibold leading-tight">Ai {summary}.</h1>
              <p className="text-white/55 text-[14px] mt-1.5 leading-relaxed">
                Din {clips.length} {clips.length === 1 ? "moment filmat" : "momente filmate"}.
                Alege unul și îl exportă.
              </p>

              <div className="grid grid-cols-2 gap-3.5 mt-6">
                {ready.map((st, i) => (
                  <div
                    key={st.output.id}
                    className="animate-in fade-in slide-in-from-bottom-2 duration-300 ease-rc"
                    style={{ animationDelay: `${Math.min(i, 5) * 40}ms` }}
                  >
                    <PackageCard status={st} onClick={() => open(st)} />
                  </div>
                ))}
              </div>

              {/* Ce lipseste, spus ca un castig */}
              {next && (
                <button
                  type="button"
                  onClick={backToFilming}
                  className="w-full mt-7 pt-4 border-t border-white/[0.09] text-left active:opacity-60 transition ease-rc duration-200"
                >
                  <div className="flex items-center gap-3.5">
                    <Camera className="w-[18px] h-[18px] shrink-0 text-white/35" strokeWidth={1.6} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-medium leading-snug">
                        Mai filmează {next.title.toLowerCase()}
                      </span>
                      {/* Singurul lucru colorat de pe ecran: castigul. Tokenul marcii,
                          nu o culoare noua. O linie de scos daca nu-ti place. */}
                      <span className="block text-[12.5px] mt-0.5" style={{ color: "var(--yellow)" }}>
                        încă {next.unlocks} {next.unlocks === 1 ? "reel" : "reeluri"}
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
  // Forma spune ce e: caruselul e 4:5, reelul 9:16. Fără etichetă.
  const isAlbum = output.kind === "carousel";
  const isSeries = output.kind === "stories";
  return (
    <button type="button" onClick={onClick} className="text-left active:opacity-80 transition ease-rc duration-200">
      <div className="relative">
        <OutputPoster poster={status.poster} aspect={isAlbum ? "4 / 5" : "9 / 16"} />
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
          {isAlbum
            ? <Images className="w-3 h-3" strokeWidth={1.8} />
            : isSeries
              ? <Layers className="w-3 h-3" strokeWidth={1.8} />
              : <Film className="w-3 h-3" strokeWidth={1.8} />}
          {complete
            ? `${total} ${isAlbum ? (total === 1 ? "imagine" : "imagini") : isSeries ? (total === 1 ? "poveste" : "povești") : "momente"}`
            : `${filmed} din ${total} filmate`}
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
        className="mt-6 px-6 py-3 rounded-full bg-white text-neutral-950 text-[14px] font-medium active:scale-[0.97] transition ease-rc duration-200"
      >
        Începe filmarea
      </button>
    </div>
  );
}
