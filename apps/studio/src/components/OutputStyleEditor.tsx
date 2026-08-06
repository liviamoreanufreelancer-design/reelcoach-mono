"use client";
/**
 * OutputStyleEditor — pasul 3: cum arată fiecare postare.
 *
 * Stilul stă pe POSTARE, nu pe moment (migrația 015). Motivul e că același
 * moment are roluri diferite în postări diferite: „mișcarea părului" e urmată
 * de after în „Transformarea", e ultima în „Procesul" și prima în „Rezultatul".
 * O tranziție setată pe moment n-ar putea fi corectă în toate trei.
 *
 * Aici se setează IMPLICITELE postării — o singură decizie de fiecare.
 * Excepțiile per moment vin separat, ca să nu transformăm 9 momente în ~24 de
 * decizii de stil (vezi CLAUDE.md, economia muncii partenerei).
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Film, Images, Layers } from "lucide-react";
import { updateOutput } from "@/lib/template-actions";
import { FILTERS, TRANSITIONS } from "@/lib/options";
import type { OutputRow, ShotRow } from "@/lib/db-types";
import OutputReelPreview from "./OutputReelPreview";

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
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(outputs[0]?.id ?? null);

  const titleOf = (slotKey: string) =>
    shots.find((s) => s.slot_key === slotKey)?.title || slotKey;

  const patch = (o: OutputRow, p: Parameters<typeof updateOutput>[2]) => {
    setError(null);
    startTransition(async () => {
      try {
        await updateOutput(o.id, templateId, p);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

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
      {error && (
        <p className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {outputs.map((o) => {
        const meta = KIND_META[o.kind] ?? KIND_META.reel;
        const isOpen = openId === o.id;
        const isVideo = o.kind === "reel";

        return (
          <div key={o.id} className="card overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : o.id)}
              className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F8F8FA] transition"
            >
              <span className="w-9 h-9 shrink-0 grid place-items-center rounded-[11px] bg-[#EDE8FF] text-[#5B34FF]">
                <meta.Icon className="w-[18px] h-[18px]" strokeWidth={1.8} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14.5px] font-semibold text-[#1F1F1F] truncate">
                  {o.name}
                </span>
                <span className="block text-[11.5px] text-[#9A9A9A]">
                  {meta.label} · {o.slots.length}{" "}
                  {o.slots.length === 1 ? "moment" : "momente"}
                </span>
              </span>
              <span className="text-[#9A9A9A] text-[13px]">{isOpen ? "▲" : "▼"}</span>
            </button>

            {isOpen && (
              <div className="px-5 pb-5 pt-1 border-t border-[#E7E3F5] flex flex-col gap-4">
                {o.slots.length === 0 && (
                  <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-snug">
                    Postarea n-are momente. Adaugă-i câteva la pasul „Ce iese".
                  </p>
                )}

                {/* Previzualizarea acestei postari — vezi, nu doar seteaza. */}
                {isVideo && o.slots.length > 0 && (
                  <OutputReelPreview output={o} shots={shots} />
                )}

                {/* Look-ul postării: o singură decizie, nu una per moment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Filtru</label>
                    <select
                      value={o.filter ?? ""}
                      onChange={(e) => patch(o, { filter: e.target.value || null })}
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
                        value={o.transition ?? ""}
                        onChange={(e) => patch(o, { transition: e.target.value || null })}
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

                {/* Caption — pentru poze e chiar conținutul postării */}
                <div>
                  <label className="label">
                    Caption{" "}
                    <span className="text-[#9A9A9A] normal-case tracking-normal">
                      (stilista îl poate schimba)
                    </span>
                  </label>
                  <textarea
                    defaultValue={o.caption ?? ""}
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (v !== (o.caption ?? "")) patch(o, { caption: v || null });
                    }}
                    rows={3}
                    placeholder={
                      o.kind === "stories"
                        ? "Text scurt pentru story…"
                        : "Textul care însoțește postarea…"
                    }
                    disabled={disabled}
                    className="input resize-none leading-relaxed"
                  />
                </div>

                {/* Momentele, doar ca reper — se editeaza la pasul 2 */}
                {o.slots.length > 0 && (
                  <div>
                    <div className="text-[10px] tracking-[0.18em] uppercase text-[#9A9A9A] mb-1.5">
                      Momentele acestei postări
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {o.slots.map((s, i) => (
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
                )}

                {pending && (
                  <span className="text-[9px] tracking-[0.2em] uppercase text-[#9A9A9A]">
                    salvez…
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
