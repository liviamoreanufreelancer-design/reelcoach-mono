"use client";
/**
 * DesignFolders — reeluri, carusele, povești. Trei foldere, unul odată.
 *
 * Nu trei secțiuni stivuite: cu 30 de variante pe ecran, împărțirea n-ar mai
 * fi însemnat nimic. Un folder înseamnă că ești ÎN el.
 *
 * Numărul de pe fiecare buton e informația care contează cel mai mult aici:
 * telefonul alege din bazine separate — 3 reeluri, 1 carusel, câteva povești
 * — deci un bazin gol înseamnă că stilista nu primește tipul ăla deloc.
 * Un „0" pe buton spune asta fără să fie nevoie de un avertisment.
 */
import { useMemo, useState } from "react";
import { Film, Images, Layers } from "lucide-react";
import type { OutputKind, ReelDesignRow } from "@/lib/db-types";
import ReelDesignGrid from "./ReelDesignGrid";

const FOLDERS: { id: OutputKind; label: string; Icon: typeof Film; empty: string }[] = [
  { id: "reel", label: "Reeluri", Icon: Film, empty: "Niciun reel încă." },
  { id: "carousel", label: "Carusele", Icon: Images, empty: "Niciun carusel încă." },
  { id: "stories", label: "Povești", Icon: Layers, empty: "Nicio poveste încă." },
];

export default function DesignFolders({ designs }: { designs: ReelDesignRow[] }) {
  const [folder, setFolder] = useState<OutputKind>("reel");

  const byFolder = useMemo(() => {
    const m = new Map<OutputKind, ReelDesignRow[]>();
    for (const f of FOLDERS) m.set(f.id, []);
    for (const d of designs) {
      const k = (d.kind ?? "reel") as OutputKind;
      (m.get(k) ?? m.get("reel"))!.push(d);
    }
    return m;
  }, [designs]);

  const list = byFolder.get(folder) ?? [];

  // În interiorul unui folder, gruparea rămâne pe tip: „before/after",
  // „glow up". Alea sunt bazinele reale din care alege telefonul.
  const byType = useMemo(() => {
    const m = new Map<string, ReelDesignRow[]>();
    for (const d of list) {
      const arr = m.get(d.reel_type) ?? [];
      arr.push(d);
      m.set(d.reel_type, arr);
    }
    return Array.from(m.entries());
  }, [list]);

  const current = FOLDERS.find((f) => f.id === folder) ?? FOLDERS[0];

  return (
    <div>
      <div className="inline-flex gap-0.5 p-0.5 bg-[#F6F4FE] rounded-lg mb-5">
        {FOLDERS.map((f) => {
          const n = byFolder.get(f.id)?.length ?? 0;
          const on = folder === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFolder(f.id)}
              aria-pressed={on}
              className={`px-3.5 py-2 rounded-md text-[13px] transition inline-flex items-center gap-2 ${
                on ? "bg-white text-[#1F1F1F] font-medium shadow-sm" : "text-[#6B6B6B] hover:text-[#1F1F1F]"
              }`}
            >
              <f.Icon className="w-3.5 h-3.5" strokeWidth={1.8} />
              {f.label}
              <span className={`tabular-nums text-[11.5px] ${on ? "text-[#9A9A9A]" : "text-[#B8B8C8]"}`}>
                {n}
              </span>
            </button>
          );
        })}
      </div>

      {list.length === 0 ? (
        <div className="card px-6 py-9 text-center">
          <p className="text-[14px] font-medium text-[#1F1F1F]">{current.empty}</p>
          <p className="text-[13px] text-[#6B6B6B] mt-1.5 leading-relaxed max-w-[440px] mx-auto">
            Telefonul alege din fiecare fel separat. Fără nimic aici, stilista
            nu primește tipul ăsta de rezultat deloc.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {byType.map(([type, items]) => (
            <section key={type}>
              <div className="flex items-baseline gap-2.5 mb-3.5">
                <h2 className="text-[14px] font-semibold text-[#1F1F1F]">{type}</h2>
                <span className="text-[12px] text-[#9A9A9A]">
                  {items.length} {items.length === 1 ? "variantă" : "variante"}
                </span>
              </div>
              <ReelDesignGrid designs={items} />
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
