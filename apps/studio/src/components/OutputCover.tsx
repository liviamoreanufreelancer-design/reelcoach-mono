"use client";
/**
 * OutputCover — cadrul-copertă al unei postări, desenat, nu încărcat.
 *
 * Sursa: momentul `output.cover_slot` (sau primul din `slots`), cu filtrul și
 * textul postării aplicate prin `renderPreviewFrame` — adică EXACT calea de
 * export. Coperta nu aproximează postarea, e postarea, la un cadru.
 *
 * Trei trepte, de la bine la acceptabil:
 *    clipul exemplu  → un cadru din mijlocul lui, cu filtru + text
 *    imaginea exemplu → desenată la fel (momentele-poză n-au clip)
 *    nimic           → placeholder, fără eroare (imaginea e plus, nu cerință)
 *
 * DE CE LENEȘ: fiecare copertă înseamnă descărcarea unui video din Supabase ca
 * să scoți din el un singur cadru. La 9 cartonașe deodată, asta e tot ce simte
 * partenera. Deci desenăm doar ce a intrat în ecran (IntersectionObserver) și
 * doar o dată — după primul cadru eliberăm video-ul, canvas-ul rămâne desenat.
 *
 * Nu se urcă nimic în storage: coperta se redesenează, nu se stochează. Costă
 * milisecunde și are avantajul că nu poate minți — schimbi filtrul, se schimbă.
 */
import { useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { renderPreviewFrame, FILTERS, type TextLayer } from "@reelcoach/core";
import type { Composition, ShotLike } from "@/lib/db-types";

/** Mic — e un cartonaș, nu un preview. Ține și memoria jos la 9 bucăți. */
const W = 270;

export default function OutputCover({
  output,
  shots,
  aspect,
}: {
  output: Composition;
  shots: ShotLike[];
  /** 9/16 pentru reel și story, 4/5 pentru carusel. */
  aspect: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  const [state, setState] = useState<"loading" | "drawn" | "empty">("loading");

  const H = Math.round(W / aspect);

  // Momentul care dă coperta, plus stilul cu care se desenează.
  const slot = output.slots.find((s) => s.slot === output.cover_slot) ?? output.slots[0];
  const shot = slot ? shots.find((s) => s.slot_key === slot.slot) : undefined;
  const filterId = slot?.filter ?? output.filter ?? "none";
  const layers = (slot?.textLayers as TextLayer[] | undefined) ?? [];
  const src = shot?.sample_video_url ?? null;
  const img = shot?.example_image_url ?? null;

  // Nu atingem rețeaua până nu e vizibil cartonașul.
  useEffect(() => {
    const host = hostRef.current;
    if (!host || seen) return;
    const io = new IntersectionObserver(
      (entries) => { if (entries.some((e) => e.isIntersecting)) setSeen(true); },
      { rootMargin: "200px" },
    );
    io.observe(host);
    return () => io.disconnect();
  }, [seen]);

  useEffect(() => {
    if (!seen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (!src && !img) { setState("empty"); return; }

    let cancelled = false;
    setState("loading");

    const draw = (source: HTMLVideoElement | HTMLImageElement) => {
      if (cancelled) return;
      // renderPreviewFrame cere un <video>; pentru imagini îi dăm elementul
      // <img>, care satisface aceeași suprafață folosită de drawImage.
      renderPreviewFrame(canvas, source as HTMLVideoElement, {
        filter: FILTERS[filterId as keyof typeof FILTERS] ?? FILTERS.none,
        effectId: shot?.effect ?? undefined,
        textLayers: layers.length > 0 ? layers : undefined,
      });
      setState("drawn");
    };

    if (src) {
      const video = document.createElement("video");
      // FĂRĂ crossOrigin. Nu citim niciodată pixeli înapoi din canvas (doar
      // îl afișăm), deci „murdărirea" lui nu ne costă nimic — dar cerută pe
      // un fișier care nu întoarce antetele CORS, încărcarea eșuează cu totul.
      // Editorul de cadru merge tocmai fiindcă acolo crossOrigin e setat DUPĂ
      // `src`, adică prea târziu ca să aibă efect. Aici era setat înainte.
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";

      // `removeAttribute` + `load()`, nu `src = ""`: șirul gol e o adresă
      // invalidă, iar browserul raportează degeaba o eroare de încărcare.
      const cleanup = () => { video.removeAttribute("src"); video.load(); };

      let settled = false;
      const paintOnce = () => {
        if (settled || cancelled) return;
        settled = true;
        draw(video);
        cleanup();
      };

      const onReady = () => {
        // Mijlocul clipului: începutul prinde des mâna care apasă butonul.
        const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
        if (dur === 0) { paintOnce(); return; }
        video.addEventListener("seeked", paintOnce, { once: true });
        try { video.currentTime = dur / 2; } catch { paintOnce(); }
      };

      video.addEventListener("loadeddata", onReady, { once: true });
      video.addEventListener("error", () => { if (!cancelled) setState("empty"); }, { once: true });
      // Plasă de siguranță: dacă `seeked` nu vine (durată necunoscută, fișier
      // fără index de căutare), desenăm cadrul pe care îl avem. Mai bine un
      // cadru de la început decât un cerc care se învârte la nesfârșit.
      video.src = src;
      const guard = window.setTimeout(() => {
        if (video.readyState >= 2) paintOnce();
        else if (!cancelled) setState("empty");
      }, 4000);

      return () => {
        cancelled = true;
        window.clearTimeout(guard);
        cleanup();
      };
    }

    const el = new Image();
    el.onload = () => draw(el);
    el.onerror = () => { if (!cancelled) setState("empty"); };
    el.src = img as string;
    return () => { cancelled = true; };
    // Redesenăm când se schimbă sursa sau stilul — altfel coperta ar minți.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seen, src, img, filterId, JSON.stringify(layers), shot?.effect, W, H]);

  return (
    <div
      ref={hostRef}
      className="relative w-full overflow-hidden rounded-[10px] bg-[#EFECF8]"
      style={{ aspectRatio: `${aspect}` }}
    >
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${
          state === "drawn" ? "opacity-100" : "opacity-0"
        }`}
      />
      {state !== "drawn" && (
        <div className="absolute inset-0 grid place-items-center">
          {state === "loading" ? (
            <span className="w-4 h-4 rounded-full border-2 border-[#C9C0E8] border-t-transparent animate-spin" />
          ) : (
            <ImageOff className="w-5 h-5 text-[#C0B9D8]" strokeWidth={1.6} />
          )}
        </div>
      )}
    </div>
  );
}
