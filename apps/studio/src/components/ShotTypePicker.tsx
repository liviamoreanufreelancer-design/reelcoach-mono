"use client";
/**
 * ShotTypePicker — ce fel de cadru e ăsta.
 *
 * Cadrele nu mai primesc nume liber. Aleg un TIP din catalog, iar slug-ul
 * tipului devine cheia care leagă cadrul de momentul filmat.
 *
 * Motivul e un bug, nu o preferință: cheile se generau după poziția în
 * variantă (`cadru-1`, `cadru-2`), deci primul cadru al fiecărei variante
 * primea aceeași cheie chiar dacă una era „before" și alta „aplicare".
 * Importate în același șablon, deveneau un singur moment — stilista filma un
 * singur lucru, iar a doua variantă randa altceva decât voia. Tăcut.
 *
 * Al doilea câștig: instrucțiunile de filmare stau pe tip, nu pe cadru. Se
 * scriu o dată și ajung în orice șablon care cere cadrul.
 */
import { useMemo, useState, useTransition } from "react";
import { X, Plus, Check, Camera, Video, Images } from "lucide-react";
import { createShotType } from "@/lib/template-actions";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { ShotType } from "@/lib/db-types";

const KIND_ICON = { video: Video, photo: Images, both: Camera } as const;

export default function ShotTypePicker({
  open,
  types,
  used,
  onClose,
  onPick,
  onCreated,
}: {
  open: boolean;
  types: ShotType[];
  /** Tipurile deja folosite în varianta asta — marcate, nu blocate. */
  used: Set<string>;
  onClose: () => void;
  onPick: (t: ShotType) => void;
  onCreated: (t: ShotType) => void;
}) {
  const [q, setQ] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const byFamily = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? types.filter((t) => t.name.toLowerCase().includes(needle))
      : types;
    const m = new Map<string, ShotType[]>();
    for (const t of list) {
      const key = t.family || "altele";
      const arr = m.get(key) ?? [];
      arr.push(t);
      m.set(key, arr);
    }
    // „comun" primul: cadrele care apar în toate serviciile sunt și cele
    // căutate cel mai des.
    return Array.from(m.entries()).sort(([a], [b]) =>
      a === "comun" ? -1 : b === "comun" ? 1 : a.localeCompare(b),
    );
  }, [types, q]);

  if (!open) return null;

  const createAndPick = () => {
    const name = q.trim();
    if (!name) return;
    setError(null);
    startTransition(async () => {
      const res = await createShotType(name);
      if (!res.ok) { setError(res.error); return; }
      const sb = getSupabaseBrowserClient();
      const { data } = await sb.from("shot_types").select("*").eq("id", res.id).maybeSingle();
      if (data) onCreated(data as ShotType);
    });
  };

  return (
    <div
      className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm grid place-items-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-[560px] max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E7E3F5]">
          <p className="eyebrow flex-1">Ce cadru e ăsta</p>
          <button onClick={onClose} aria-label="Închide" className="w-8 h-8 rounded-full bg-white/[0.06] grid place-items-center text-[#6B6B6B]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[#E7E3F5]">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Caută sau scrie un tip nou…"
            className="input !mb-0 text-[13px]"
          />
          <p className="text-[11px] text-[#9A9A9A] mt-1.5 leading-snug">
            Instrucțiunile de filmare se scriu o singură dată, pe tip — și ajung
            în orice șablon care cere cadrul.
          </p>
        </div>

        {error && (
          <p className="mx-5 mt-3 text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {byFamily.length === 0 ? (
            <p className="text-[13px] text-[#6B6B6B] py-4 text-center">
              Niciun tip cu numele ăsta.
            </p>
          ) : (
            byFamily.map(([family, list]) => (
              <section key={family}>
                <h3 className="text-[10px] tracking-[0.18em] uppercase text-[#9A9A9A] mb-2">
                  {family}
                </h3>
                <div className="flex flex-col gap-1">
                  {list.map((t) => {
                    const Icon = KIND_ICON[t.capture_kind] ?? Video;
                    const already = used.has(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onPick(t)}
                        className="flex items-center gap-2.5 rounded-lg border border-[#E7E3F5] bg-white px-3 py-2 hover:border-[#5B34FF] transition text-left"
                      >
                        <Icon className="w-4 h-4 text-[#9A9A9A] shrink-0" strokeWidth={1.8} />
                        <span className="flex-1 min-w-0 text-[13px] truncate">{t.name}</span>
                        {!t.hook && (
                          <span
                            title="N-are încă instrucțiuni scrise în catalog"
                            className="text-[10.5px] text-amber-600 shrink-0"
                          >
                            fără instrucțiuni
                          </span>
                        )}
                        {already && (
                          <Check className="w-3.5 h-3.5 text-[#5B34FF] shrink-0" strokeWidth={2.4} />
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            ))
          )}
        </div>

        {q.trim() && !types.some((t) => t.name.toLowerCase() === q.trim().toLowerCase()) && (
          <div className="px-5 py-3.5 border-t border-[#E7E3F5]">
            <button
              type="button"
              onClick={createAndPick}
              disabled={pending}
              className="btn-champagne w-full inline-flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
              {pending ? "Se creează…" : `Tip nou: „${q.trim()}"`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
