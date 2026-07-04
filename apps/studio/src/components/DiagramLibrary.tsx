"use client";
/**
 * Biblioteca de diagrame — admin UI (migration 007).
 * Filtre pe etichete (categorie/poziție/lumină/distanță) + upload + grid + ștergere.
 * Stilul refolosește identitatea ReelCoach (midnight/champagne/gold).
 */
import { useState, useTransition, useMemo } from "react";
import {
  DIAGRAM_CATEGORIES,
  DIAGRAM_POSITIONS,
  DIAGRAM_LIGHTING,
  DIAGRAM_DISTANCES,
  type DiagramRow,
} from "@/lib/db-types";
import { createDiagram, deleteDiagram } from "@/lib/diagram-actions";

export default function DiagramLibrary({ initialDiagrams }: { initialDiagrams: DiagramRow[] }) {
  const [diagrams] = useState<DiagramRow[]>(initialDiagrams);
  const [pending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);

  // Filtre
  const [fCategory, setFCategory] = useState<string>("");
  const [fPosition, setFPosition] = useState<string>("");
  const [fLighting, setFLighting] = useState<string>("");
  const [fDistance, setFDistance] = useState<string>("");

  const filtered = useMemo(() => {
    return diagrams.filter((d) => {
      if (fCategory && d.category !== fCategory) return false;
      if (fPosition && d.position !== fPosition) return false;
      if (fDistance && d.distance !== fDistance) return false;
      if (fLighting && !(d.lighting ?? []).includes(fLighting)) return false;
      return true;
    });
  }, [diagrams, fCategory, fPosition, fLighting, fDistance]);

  const onDelete = (id: string) => {
    if (!confirm("Ștergi această diagramă? Scenele care o folosesc rămân fără diagramă.")) return;
    startTransition(async () => {
      await deleteDiagram(id);
      window.location.reload();
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <p className="eyebrow text-[10px] mb-1">Bibliotecă</p>
          <h1 className="h-display text-[24px] text-[#1F1F1F]">Diagrame</h1>
          <p className="text-[12px] text-[#9A9A9A] mt-1">
            Încarci o diagramă o dată, o folosești în orice reel. {diagrams.length} în bibliotecă.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="btn-glass text-[13px] px-4 py-2 shrink-0"
        >
          {showForm ? "Închide" : "+ Diagramă nouă"}
        </button>
      </div>

      {/* Formular upload */}
      {showForm && <UploadForm pending={pending} />}

      {/* Filtre */}
      <div className="flex flex-wrap gap-2 mb-5">
        <FilterSelect label="Categorie" value={fCategory} onChange={setFCategory} options={DIAGRAM_CATEGORIES} />
        <FilterSelect label="Poziție" value={fPosition} onChange={setFPosition} options={DIAGRAM_POSITIONS} />
        <FilterSelect label="Lumină" value={fLighting} onChange={setFLighting} options={DIAGRAM_LIGHTING} />
        <FilterSelect label="Distanță" value={fDistance} onChange={setFDistance} options={DIAGRAM_DISTANCES} />
        {(fCategory || fPosition || fLighting || fDistance) && (
          <button
            type="button"
            onClick={() => { setFCategory(""); setFPosition(""); setFLighting(""); setFDistance(""); }}
            className="text-[11px] text-[#5B34FF]/70 hover:text-[#5B34FF] px-2 py-1"
          >
            Resetează filtrele
          </button>
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-[13px] text-[#9A9A9A]">
            {diagrams.length === 0
              ? "Încă nicio diagramă. Apasă „+ Diagramă nouă” ca să adaugi prima."
              : "Nicio diagramă nu se potrivește filtrelor."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((d) => (
            <div key={d.id} className="card overflow-hidden group">
              <div className="aspect-square bg-black/20 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.image_url} alt={d.name} className="absolute inset-0 w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => onDelete(d.id)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm text-[#1F1F1F] hover:text-[#1F1F1F] hover:bg-red-500/70 flex items-center justify-center text-[14px] opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Șterge diagrama"
                >
                  ×
                </button>
              </div>
              <div className="p-3">
                <p className="text-[13px] text-[#1F1F1F] font-medium truncate">{d.name}</p>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <Tag>{d.category}</Tag>
                  {d.position && <Tag>{d.position}</Tag>}
                  {d.distance && <Tag>{d.distance}</Tag>}
                  {(d.lighting ?? []).map((l) => <Tag key={l} accent>{l}</Tag>)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Tag({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={`text-[9px] tracking-[0.05em] px-1.5 py-0.5 rounded ${
      accent ? "bg-[#5B34FF]/15 text-[#5B34FF]" : "bg-white/8 text-[#6B6B6B]"
    }`}>
      {children}
    </span>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`text-[12px] rounded-lg px-3 py-2 bg-white/[0.04] border outline-none ${
        value ? "border-[#5B34FF]/40 text-[#1F1F1F]" : "border-white/10 text-[#6B6B6B]"
      }`}
    >
      <option value="">{label}: toate</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function UploadForm({ pending }: { pending: boolean }) {
  const [lighting, setLighting] = useState<string[]>([]);
  const [submitting, startSubmit] = useTransition();

  const toggleLighting = (l: string) => {
    setLighting((prev) => prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete("lighting");
    lighting.forEach((l) => fd.append("lighting", l));
    startSubmit(async () => {
      try {
        await createDiagram(fd);
        window.location.reload();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Eroare la salvare");
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="card p-5 mb-6 space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] text-[#6B6B6B] mb-1.5">Imagine diagramă</label>
          <input type="file" name="image" accept="image/*" required
            className="text-[12px] text-[#4B4B4B] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-[#5B34FF]/15 file:text-[#5B34FF] file:text-[12px]" />
        </div>
        <div>
          <label className="block text-[11px] text-[#6B6B6B] mb-1.5">Nume</label>
          <input type="text" name="name" required placeholder="ex: Frontal machiaj naturală"
            className="w-full text-[13px] rounded-lg px-3 py-2 bg-white/[0.04] border border-white/10 text-[#1F1F1F] outline-none focus:border-[#5B34FF]/40" />
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-[11px] text-[#6B6B6B] mb-1.5">Categorie</label>
          <select name="category" className="w-full text-[13px] rounded-lg px-3 py-2 bg-white/[0.04] border border-white/10 text-[#1F1F1F] outline-none">
            {DIAGRAM_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-[#6B6B6B] mb-1.5">Poziție</label>
          <select name="position" className="w-full text-[13px] rounded-lg px-3 py-2 bg-white/[0.04] border border-white/10 text-[#1F1F1F] outline-none">
            <option value="">—</option>
            {DIAGRAM_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11px] text-[#6B6B6B] mb-1.5">Distanță</label>
          <select name="distance" className="w-full text-[13px] rounded-lg px-3 py-2 bg-white/[0.04] border border-white/10 text-[#1F1F1F] outline-none">
            <option value="">—</option>
            {DIAGRAM_DISTANCES.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[11px] text-[#6B6B6B] mb-1.5">Lumină (poți alege mai multe)</label>
        <div className="flex flex-wrap gap-2">
          {DIAGRAM_LIGHTING.map((l) => (
            <button key={l} type="button" onClick={() => toggleLighting(l)}
              className={`text-[12px] px-3 py-1.5 rounded-lg border transition-colors ${
                lighting.includes(l)
                  ? "bg-[#5B34FF]/15 border-[#5B34FF]/40 text-[#5B34FF]"
                  : "bg-white/[0.04] border-white/10 text-[#6B6B6B] hover:text-[#1F1F1F]"
              }`}>
              {l}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" disabled={submitting || pending}
        className="btn-glass text-[13px] px-5 py-2 disabled:opacity-40">
        {submitting ? "Se salvează…" : "Salvează diagrama"}
      </button>
    </form>
  );
}
