/**
 * /povesti — seria de povești, gata de postat.
 *
 * Fiecare poveste e un FIȘIER PROPRIU, nu o bucată dintr-un montaj — așa se
 * și postează, una după alta. De asta ecranul e o listă cu salvare separată,
 * nu un singur buton de export.
 *
 * SE PREGĂTESC PE RÂND, în ordine, iar fiecare devine salvabilă imediat ce e
 * gata. Poveștile-imagine ies instantaneu; cele filmate se randează în timp
 * real, deci una de 4 secunde costă 4 secunde. Cu trei-patru povești, asta
 * înseamnă că prima e gata înainte ca ultima să înceapă — stilista poate
 * începe să posteze fără să aștepte tot.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Download, Film, ImageIcon } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { PhoneShell } from "@/components/PhoneShell";
import { getSelectedScenario, getSelectedIdeaId } from "@/lib/selected-idea";
import { listClips } from "@/lib/clip-store";
import { planOutput, findOutput } from "@/lib/output-plan";
import { renderStory } from "@/lib/render-story";
import { playSuccess } from "@/lib/ui-sound";
import { light } from "@/lib/haptic";

export const Route = createFileRoute("/povesti")({
  validateSearch: (search: Record<string, unknown>): { output?: string } => ({
    output: typeof search.output === "string" ? search.output : undefined,
  }),
  component: Povesti,
});

type Story = { url: string; blob: Blob; name: string; isVideo: boolean };

function Povesti() {
  const nav = useNavigate();
  const { output: outputId } = Route.useSearch();
  const [scenario] = useState(() => getSelectedScenario());
  const [scenarioId] = useState(() => getSelectedIdeaId());

  const [stories, setStories] = useState<Story[]>([]);
  const [total, setTotal] = useState(0);
  const [busy, setBusy] = useState<string | null>("Pregătesc…");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const urlsRef = useRef<string[]>([]);

  const output = findOutput(scenario, outputId);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!output) { setError("Seria nu mai există."); setBusy(null); return; }
        const clips = await listClips(scenarioId);
        const planned = planOutput(scenario, output, clips);
        if (planned.length === 0) {
          setError("Niciun moment filmat pentru seria asta.");
          setBusy(null);
          return;
        }
        setTotal(planned.length);

        for (let i = 0; i < planned.length; i += 1) {
          if (!alive) return;
          setBusy(`Pregătesc ${i + 1} din ${planned.length}…`);
          const r = await renderStory(planned[i], scenarioId, (p) => {
            if (alive) setBusy(`Pregătesc ${i + 1} din ${planned.length} · ${Math.round(p.pct)}%`);
          });
          if (!alive) { URL.revokeObjectURL(r.url); return; }
          urlsRef.current.push(r.url);
          // Fiecare apare imediat ce e gata: poți începe să postezi fără să
          // aștepți seria întreagă.
          setStories((cur) => [
            ...cur,
            { ...r, name: `${slug(scenario.title)}-poveste-${i + 1}.${r.isVideo ? "mp4" : "png"}` },
          ]);
        }
        if (alive) { setBusy(null); playSuccess(); }
      } catch (e) {
        if (alive) { setError(e instanceof Error ? e.message : String(e)); setBusy(null); }
      }
    })();
    return () => {
      alive = false;
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      urlsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputId, scenarioId]);

  const share = async (s: Story, i: number) => {
    light();
    try {
      if (Capacitor.isNativePlatform()) {
        const base64 = await blobToBase64(s.blob);
        const written = await Filesystem.writeFile({
          path: s.name,
          data: base64,
          directory: Directory.Cache,
        });
        await Share.share({ files: [written.uri], title: scenario.title });
      } else {
        const a = document.createElement("a");
        a.href = s.url;
        a.download = s.name;
        a.click();
      }
      setSaved((v) => new Set(v).add(i));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/cancel/i.test(msg)) setError(msg);
    }
  };

  return (
    <PhoneShell>
      <div className="absolute inset-0 bg-neutral-950 text-white overflow-y-auto">
        <div className="px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-10">
          <button
            type="button"
            onClick={() => nav({ to: "/pachet" })}
            className="w-9 h-9 -ml-1 grid place-items-center rounded-full bg-white/10 mb-5"
            aria-label="Înapoi la pachet"
          >
            <ArrowLeft className="w-[18px] h-[18px]" />
          </button>

          <h1 className="text-[24px] font-semibold leading-tight">
            {output?.name ?? "Povești"}
          </h1>
          <p className="text-white/55 text-[13.5px] mt-1.5 leading-relaxed">
            {total > 0
              ? `${total} ${total === 1 ? "poveste" : "povești"}. Se postează una după alta, în ordinea de mai jos.`
              : "Pregătesc seria…"}
          </p>

          {error && (
            <p className="mt-4 text-[13px] text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-xl px-3.5 py-3 leading-relaxed">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-col gap-3">
            {stories.map((s, i) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="text-[12px] text-white/40 tabular-nums w-4 shrink-0">
                  {i + 1}
                </span>
                <div className="relative w-[54px] shrink-0">
                  {s.isVideo ? (
                    <video
                      src={s.url}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full rounded-lg bg-neutral-800"
                      style={{ aspectRatio: "9 / 16", objectFit: "cover" }}
                    />
                  ) : (
                    <img
                      src={s.url}
                      alt=""
                      className="w-full rounded-lg bg-neutral-800"
                      style={{ aspectRatio: "9 / 16", objectFit: "cover" }}
                    />
                  )}
                  <span className="absolute bottom-1 left-1 w-4 h-4 rounded-full bg-black/60 grid place-items-center">
                    {s.isVideo
                      ? <Film className="w-2.5 h-2.5" strokeWidth={2} />
                      : <ImageIcon className="w-2.5 h-2.5" strokeWidth={2} />}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => share(s, i)}
                  className={`flex-1 h-11 rounded-full text-[14px] font-medium inline-flex items-center justify-center gap-2 transition active:scale-[0.98] ${
                    saved.has(i) ? "bg-white/10 text-white/70" : "bg-white text-neutral-950"
                  }`}
                >
                  {saved.has(i) ? (
                    <><Check className="w-4 h-4" strokeWidth={2.4} /> Salvată</>
                  ) : (
                    <><Download className="w-4 h-4" /> Salvează</>
                  )}
                </button>
              </div>
            ))}

            {busy && (
              <div className="flex items-center gap-3 py-2">
                <span className="w-4 shrink-0" />
                <span className="w-[54px] shrink-0 rounded-lg bg-white/[0.06] grid place-items-center" style={{ aspectRatio: "9 / 16" }}>
                  <span className="w-4 h-4 rounded-full border-2 border-white/25 border-t-white/80 animate-spin" />
                </span>
                <span className="flex-1 text-[13px] text-white/55">{busy}</span>
              </div>
            )}
          </div>

          {!busy && stories.length > 0 && (
            <p className="text-[12px] text-white/40 mt-6 leading-relaxed">
              Textul e deja pe imagine — poveștile n-au descriere dedesubt.
            </p>
          )}
        </div>
      </div>
    </PhoneShell>
  );
}

const slug = (s: string) => s.replace(/\s+/g, "-").toLowerCase().slice(0, 40) || "poveste";

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve((r.result as string).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
