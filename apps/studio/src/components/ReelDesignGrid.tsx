"use client";
/**
 * ReelDesignGrid — variantele unui tip, una lângă alta.
 *
 * Aceleași cartonașe 9:16 cu coperta desenată ca la rezultate, din același
 * motiv: forma și cadrul spun mai mult decât un nume. Aici e chiar scopul —
 * variantele se compară vizual, nu se citesc.
 *
 * Coperta se desenează din filmarea de probă a cadrului, cu filtrul variantei.
 * Deci diferența dintre două variante se vede din grilă, fără să intri în ele.
 */
import Link from "next/link";
import { Film } from "lucide-react";
import type { ReelDesignRow } from "@/lib/db-types";
import { framesAsShots } from "@/lib/design-frames";
import OutputCover from "./OutputCover";

const TILE = 132;

export default function ReelDesignGrid({ designs }: { designs: ReelDesignRow[] }) {
  return (
    <div className="flex flex-wrap items-start gap-x-4 gap-y-5">
      {designs.map((d) => {
        const n = d.slots.length;
        const shots = framesAsShots(d.slots);
        return (
          <Link
            key={d.id}
            href={`/dashboard/biblioteca/${d.id}`}
            style={{ width: TILE }}
            className="group shrink-0"
          >
            <div className="rounded-[10px] overflow-hidden border-2 border-transparent group-hover:border-[#D8D0F5] transition">
              <OutputCover output={d} shots={shots} aspect={9 / 16} />
            </div>
            <div className="mt-2 px-0.5">
              <div className="text-[12.5px] font-medium text-[#1F1F1F] leading-tight truncate">
                {d.name}
              </div>
              <div className="text-[10.5px] text-[#9A9A9A] mt-0.5 inline-flex items-center gap-1">
                <Film className="w-3 h-3" strokeWidth={1.8} />
                {n} {n === 1 ? "cadru" : "cadre"}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
