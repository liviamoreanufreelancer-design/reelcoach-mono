"use client";

/**
 * ScenePanel — full edit form for a single shot/scene. Renders when the
 * scene is expanded in ScenesEditor.
 *
 * Fields:
 *   - pattern (dropdown)
 *   - title (text)
 *   - hook (text, optional, legacy)
 *   - overlay_text (text — burned on final video)
 *   - recording_duration / final_usage_duration / countdown (numbers)
 *   - transition_type / filter_style / effect (dropdowns)
 *   - hands_busy (toggle)
 *   - must_see (string list)
 *   - must_show (string list, legacy)
 *   - instructions (string list, legacy)
 *   - how_shoot (object list: icon + label + detail)
 *
 * Strategy: each field input dispatches an updateShot on blur.
 * List fields (must_see, must_show, instructions, how_shoot) use local state
 * and persist on every change (add/remove/edit) since they can't rely on blur.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, X } from "lucide-react";
import { updateShot } from "@/lib/template-actions";
import { PATTERNS, HOW_SHOOT_ICONS } from "@/lib/options";
import type { ShotRow, HowShootItem } from "@/lib/db-types";
import Combobox from "./Combobox";

export default function ScenePanel({
  shot,
  templateId,
  disabled,
}: {
  shot: ShotRow;
  templateId: string;
  disabled: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  // Local state for list fields (since these need add/remove buttons).
  const [mustSee, setMustSee] = useState<string[]>(shot.must_see ?? []);
  const [mustShow, setMustShow] = useState<string[]>(shot.must_show ?? []);
  const [instructions, setInstructions] = useState<string[]>(shot.instructions ?? []);
  const [howShoot, setHowShoot] = useState<HowShootItem[]>(shot.how_shoot ?? []);

  const saveField = (patch: Parameters<typeof updateShot>[2]) => {
    setError(null);
    startTransition(async () => {
      try {
        await updateShot(shot.id, templateId, patch);
        setSavedAt(new Date());
        // Refresh server data so the PreviewPanel on the right re-renders
        // with the new filter/effect/transition/speed value immediately.
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  return (
    <fieldset disabled={disabled} className="flex flex-col gap-4 disabled:opacity-60">
      {/* Save indicator */}
      <div className="flex justify-end">
        <SaveIndicator pending={pending} savedAt={savedAt} error={error} />
      </div>

      {/* Row 1: Pattern + Title */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">
            Pattern <span className="text-white/35 normal-case tracking-normal">(opțional, eticheta scenei)</span>
          </label>
          <Combobox
            value={shot.pattern}
            onCommit={(next) => saveField({ pattern: next })}
            suggestions={PATTERNS.map((p) => ({
              value: p.id,
              label: p.label,
              desc: p.desc,
            }))}
            placeholder="Ex: Before, Tip 1, Demo, sau orice..."
          />
        </div>

        <div>
          <label className="label">Titlu intern</label>
          <input
            type="text"
            defaultValue={shot.title}
            onBlur={(e) => saveField({ title: e.target.value })}
            className="input"
          />
        </div>
      </div>

      {/* Row 2: Overlay text + Hook (legacy) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label">
            Overlay text <span className="text-white/35 normal-case tracking-normal">(pe video final)</span>
          </label>
          <input
            type="text"
            defaultValue={shot.overlay_text ?? ""}
            onBlur={(e) => saveField({ overlay_text: e.target.value || null })}
            placeholder="Ex: Wait for the reveal…"
            className="input"
          />
        </div>

        <div>
          <label className="label">
            Hook <span className="text-white/35 normal-case tracking-normal">(legacy, în filmare)</span>
          </label>
          <input
            type="text"
            defaultValue={shot.hook ?? ""}
            onBlur={(e) => saveField({ hook: e.target.value || null })}
            placeholder="Opțional"
            className="input"
          />
        </div>
      </div>

      {/* Row 3: Durations */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Durată filmare</label>
          <div className="relative">
            <input
              type="number"
              step="0.5"
              min="1"
              max="60"
              defaultValue={shot.recording_duration}
              onBlur={(e) => saveField({ recording_duration: Number(e.target.value) })}
              className="input pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-white/45">s</span>
          </div>
        </div>

        <div>
          <label className="label">În reel</label>
          <div className="relative">
            <input
              type="number"
              step="0.5"
              min="0.5"
              max="60"
              defaultValue={shot.final_usage_duration}
              onBlur={(e) => saveField({ final_usage_duration: Number(e.target.value) })}
              className="input pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-white/45">s</span>
          </div>
        </div>

        <div>
          <label className="label">Countdown</label>
          <div className="relative">
            <input
              type="number"
              step="1"
              min="0"
              max="10"
              defaultValue={shot.countdown}
              onBlur={(e) => saveField({ countdown: Number(e.target.value) })}
              className="input pr-10"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-white/45">s</span>
          </div>
        </div>
      </div>

      {/* Filter / Effect / Transition / Speed are now edited inside the
          PreviewPanel on the right, so the editor sees the result live. */}

      {/* Hands busy toggle */}
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          defaultChecked={shot.hands_busy}
          onChange={(e) => saveField({ hands_busy: e.target.checked })}
          className="w-4 h-4 accent-[#E8D5B5]"
        />
        <span className="text-[13px] text-white/85">
          Mâinile sunt ocupate cu clienta <span className="text-white/45">(stilista nu poate ține telefonul)</span>
        </span>
      </label>

      {/* Playback speed + motion blur are also in the PreviewPanel for the
          live preview workflow. */}

      {/* Must see */}
      <div>
        <label className="label">
          Ce trebuie să se vadă <span className="text-white/35 normal-case tracking-normal">(checklist, shot-first)</span>
        </label>
        <StringListEditor
          value={mustSee}
          onChange={(next) => {
            setMustSee(next);
            saveField({ must_see: next });
          }}
          placeholder="Ex: Fața clientei"
        />
      </div>

      {/* How shoot */}
      <div>
        <label className="label">
          Cum filmezi <span className="text-white/35 normal-case tracking-normal">(bullets compacte)</span>
        </label>
        <HowShootListEditor
          value={howShoot}
          onChange={(next) => {
            setHowShoot(next);
            saveField({ how_shoot: next });
          }}
        />
      </div>

      {/* Must show (legacy) */}
      <div>
        <label className="label">
          Trebuie să se vadă <span className="text-white/35 normal-case tracking-normal">(legacy)</span>
        </label>
        <StringListEditor
          value={mustShow}
          onChange={(next) => {
            setMustShow(next);
            saveField({ must_show: next });
          }}
          placeholder="Ex: Tot părul"
        />
      </div>

      {/* Instructions (legacy) */}
      <div>
        <label className="label">
          Instrucțiuni pas cu pas <span className="text-white/35 normal-case tracking-normal">(legacy)</span>
        </label>
        <StringListEditor
          value={instructions}
          onChange={(next) => {
            setInstructions(next);
            saveField({ instructions: next });
          }}
          placeholder="Ex: Așază clienta cu fața spre telefon"
          multiline
        />
      </div>
    </fieldset>
  );
}

// ============================================================================
// Reusable list editors
// ============================================================================

function StringListEditor({
  value,
  onChange,
  placeholder,
  multiline,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...value, trimmed]);
    setDraft("");
  };

  const remove = (i: number) => {
    onChange(value.filter((_, idx) => idx !== i));
  };

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {value.map((item, i) => (
            <li
              key={i}
              className="flex items-start gap-2 bg-white/[0.04] border border-[#E8D5B5]/12 rounded-lg px-3 py-2"
            >
              <span className="text-[10px] text-[#E8D5B5]/55 font-semibold tabular-nums pt-0.5 shrink-0">
                {i + 1}.
              </span>
              <span className="flex-1 text-[13px] text-white/85 leading-snug">{item}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Șterge"
                className="text-white/40 hover:text-rose-300 transition shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        {multiline ? (
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={placeholder}
            rows={2}
            className="input flex-1 resize-none"
          />
        ) : (
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                add();
              }
            }}
            placeholder={placeholder}
            className="input flex-1"
          />
        )}
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="btn-glass disabled:opacity-30 shrink-0 inline-flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          Adaugă
        </button>
      </div>
    </div>
  );
}

function HowShootListEditor({
  value,
  onChange,
}: {
  value: HowShootItem[];
  onChange: (next: HowShootItem[]) => void;
}) {
  const [draftIcon, setDraftIcon] = useState(HOW_SHOOT_ICONS[0].id);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftDetail, setDraftDetail] = useState("");

  const add = () => {
    const label = draftLabel.trim();
    const detail = draftDetail.trim();
    if (!label || !detail) return;
    onChange([...value, { icon: draftIcon, label, detail }]);
    setDraftLabel("");
    setDraftDetail("");
  };

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {value.map((item, i) => (
            <li
              key={i}
              className="flex items-center gap-2 bg-white/[0.04] border border-[#E8D5B5]/12 rounded-lg px-3 py-2"
            >
              <span className="text-[9px] tracking-[0.18em] uppercase text-[#E8D5B5]/65 bg-[#E8D5B5]/10 rounded px-2 py-0.5 shrink-0">
                {HOW_SHOOT_ICONS.find((i2) => i2.id === item.icon)?.label ?? item.icon}
              </span>
              <span className="text-[13px] text-white font-semibold">{item.label}</span>
              <span className="text-[12px] text-white/55 truncate">· {item.detail}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label="Șterge"
                className="ml-auto text-white/40 hover:text-rose-300 transition shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr_1fr_auto] gap-2">
        <select
          value={draftIcon}
          onChange={(e) => setDraftIcon(e.target.value)}
          className="input"
        >
          {HOW_SHOOT_ICONS.map((i) => (
            <option key={i.id} value={i.id}>{i.label}</option>
          ))}
        </select>
        <input
          type="text"
          value={draftLabel}
          onChange={(e) => setDraftLabel(e.target.value)}
          placeholder="Ex: Telefon vertical"
          className="input"
        />
        <input
          type="text"
          value={draftDetail}
          onChange={(e) => setDraftDetail(e.target.value)}
          placeholder="Ex: Sprijinit sau pe trepied"
          className="input"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draftLabel.trim() || !draftDetail.trim()}
          className="btn-glass disabled:opacity-30 inline-flex items-center gap-1 justify-center"
        >
          <Plus className="w-3.5 h-3.5" />
          Adaugă
        </button>
      </div>
    </div>
  );
}

function SaveIndicator({
  pending,
  savedAt,
  error,
}: {
  pending: boolean;
  savedAt: Date | null;
  error: string | null;
}) {
  if (error) return <span className="text-[11px] text-rose-300">{error}</span>;
  if (pending) return <span className="text-[10px] tracking-[0.2em] uppercase text-white/45">Se salvează…</span>;
  if (savedAt) {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.2em] uppercase text-[#E8D5B5]/65">
        <Check className="w-3 h-3" />
        Salvat
      </span>
    );
  }
  return null;
}

