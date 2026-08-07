"use client";
/**
 * OutputStyleEditor — pasul 3: cum arată fiecare postare.
 *
 * Stilul stă pe POSTARE, nu pe moment (migrația 015). Același moment are
 * roluri diferite în postări diferite: „mișcarea părului" e urmată de after în
 * „Transformarea", e ultima în „Procesul" și prima în „Rezultatul". O tranziție
 * setată pe moment n-ar putea fi corectă în toate trei.
 *
 * Aici se setează IMPLICITELE postării — o singură decizie de fiecare.
 * Excepțiile per moment vin separat, ca să nu transformăm 9 momente în ~24 de
 * decizii de stil (vezi CLAUDE.md, economia muncii partenerei).
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { Film, Images, Layers } from "lucide-react";
import { updateOutput } from "@/lib/template-actions";
import { FILTERS, TRANSITIONS } from "@/lib/options";
import type { OutputRow, OutputSlot, ShotRow } from "@/lib/db-types";
import OutputLivePreview from "./OutputLivePreview";
import OutputReelPreview from "./OutputReelPreview";
import OutputTextEditor from "./OutputTextEditor";

const KIND_META = {
  reel: { label: "Reel", Icon: Film },
  carousel: { label: "Carusel", Icon: Images },
  stories: { label: "Story-uri", Icon: Layers },
} as const;

export default function OutputStyleEditor({
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
  const [openId, setOpenId] = useState<string | null>(outputs[0]?.id ?? null);

  if (outputs.length === 0) {
    return (
      <div className="card p-6 text-center">
        <p className="text-[13px] text-[#6B6B6B] leading-relaxed max-w-[340px] mx-auto">
          Nicio postare încă. Treci la pasul <strong>Ce iese</strong> și adaugă una —
          apoi te întorci aici ca să-i dai un look.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {outputs.map((o) => (
        <OutputCard
          key={o.id}
          output={o}
          shots={shots}
          templateId={templateId}
          disabled={disabled}
          open={openId === o.id}
          onToggle={() => setOpenId(openId === o.id ? null : o.id)}
        />
      ))}
    </div>
  );
}

/**
 * O postare. Ține stare LOCALĂ pentru stil.
 *
 * Fără ea, selectul ar fi controlat direct de datele de pe server: alegi un
 * filtru, componenta se redesenează cu valoarea veche până răspunde salvarea,
 * iar selectul sare înapoi — pare că nu se poate modifica. Local state =
 * feedback instant, iar previzualizarea de deasupra reacționează imediat.
 */
function OutputCard({
  output,
  shots,
  templateId,
  disabled,
  open,
  onToggle,
}: {
  output: OutputRow;
  shots: ShotRow[];
  templateId: string;
  disabled: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<string>(output.filter ?? "");
  const [transition, setTransition] = useState<string>(output.transition ?? "");
  const [showRender, setShowRender] = useState(false);
  // Slot-urile local: textul se vede in previzualizare pe masura ce scrii,
  // iar salvarea pleaca debounced ca sa nu lovim serverul la fiecare tasta.
  const [slots, setSlots] = useState<OutputSlot[]>(output.slots);
  const [textSlotIdx, setTextSlotIdx] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const meta = KIND_META[output.kind] ?? KIND_META.reel;
  const isVideo = output.kind === "reel";
  const titleOf = (slotKey: string) =>
    shots.find((s) => s.slot_key === slotKey)?.title || slotKey;

  // Copie locală cu stilul curent — previzualizarea o folosește, deci reflectă
  // alegerea din secundă, nu ce e salvat pe server.
  const live: OutputRow = {
    ...output,
    filter: filter || null,
    transition: transition || null,
    slots,
  };

  // Cand se schimba postarea de pe server (ex. dupa pasul 2), resincronizam.
  useEffect(() => { setSlots(output.slots); }, [output.slots]);

  const writeSlots = (next: OutputSlot[]) => {
    setSlots(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save({ slots: next }), 600);
  };

  const save = (patch: Parameters<typeof updateOutput>[2]) => {
    setError(null);
    startTransition(async () => {
      try {
        const res = await updateOutput(output.id, templateId, patch);
        if (res && !res.ok) { setError(res.error); return; }
        // revalidatePath din actiune reimprospateaza deja; router.refresh() ar
        // fi o a doua rundă inutilă peste bucla de previzualizare.
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  return (
    <div className="card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F8FA] transition"
      >
        <span className="w-9 h-9 shrink-0 grid place-items-center rounded-[11px] bg-[#EDE8FF] text-[#5B34FF]">
          <meta.Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[14.5px] font-semibold text-[#1F1F1F] truncate">
            {output.name}
          </span>
          <span className="block text-[11.5px] text-[#9A9A9A]">
            {meta.label} · {output.slots.length}{" "}
            {output.slots.length === 1 ? "moment" : "momente"}
          </span>
        </span>
        <span className="text-[#9A9A9A] text-[13px]">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 pt-4 border-t border-[#E7E3F5]">
          {error && (
            <p className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
              {error}
            </p>
          )}

          {output.slots.length === 0 ? (
            <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-snug">
              Postarea n-are momente. Adaugă-i câteva la pasul „Ce iese".
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-[240px_1fr] gap-5 items-start">
              {/* Previzualizarea — LIVE sau randata, in ACELASI loc.
                  Inainte, rezultatul randat aparea jos printre setari; acum
                  apare unde te uiti oricum, fara sa sara pagina. */}
              <div>
                {isVideo && (
                  <div className="flex gap-1 mb-2 p-0.5 bg-[#F6F4FE] rounded-lg">
                    <button
                      type="button"
                      onClick={() => setShowRender(false)}
                      className={`flex-1 py-1 rounded-md text-[11.5px] transition ${
                        !showRender ? "bg-white text-[#1F1F1F] font-medium shadow-sm" : "text-[#6B6B6B]"
                      }`}
                    >
                      Live
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowRender(true)}
                      title="Randare reala, cu tranzitii"
                      className={`flex-1 py-1 rounded-md text-[11.5px] transition ${
                        showRender ? "bg-white text-[#1F1F1F] font-medium shadow-sm" : "text-[#6B6B6B]"
                      }`}
                    >
                      Rezultat final
                    </button>
                  </div>
                )}
                {isVideo && showRender ? (
                  <OutputReelPreview output={live} shots={shots} />
                ) : isVideo ? (
                  <OutputLivePreview
                    output={live}
                    shots={shots}
                    pinnedIdx={textSlotIdx}
                    onUnpin={() => setTextSlotIdx(null)}
                    onMoveLayer={(slotIdx, layerId, x, y) => {
                      writeSlots(
                        slots.map((s, i) =>
                          i !== slotIdx
                            ? s
                            : {
                                ...s,
                                textLayers: ((s.textLayers ?? []) as { id: string }[]).map((l) =>
                                  l.id === layerId ? { ...l, x, y } : l,
                                ),
                              },
                        ),
                      );
                    }}
                  />
                ) : (
                  <p className="text-[11.5px] text-[#9A9A9A] text-center py-8 leading-snug">
                    Previzualizarea pentru {meta.label.toLowerCase()} vine separat.
                  </p>
                )}
              </div>

              {/* Setarile — schimbarea se vede imediat in stanga */}
              <div className="flex flex-col gap-4 min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Filtru</label>
                    <select
                      value={filter}
                      onChange={(e) => {
                        setFilter(e.target.value);
                        save({ filter: e.target.value || null });
                      }}
                      disabled={disabled}
                      className="input"
                    >
                      <option value="">Fără filtru</option>
                      {FILTERS.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {isVideo && (
                    <div>
                      <label className="label">Tranziție între momente</label>
                      <select
                        value={transition}
                        onChange={(e) => {
                          setTransition(e.target.value);
                          save({ transition: e.target.value || null });
                        }}
                        disabled={disabled}
                        className="input"
                      >
                        <option value="">Implicit (fade)</option>
                        {TRANSITIONS.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div>
                  <label className="label">
                    Caption{" "}
                    <span className="text-[#9A9A9A] normal-case tracking-normal">
                      (stilista îl poate schimba)
                    </span>
                  </label>
                  <textarea
                    defaultValue={output.caption ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (output.caption ?? "")) save({ caption: v || null });
                    }}
                    rows={3}
                    placeholder={
                      output.kind === "stories"
                        ? "Text scurt pentru story…"
                        : "Textul care însoțește postarea…"
                    }
                    disabled={disabled}
                    className="input resize-none leading-relaxed"
                  />
                </div>

                {isVideo && (
                  <OutputTextEditor
                    output={live}
                    shots={shots}
                    activeSlotIdx={textSlotIdx ?? 0}
                    onPickSlot={(i) => setTextSlotIdx(i)}
                    onChangeSlots={writeSlots}
                    disabled={disabled}
                  />
                )}

                <div>
                  <div className="text-[10px] tracking-[0.18em] uppercase text-[#9A9A9A] mb-1.5">
                    Momentele acestei postări
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {output.slots.map((s, i) => (
                      <span
                        key={`${s.slot}-${i}`}
                        className="text-[11.5px] px-2.5 py-1 rounded-full bg-[#F6F4FE] border border-[#EDE8FF] text-[#6B6B6B]"
                      >
                        {i + 1}. {titleOf(s.slot)}
                        {s.sec ? ` · ${s.sec}s` : ""}
                      </span>
                    ))}
                  </div>
                </div>

                {pending && (
                  <span className="text-[9px] tracking-[0.2em] uppercase text-[#9A9A9A]">
                    salvez…
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
