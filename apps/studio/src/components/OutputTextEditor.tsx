"use client";
/**
 * OutputTextEditor — textul de pe fiecare moment, în CADRUL unei postări.
 *
 * Textul e singurul element de stil care trebuie să fie integral per postare:
 * peste exact același cadru, „Transformarea" scrie ZIUA 1 și „Procesul" scrie
 * Pasul 2. De aceea straturile stau în `slots[].textLayers`, nu pe scenă.
 *
 * Stă în jsonb, deci n-a cerut migrație — vezi 015.
 */
import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { TextLayer } from "@reelcoach/core";
import type { OutputRow, OutputSlot, ShotRow } from "@/lib/db-types";

const TEXT_FONTS = [
  { id: "hookBold", label: "Hook Bold" },
  { id: "luxurySerif", label: "Luxury Serif" },
  { id: "bubblePill", label: "Bubble Pill" },
  { id: "subtitleOutline", label: "Subtitrare" },
  { id: "badgeGold", label: "Badge Gold" },
  { id: "brandSoft", label: "Soft Pink" },
];

const SWATCHES = ["#FFFFFF", "#000000", "#5B34FF", "#F5B228", "#FF3D9A"];

export default function OutputTextEditor({
  output,
  shots,
  activeSlotIdx,
  onPickSlot,
  onChangeSlots,
  disabled,
}: {
  output: OutputRow;
  shots: ShotRow[];
  /** Momentul pe care se lucrează — ținut sus, ca previzualizarea să-l arate. */
  activeSlotIdx: number;
  onPickSlot: (i: number) => void;
  onChangeSlots: (slots: OutputSlot[]) => void;
  disabled: boolean;
}) {
  const [openPicker, setOpenPicker] = useState<string | null>(null);

  const titleOf = (slotKey: string) =>
    shots.find((s) => s.slot_key === slotKey)?.title || slotKey;

  const slot = output.slots[activeSlotIdx];
  const layers: TextLayer[] = (slot?.textLayers as TextLayer[] | undefined) ?? [];

  const writeLayers = (next: TextLayer[]) => {
    onChangeSlots(
      output.slots.map((s, i) =>
        i === activeSlotIdx ? { ...s, textLayers: next.length > 0 ? next : undefined } : s,
      ),
    );
  };

  const addLayer = () => {
    const n: TextLayer = {
      id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
      text: "Text nou",
      presetId: "hookBold",
      x: 0.5,
      y: Math.min(0.85, 0.2 + layers.length * 0.18),
    };
    writeLayers([...layers, n]);
  };

  const patchLayer = (id: string, patch: Partial<TextLayer>) =>
    writeLayers(layers.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const removeLayer = (id: string) => writeLayers(layers.filter((l) => l.id !== id));

  if (output.slots.length === 0) return null;

  return (
    <div className="rounded-xl bg-[#F6F4FE] border border-[#EDE8FF] p-3.5">
      <div className="text-[10px] tracking-[0.18em] uppercase text-[#5B34FF]/85 mb-2.5">
        ✦ Text pe video
      </div>

      {/* Pe care moment scriem. Selectia conduce si previzualizarea. */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {output.slots.map((s, i) => {
          const count = ((s.textLayers as TextLayer[] | undefined) ?? []).length;
          const active = i === activeSlotIdx;
          return (
            <button
              key={`${s.slot}-${i}`}
              type="button"
              onClick={() => onPickSlot(i)}
              className={`text-[11.5px] px-2.5 py-1 rounded-full border transition ${
                active
                  ? "bg-[#5B34FF] border-[#5B34FF] text-white font-medium"
                  : "bg-white border-[#E7E3F5] text-[#6B6B6B] hover:text-[#1F1F1F]"
              }`}
            >
              {i + 1}. {titleOf(s.slot)}
              {count > 0 && (
                <span className={active ? "text-white/75" : "text-[#5B34FF]"}> · {count}</span>
              )}
            </button>
          );
        })}
      </div>

      {layers.length === 0 && (
        <p className="text-[11.5px] text-[#9A9A9A] py-1.5">
          Niciun text pe „{titleOf(slot?.slot ?? "")}". Apasă „+ Adaugă text".
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {layers.map((layer) => (
          <div key={layer.id} className="rounded-lg bg-white border border-[#E7E3F5] p-2.5">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={layer.text}
                onChange={(e) => patchLayer(layer.id, { text: e.target.value })}
                placeholder="Scrie textul…"
                className="input flex-1 !mb-0"
                disabled={disabled}
              />
              <button
                type="button"
                onClick={() => removeLayer(layer.id)}
                disabled={disabled}
                aria-label="Șterge textul"
                className="shrink-0 w-9 rounded-lg text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 disabled:opacity-40 text-[15px]"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <select
                value={layer.presetId}
                onChange={(e) => patchLayer(layer.id, { presetId: e.target.value })}
                className="input !mb-0 text-[12px]"
                disabled={disabled}
              >
                {TEXT_FONTS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-[#9A9A9A] shrink-0">Mărime</span>
                <input
                  type="range"
                  min={0.5}
                  max={2}
                  step={0.1}
                  value={layer.sizeScale ?? 1}
                  onChange={(e) => patchLayer(layer.id, { sizeScale: Number(e.target.value) })}
                  className="flex-1 accent-[#5B34FF]"
                  disabled={disabled}
                />
              </div>
            </div>

            <div className="flex gap-1.5 items-center">
              {(
                [
                  { key: "bold", label: "B", cls: "font-bold" },
                  { key: "italic", label: "I", cls: "italic" },
                  { key: "underline", label: "U", cls: "underline" },
                ] as const
              ).map((b) => {
                const on = Boolean(layer[b.key]);
                return (
                  <button
                    key={b.key}
                    type="button"
                    onClick={() => patchLayer(layer.id, { [b.key]: !on })}
                    disabled={disabled}
                    className={`w-8 h-8 rounded-lg text-[13px] ${b.cls} transition disabled:opacity-40 ${
                      on
                        ? "bg-[#5B34FF] text-white"
                        : "bg-white border border-[#E7E3F5] text-[#6B6B6B] hover:text-[#1F1F1F]"
                    }`}
                  >
                    {b.label}
                  </button>
                );
              })}

              <span className="w-px h-6 bg-[#E7E3F5] mx-1" />

              {SWATCHES.map((c) => {
                const on = (layer.color ?? "#FFFFFF").toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => patchLayer(layer.id, { color: c })}
                    disabled={disabled}
                    title={c}
                    className={`w-6 h-6 rounded-full border transition disabled:opacity-40 ${
                      on ? "ring-2 ring-[#5B34FF] ring-offset-1 border-white" : "border-[#E7E3F5]"
                    }`}
                    style={{ background: c }}
                  />
                );
              })}
              <label
                className="relative w-6 h-6 rounded-full border border-[#E7E3F5] overflow-hidden cursor-pointer"
                title="Altă culoare"
              >
                <span
                  className="absolute inset-0"
                  style={{
                    background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
                  }}
                />
                <input
                  type="color"
                  value={layer.color ?? "#FFFFFF"}
                  onChange={(e) => patchLayer(layer.id, { color: e.target.value })}
                  onFocus={() => setOpenPicker(layer.id)}
                  onBlur={() => setOpenPicker(null)}
                  disabled={disabled}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </label>
              {openPicker === layer.id && (
                <span className="text-[10px] text-[#9A9A9A]">alege…</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addLayer}
        disabled={disabled}
        className="mt-2.5 text-[11.5px] font-medium text-[#5B34FF] hover:text-[#4826CC] disabled:opacity-40 inline-flex items-center gap-1"
      >
        <Plus className="w-3.5 h-3.5" /> Adaugă text
      </button>

      <p className="text-[10.5px] text-[#9A9A9A] mt-2 leading-snug">
        Trage textul direct pe previzualizare ca să-l poziționezi.
      </p>
    </div>
  );
}
