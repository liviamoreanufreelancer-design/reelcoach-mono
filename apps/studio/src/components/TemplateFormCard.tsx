"use client";

/**
 * Form card for template metadata. Auto-saves when the user blurs an input
 * (debounced). Optimistic UI with last-saved indicator.
 */

import { useRef, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { updateTemplate } from "@/lib/template-actions";
import { DIFFICULTIES } from "@/lib/options";
import type { TemplateRow, Category } from "@/lib/db-types";

export default function TemplateFormCard({
  template,
  categories,
  disabled,
}: {
  template: TemplateRow;
  categories: Pick<Category, "id" | "label">[];
  disabled: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const PROMISE_MAX = 140;
  const [promiseLen, setPromiseLen] = useState((template.promise ?? "").length);

  const save = () => {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    setError(null);
    startTransition(async () => {
      try {
        await updateTemplate(template.id, fd);
        setSavedAt(new Date());
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[10px] tracking-[0.32em] uppercase text-[#E8D5B5]/85 font-bold">
          Detalii șablon
        </h2>
        <SaveIndicator pending={pending} savedAt={savedAt} error={error} />
      </div>

      <form ref={formRef} className="flex flex-col gap-4" onBlur={save}>
        <fieldset disabled={disabled} className="flex flex-col gap-4 disabled:opacity-60">
          <div>
            <label htmlFor="title" className="label">Titlu</label>
            <input
              id="title"
              name="title"
              type="text"
              required
              defaultValue={template.title}
              className="input"
            />
          </div>

          <div>
            <label htmlFor="promise" className="label">
              Promise <span className="text-white/35 normal-case tracking-normal">(pitch scurt afișat în preview)</span>
            </label>
            <textarea
              id="promise"
              name="promise"
              rows={2}
              maxLength={PROMISE_MAX}
              defaultValue={template.promise ?? ""}
              onChange={(e) => setPromiseLen(e.target.value.length)}
              placeholder="Ex: Un reel cu efect WOW prin contrast puternic before/after."
              className="input resize-none"
            />
            <div className="mt-1 text-right text-[11px] tabular-nums" style={{ color: promiseLen >= PROMISE_MAX ? "#E5484D" : promiseLen >= PROMISE_MAX - 20 ? "#F5B228" : "rgba(255,255,255,0.4)" }}>
              {promiseLen}/{PROMISE_MAX}
            </div>
          </div>

          <div>
            <label htmlFor="emotional_pitch" className="label">
              Senzația <span className="text-white/35 normal-case tracking-normal">(editorial italic, opțional)</span>
            </label>
            <textarea
              id="emotional_pitch"
              name="emotional_pitch"
              rows={3}
              defaultValue={template.emotional_pitch ?? ""}
              placeholder="Ex: Construit pentru efectul WOW. Începi calm, creezi tensiune…"
              className="input resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="category_id" className="label">Categorie</label>
              <select
                id="category_id"
                name="category_id"
                required
                defaultValue={template.category_id}
                className="input"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="difficulty" className="label">Dificultate</label>
              <select
                id="difficulty"
                name="difficulty"
                defaultValue={template.difficulty}
                className="input"
              >
                {DIFFICULTIES.map((d) => (
                  <option key={d.id} value={d.id}>{d.label}</option>
                ))}
              </select>
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer mt-2">
            <input
              type="checkbox"
              name="is_recommended"
              defaultChecked={template.is_recommended}
              className="w-4 h-4 accent-[#E8D5B5]"
            />
            <span className="text-[13px] text-white/85">
              Recomandat pe Home <span className="text-white/45">(apare ca hero card)</span>
            </span>
          </label>
        </fieldset>
      </form>
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
  if (error) {
    return <span className="text-[11px] text-rose-300">{error}</span>;
  }
  if (pending) {
    return <span className="text-[10px] tracking-[0.2em] uppercase text-white/45">Se salvează…</span>;
  }
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
