"use client";
/**
 * StoryPostPreview — cum arată poveștile în aplicație, nu în editor.
 *
 * O poveste nu se judecă pe un cadru: se judecă pe SERIE. Cinci povești
 * postate una după alta sunt un singur lucru pentru cine le vede, iar
 * întrebările reale sunt „se repetă?", „textul stă în zona sigură?",
 * „prima e destul de tare cât să oprească scroll-ul?". Niciuna nu se poate
 * pune uitându-te la un moment odată.
 *
 * De asta preview-ul are barele de progres de sus: nu sunt decor, sunt
 * singurul lucru care spune „ești la 2 din 5" — exact ce vede publicul.
 *
 * ZONELE SIGURE sunt marcate. Interfața rețelei acoperă partea de sus (barele
 * și numele contului) și partea de jos (câmpul de răspuns). Text pus acolo se
 * pierde sub butoane, iar asta se descoperă abia după ce ai postat. Aici se
 * vede înainte.
 */
import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import type { Composition, ShotLike } from "@/lib/db-types";
import { VIDEO_ASPECT, isImageUrl } from "@/lib/media-display";
import StoryPlayer from "./StoryPlayer";

export default function StoryPostPreview({
  output,
  shots,
}: {
  output: Composition;
  shots: ShotLike[];
}) {
  const [i, setI] = useState(0);
  /** Cât din povestea curentă a trecut, pentru bara de sus. */
  const [p, setP] = useState(0);
  /** Seria s-a terminat. Nu reluăm singuri: ai văzut-o, decizi tu. */
  const [ended, setEnded] = useState(false);
  const total = output.slots.length;

  if (total === 0) {
    return (
      <p className="text-[12.5px] text-[#9A9A9A] py-6 text-center">
        Adaugă momente ca să vezi cum arată seria.
      </p>
    );
  }

  const idx = Math.min(i, total - 1);
  const current = output.slots[idx];
  const isPhoto = isImageUrl(
    shots.find((s) => s.slot_key === current?.slot)?.sample_video_url,
  );

  const go = (d: number) => {
    setP(0);
    setEnded(false);
    setI((v) => (v + d + total) % total);
  };

  /**
   * Trecerea automată — asta face o serie să fie o serie.
   *
   * La ultima nu se reia din prima: cine se uită la povești vede seria O
   * DATĂ, apoi trece mai departe. O buclă ar ascunde exact senzația care
   * trebuie judecată — cum se termină.
   */
  const onDone = useCallback(() => {
    setI((v) => {
      if (v >= total - 1) { setEnded(true); return v; }
      setP(0);
      return v + 1;
    });
  }, [total]);

  return (
    <div className="w-full max-w-[300px] mx-auto">
      <div className="relative rounded-[22px] overflow-hidden bg-black">
        <div className="relative w-full" style={{ aspectRatio: `${VIDEO_ASPECT}` }}>
          {!ended && (
            <StoryPlayer
              key={idx}
              output={output}
              shots={shots}
              index={idx}
              onProgress={setP}
              onDone={onDone}
            />
          )}
          {ended && (
            <button
              type="button"
              onClick={() => { setI(0); setP(0); setEnded(false); }}
              className="absolute inset-0 z-30 grid place-items-center bg-black/70 text-white"
            >
              <span className="flex flex-col items-center gap-2">
                <RotateCcw className="w-6 h-6" strokeWidth={1.8} />
                <span className="text-[12.5px]">Vezi seria din nou</span>
              </span>
            </button>
          )}
        </div>

        {/* Barele de progres — câte una per poveste, ca în aplicație. */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex gap-1 z-10">
          {output.slots.map((_, k) => (
            <span
              key={k}
              className="h-[2.5px] flex-1 rounded-full bg-white/30 overflow-hidden"
            >
              {/* Bara curentă se umple în timp real — de acolo se citește
                  ritmul, nu din cifre. */}
              <span
                className="block h-full bg-white"
                style={{ width: k < idx ? "100%" : k === idx ? `${Math.round(p * 100)}%` : "0%" }}
              />
            </span>
          ))}
        </div>

        {/* Zonele acoperite de interfața rețelei. Text pus acolo se pierde. */}
        <div className="absolute inset-x-0 top-0 h-[13%] bg-gradient-to-b from-black/35 to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-[16%] bg-gradient-to-t from-black/35 to-transparent pointer-events-none" />

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Povestea anterioară"
              className="absolute left-0 top-0 bottom-0 w-1/3 z-20 flex items-center justify-start pl-2 opacity-0 hover:opacity-100 transition"
            >
              <ChevronLeft className="w-6 h-6 text-white drop-shadow" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Povestea următoare"
              className="absolute right-0 top-0 bottom-0 w-1/3 z-20 flex items-center justify-end pr-2 opacity-0 hover:opacity-100 transition"
            >
              <ChevronRight className="w-6 h-6 text-white drop-shadow" />
            </button>
          </>
        )}
      </div>

      <div className="flex items-center justify-between mt-2.5 px-0.5">
        <span className="text-[11.5px] text-[#9A9A9A] tabular-nums">
          {idx + 1} din {total} · {isPhoto ? "poză" : "filmare"}
        </span>
        <span className="text-[11.5px] text-[#9A9A9A]">
          {total} {total === 1 ? "poveste" : "povești"}
        </span>
      </div>

      <p className="text-[11px] text-[#9A9A9A] mt-2 leading-relaxed">
        Zonele întunecate sus și jos sunt acoperite de interfața rețelei —
        textul pus acolo se pierde sub butoane.
      </p>
    </div>
  );
}
