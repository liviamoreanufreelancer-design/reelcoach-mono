"use client";
/**
 * „Variantă nouă" — nume și tip. Atât.
 *
 * Tipul e text liber cu sugestii din ce există deja (`datalist`). Un select
 * fix ar îngheța acum o taxonomie pe care partenera încă o descoperă; sugestiile
 * previn doar varianta ieftină a problemei — „glow up" o dată, „glowup" a doua.
 *
 * Nu se alege niciun șablon (migrația 018): varianta e o compoziție peste nume
 * de momente, iar filmările de probă vin de la momentul cu eticheta cerută,
 * din orice serviciu.
 */
import { useRef, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { createReelDesign } from "@/lib/template-actions";

export default function NewReelDesignButton({
  knownTypes,
}: {
  knownTypes: string[];
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
        await createReelDesign(formData);
      } catch (e) {
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
        className="btn-champagne inline-flex items-center gap-2 shrink-0 self-start"
      >
        <Plus className="w-4 h-4" />
        <span className="whitespace-nowrap">Variantă nouă</span>
      </button>

      <dialog
        ref={dialogRef}
        className="bg-transparent p-0 backdrop:bg-black/70 backdrop:backdrop-blur-sm rounded-2xl"
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
      >
        <div className="card p-6 w-[92vw] max-w-[460px]">
          <div className="flex items-center justify-between mb-5">
            <p className="eyebrow">Variantă nouă</p>
            <button
              onClick={close}
              aria-label="Închide"
              className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-[#6B6B6B] active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form action={onSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="name" className="label">Nume</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoFocus
                placeholder="ex. Rapid, text mult"
                className="input"
              />
            </div>

            <div>
              <label htmlFor="reel_type" className="label">
                Tip de reel{" "}
                <span className="text-[#9A9A9A] normal-case tracking-normal">
                  (al cărui variantă e)
                </span>
              </label>
              <input
                id="reel_type"
                name="reel_type"
                type="text"
                required
                list="known-reel-types"
                placeholder="ex. before/after"
                className="input"
              />
              <datalist id="known-reel-types">
                {knownTypes.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </div>

            {error && (
              <p className="text-[12px] text-rose-600 leading-relaxed">{error}</p>
            )}

            <div className="flex gap-2 mt-2">
              <button type="button" onClick={close} className="btn-glass flex-1">
                Anulează
              </button>
              <button type="submit" disabled={pending} className="btn-champagne flex-1">
                {pending ? "Se creează…" : "Creează"}
              </button>
            </div>
          </form>
        </div>
      </dialog>
    </>
  );
}
