"use client";
/**
 * MediaKindFilter — filmări / poze / toate.
 *
 * Cele două sunt lucruri diferite, nu două formate ale aceluiași lucru:
 * filmările intră în montaj și au buget de randare, pozele devin postări
 * separate și n-au. Amestecate în aceeași grilă, cauți printre ele; separate,
 * te uiți la ce te interesează.
 *
 * Numărul stă pe fiecare buton fiindcă răspunde singur la întrebarea care
 * urmează oricum: „am destule poze de rezultat?".
 */
import type { MediaAsset } from "@/lib/db-types";

export type MediaKindFilterValue = "all" | "video" | "image";

export function filterByKind(assets: MediaAsset[], kind: MediaKindFilterValue): MediaAsset[] {
  return kind === "all" ? assets : assets.filter((a) => a.kind === kind);
}

export default function MediaKindFilter({
  assets,
  value,
  onChange,
}: {
  assets: MediaAsset[];
  value: MediaKindFilterValue;
  onChange: (v: MediaKindFilterValue) => void;
}) {
  const videos = assets.filter((a) => a.kind === "video").length;
  const images = assets.length - videos;

  const options: { id: MediaKindFilterValue; label: string; count: number }[] = [
    { id: "all", label: "Toate", count: assets.length },
    { id: "video", label: "Filmări", count: videos },
    { id: "image", label: "Poze", count: images },
  ];

  return (
    <div className="inline-flex gap-0.5 p-0.5 bg-[#F6F4FE] rounded-lg shrink-0">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          aria-pressed={value === o.id}
          className={`px-3 py-1.5 rounded-md text-[12px] transition inline-flex items-center gap-1.5 ${
            value === o.id
              ? "bg-white text-[#1F1F1F] font-medium shadow-sm"
              : "text-[#6B6B6B] hover:text-[#1F1F1F]"
          }`}
        >
          {o.label}
          <span className={`tabular-nums ${value === o.id ? "text-[#9A9A9A]" : "text-[#B8B8C8]"}`}>
            {o.count}
          </span>
        </button>
      ))}
    </div>
  );
}
