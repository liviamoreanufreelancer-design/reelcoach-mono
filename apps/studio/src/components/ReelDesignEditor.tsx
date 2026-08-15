"use client";
/**
 * ReelDesignEditor — editorul unei variante din bibliotecă.
 *
 * DIFERENȚA FAȚĂ DE REZULTATE, și e cea care contează: aici varianta nu
 * compune momente existente, ci LE DEFINEȘTE. Partenera adaugă cadre, îi dă
 * fiecăruia un nume și urcă o filmare de probă. Numele devine cerința pe care
 * o umple mai târziu filmarea stilistei; filmarea de probă e doar materialul
 * pe care proiectează.
 *
 * Ordinea e deci: întâi se construiește varianta, apoi se aplică pe ce
 * filmează stilista. Nu invers.
 *
 * Editorul propriu-zis e ACELAȘI, nu o copie: `OutputSceneEditor` și
 * `OutputReelPreview` lucrează pe forme înguste (`Composition`, `ShotLike`),
 * iar cadrele variantei sunt împachetate ca momente prin `framesAsShots`.
 * O a doua copie ar începe să dea drift din prima săptămână — aceeași
 * disciplină ca „preview = export".
 *
 * Restul deosebirilor:
 *   - scrie în `reel_designs`, nu în `outputs` (deci nu poate ajunge din
 *     greșeală în pachetul stilistei)
 *   - are „Duplică" — fără el, cele 10 variante sunt de zece ori munca
 *   - are tipul, editabil: dacă vezi la a treia că e de fapt alt tip, o muți
 */
import { useEffect, useRef, useState, useTransition } from "react";
import { X, Copy, Trash2, Upload, Plus, Check } from "lucide-react";
import {
  updateReelDesign,
  duplicateReelDesign,
  deleteReelDesign,
} from "@/lib/template-actions";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { FILTERS } from "@/lib/options";
import { framesAsShots, newFrameKey } from "@/lib/design-frames";
import type { ReelDesignRow, OutputSlot } from "@/lib/db-types";
import OutputSceneEditor from "./OutputSceneEditor";
import OutputReelPreview from "./OutputReelPreview";

export default function ReelDesignEditor({ design }: { design: ReelDesignRow }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(design.filter ?? "");
  const [slots, setSlots] = useState<OutputSlot[]>(design.slots);
  const [coverSlot, setCoverSlot] = useState<string | null>(design.cover_slot);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showRender, setShowRender] = useState(false);
  /** Ce cadru se urcă acum — indexul, ca să arătăm starea pe rândul lui. */
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pickTargetRef = useRef<number | null>(null);

  useEffect(() => { setSlots(design.slots); }, [design.slots]);

  const shots = framesAsShots(slots);
  const live = {
    slots,
    filter: filter || null,
    transition: design.transition,
    cover_slot: coverSlot,
  };
  const totalSec = slots.reduce((sum, s) => sum + (s.sec ?? 0), 0);
  const withVideo = slots.filter((s) => s.demoUrl).length;
  const effectiveCover = slots.some((s) => s.slot === coverSlot)
    ? coverSlot
    : slots[0]?.slot ?? null;

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

  /** Scriere locală imediată + salvare amânată, ca editorul să nu se blocheze. */
  const writeSlots = (next: OutputSlot[]) => {
    setSlots(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save({ slots: next }), 600);
  };
  /** Salvare imediată — pentru urcări, unde amânarea ar putea pierde URL-ul. */
  const writeSlotsNow = (next: OutputSlot[]) => {
    setSlots(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    save({ slots: next });
  };

  const addFrame = () => {
    const next = [...slots, { slot: newFrameKey(slots), sec: 2, label: "" }];
    writeSlots(next);
    setActiveIdx(next.length - 1);
  };
  const removeFrame = (i: number) => {
    writeSlots(slots.filter((_, x) => x !== i));
    setActiveIdx((cur) => Math.max(0, Math.min(cur, slots.length - 2)));
  };
  const moveFrame = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= slots.length) return;
    const next = [...slots];
    [next[i], next[j]] = [next[j], next[i]];
    writeSlots(next);
    setActiveIdx(j);
  };
  const patchFrame = (i: number, p: Partial<OutputSlot>) => {
    writeSlots(slots.map((s, x) => (x === i ? { ...s, ...p } : s)));
  };

  const pickVideo = (i: number) => {
    pickTargetRef.current = i;
    fileInputRef.current?.click();
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const i = pickTargetRef.current;
    e.target.value = "";
    if (!file || i === null || !slots[i]) return;

    setUploadingIdx(i);
    setError(null);
    try {
      // Urcare DIRECT din browser: footage real de telefon depășește body-ul
      // unei server action (413). Prin acțiune trece doar URL-ul.
      const sb = getSupabaseBrowserClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const path = `designs/${design.id}/${slots[i].slot}-${Date.now()}.${ext}`;
      const { error: upErr } = await sb.storage
        .from("samples")
        .upload(path, file, { contentType: file.type || "video/mp4", upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = sb.storage.from("samples").getPublicUrl(path);
      writeSlotsNow(slots.map((s, x) => (x === i ? { ...s, demoUrl: pub.publicUrl } : s)));
      setActiveIdx(i);
    } catch (err) {
      // Fără asta, eșecul ar muri în tăcere: spinnerul dispare, cadrul pare
      // încărcat, dar n-are filmare — exact bifa falsă pe care am scos-o
      // din filmare.
      console.error("[design-upload] urcare esuata:", err);
      setError("Filmarea NU s-a urcat. Cadrul rămâne gol. Încearcă din nou.");
    } finally {
      setUploadingIdx(null);
    }
  };

  return (
    <div className="card overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={onFile}
        className="hidden"
      />

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
          className="input !mb-0 w-[150px] text-[12.5px]"
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

        {/* Cadrele: lista E si selectorul pentru editorul de dedesubt */}
        <div>
          <div className="flex items-baseline justify-between mb-1.5">
            <span className="text-[10px] tracking-[0.18em] uppercase text-[#9A9A9A]">
              Cadrele variantei
            </span>
            <span className="text-[11px] text-[#9A9A9A] tabular-nums">
              {pending ? "salvez…" : totalSec > 0 ? `~${totalSec.toFixed(1)}s` : ""}
            </span>
          </div>

          {slots.length === 0 ? (
            <p className="text-[12px] text-[#6B6B6B] py-2 leading-relaxed">
              Niciun cadru încă. Adaugă primul, dă-i un nume („before") și urcă
              o filmare de probă.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {slots.map((s, i) => {
                const active = i === activeIdx;
                const isCover = s.slot === effectiveCover;
                const busy = uploadingIdx === i;
                return (
                  <div
                    key={s.slot}
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
                        onClick={(e) => { e.stopPropagation(); moveFrame(i, -1); }}
                        disabled={i === 0}
                        aria-label="Mai sus"
                        className="text-[#9A9A9A] hover:text-[#5B34FF] disabled:opacity-25 leading-none text-[10px]"
                      >▲</button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); moveFrame(i, 1); }}
                        disabled={i === slots.length - 1}
                        aria-label="Mai jos"
                        className="text-[#9A9A9A] hover:text-[#5B34FF] disabled:opacity-25 leading-none text-[10px]"
                      >▼</button>
                    </div>

                    {/* Numele cadrului: cerinta pe care o umple filmarea stilistei */}
                    <input
                      type="text"
                      defaultValue={s.label ?? ""}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={(e) => {
                        const v = e.target.value.trim();
                        if (v !== (s.label ?? "")) patchFrame(i, { label: v });
                      }}
                      placeholder="numele cadrului (ex. before)"
                      className="flex-1 min-w-0 bg-transparent text-[12.5px] outline-none placeholder:text-[#B8B8C8] focus:bg-white focus:px-1.5 focus:rounded"
                    />

                    {s.sec ? (
                      <span className="text-[11px] text-[#6B6B6B] tabular-nums">{s.sec}s</span>
                    ) : null}

                    {/* Filmarea de proba */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); pickVideo(i); }}
                      disabled={busy}
                      title={s.demoUrl ? "Înlocuiește filmarea de probă" : "Urcă o filmare de probă"}
                      className={`shrink-0 inline-flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded transition ${
                        s.demoUrl
                          ? "text-emerald-700 hover:bg-emerald-50"
                          : "text-[#5B34FF] hover:bg-[#EDE8FF]"
                      }`}
                    >
                      {busy ? (
                        <span className="w-3 h-3 rounded-full border-2 border-[#C9C0E8] border-t-transparent animate-spin" />
                      ) : s.demoUrl ? (
                        <Check className="w-3.5 h-3.5" strokeWidth={2.4} />
                      ) : (
                        <Upload className="w-3.5 h-3.5" />
                      )}
                      {busy ? "urc…" : s.demoUrl ? "" : "filmare"}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCoverSlot(s.slot);
                        save({ cover_slot: s.slot });
                      }}
                      title={isCover ? "Cadrul care dă coperta" : "Folosește ca imagine de copertă"}
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
                      onClick={(e) => { e.stopPropagation(); removeFrame(i); }}
                      aria-label="Șterge cadrul"
                      className="shrink-0 text-[#C88] hover:text-[#A44]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={addFrame}
            className="mt-2 w-full py-2 rounded-lg text-[12.5px] font-medium bg-white border border-dashed border-[#D8D0F5] text-[#5B34FF] hover:bg-[#F6F4FE] transition inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Adaugă cadru
          </button>
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
                disabled={withVideo === 0}
                className={`px-4 py-1.5 rounded-md text-[12px] transition disabled:opacity-40 ${
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
