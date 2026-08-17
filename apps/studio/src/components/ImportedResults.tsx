"use client";
/**
 * ImportedResults — rezultatele șablonului, importate din bibliotecă.
 *
 * Aici NU se mai construiește nimic. Variantele se fac în bibliotecă, peste
 * material de probă; șablonul doar alege care dintre ele intră în serviciul
 * ăsta. Momentele de filmat se generează apoi din cadrele lor.
 *
 * Direcția e inversă față de cum era: înainte scriai momentele și compuneai
 * rezultate din ele. Acum alegi rezultatele, iar lista de filmat rezultă. Așa
 * nu se mai poate filma ceva ce nu folosește nimic, și nu mai poate lipsi ceva
 * ce un rezultat cere.
 *
 * IMPORTUL COPIAZĂ. O modificare făcută în bibliotecă nu se propagă singură
 * peste șabloanele publicate — altfel reelurile de miercuri ar ieși altfel
 * decât cele de marți fără ca nimeni să fi apăsat „Publică". Cine vrea
 * versiunea nouă o reimportă.
 */
import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, X, Film, Images, Layers, Check } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { importDesigns, removeImportedOutput } from "@/lib/template-actions";
import { framesAsShots } from "@/lib/design-frames";
import type { OutputRow, ReelDesignRow, ShotRow } from "@/lib/db-types";
import OutputCover from "./OutputCover";

const KIND_ICON = { reel: Film, carousel: Images, stories: Layers } as const;

export default function ImportedResults({
  templateId,
  outputs,
  shots,
  disabled,
}: {
  templateId: string;
  outputs: OutputRow[];
  shots: ShotRow[];
  disabled: boolean;
}) {
  const [picking, setPicking] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-5">
      {error && (
        <p className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <p className="text-[13px] text-[#6B6B6B] leading-relaxed max-w-[620px]">
        Rezultatele nu se construiesc aici — se aleg din bibliotecă. Din cadrele
        lor se generează singure momentele pe care le filmează stilista, la
        pasul <strong>Momente</strong>.
      </p>

      {outputs.length === 0 ? (
        <div className="card px-6 py-9 text-center">
          <p className="text-[14px] font-medium text-[#1F1F1F]">
            Niciun rezultat importat.
          </p>
          <p className="text-[13px] text-[#6B6B6B] mt-1.5 leading-relaxed max-w-[440px] mx-auto">
            Alege din bibliotecă ce postări ies din serviciul ăsta. Lista de
            filmat se completează singură după ele.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-start gap-x-4 gap-y-5">
          {outputs.map((o) => {
            const Icon = KIND_ICON[o.kind] ?? Film;
            return (
              <div key={o.id} style={{ width: 132 }} className="shrink-0">
                <div className="relative rounded-[10px] overflow-hidden border border-[#E7E3F5]">
                  {/* Cadrele rezultatului își poartă filmarea de probă cu ele,
                      deci coperta se desenează fără să atingă momentele. */}
                  <OutputCover output={o} shots={framesAsShots(o.slots)} aspect={9 / 16} />
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!confirm(`Scoți „${o.name}" din șablon? Momentele se recalculează.`)) return;
                        setError(null);
                        startTransition(async () => {
                          const res = await removeImportedOutput(o.id, templateId);
                          if (!res.ok) setError(res.error);
                        });
                      }}
                      disabled={pending}
                      aria-label="Scoate rezultatul"
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/55 backdrop-blur-sm text-white grid place-items-center"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <div className="mt-2 text-[12.5px] font-medium text-[#1F1F1F] leading-tight truncate">
                  {o.name}
                </div>
                <div className="text-[10.5px] text-[#9A9A9A] mt-0.5 inline-flex items-center gap-1">
                  <Icon className="w-3 h-3" strokeWidth={1.8} />
                  {o.slots.length} {o.slots.length === 1 ? "cadru" : "cadre"}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!disabled && (
        <button
          type="button"
          onClick={() => setPicking(true)}
          disabled={pending}
          className="self-start btn-champagne inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Importă din bibliotecă
        </button>
      )}

      {outputs.length > 0 && (
        <p className="text-[12px] text-[#9A9A9A] leading-relaxed max-w-[620px] pt-1 border-t border-[#E7E3F5]">
          Din ele au rezultat <strong>{shots.length}</strong>{" "}
          {shots.length === 1 ? "moment" : "momente"} de filmat. Instrucțiunile
          pentru fiecare se scriu la pasul Momente și se păstrează dacă mai
          imporți ceva.
        </p>
      )}

      <DesignPicker
        open={picking}
        alreadyImported={outputs.map((o) => o.from_design_id).filter(Boolean) as string[]}
        onClose={() => setPicking(false)}
        onImport={(ids) => {
          setError(null);
          startTransition(async () => {
            const res = await importDesigns(templateId, ids);
            if (!res.ok) setError(res.error);
          });
        }}
      />
    </div>
  );
}

/** Alegerea variantelor: mai multe deodată, grupate pe tip. */
function DesignPicker({
  open,
  alreadyImported,
  onClose,
  onImport,
}: {
  open: boolean;
  alreadyImported: string[];
  onClose: () => void;
  onImport: (ids: string[]) => void;
}) {
  const [designs, setDesigns] = useState<ReelDesignRow[] | null>(null);
  const [chosen, setChosen] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setChosen(new Set());
    const sb = getSupabaseBrowserClient();
    void sb.from("reel_designs").select("*").order("reel_type").order("sort_order")
      .then(({ data }) => setDesigns((data ?? []) as ReelDesignRow[]));
  }, [open]);

  const byType = useMemo(() => {
    const m = new Map<string, ReelDesignRow[]>();
    for (const d of designs ?? []) {
      const list = m.get(d.reel_type) ?? [];
      list.push(d);
      m.set(d.reel_type, list);
    }
    return Array.from(m.entries());
  }, [designs]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-[760px] max-h-[82vh] flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E7E3F5]">
          <p className="eyebrow flex-1">Alege din bibliotecă</p>
          <button onClick={onClose} aria-label="Închide" className="w-8 h-8 rounded-full bg-white/[0.06] grid place-items-center text-[#6B6B6B]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {designs === null ? (
            <p className="text-[13px] text-[#9A9A9A] py-8 text-center">Se încarcă…</p>
          ) : byType.length === 0 ? (
            <p className="text-[13px] text-[#6B6B6B] py-8 text-center leading-relaxed">
              Biblioteca e goală. Construiește întâi o variantă acolo.
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {byType.map(([type, list]) => (
                <section key={type}>
                  <h3 className="text-[13px] font-semibold text-[#1F1F1F] mb-2.5">{type}</h3>
                  <div className="flex flex-wrap items-start gap-x-4 gap-y-4">
                    {list.map((d) => {
                      const on = chosen.has(d.id);
                      // Deja importat nu înseamnă blocat: partenera poate vrea
                      // versiunea nouă a variantei. Doar i-o spunem.
                      const imported = alreadyImported.includes(d.id);
                      return (
                        <button
                          key={d.id}
                          type="button"
                          style={{ width: 112 }}
                          onClick={() => setChosen((c) => {
                            const n = new Set(c);
                            if (n.has(d.id)) n.delete(d.id); else n.add(d.id);
                            return n;
                          })}
                          className="text-left shrink-0"
                        >
                          <div className={`relative rounded-lg overflow-hidden border-2 transition ${on ? "border-[#5B34FF]" : "border-transparent hover:border-[#D8D0F5]"}`}>
                            <OutputCover output={d} shots={framesAsShots(d.slots)} aspect={9 / 16} />
                            {on && (
                              <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#5B34FF] text-white grid place-items-center">
                                <Check className="w-3 h-3" strokeWidth={3} />
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 text-[11.5px] text-[#1F1F1F] leading-tight truncate">{d.name}</div>
                          <div className="text-[10px] text-[#9A9A9A]">
                            {d.slots.length} cadre{imported ? " · deja în șablon" : ""}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3.5 border-t border-[#E7E3F5] flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn-glass">Anulează</button>
          <button
            type="button"
            disabled={chosen.size === 0}
            onClick={() => { onImport(Array.from(chosen)); onClose(); }}
            className="btn-champagne disabled:opacity-40"
          >
            Importă {chosen.size > 0 ? `(${chosen.size})` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
