/**
 * /carusel — postarea cu poze, gata de trimis.
 *
 * E cel mai ieftin rezultat din tot produsul: imaginile n-au timp, deci se
 * desenează într-o clipă. Patru poze costă milisecunde, nu minutele pe care
 * le cere un reel randat în timp real — iar asta contează exact la finalul
 * programării, când stilista n-are răbdare.
 *
 * DESCĂRCAREA E PE RÂND, nu „toate deodată". Instagram și Facebook cer
 * imaginile una câte una când postezi un carusel, iar foaia de partajare a
 * iOS-ului nu poate trimite un set de fișiere într-o aplicație anume. Deci
 * ordinea contează și se vede: numerotată, cu bifă pe ce a fost deja salvat.
 */
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Download } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { PhoneShell } from "@/components/PhoneShell";
import { getSelectedScenario, getSelectedIdeaId } from "@/lib/selected-idea";
import { listClips } from "@/lib/clip-store";
import { planOutput, findOutput } from "@/lib/output-plan";
import { renderPhoto } from "@/lib/render-photo";
import { playSuccess } from "@/lib/ui-sound";
import { light } from "@/lib/haptic";

export const Route = createFileRoute("/carusel")({
  validateSearch: (search: Record<string, unknown>): { output?: string } => ({
    output: typeof search.output === "string" ? search.output : undefined,
  }),
  component: Carusel,
});

type Photo = { url: string; blob: Blob; name: string };

function Carusel() {
  const nav = useNavigate();
  const { output: outputId } = Route.useSearch();
  const [scenario] = useState(() => getSelectedScenario());
  const [scenarioId] = useState(() => getSelectedIdeaId());

  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Set<number>>(new Set());
  const urlsRef = useRef<string[]>([]);

  const output = findOutput(scenario, outputId);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (!output) { setError("Postarea nu mai există."); return; }
        const clips = await listClips(scenarioId);
        const planned = planOutput(scenario, output, clips);
        if (planned.length === 0) { setError("Niciun moment filmat pentru postarea asta."); return; }

        const out: Photo[] = [];
        for (let i = 0; i < planned.length; i += 1) {
          const p = await renderPhoto(planned[i], scenarioId);
          urlsRef.current.push(p.url);
          out.push({ ...p, name: `${slug(scenario.title)}-${i + 1}.png` });
        }
        if (alive) { setPhotos(out); playSuccess(); }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      alive = false;
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      urlsRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputId, scenarioId]);

  const share = async (p: Photo, i: number) => {
    light();
    try {
      if (Capacitor.isNativePlatform()) {
        const base64 = await blobToBase64(p.blob);
        const written = await Filesystem.writeFile({
          path: p.name,
          data: base64,
          directory: Directory.Cache,
        });
        await Share.share({ files: [written.uri], title: scenario.title });
      } else {
        const a = document.createElement("a");
        a.href = p.url;
        a.download = p.name;
        a.click();
      }
      setSaved((s) => new Set(s).add(i));
    } catch (e) {
      // Anularea foii de partajare ajunge tot aici; n-o raportăm ca eroare.
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
            {output?.name ?? "Carusel"}
          </h1>
          <p className="text-white/55 text-[13.5px] mt-1.5 leading-relaxed">
            {photos
              ? `${photos.length} ${photos.length === 1 ? "imagine" : "imagini"}. Salvează-le în ordine — rețeaua le cere una câte una.`
              : "Pregătesc imaginile…"}
          </p>

          {error && (
            <p className="mt-4 text-[13px] text-rose-300 bg-rose-500/10 border border-rose-400/25 rounded-xl px-3.5 py-3 leading-relaxed">
              {error}
            </p>
          )}

          {!photos && !error && (
            <div className="py-12 grid place-items-center">
              <span className="w-6 h-6 rounded-full border-2 border-white/25 border-t-white/80 animate-spin" />
            </div>
          )}

          {photos && (
            <div className="mt-5 flex flex-col gap-3">
              {photos.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-[12px] text-white/40 tabular-nums w-4 shrink-0">
                    {i + 1}
                  </span>
                  <img
                    src={p.url}
                    alt=""
                    className="w-[76px] rounded-lg bg-neutral-800 shrink-0"
                    style={{ aspectRatio: "4 / 5", objectFit: "cover" }}
                  />
                  <button
                    type="button"
                    onClick={() => share(p, i)}
                    className={`flex-1 h-11 rounded-full text-[14px] font-medium inline-flex items-center justify-center gap-2 transition active:scale-[0.98] ${
                      saved.has(i)
                        ? "bg-white/10 text-white/70"
                        : "bg-white text-neutral-950"
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
            </div>
          )}

          {photos && output?.caption && (
            <div className="mt-7">
              <p className="text-[10px] tracking-[0.24em] uppercase text-white/40 mb-2">
                Descrierea
              </p>
              <p className="text-[13.5px] text-white/80 leading-relaxed whitespace-pre-wrap bg-white/[0.06] rounded-xl px-3.5 py-3">
                {output.caption}
              </p>
              <button
                type="button"
                onClick={() => { void navigator.clipboard?.writeText(output.caption ?? ""); light(); }}
                className="mt-2 text-[12.5px] text-white/60 underline"
              >
                Copiază descrierea
              </button>
            </div>
          )}
        </div>
      </div>
    </PhoneShell>
  );
}

const slug = (s: string) => s.replace(/\s+/g, "-").toLowerCase().slice(0, 40) || "carusel";

const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve((r.result as string).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
