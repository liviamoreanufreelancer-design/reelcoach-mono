"use client";
/**
 * ReelDesignEditor — editorul unei variante din bibliotecă.
 *
 * E ACELAȘI editor ca la rezultate, nu o copie a lui: `OutputSceneEditor` și
 * `OutputReelPreview` lucrează pe forma `Composition`, iar o variantă are
 * exact forma aia. O a doua copie ar începe să dea drift din prima săptămână
 * — aceeași disciplină ca „preview = export".
 *
 * Ce e diferit față de rezultate, și doar atât:
 *   - scrie în `reel_designs`, nu în `outputs` (deci nu poate ajunge din
 *     greșeală în pachetul stilistei)
 *   - are „Duplică" — fără el, cele 10 variante sunt de zece ori munca
 *   - are tipul, editabil: dacă vezi la a treia că e de fapt alt tip, o muți
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { X, Copy, Trash2 } from "lucide-react";
import {
  updateReelDesign,
  duplicateReelDesign,
  deleteReelDesign,
} from "@/lib/template-actions";
import { FILTERS } from "@/lib/options";
import type { ReelDesignRow, OutputSlot, ShotRow } from "@/lib/db-types";
import OutputSceneEditor from "./OutputSceneEditor";
import OutputReelPreview from "./OutputReelPreview";

export default function ReelDesignEditor({
  design,
  shots,
}: {
  design: ReelDesignRow;
  /** Câte un moment per etichetă, din tot catalogul. */
  shots: ShotRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(design.filter ?? "");
  const [slots, setSlots] = useState<OutputSlot[]>(design.slots);
  const [coverSlot, setCoverSlot] = useState<string | null>(design.cover_slot);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showRender, setShowRender] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setSlots(design.slots); }, [design.slots]);

  const options = shots.filter((s) => s.slot_key);
  const titleOf = (key: string) => shots.find((s) => s.slot_key === key)?.title || key;

  const live = { slots, filter: filter || null, transition: design.transition, cover_slot: coverSlot };
  const used = new Set(slots.map((s) => s.slot));
  const available = options.filter((o) => !used.has(o.slot_key as string));
  const totalSec = slots.reduce((sum, s) => sum + (s.sec ?? 0), 0);
  const effectiveCover = slots.some((s) => s.slot === coverSlot) ? coverSlot : slots[0]?.slot ?? null;

  const save = (patch: Parameters<typeof updateReelDesign>[1]) => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await updateReelDesign(design.id, patch);
        if (res && !res.ok) setError(res.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  const writeSlots = (next: OutputSlot[]) => {
    setSlots(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save({ slots: next }), 600);
  };

  const addSlot = (key: string) => {
    writeSlots([...slots, { slot: key, sec: 2 }]);
    setActiveIdx(slots.length);
  };
  const removeSlot = (i: number) => {
    writeSlots(slots.filter((_, x) => x !== i));
    setActiveIdx((cur) => Math.max(0, Math.min(cur, slots.length - 2)));
  };
  const moveSlot = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= slots.length) return;
    const next = [...slots];
    [next[i], next[j]] = [next[j], next[i]];
    writeSlots(next);
    setActiveIdx(j);
  };

  if (options.length === 0) {
    return (
      <div className="card px-6 py-8 text-center">
        <p className="text-[14px] text-[#1F1F1F] font-medium">
          Niciun moment n-are etichetă.
        </p>
        <p className="text-[13px] text-[#6B6B6B] mt-1.5 leading-relaxed max-w-[440px] mx-auto">
          Variantele se compun din momente identificate prin etichetă, nu prin
          șablon. Completează „Eticheta momentului" în cel puțin un șablon și
          revino.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-[#E7E3F5]">
        <input
          type="text"
          defaultValue={design.name}
          onBlur={(e) => {
            if (e.target.value.trim() && e.target.value !== design.name) {
              save({ name: e.target.value.trim() });
            }
          }}
          className="input flex-1 !mb-0 font-medium"
          aria-label="Numele variantei"
        />
        <input
          type="text"
          defaultValue={design.reel_type}
          onBlur={(e) => {
            if (e.target.value.trim() && e.target.value !== design.reel_type) {
              save({ reel_type: e.target.value.trim() });
            }
          }}
          className="input !mb-0 w-[160px] text-[12.5px]"
          aria-label="Tipul de reel"
        />
        <button
          type="button"
          onClick={() => startTransition(async () => { await duplicateReelDesign(design.id); })}
          disabled={pending}
          title="Pornește o variantă nouă din asta"
          className="btn-glass shrink-0 !px-3 !py-2 inline-flex items-center gap-1.5 text-[12.5px]"
        >
          <Copy className="w-3.5 h-3.5" /> Duplică
        </button>
        <button
          type="button"
          onClick={() => {
            if (!confirm(`Ștergi varianta „${design.name}"?`)) return;
            startTransition(async () => { await deleteReelDesign(design.id); });
          }}
          disabled={pending}
          aria-label="Șterge varianta"
          className="shrink-0 w-9 h-9 grid place-items-center rounded-lg text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-40"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="px-5 pb-5 pt-4 flex flex-col gap-4">
        {error && (
          <p className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        {pending && (
          <p className="text-[9px] tracking-[0.2em] uppercase text-[#9A9A9A]">salvez…</p>
        )}

        {/* Momentele: lista E si selectorul pentru editorul de dedesubt */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[10px] tracking-[0.18em] uppercase text-[#9A9A9A]">
              Momentele variantei
            </span>
            {totalSec > 0 && (
              <span className="text-[11px] text-[#9A9A9A] tabular-nums">
                ~{totalSec.toFixed(1)}s
              </span>
            )}
          </div>

          {slots.length === 0 ? (
            <p className="text-[11.5px] text-[#9A9A9A] py-1.5">
              Niciunul încă. Adaugă mai jos și îl vezi imediat.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {slots.map((s, i) => {
                const known = options.some((o) => o.slot_key === s.slot);
                const active = i === activeIdx;
                const isCover = s.slot === effectiveCover;
                return (
                  <div
                    key={`${s.slot}-${i}`}
                    onClick={() => setActiveIdx(i)}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 border cursor-pointer transition ${
                      active
                        ? "bg-[#EDE8FF] border-[#5B34FF]"
                        : "bg-white border-[#E7E3F5] hover:border-[#D8D0F5]"
                    }`}
                  >
                    <span className="text-[10px] text-[#9A9A9A] tabular-nums w-4">{i + 1}</span>
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveSlot(i, -1); }}
                        disabled={i === 0}
                        aria-label="Mai sus"
                        className="text-[#9A9A9A] hover:text-[#5B34FF] disabled:opacity-25 leading-none text-[10px]"
                      >▲</button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveSlot(i, 1); }}
                        disabled={i === slots.length - 1}
                        aria-label="Mai jos"
                        className="text-[#9A9A9A] hover:text-[#5B34FF] disabled:opacity-25 leading-none text-[10px]"
                      >▼</button>
                    </div>
                    <span className="flex-1 min-w-0 text-[12.5px] truncate">
                      {titleOf(s.slot)}
                      {!known && (
                        <span className="text-rose-600 ml-1.5 text-[11px]">
                          (momentul nu mai există)
                        </span>
                      )}
                    </span>
                    {s.sec ? (
                      <span className="text-[11px] text-[#6B6B6B] tabular-nums">{s.sec}s</span>
                    ) : null}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCoverSlot(s.slot);
                        save({ cover_slot: s.slot });
                      }}
                      title={isCover ? "Momentul care dă coperta" : "Folosește ca imagine de copertă"}
                      aria-label="Folosește ca imagine de copertă"
                      aria-pressed={isCover}
                      className={`shrink-0 text-[13px] leading-none transition ${
                        isCover ? "text-[#5B34FF]" : "text-[#C9C0E8] hover:text-[#5B34FF]"
                      }`}
                    >
                      ★
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeSlot(i); }}
                      aria-label="Scoate momentul"
                      className="shrink-0 text-[#C88] hover:text-[#A44]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {available.length > 0 && (
            <select
              value=""
              onChange={(e) => { if (e.target.value) addSlot(e.target.value); e.target.value = ""; }}
              className="input !mb-0 text-[12px] mt-2"
            >
              <option value="">+ Adaugă moment…</option>
              {available.map((o) => (
                <option key={o.slot_key} value={o.slot_key as string}>
                  {o.title}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Acelasi editor ca la rezultate — o singura implementare */}
        {slots.length > 0 && (
          <>
            <div className="flex gap-1 p-0.5 bg-[#F6F4FE] rounded-lg self-start">
              <button
                type="button"
                onClick={() => setShowRender(false)}
                className={`px-4 py-1.5 rounded-md text-[12px] transition ${
                  !showRender ? "bg-white text-[#1F1F1F] font-medium shadow-sm" : "text-[#6B6B6B]"
                }`}
              >
                Editare
              </button>
              <button
                type="button"
                onClick={() => setShowRender(true)}
                className={`px-4 py-1.5 rounded-md text-[12px] transition ${
                  showRender ? "bg-white text-[#1F1F1F] font-medium shadow-sm" : "text-[#6B6B6B]"
                }`}
              >
                Vezi tot reelul
              </button>
            </div>

            {showRender ? (
              <div className="flex justify-center">
                <OutputReelPreview output={live} shots={shots} />
              </div>
            ) : (
              <OutputSceneEditor
                output={live}
                shots={shots}
                idx={Math.min(activeIdx, slots.length - 1)}
                onChangeSlots={writeSlots}
                disabled={false}
              />
            )}
          </>
        )}

        <div className="pt-1 border-t border-[#E7E3F5] flex flex-col gap-4">
          <div>
            <label className="label">
              Filtru{" "}
              <span className="text-[#9A9A9A] normal-case tracking-normal">
                (pentru toată varianta)
              </span>
            </label>
            <select
              value={filter}
              onChange={(e) => { setFilter(e.target.value); save({ filter: e.target.value || null }); }}
              className="input sm:max-w-[280px]"
            >
              <option value="">Fără filtru</option>
              {FILTERS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">
              Descriere pentru Instagram / TikTok{" "}
              <span className="text-[#9A9A9A] normal-case tracking-normal">
                (textul de sub postare — NU apare pe video)
              </span>
            </label>
            <textarea
              defaultValue={design.caption ?? ""}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v !== (design.caption ?? "")) save({ caption: v || null });
              }}
              rows={3}
              className="input resize-none leading-relaxed"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
