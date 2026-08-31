"use client";
/**
 * CarouselPostPreview — cum arată postarea, nu cadrele.
 *
 * Un reel se judecă pe mișcare, deci previzualizarea lui e o randare. Un
 * carusel se judecă pe COMPOZIȚIE: cum stau pozele una lângă alta, ce se vede
 * din fiecare după ce rețeaua le decupează, și cum citește textul deasupra
 * lor. Nimic din astea nu se vede uitându-te la un cadru odată.
 *
 * ARANJAREA E CEA A FACEBOOK, nu una inventată. Rețeaua nu arată pozele așa
 * cum le-ai pus: le așază după număr și le taie ca să încapă în grilă.
 *
 *     1 poză   — întreagă, în formatul ei
 *     2 poze   — alături, pătrate
 *     3 poze   — una mare sus, două dedesubt
 *     4 poze   — grilă 2×2
 *     5+       — 2×2, iar ultima poartă „+N"
 *
 * Consecința practică, și e motivul pentru care merită arătată: de la două
 * poze în sus, tot ce e vertical se taie la pătrat. O poză de rezultat
 * gândită pe înălțime își pierde exact partea de jos — părul, de obicei.
 * Aici se vede înainte, nu după ce e postată.
 *
 * TEXTUL E DEASUPRA, ca pe Facebook. Pe Instagram stă dedesubt, dar acolo se
 * citește doar dacă cineva se oprește; deasupra, e primul lucru citit. Cine
 * scrie descrierea trebuie s-o vadă în poziția în care are cea mai mare
 * greutate.
 */
import { useState } from "react";
import { Images } from "lucide-react";
import type { Composition, ShotLike } from "@/lib/db-types";
import { PHOTO_ASPECT } from "@/lib/media-display";
import OutputCover from "./OutputCover";

/** Câte poze intră în grilă înainte de „+N". */
const MAX_TILES = 4;

export default function CarouselPostPreview({
  output,
  shots,
  caption,
}: {
  output: Composition;
  shots: ShotLike[];
  caption: string | null;
}) {
  const [showAll, setShowAll] = useState(false);
  const total = output.slots.length;

  if (total === 0) {
    return (
      <p className="text-[12.5px] text-[#9A9A9A] py-6 text-center">
        Adaugă imagini ca să vezi cum arată postarea.
      </p>
    );
  }

  const visible = showAll ? total : Math.min(total, MAX_TILES);
  const rest = total - visible;

  return (
    <div className="w-full max-w-[380px] mx-auto">
      <div className="rounded-2xl border border-[#E7E3F5] bg-white overflow-hidden">
        {/* Textul deasupra — pe Facebook e primul lucru citit. */}
        <div className="px-4 pt-3.5 pb-3">
          {caption?.trim() ? (
            <p className="text-[13px] text-[#1F1F1F] leading-relaxed whitespace-pre-wrap">
              {caption}
            </p>
          ) : (
            <p className="text-[12.5px] text-[#B8B8C8] italic">
              Fără descriere — se scrie mai jos.
            </p>
          )}
        </div>

        <PhotoGrid output={output} shots={shots} count={visible} extra={rest} />
      </div>

      <div className="flex items-center justify-between mt-2.5 px-0.5">
        <span className="text-[11.5px] text-[#9A9A9A] inline-flex items-center gap-1.5">
          <Images className="w-3.5 h-3.5" strokeWidth={1.8} />
          {total} {total === 1 ? "imagine" : "imagini"}
        </span>
        {total > MAX_TILES && (
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="text-[11.5px] text-[#5B34FF] hover:underline"
          >
            {showAll ? "Arată ca în feed" : `Vezi toate ${total}`}
          </button>
        )}
      </div>

      {total > 1 && (
        <p className="text-[11px] text-[#9A9A9A] mt-2 leading-relaxed">
          De la două imagini în sus, rețeaua le taie la pătrat. Ce iese din
          cadru aici, iese și în postare.
        </p>
      )}
    </div>
  );
}

/**
 * Grila, după regulile Facebook. Peste patru imagini, „+N" pe ultima —
 * exact ce vede și cine dă scroll.
 */
function PhotoGrid({
  output, shots, count, extra,
}: {
  output: Composition;
  shots: ShotLike[];
  count: number;
  extra: number;
}) {
  const cell = (i: number, aspect: number, overlay?: number) => (
    <div key={i} className="relative bg-[#EFECF8]">
      <OutputCover output={output} shots={shots} aspect={aspect} slotIndex={i} />
      {overlay ? (
        <div className="absolute inset-0 bg-black/45 grid place-items-center">
          <span className="text-white text-[22px] font-semibold">+{overlay}</span>
        </div>
      ) : null}
    </div>
  );

  // O singură imagine își păstrează formatul; de la două în sus, pătrat.
  if (count === 1) return <div>{cell(0, PHOTO_ASPECT)}</div>;

  if (count === 2) {
    return (
      <div className="grid grid-cols-2 gap-0.5">
        {cell(0, 1)}
        {cell(1, 1, extra > 0 ? extra : undefined)}
      </div>
    );
  }

  if (count === 3) {
    return (
      <div className="flex flex-col gap-0.5">
        {cell(0, 16 / 9)}
        <div className="grid grid-cols-2 gap-0.5">
          {cell(1, 1)}
          {cell(2, 1, extra > 0 ? extra : undefined)}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-0.5">
      {cell(0, 1)}
      {cell(1, 1)}
      {cell(2, 1)}
      {cell(3, 1, extra > 0 ? extra : undefined)}
    </div>
  );
}
