"use client";
/**
 * OutputSceneEditor — editorul unei postări, moment cu moment.
 *
 * Copiat după `LiveScenePreview`, care e mecanismul dovedit (canvas + tragere
 * + ghidaje). Diferența e UNDE se scrie: acolo pe scenă (`shots`), aici pe
 * momentul din ACEASTĂ postare (`output.slots[i]`).
 *
 * De ce contează: același moment are alt rol în fiecare postare. Peste exact
 * același cadru, „Transformarea" scrie ZIUA 1 și „Procesul" scrie Pasul 2; iar
 * „prima trăsătură" ține 2s într-una și 3s în cealaltă.
 *
 * Un moment o dată, ca la scene — editarea cere o imagine care stă pe loc.
 * Pentru vizionarea postării întregi există comutatorul „Rezultat final".
 */
import { useEffect, useRef, useState } from "react";
import { renderPreviewFrame, FILTERS, type TextLayer } from "@reelcoach/core";
import { TRANSITIONS } from "@/lib/options";
import type { OutputRow, OutputSlot, ShotRow, TransitionId } from "@/lib/db-types";

const W = 540;
const H = 960;
const SPEEDS = [0.25, 0.5, 0.75, 1.0, 1.5, 2.0];

const TEXT_FONTS = [
  { id: "hookBold", label: "Hook Bold" },
  { id: "luxurySerif", label: "Luxury Serif" },
  { id: "bubblePill", label: "Bubble Pill" },
  { id: "subtitleOutline", label: "Subtitrare" },
  { id: "badgeGold", label: "Badge Gold" },
  { id: "brandSoft", label: "Soft Pink" },
];
const SWATCHES = ["#FFFFFF", "#000000", "#5B34FF", "#F5B228", "#FF3D9A"];

export default function OutputSceneEditor({
  output,
  shots,
  onChangeSlots,
  disabled,
}: {
  output: OutputRow;
  shots: ShotRow[];
  onChangeSlots: (slots: OutputSlot[]) => void;
  disabled: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [guides, setGuides] = useState<{ v: boolean; h: boolean; vs: number[]; hs: number[] }>(
    { v: false, h: false, vs: [], hs: [] },
  );

  const slot: OutputSlot | undefined = output.slots[idx];
  const shot = shots.find((s) => s.slot_key === slot?.slot);
  const layers: TextLayer[] = (slot?.textLayers as TextLayer[] | undefined) ?? [];

  // Stilul efectiv: excepția momentului bate implicitul postării.
  const filterId = slot?.filter ?? output.filter ?? "none";
  const speed = slot?.speed ?? shot?.playback_speed ?? 1;
  const trimSec = slot?.sec ?? shot?.final_usage_duration ?? 2;
  const effectId = shot?.effect ?? "none";

  // Bucla de desenare citește prin ref, ca schimbările să apară la următorul
  // cadru fără s-o repornim (repornirea produce sclipiri și cadre negre).
  const layersRef = useRef(layers);
  const filterRef = useRef(filterId);
  const speedRef = useRef(speed);
  const trimRef = useRef(trimSec);
  const effectRef = useRef(effectId);
  useEffect(() => { layersRef.current = layers; });
  useEffect(() => { filterRef.current = filterId; }, [filterId]);
  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { trimRef.current = trimSec; }, [trimSec]);
  useEffect(() => { effectRef.current = effectId; }, [effectId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    let running = true;
    const loop = () => {
      if (!running) return;
      if (video.readyState >= 2) {
        if (video.playbackRate !== speedRef.current) video.playbackRate = speedRef.current;
        const full = video.duration || 4;
        const win = Math.min(trimRef.current || full, full);
        const start = Math.max(0, (full - win) / 2);
        const end = start + win;
        if (!video.paused && (video.currentTime < start || video.currentTime >= end)) {
          try { video.currentTime = start; } catch { /* not ready */ }
        }
        const local = Math.max(0, video.currentTime - start);
        renderPreviewFrame(canvas, video, {
          filter: FILTERS[filterRef.current as keyof typeof FILTERS] ?? FILTERS.none,
          effectId: effectRef.current,
          tNorm: win > 0 ? local / win : 0,
          localMs: local * 1000,
          clipMs: win * 1000,
          textLayers: layersRef.current.length > 0 ? layersRef.current : undefined,
        });
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      running = false;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Sursa video a momentului selectat.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const url = shot?.sample_video_url;
    if (url) {
      video.src = url;
      video.crossOrigin = "anonymous";
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.play().catch(() => {});
      setPaused(false);
    } else {
      video.removeAttribute("src");
      video.load();
    }
  }, [shot?.sample_video_url]);

  // ── Scriere în slot ──────────────────────────────────────────────────
  const patchSlot = (p: Partial<OutputSlot>) =>
    onChangeSlots(output.slots.map((s, i) => (i === idx ? { ...s, ...p } : s)));

  const writeLayers = (next: TextLayer[]) =>
    patchSlot({ textLayers: next.length > 0 ? next : undefined });

  const addLayer = () =>
    writeLayers([
      ...layers,
      {
        id: globalThis.crypto?.randomUUID?.() ?? String(Date.now()),
        text: "Text nou",
        presetId: "hookBold",
        x: 0.5,
        y: Math.min(0.9, 0.2 + layers.length * 0.18),
      },
    ]);

  const patchLayer = (id: string, p: Partial<TextLayer>) =>
    writeLayers(layers.map((l) => (l.id === id ? { ...l, ...p } : l)));

  const removeLayer = (id: string) => writeLayers(layers.filter((l) => l.id !== id));

  // ── Tragere + ghidaje, identic cu editorul de scene ──────────────────
  const SNAP = 0.02;

  const onDown = (e: React.PointerEvent) => {
    if (disabled || layers.length === 0) return;
    const stage = stageRef.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    let best: string | null = null;
    let bestD = Infinity;
    for (const l of layers) {
      const d = (l.x - px) ** 2 + (l.y - py) ** 2;
      if (d < bestD) { bestD = d; best = l.id; }
    }
    if (best && bestD < 0.18 * 0.18) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setDragId(best);
    }
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragId) return;
    const stage = stageRef.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    let x = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    let y = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));

    const others = layers.filter((l) => l.id !== dragId);
    const vs: number[] = [];
    const hs: number[] = [];
    let v = false;
    let h = false;
    if (Math.abs(x - 0.5) < SNAP) { x = 0.5; v = true; }
    if (Math.abs(y - 0.5) < SNAP) { y = 0.5; h = true; }
    for (const o of others) {
      if (Math.abs(x - o.x) < SNAP) { x = o.x; if (!vs.includes(o.x)) vs.push(o.x); }
      if (Math.abs(y - o.y) < SNAP) { y = o.y; if (!hs.includes(o.y)) hs.push(o.y); }
    }
    setGuides({ v, h, vs, hs });
    patchLayer(dragId, { x, y });
  };

  const onUp = (e: React.PointerEvent) => {
    if (!dragId) return;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    setDragId(null);
    setGuides({ v: false, h: false, vs: [], hs: [] });
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPaused(false); }
    else { v.pause(); setPaused(true); }
  };

  if (output.slots.length === 0) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-5 items-start">
      {/* STÂNGA: momentul curent */}
      <div className="flex flex-col gap-2">
        <div
          ref={stageRef}
          className="relative w-full rounded-2xl overflow-hidden bg-black border border-[#EDE8FF]"
          style={{ aspectRatio: "9 / 16", touchAction: "none" }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        >
          <canvas ref={canvasRef} width={W} height={H} className="absolute inset-0 w-full h-full object-cover" />
          <video ref={videoRef} className="hidden" playsInline muted />

          {dragId && (
            <div className="absolute inset-0 pointer-events-none z-20">
              {guides.v && <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-[#FF3D9A]" />}
              {guides.h && <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-px bg-[#FF3D9A]" />}
              {guides.vs.map((gx, i) => (
                <div key={`v${i}`} className="absolute top-0 bottom-0 w-px bg-[#5B34FF]" style={{ left: `${gx * 100}%` }} />
              ))}
              {guides.hs.map((gy, i) => (
                <div key={`h${i}`} className="absolute left-0 right-0 h-px bg-[#5B34FF]" style={{ top: `${gy * 100}%` }} />
              ))}
            </div>
          )}

          {!disabled && layers.length > 0 && (
            <div className="absolute inset-0 z-10" style={{ cursor: dragId ? "grabbing" : "move" }} />
          )}

          {!shot?.sample_video_url && (
            <div className="absolute inset-0 grid place-items-center text-[#9A9A9A] text-[11px] px-3 text-center">
              Momentul n-are clip exemplu
            </div>
          )}

          {shot?.sample_video_url && (
            <button
              type="button"
              onClick={togglePlay}
              className="absolute bottom-2.5 left-1/2 -translate-x-1/2 z-30 w-9 h-9 rounded-full bg-black/55 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/70 transition"
            >
              {paused ? "▶" : "⏸"}
            </button>
          )}
        </div>

        {layers.length > 0 && (
          <p className="text-[10.5px] text-[#9A9A9A] leading-snug text-center">
            Trage textul pe imagine ca să-l poziționezi.
          </p>
        )}
      </div>

      {/* DREAPTA: momentele + setările momentului selectat */}
      <div className="flex flex-col gap-4 min-w-0">
        {/* Momentele postării, ca tab-uri */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {output.slots.map((s, i) => {
            const t = shots.find((x) => x.slot_key === s.slot)?.title || s.slot;
            const n = ((s.textLayers as TextLayer[] | undefined) ?? []).length;
            return (
              <button
                key={`${s.slot}-${i}`}
                type="button"
                onClick={() => setIdx(i)}
                className={`px-3 py-1.5 rounded-full text-[12px] transition ${
                  i === idx ? "bg-[#5B34FF] text-white font-medium" : "text-[#6B6B6B] hover:text-[#1F1F1F] bg-white border border-[#E7E3F5]"
                }`}
              >
                {i + 1}. {t}
                {n > 0 && <span className={i === idx ? " text-white/75" : " text-[#5B34FF]"}> · {n}</span>}
              </button>
            );
          })}
        </div>

        <fieldset disabled={disabled} className="flex flex-col gap-4 disabled:opacity-60">
          {/* Durata în ACEASTĂ postare + viteză */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">
                Durată în postare{" "}
                <span className="text-[#9A9A9A] normal-case tracking-normal">(secunde)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={0.5} max={10} step={0.5}
                  value={trimSec}
                  onChange={(e) => patchSlot({ sec: Number(e.target.value) })}
                  className="flex-1 accent-[#5B34FF]"
                />
                <span className="text-[13px] text-[#5B34FF] font-medium tabular-nums w-10 text-right">
                  {trimSec.toFixed(1)}s
                </span>
              </div>
            </div>
            <div>
              <label className="label">Viteză</label>
              <select
                value={speed}
                onChange={(e) => patchSlot({ speed: Number(e.target.value) })}
                className="input"
              >
                {SPEEDS.map((v) => (
                  <option key={v} value={v}>{v}×</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tranzitia sta pe MOMENT: partenera o variaza intentionat de la un
              moment la altul (fade, slide, zoom, whipPan in acelasi reel).
              Filtrul sta pe postare — un reel are o singura nota de culoare. */}
          <div>
            <label className="label">Tranziție după acest moment</label>
            <select
              value={slot?.transition ?? ""}
              onChange={(e) =>
                patchSlot({ transition: (e.target.value || undefined) as TransitionId | undefined })
              }
              className="input"
            >
              <option value="">Implicit (fade)</option>
              {TRANSITIONS.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={slot?.motionBlur ?? false}
              onChange={(e) => patchSlot({ motionBlur: e.target.checked })}
              className="w-4 h-4 accent-[#5B34FF]"
            />
            <span className="text-[13px] text-[#1F1F1F]">Motion blur</span>
          </label>

          {/* Text pe acest moment, în această postare */}
          <div className="rounded-xl bg-[#F6F4FE] border border-[#EDE8FF] p-3.5">
            <div className="flex items-center justify-between mb-2.5">
              <div className="text-[10px] tracking-[0.18em] uppercase text-[#5B34FF]/85">
                ✦ Text pe acest moment
              </div>
              <button
                type="button"
                onClick={addLayer}
                className="text-[11px] font-medium text-[#5B34FF] hover:text-[#4826CC]"
              >
                + Adaugă text
              </button>
            </div>

            {layers.length === 0 && (
              <p className="text-[11px] text-[#9A9A9A] py-1.5">
                Niciun text aici. Apasă „+ Adaugă text".
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
                    />
                    <button
                      type="button"
                      onClick={() => removeLayer(layer.id)}
                      className="shrink-0 w-9 rounded-lg text-rose-600 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-[15px]"
                    >
                      ×
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <select
                      value={layer.presetId}
                      onChange={(e) => patchLayer(layer.id, { presetId: e.target.value })}
                      className="input !mb-0 text-[12px]"
                    >
                      {TEXT_FONTS.map((f) => (
                        <option key={f.id} value={f.id}>{f.label}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-[#9A9A9A] shrink-0">Mărime</span>
                      <input
                        type="range" min={0.5} max={2} step={0.1}
                        value={layer.sizeScale ?? 1}
                        onChange={(e) => patchLayer(layer.id, { sizeScale: Number(e.target.value) })}
                        className="flex-1 accent-[#5B34FF]"
                      />
                    </div>
                  </div>
                  <div className="flex gap-1.5 items-center flex-wrap">
                    {([
                      { key: "bold", label: "B", cls: "font-bold" },
                      { key: "italic", label: "I", cls: "italic" },
                      { key: "underline", label: "U", cls: "underline" },
                    ] as const).map((b) => {
                      const on = Boolean(layer[b.key]);
                      return (
                        <button
                          key={b.key}
                          type="button"
                          onClick={() => patchLayer(layer.id, { [b.key]: !on })}
                          className={`w-8 h-8 rounded-lg text-[13px] ${b.cls} transition ${
                            on ? "bg-[#5B34FF] text-white" : "bg-white border border-[#E7E3F5] text-[#6B6B6B]"
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
                          title={c}
                          className={`w-6 h-6 rounded-full border transition ${
                            on ? "ring-2 ring-[#5B34FF] ring-offset-1 border-white" : "border-[#E7E3F5]"
                          }`}
                          style={{ background: c }}
                        />
                      );
                    })}
                    <label className="relative w-6 h-6 rounded-full border border-[#E7E3F5] overflow-hidden cursor-pointer" title="Altă culoare">
                      <span className="absolute inset-0" style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }} />
                      <input
                        type="color"
                        value={layer.color ?? "#FFFFFF"}
                        onChange={(e) => patchLayer(layer.id, { color: e.target.value })}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </fieldset>
      </div>
    </div>
  );
}
