"use client";

/**
 * PreviewPanel — interactive visual preview with inline editing.
 *
 * Editors:
 *   1. Pick a scene (dropdown) — defaults to first scene
 *   2. Watch the preview video for the current dimension (filter/effect/transition/speed)
 *   3. Change filter/effect/transition/speed inline via dropdowns under the video
 *   4. Toggle motion blur
 *   5. Optionally see what the video looks like for each dimension by tapping the tabs
 *
 * All edits auto-save to Supabase and the video re-loads with the new
 * value. The scene's filter/effect/transition/speed/motion_blur are no
 * longer edited in the ScenePanel — only here.
 */

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Film, Sparkles, ArrowRightLeft, Gauge } from "lucide-react";
import { updateShot } from "@/lib/template-actions";
import { TRANSITIONS, FILTERS, EFFECTS } from "@/lib/options";
import type { ShotRow, TransitionId, EffectId } from "@/lib/db-types";

type Dimension = "filter" | "effect" | "transition" | "speed";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PREVIEW_BASE = `${SUPABASE_URL}/storage/v1/object/public/previews`;

const SPEED_PRESETS = [
  { v: 0.25, label: "0.25×" },
  { v: 0.5,  label: "0.5×"  },
  { v: 0.75, label: "0.75×" },
  { v: 1.0,  label: "1×"    },
  { v: 1.5,  label: "1.5×"  },
  { v: 2.0,  label: "2×"    },
  { v: 3.0,  label: "3×"    },
  { v: 4.0,  label: "4×"    },
];

export default function PreviewPanel({
  templateId,
  shots,
  disabled,
}: {
  templateId: string;
  shots: ShotRow[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [selectedShotIdx, setSelectedShotIdx] = useState(0);
  const [dimension, setDimension] = useState<Dimension>("filter");
  const [pending, startTransition] = useTransition();

  const shot = shots[selectedShotIdx];

  // Pick the preview video URL based on current dimension + scene value.
  const videoUrl = useMemo(() => {
    if (!shot) return null;
    switch (dimension) {
      case "filter":
        return `${PREVIEW_BASE}/filter-${shot.filter_style}.mp4`;
      case "effect":
        return `${PREVIEW_BASE}/effect-${shot.effect}.mp4`;
      case "transition":
        return `${PREVIEW_BASE}/transition-${shot.transition_type}.mp4`;
      case "speed":
        return `${PREVIEW_BASE}/speed-${formatSpeed(shot.playback_speed)}.mp4`;
    }
  }, [shot, dimension]);

  // Save a single field, then refresh router so all components see the new value.
  const saveField = (patch: Parameters<typeof updateShot>[2]) => {
    if (!shot) return;
    startTransition(async () => {
      await updateShot(shot.id, templateId, patch);
      router.refresh();
    });
  };

  if (shots.length === 0) {
    return (
      <div className="card p-5">
        <h2 className="text-[10px] tracking-[0.32em] uppercase text-[#E8D5B5]/85 font-bold mb-3">
          Preview vizual
        </h2>
        <p className="text-[12px] text-white/45 leading-relaxed">
          Adaugă o scenă pentru a vedea preview-urile și a edita efectele.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] tracking-[0.32em] uppercase text-[#E8D5B5]/85 font-bold">
          Preview & efecte
        </h2>
        {pending && (
          <span className="text-[9px] tracking-[0.2em] uppercase text-white/45">salvez…</span>
        )}
      </div>

      {/* Scene selector — only if there are multiple scenes */}
      {shots.length > 1 && (
        <div className="mb-3">
          <label className="label">Scena</label>
          <select
            value={selectedShotIdx}
            onChange={(e) => setSelectedShotIdx(Number(e.target.value))}
            className="input"
          >
            {shots.map((s, i) => (
              <option key={s.id} value={i}>
                {i + 1}. {s.title || "Fără titlu"}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Video preview frame — 9:16 portrait */}
      <div
        className="relative w-full rounded-xl overflow-hidden bg-black border border-[#E8D5B5]/15 mb-3"
        style={{ aspectRatio: "9 / 16" }}
      >
        {videoUrl && (
          <video
            key={videoUrl}
            src={videoUrl}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        {/* Current value badge — top right corner overlay */}
        <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15">
          <span className="text-[10px] tracking-[0.2em] uppercase text-[#E8D5B5] font-semibold">
            {getCurrentValue(shot, dimension)}
          </span>
        </div>
      </div>

      {/* Dimension tabs — switch which preview video plays */}
      <div className="grid grid-cols-4 gap-1 mb-3">
        <DimTab
          active={dimension === "filter"}
          onClick={() => setDimension("filter")}
          icon={<Film className="w-3 h-3" />}
          label="Filtru"
        />
        <DimTab
          active={dimension === "effect"}
          onClick={() => setDimension("effect")}
          icon={<Sparkles className="w-3 h-3" />}
          label="Effect"
        />
        <DimTab
          active={dimension === "transition"}
          onClick={() => setDimension("transition")}
          icon={<ArrowRightLeft className="w-3 h-3" />}
          label="Tranziție"
        />
        <DimTab
          active={dimension === "speed"}
          onClick={() => setDimension("speed")}
          icon={<Gauge className="w-3 h-3" />}
          label="Viteză"
        />
      </div>

      {/* Active dimension controls — only the dimension currently selected
          is shown as a control. This keeps the panel compact. */}
      <fieldset disabled={disabled} className="disabled:opacity-50">
        {dimension === "filter" && (
          <div>
            <label className="label">Schimbă filtrul</label>
            <select
              value={shot.filter_style}
              onChange={(e) => saveField({ filter_style: e.target.value })}
              className="input"
            >
              {FILTERS.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>
        )}

        {dimension === "effect" && (
          <div>
            <label className="label">Schimbă effect-ul</label>
            <select
              value={shot.effect}
              onChange={(e) => saveField({ effect: e.target.value as EffectId })}
              className="input"
            >
              {EFFECTS.map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-white/40 mt-1.5 leading-snug">
              {EFFECTS.find((e) => e.id === shot.effect)?.desc}
            </p>
          </div>
        )}

        {dimension === "transition" && (
          <div>
            <label className="label">Schimbă tranziția</label>
            <select
              value={shot.transition_type}
              onChange={(e) => saveField({ transition_type: e.target.value as TransitionId })}
              className="input"
            >
              {TRANSITIONS.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
            <p className="text-[10px] text-white/40 mt-1.5 leading-snug">
              {TRANSITIONS.find((t) => t.id === shot.transition_type)?.desc}
            </p>
          </div>
        )}

        {dimension === "speed" && (
          <div>
            <label className="label">Schimbă viteza</label>
            <div className="flex gap-1.5 flex-wrap">
              {SPEED_PRESETS.map((p) => {
                const active = Math.abs(p.v - shot.playback_speed) < 0.01;
                return (
                  <button
                    key={p.v}
                    type="button"
                    onClick={() => saveField({ playback_speed: p.v })}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition tabular-nums ${
                      active
                        ? "bg-[#E8D5B5] text-[#0F1419] border border-[#E8D5B5]"
                        : "bg-white/[0.04] text-white/70 border border-[#E8D5B5]/12 hover:border-[#E8D5B5]/30 hover:text-white"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            {shot.playback_speed !== 1.0 && (
              <p className="text-[10px] text-white/40 mt-2 leading-snug">
                {shot.playback_speed < 1.0
                  ? "Slow motion — clipul devine mai lung în reel."
                  : "Fast forward — clipul devine mai scurt în reel."}
              </p>
            )}
          </div>
        )}

        {/* Motion blur toggle — always visible, separate from dimension tabs */}
        <label className="flex items-center gap-2.5 cursor-pointer mt-4 pt-3 border-t border-[#E8D5B5]/10">
          <input
            type="checkbox"
            checked={shot.motion_blur ?? false}
            onChange={(e) => saveField({ motion_blur: e.target.checked })}
            className="w-4 h-4 accent-[#E8D5B5]"
          />
          <span className="text-[12px] text-white/85">
            Motion blur <span className="text-white/45">(pe toată scena)</span>
          </span>
        </label>
      </fieldset>
    </div>
  );
}

function DimTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-1.5 py-1.5 rounded-lg text-[10px] font-medium transition flex flex-col items-center gap-1 ${
        active
          ? "bg-[#E8D5B5] text-[#0F1419]"
          : "bg-white/[0.04] text-white/65 hover:bg-white/[0.08] hover:text-white"
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function getCurrentValue(shot: ShotRow, dimension: Dimension): string {
  switch (dimension) {
    case "filter":     return shot.filter_style;
    case "effect":     return shot.effect;
    case "transition": return shot.transition_type;
    case "speed":      return `${shot.playback_speed}×`;
  }
}

/**
 * Format playback speed for the preview filename: 0.5 → "0.5x", 1 → "1x", etc.
 */
function formatSpeed(speed: number): string {
  if (Number.isInteger(speed)) return `${speed}x`;
  return `${speed}x`;
}
