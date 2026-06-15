"use client";
/**
 * DiagramPicker — selector de diagramă pentru o scenă (în ScenePanel).
 * Arată diagrama curentă; deschide un modal cu biblioteca filtrabilă pe categorie.
 * Salvează diagram_id pe shot via updateShot.
 */
import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DIAGRAM_CATEGORIES, type DiagramRow } from "@/lib/db-types";
import { listDiagrams } from "@/lib/diagram-actions";
import { updateShot } from "@/lib/template-actions";

export default function DiagramPicker({
  shotId,
  templateId,
  currentDiagramId,
  disabled,
}: {
  shotId: string;
  templateId: string;
  currentDiagramId: string | null;
  disabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [diagrams, setDiagrams] = useState<DiagramRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fCategory, setFCategory] = useState<string>("");
  const [pending, startTransition] = useTransition();

  const current = diagrams.find((d) => d.id === currentDiagramId) ?? null;

  // Încarcă biblioteca o dată, la prima deschidere (sau dacă avem deja un id setat, ca să arătăm thumbnail-ul).
  useEffect(() => {
    if (diagrams.length > 0) return;
    if (!open && !currentDiagramId) return;
    setLoading(true);
    listDiagrams()
      .then(setDiagrams)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, currentDiagramId, diagrams.length]);

  const choose = (id: string | null) => {
    startTransition(async () => {
      await updateShot(shotId, templateId, { diagram_id: id });
      setOpen(false);
      router.refresh();
    });
  };

  const shown = fCategory ? diagrams.filter((d) => d.category === fCategory) : diagrams;

  return (
    <div>
      <label className="block text-[11px] tracking-[0.18em] uppercase text-[#E8D5B5]/65 font-semibold mb-2">
        Diagramă de filmare
      </label>

      {/* Diagrama curentă sau buton de alegere */}
      <div className="flex items-center gap-3">
        {current ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.image_url} alt={current.name}
              className="w-12 h-12 rounded-lg object-cover border border-[#E8D5B5]/20 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-white truncate">{current.name}</p>
              <p className="text-[10px] text-white/45 truncate">{current.category}</p>
            </div>
            <button type="button" onClick={() => setOpen(true)} disabled={disabled}
              className="btn-glass text-[11px] px-3 py-1.5 shrink-0">Schimbă</button>
            <button type="button" onClick={() => choose(null)} disabled={disabled || pending}
              className="text-[11px] text-white/45 hover:text-white/80 px-2 shrink-0">Scoate</button>
          </>
        ) : (
          <button type="button" onClick={() => setOpen(true)} disabled={disabled}
            className="btn-glass text-[12px] px-4 py-2 disabled:opacity-40">
            Alege o diagramă din bibliotecă
          </button>
        )}
      </div>

      {/* Modal picker */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setOpen(false)}>
          <div className="bg-[#0F1419] border border-[#E8D5B5]/15 rounded-2xl p-5 max-w-2xl w-full max-h-[80vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="h-display text-[18px] text-white">Alege o diagramă</h3>
              <button type="button" onClick={() => setOpen(false)}
                className="text-white/50 hover:text-white text-[20px] leading-none">×</button>
            </div>

            {/* Filtru categorie */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              <button type="button" onClick={() => setFCategory("")}
                className={`text-[11px] px-2.5 py-1 rounded-lg ${!fCategory ? "bg-[#E8D5B5]/15 text-[#E8D5B5]" : "bg-white/5 text-white/55"}`}>
                Toate
              </button>
              {DIAGRAM_CATEGORIES.map((c) => (
                <button key={c} type="button" onClick={() => setFCategory(c)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg ${fCategory === c ? "bg-[#E8D5B5]/15 text-[#E8D5B5]" : "bg-white/5 text-white/55"}`}>
                  {c}
                </button>
              ))}
            </div>

            {loading ? (
              <p className="text-[12px] text-white/45 text-center py-8">Se încarcă…</p>
            ) : shown.length === 0 ? (
              <p className="text-[12px] text-white/45 text-center py-8">
                {diagrams.length === 0
                  ? "Biblioteca e goală. Adaugă diagrame din pagina Diagrame."
                  : "Nicio diagramă în această categorie."}
              </p>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {shown.map((d) => (
                  <button key={d.id} type="button" onClick={() => choose(d.id)} disabled={pending}
                    className={`text-left rounded-lg overflow-hidden border transition-colors ${
                      d.id === currentDiagramId ? "border-[#E8D5B5]" : "border-transparent hover:border-[#E8D5B5]/40"
                    }`}>
                    <div className="aspect-square bg-black/30">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={d.image_url} alt={d.name} className="w-full h-full object-cover" />
                    </div>
                    <p className="text-[10px] text-white/70 truncate px-1.5 py-1">{d.name}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
