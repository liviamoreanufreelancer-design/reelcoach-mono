"use client";
/**
 * OutputsEditor — jumătatea "ce iese" din editorul de sesiune (migrația 014).
 *
 * Stânga (ScenesEditor) = momentele care se filmează.
 * Aici = postările care ies din ele, fiecare cu momentele care o compun.
 *
 * Relația e many-to-many: un moment intră în mai multe postări, o postare
 * cere mai multe momente. Legătura se face prin `slot_key`, nu prin `shots.id`
 * — publicarea recreează scenele cu id-uri noi.
 *
 * Regula "niciodată zero" nu e programată nicăieri: rezultă din legături.
 * Dacă stilista a filmat 5 din 8 momente, postările complete apar singure.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Film, Images, Layers } from "lucide-react";
import { createOutput, updateOutput, deleteOutput } from "@/lib/template-actions";
import type { OutputRow, OutputKind, OutputSlot, ShotRow } from "@/lib/db-types";

const KINDS: { id: OutputKind; label: string; hint: string; Icon: typeof Film }[] = [
  { id: "reel", label: "Reel", hint: "Montaj video din mai multe momente", Icon: Film },
  { id: "carousel", label: "Carusel", hint: "Set de imagini", Icon: Images },
  { id: "stories", label: "Story-uri", hint: "Clipurile brute, fără montaj", Icon: Layers },
];

/** Ce poate oferi fiecare moment: filmare, poză, sau ambele. */
function slotOptions(shots: ShotRow[]) {
  return shots
    .filter((s) => s.slot_key)
    .map((s) => ({
      key: s.slot_key as string,
      label: s.title || s.slot_key || "",
      kind: s.capture_kind,
    }));
}

export default function OutputsEditor({
  templateId,
  shots,
  outputs,
  disabled,
}: {
  templateId: string;
  shots: ShotRow[];
  outputs: OutputRow[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const options = slotOptions(shots);

  const run = (fn: () => Promise<void>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  const addOutput = () => run(() => createOutput(templateId, "Postare nouă", "reel"));

  const patch = (o: OutputRow, p: Parameters<typeof updateOutput>[2]) =>
    run(() => updateOutput(o.id, templateId, p));

  const addSlot = (o: OutputRow, slot: string) =>
    patch(o, { slots: [...o.slots, { slot, sec: undefined }] });

  const removeSlot = (o: OutputRow, i: number) =>
    patch(o, { slots: o.slots.filter((_, x) => x !== i) });

  const moveSlot = (o: OutputRow, i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= o.slots.length) return;
    const next = [...o.slots];
    [next[i], next[j]] = [next[j], next[i]];
    patch(o, { slots: next });
  };

  const setSec = (o: OutputRow, i: number, sec: number | undefined) =>
    patch(o, { slots: o.slots.map((s, x) => (x === i ? { ...s, sec } : s)) });

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[#5B34FF] text-[17px]">◈</span>
          <span className="text-[15px] font-semibold text-[#1F1F1F]">Ce iese din sesiune</span>
        </div>
        {pending && (
          <span className="text-[9px] tracking-[0.2em] uppercase text-[#9A9A9A]">salvez…</span>
        )}
      </div>
      <p className="text-[12px] text-[#6B6B6B] mb-4 leading-snug">
        Fiecare postare spune din ce momente e făcută. Un moment poate intra în mai
        multe postări.
      </p>

      {error && (
        <p className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      {options.length === 0 && (
        <p className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3 leading-snug">
          Momentele n-au încă etichete. Completează „Eticheta momentului" la fiecare
          scenă — cu ele se construiesc postările.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {outputs.map((o) => {
          const used = new Set(o.slots.map((s) => s.slot));
          const available = options.filter((opt) => !used.has(opt.key));
          const totalSec = o.slots.reduce((sum, s) => sum + (s.sec ?? 0), 0);

          return (
            <div key={o.id} className="rounded-xl bg-[#F6F4FE] border border-[#EDE8FF] p-3.5">
              {/* Nume + tip + stergere */}
              <div className="flex gap-2 mb-2.5">
                <input
                  type="text"
                  defaultValue={o.name}
                  onBlur={(e) => {
                    if (e.target.value !== o.name) patch(o, { name: e.target.value });
                  }}
                  className="input flex-1 !mb-0 font-medium"
                  disabled={disabled}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!confirm(`Ștergi „${o.name}"? Momentele filmate rămân neatinse.`)) return;
                    run(() => deleteOutput(o.id, templateId));
                  }}
                  disabled={disabled}
                  aria-label="Șterge postarea"
                  className="shrink-0 w-9 rounded-lg text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-40 text-[15px]"
                >
                  ×
                </button>
              </div>

              <div className="flex gap-1.5 mb-3">
                {KINDS.map((k) => (
                  <button
                    key={k.id}
                    type="button"
                    title={k.hint}
                    onClick={() => patch(o, { kind: k.id })}
                    disabled={disabled}
                    className={`flex-1 py-1.5 rounded-lg text-[11.5px] transition inline-flex items-center justify-center gap-1.5 disabled:opacity-40 ${
                      o.kind === k.id
                        ? "bg-[#5B34FF] text-white font-medium"
                        : "bg-white border border-[#E7E3F5] text-[#6B6B6B] hover:text-[#1F1F1F]"
                    }`}
                  >
                    <k.Icon className="w-3.5 h-3.5" />
                    {k.label}
                  </button>
                ))}
              </div>

              {/* Momentele, in ordinea montajului */}
              {o.slots.length === 0 ? (
                <p className="text-[11.5px] text-[#9A9A9A] py-1.5">
                  Niciun moment. Adaugă mai jos.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5 mb-2">
                  {o.slots.map((s, i) => {
                    const opt = options.find((x) => x.key === s.slot);
                    return (
                      <div
                        key={`${s.slot}-${i}`}
                        className="flex items-center gap-2 bg-white border border-[#E7E3F5] rounded-lg px-2.5 py-1.5"
                      >
                        <span className="text-[10px] text-[#9A9A9A] tabular-nums w-4">{i + 1}</span>
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveSlot(o, i, -1)}
                            disabled={disabled || i === 0}
                            aria-label="Mai sus"
                            className="text-[#9A9A9A] hover:text-[#5B34FF] disabled:opacity-25 leading-none text-[10px]"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            onClick={() => moveSlot(o, i, 1)}
                            disabled={disabled || i === o.slots.length - 1}
                            aria-label="Mai jos"
                            className="text-[#9A9A9A] hover:text-[#5B34FF] disabled:opacity-25 leading-none text-[10px]"
                          >
                            ▼
                          </button>
                        </div>
                        <span className="flex-1 min-w-0 text-[12.5px] text-[#1F1F1F] truncate">
                          {opt?.label ?? s.slot}
                          {!opt && (
                            <span className="text-rose-600 ml-1.5 text-[11px]">
                              (momentul nu mai există)
                            </span>
                          )}
                        </span>
                        {o.kind === "reel" && (
                          <input
                            type="number"
                            min={0.5}
                            max={30}
                            step={0.5}
                            defaultValue={s.sec ?? ""}
                            placeholder="tot"
                            onBlur={(e) => {
                              const v = e.target.value.trim();
                              setSec(o, i, v === "" ? undefined : Number(v));
                            }}
                            disabled={disabled}
                            title="Secunde în această postare"
                            className="w-14 text-[12px] text-right bg-[#F8F8FA] border border-[#E7E3F5] rounded px-1.5 py-1 tabular-nums"
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => removeSlot(o, i)}
                          disabled={disabled}
                          aria-label="Scoate momentul"
                          className="shrink-0 text-[#C88] hover:text-[#A44] disabled:opacity-40"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Adauga moment */}
              {available.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) addSlot(o, e.target.value);
                    e.target.value = "";
                  }}
                  disabled={disabled}
                  className="input !mb-0 text-[12px]"
                >
                  <option value="">+ Adaugă moment…</option>
                  {available.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                      {opt.kind === "photo" ? " (poză)" : opt.kind === "both" ? " (filmare + poză)" : ""}
                    </option>
                  ))}
                </select>
              )}

              {o.kind === "reel" && totalSec > 0 && (
                <p className="text-[11px] text-[#6B6B6B] mt-2 tabular-nums">
                  Durată: ~{totalSec.toFixed(1)}s
                </p>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addOutput}
        disabled={disabled}
        className="mt-3 w-full py-2.5 rounded-lg text-[13px] font-medium bg-white border border-dashed border-[#D8D0F5] text-[#5B34FF] hover:bg-[#F6F4FE] transition disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
      >
        <Plus className="w-4 h-4" /> Adaugă postare
      </button>
    </div>
  );
}
