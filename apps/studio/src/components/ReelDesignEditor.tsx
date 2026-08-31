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
import { framesAsShots, isLegacyFrameKey } from "@/lib/design-frames";
import { PHOTO_ASPECT, VIDEO_ASPECT, isImageUrl } from "@/lib/media-display";
import type { ReelDesignRow, OutputSlot, MediaAsset, ShotType } from "@/lib/db-types";
import MediaPicker from "./MediaPicker";
import ShotTypePicker from "./ShotTypePicker";
import CarouselPostPreview from "./CarouselPostPreview";
import OutputSceneEditor from "./OutputSceneEditor";
import OutputReelPreview from "./OutputReelPreview";

/** Cuvintele se schimbă cu felul rezultatului — nu doar controalele. */
const WORDS = {
  reel:     { one: "moment", many: "momente", list: "Momentele reelului",   render: "Vezi tot reelul" },
  carousel: { one: "imagine", many: "imagini", list: "Imaginile caruselului", render: "Vezi postarea" },
  stories:  { one: "poveste", many: "povești", list: "Poveștile",           render: "" },
} as const;

export default function ReelDesignEditor({ design }: { design: ReelDesignRow }) {
  const kind = design.kind ?? "reel";
  /**
   * O poveste NU e un reel mai scurt.
   *
   * Un reel e un fișier montat din mai multe momente; o variantă de povești e
   * mai multe fișiere, câte unul per moment, postate una după alta. Deci n-are
   * tranziții (n-au între ce să fie) și n-are randare (momentul brut E
   * rezultatul). Fiecare rând de mai jos e un output separat, nu o bucată
   * dintr-unul.
   */
  const isMontage = kind === "reel";
  const words = WORDS[kind] ?? WORDS.reel;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>(design.filter ?? "");
  const [slots, setSlots] = useState<OutputSlot[]>(design.slots);
  const [coverSlot, setCoverSlot] = useState<string | null>(design.cover_slot);
  const [activeIdx, setActiveIdx] = useState(0);
  const [showRender, setShowRender] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  /** Ce cadru își alege tipul acum. null = dialogul e închis. */
  const [typeForIdx, setTypeForIdx] = useState<number | null>(null);
  const [types, setTypes] = useState<ShotType[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickTargetRef = useRef<number | null>(null);

  useEffect(() => { setSlots(design.slots); }, [design.slots]);

  // Catalogul, o dată: numele afișate ale cadrelor vin de aici, nu din slot.
  useEffect(() => {
    const sb = getSupabaseBrowserClient();
    void sb.from("shot_types").select("*").order("sort_order")
      .then(({ data }) => setTypes((data ?? []) as ShotType[]));
  }, []);
  const typeName = (slot: string) => types.find((t) => t.id === slot)?.name ?? slot;

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

  /**
   * Un cadru nu se mai adaugă gol: îți alegi întâi TIPUL din catalog.
   * Tipul e cheia care leagă cadrul de momentul filmat, deci nu poate fi
   * decis mai târziu fără să rămână un cadru care nu trimite nicăieri.
   */
  const addFrame = () => setTypeForIdx(-1);

  const onTypeChosen = (type: ShotType) => {
    const i = typeForIdx;
    setTypeForIdx(null);
    if (i === null) return;
    if (i < 0) {
      const next = [...slots, { slot: type.id, sec: 2, label: type.name }];
      writeSlots(next);
      setActiveIdx(next.length - 1);
      return;
    }
    // Schimbarea tipului unui cadru existent îi păstrează durata și stilul —
    // se schimbă ce se filmează, nu cum arată.
    writeSlots(slots.map((s, x) => (x === i ? { ...s, slot: type.id, label: type.name } : s)));
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

  /**
   * Filmarea vine din BIBLIOTECĂ, nu de pe disc.
   *
   * Înainte fiecare cadru urca fișierul lui, deci aceeași „mișcare de păr"
   * folosită în zece variante însemna zece urcări și zece fișiere identice.
   * Dialogul are și el buton de urcare — dar după listă, ca să te uiți întâi
   * la ce există.
   */
  const pickVideo = (i: number) => {
    pickTargetRef.current = i;
    setPickerOpen(true);
  };

  const onPicked = (asset: MediaAsset) => {
    const i = pickTargetRef.current;
    if (i === null || !slots[i]) return;
    writeSlotsNow(slots.map((s, x) => (x === i ? { ...s, demoUrl: asset.url } : s)));
    setActiveIdx(i);
  };

  return (
    <div className="card overflow-hidden">
      <ShotTypePicker
        open={typeForIdx !== null}
        types={types}
        used={new Set(slots.map((s) => s.slot))}
        onClose={() => setTypeForIdx(null)}
        onPick={onTypeChosen}
        onCreated={(t) => { setTypes((cur) => [...cur, t].sort((a, b) => a.sort_order - b.sort_order)); onTypeChosen(t); }}
      />

      <MediaPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPick={onPicked}
        // Caruselul cere poze, reelul filmări. Poveștile pot fi și una, și
        // alta — deci acolo nu presupunem nimic și le arătăm pe toate.
        prefer={kind === "carousel" ? "image" : kind === "stories" ? "all" : "video"}
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
              {words.list}
            </span>
            <span className="text-[11px] text-[#9A9A9A] tabular-nums">
              {pending ? "salvez…" : totalSec > 0 ? `~${totalSec.toFixed(1)}s` : ""}
            </span>
          </div>

          {slots.length === 0 ? (
            <p className="text-[12px] text-[#6B6B6B] py-2 leading-relaxed">
              Niciunul încă. Adaugă primul, alege ce moment e, și pune-i o
              filmare de probă din Materiale.
            </p>
          ) : (
            <div className="flex flex-col gap-1.5">
              {slots.map((s, i) => {
                const active = i === activeIdx;
                const isCover = s.slot === effectiveCover;

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

                    {/* Tipul de cadru — vine din catalog. Instrucțiunile lui
                        ajung în orice șablon care cere cadrul, scrise o dată. */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setTypeForIdx(i); }}
                      title="Schimbă tipul de cadru"
                      className="flex-1 min-w-0 text-left text-[12.5px] truncate hover:text-[#5B34FF] transition"
                    >
                      {typeName(s.slot)}
                      {isLegacyFrameKey(s.slot) && (
                        <span className="ml-1.5 text-[10.5px] text-amber-600">
                          fără tip — alege unul
                        </span>
                      )}
                    </button>

                    {s.sec ? (
                      <span className="text-[11px] text-[#6B6B6B] tabular-nums">{s.sec}s</span>
                    ) : null}

                    {/* Filmarea de proba */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); pickVideo(i); }}
                      title={
                        s.demoUrl
                          ? "Schimbă materialul de probă"
                          : kind === "carousel"
                            ? "Alege o poză din Materiale"
                            : kind === "stories"
                              ? "Alege o filmare sau o poză din Materiale"
                              : "Alege o filmare din Materiale"
                      }
                      className={`shrink-0 inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border transition ${
                        s.demoUrl
                          ? "text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100"
                          : "text-[#5B34FF] border-[#D8D0F5] bg-white hover:bg-[#EDE8FF]"
                      }`}
                    >
                      {s.demoUrl
                        ? <Check className="w-3.5 h-3.5" strokeWidth={2.4} />
                        : <Upload className="w-3.5 h-3.5" />}
                      {s.demoUrl
                        ? (isImageUrl(s.demoUrl) ? "poză" : "filmare")
                        : kind === "carousel"
                          ? "alege poză"
                          : kind === "stories"
                            ? "alege material"
                            : "alege filmare"}
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
            <Plus className="w-4 h-4" /> Adaugă {words.one}
          </button>
        </div>

        {/* Acelasi editor ca la rezultate — o singura implementare */}
        {slots.length > 0 && isMontage && (
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
                {words.render}
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
                onRequestVideo={() => pickVideo(Math.min(activeIdx, slots.length - 1))}
              />
            )}
          </>
        )}

        {/* Caruselul are și el două vederi, dar a doua nu e o randare: e
            POSTAREA. Un carusel se judecă pe cum stau pozele una lângă alta
            și pe cum citește textul deasupra lor — nimic din astea nu se vede
            uitându-te la un cadru odată. Poveștile n-au a doua vedere:
            fiecare e un fișier separat, deci cadrul E rezultatul. */}
        {slots.length > 0 && kind === "carousel" && (
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
              {words.render}
            </button>
          </div>
        )}

        {slots.length > 0 && kind === "carousel" && showRender && (
          <CarouselPostPreview output={live} shots={shots} caption={design.caption} />
        )}

        {slots.length > 0 && !isMontage && !(kind === "carousel" && showRender) && (
          <OutputSceneEditor
            output={live}
            shots={shots}
            idx={Math.min(activeIdx, slots.length - 1)}
            onChangeSlots={writeSlots}
            disabled={false}
            onRequestVideo={() => pickVideo(Math.min(activeIdx, slots.length - 1))}
            // Caruselul e mereu imagini, în 4:5. Poveștile sunt 9:16 și pot
            // fi ORICE — o imagine sau o filmare, hotărât per moment, după
            // materialul ales. De asta nu se forțează nimic acolo.
            forceStills={kind === "carousel"}
            aspect={kind === "carousel" ? PHOTO_ASPECT : VIDEO_ASPECT}
          />
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
