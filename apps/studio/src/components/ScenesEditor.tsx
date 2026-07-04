"use client";

/**
 * ScenesEditor — manages the list of shots (scenes) for a template.
 *
 * Each scene is rendered as an expandable card with all its fields.
 * Provides:
 *   - Add scene (appends at the end)
 *   - Delete scene (with confirmation, re-numbers the rest)
 *   - Move up / Move down buttons for reordering
 *   - Inline edit with auto-save on blur for every field
 *
 * Drag-to-reorder is implemented as up/down buttons (simpler than full DnD).
 */

import { useState, useTransition } from "react";
import {
  Plus, Trash2, ChevronUp, ChevronDown, ChevronRight,
} from "lucide-react";
import { addShot, deleteShot, reorderShots } from "@/lib/template-actions";
import type { ShotRow } from "@/lib/db-types";
import ScenePanel from "./ScenePanel";

export default function ScenesEditor({
  templateId,
  shots,
  disabled,
}: {
  templateId: string;
  shots: ShotRow[];
  disabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(
    shots.length === 1 ? shots[0].id : null,
  );

  const onAdd = () => {
    startTransition(async () => {
      await addShot(templateId);
    });
  };

  const onDelete = (shotId: string) => {
    if (!window.confirm("Sigur vrei să ștergi scena? Acțiunea nu poate fi anulată.")) return;
    startTransition(async () => {
      await deleteShot(shotId, templateId);
    });
  };

  const onMove = (index: number, direction: -1 | 1) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= shots.length) return;
    const newOrder = [...shots];
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(newIndex, 0, moved);
    startTransition(async () => {
      await reorderShots(templateId, newOrder.map((s) => s.id));
    });
  };

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-[10px] tracking-[0.32em] uppercase text-[#5B34FF]/85 font-bold">
            Scene
          </h2>
          <p className="text-[11px] text-[#9A9A9A] mt-1">
            {shots.length} scen{shots.length === 1 ? "ă" : "e"}
          </p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          disabled={disabled || pending}
          className="btn-glass inline-flex items-center gap-1.5 disabled:opacity-30"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Adaugă scenă</span>
        </button>
      </div>

      {shots.length === 0 ? (
        <div className="border border-dashed border-[#5B34FF]/20 rounded-xl p-8 text-center">
          <p className="text-[13px] text-[#6B6B6B]">
            Nicio scenă încă. Adaugă prima scenă pentru a construi șablonul.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {shots.map((shot, index) => {
            const isExpanded = expandedId === shot.id;
            return (
              <div
                key={shot.id}
                className="rounded-xl border border-[#5B34FF]/15 bg-white/[0.025] overflow-hidden"
              >
                {/* Collapsed header — always visible */}
                <div className="flex items-center gap-2 p-3">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : shot.id)}
                    className="flex-1 flex items-center gap-3 min-w-0 text-left"
                  >
                    <ChevronRight
                      className={`w-4 h-4 text-[#5B34FF]/75 shrink-0 transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                    <span className="text-[10px] tracking-[0.22em] uppercase text-[#5B34FF]/65 font-semibold tabular-nums shrink-0">
                      {index + 1}
                    </span>
                    <span className="text-[14px] text-[#1F1F1F] font-medium truncate">
                      {shot.title || "Fără titlu"}
                    </span>
                    {shot.pattern && (
                      <span className="text-[9px] tracking-[0.2em] uppercase text-[#9A9A9A] shrink-0 hidden sm:inline">
                        {shot.pattern}
                      </span>
                    )}
                  </button>

                  {shot.example_image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={shot.example_image_url} alt="" className="w-8 h-11 rounded-md object-cover border border-[#5B34FF]/20 shrink-0" />
                  )}
                  {/* Move + delete */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onMove(index, -1)}
                      disabled={disabled || pending || index === 0}
                      aria-label="Mută în sus"
                      className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center text-[#6B6B6B] disabled:opacity-25 active:scale-95"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onMove(index, 1)}
                      disabled={disabled || pending || index === shots.length - 1}
                      aria-label="Mută în jos"
                      className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center text-[#6B6B6B] disabled:opacity-25 active:scale-95"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(shot.id)}
                      disabled={disabled || pending}
                      aria-label="Șterge scena"
                      className="w-8 h-8 rounded-full bg-rose-400/[0.06] flex items-center justify-center text-rose-300/85 disabled:opacity-25 active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Expanded body */}
                {isExpanded && (
                  <div className="border-t border-[#5B34FF]/10 p-4 sm:p-5">
                    <ScenePanel
                      shot={shot}
                      templateId={templateId}
                      disabled={disabled}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
