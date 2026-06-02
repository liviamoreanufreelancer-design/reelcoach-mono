"use client";

/**
 * "Șablon nou" button — opens an inline dialog to pick a title + category,
 * then calls the createTemplate server action which redirects to the new
 * template's edit page.
 *
 * Uses native <dialog> element for accessibility (no modal lib required).
 */

import { useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createTemplate } from "@/lib/template-actions";
import type { Category } from "@/lib/db-types";

export default function NewTemplateButton({
  categories,
}: {
  categories: Pick<Category, "id" | "label">[];
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setError(null);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  const onSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        await createTemplate(formData);
        // createTemplate redirects on success; this line only runs on error.
      } catch (e) {
        // Next.js redirect throws a special error — ignore those.
        const message = e instanceof Error ? e.message : String(e);
        if (message.includes("NEXT_REDIRECT")) return;
        setError(message);
      }
    });
  };

  return (
    <>
      <button
        onClick={open}
        className="btn-champagne inline-flex items-center gap-2 shrink-0 self-start sm:self-auto"
      >
        <Plus className="w-4 h-4" />
        <span className="whitespace-nowrap">Șablon nou</span>
      </button>

      <dialog
        ref={dialogRef}
        className="bg-transparent p-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm rounded-2xl"
        onClick={(e) => {
          // Close when clicking the backdrop (outside the dialog content).
          if (e.target === dialogRef.current) close();
        }}
      >
        <div className="card p-6 w-[92vw] max-w-[440px]">
          <div className="flex items-center justify-between mb-5">
            <p className="eyebrow">Șablon nou</p>
            <button
              onClick={close}
              aria-label="Închide"
              className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-white/60 active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form action={onSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="title" className="label">Titlu</label>
              <input
                id="title"
                name="title"
                type="text"
                required
                autoFocus
                placeholder="ex. Nu o să crezi transformarea asta"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="category_id" className="label">Categorie</label>
              <select id="category_id" name="category_id" required className="input">
                <option value="">— Alege categoria —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            {error && (
              <p className="text-[12px] text-rose-300 leading-relaxed">{error}</p>
            )}

            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={close}
                className="btn-glass flex-1"
              >
                Anulează
              </button>
              <button
                type="submit"
                disabled={pending}
                className="btn-champagne flex-1"
              >
                {pending ? "Se creează…" : "Creează draft"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
