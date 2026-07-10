"use client";
/**
 * TemplateSidebar — per-reel controls that live beside the scene editor.
 * Contains the cover image (with a dialog to upload one) + status + publish
 * actions. Per-scene editing stays in LiveScenePreview; this is "about the
 * whole reel."
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, RotateCcw, Trash2, Upload, Pencil, X } from "lucide-react";
import {
  uploadCover,
  publishTemplate,
  unpublishTemplate,
  deleteTemplate,
  createDraftCopy,
  publishDraftChanges,
  discardDraftChanges,
} from "@/lib/template-actions";
import type { TemplateStatus } from "@/lib/db-types";

export default function TemplateSidebar({
  templateId,
  coverUrl,
  status,
  isAdmin,
  canEdit,
  parentId = null,
  hasDraft = false,
}: {
  templateId: string;
  coverUrl: string | null;
  status: TemplateStatus;
  isAdmin: boolean;
  canEdit: boolean;
  /** Setat daca acesta e un draft-copy al unui template publicat. */
  parentId?: string | null;
  /** Setat daca acest template publicat are deja o ciorna in lucru. */
  hasDraft?: boolean;
}) {
  const router = useRouter();
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isPublished = status === "published";
  const isDraftCopy = Boolean(parentId);

  const onEditDraft = () => {
    setError(null);
    startTransition(async () => {
      try {
        const draftId = await createDraftCopy(templateId);
        router.push(`/dashboard/templates/${draftId}`);
      } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    });
  };

  const onPublishChanges = () => {
    if (!window.confirm("Publici modificările? Vor înlocui versiunea live din app.")) return;
    setError(null);
    startTransition(async () => {
      try {
        await publishDraftChanges(templateId);
        router.push(`/dashboard/templates/${parentId}`);
      } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    });
  };

  const onDiscard = () => {
    if (!window.confirm("Renunți la modificări? Ciorna va fi ștearsă definitiv.")) return;
    setError(null);
    startTransition(async () => {
      try {
        await discardDraftChanges(templateId);
        router.push(`/dashboard/templates/${parentId}`);
      } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    });
  };

  const onCoverPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const MAX_MB = 5;
    if (file.size > MAX_MB * 1024 * 1024) {
      alert(`Imaginea e prea mare (${(file.size / 1024 / 1024).toFixed(1)}MB). Încarcă una sub ${MAX_MB}MB.`);
      if (coverInputRef.current) coverInputRef.current.value = "";
      return;
    }
    const fd = new FormData();
    fd.set("cover", file);
    setError(null);
    startTransition(async () => {
      try {
        await uploadCover(templateId, fd);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
    if (coverInputRef.current) coverInputRef.current.value = "";
  };

  const onSaveDraft = () => {
    // Everything auto-saves; this is a reassuring confirmation.
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 1800);
  };

  const onPublish = () => {
    setError(null);
    startTransition(async () => {
      try { await publishTemplate(templateId); }
      catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    });
  };

  const onUnpublish = () => {
    if (!window.confirm("Sigur vrei să muți acest șablon înapoi pe draft? Nu va mai apărea în appul mobile.")) return;
    setError(null);
    startTransition(async () => {
      try { await unpublishTemplate(templateId); }
      catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    });
  };

  const onDelete = () => {
    if (!window.confirm("Sigur vrei să ștergi complet acest șablon? Acțiunea NU poate fi anulată.")) return;
    setError(null);
    startTransition(async () => {
      try { await deleteTemplate(templateId); }
      catch (e) {
        const m = e instanceof Error ? e.message : String(e);
        if (m.includes("NEXT_REDIRECT")) return;
        setError(m);
      }
    });
  };

  return (
    <div className="card p-5 flex flex-col gap-5 lg:sticky lg:top-6">
      {/* Cover */}
      <div>
        <div className="text-[10px] tracking-[0.18em] uppercase text-[#9A9A9A] mb-2.5">Imagine copertă</div>
        <div className="relative w-full rounded-lg overflow-hidden bg-white/[0.04] border border-[#5B34FF]/15 mb-2.5" style={{ aspectRatio: "9 / 16" }}>
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverUrl} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[#B8B8B8] text-[10px]">fără copertă</div>
          )}
        </div>
        <input ref={coverInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onCoverPick} disabled={!canEdit} className="hidden" />
        <button type="button" onClick={() => coverInputRef.current?.click()} disabled={!canEdit || pending}
          className="btn-champagne w-full text-[12px] py-2 inline-flex items-center justify-center gap-2 disabled:opacity-40">
          <Upload className="w-3.5 h-3.5" />
          {coverUrl ? "Schimbă coperta" : "Stabilește coperta"}
        </button>
      </div>

      {/* Status + actions */}
      <div className="border-t border-[#5B34FF]/10 pt-4 flex flex-col gap-2.5">
        <div className="text-[10px] tracking-[0.18em] uppercase text-[#9A9A9A]">
          Stare: <span className={isDraftCopy ? "text-[#B8860B] font-semibold" : isPublished ? "text-emerald-600" : "text-amber-600"}>
            {isDraftCopy ? "Ciornă" : isPublished ? "Publicat" : "Draft"}
          </span>
        </div>

        {isDraftCopy && (
          <div className="rounded-lg bg-[#FFF6E5] border border-[#F5B228]/40 p-2.5">
            <p className="text-[11px] text-[#7A5A10] leading-relaxed">
              <span className="font-semibold">Ciornă.</span> Versiunea live rămâne neschimbată
              până apeși „Publică modificările".
            </p>
          </div>
        )}

        {!isAdmin && (
          <p className="text-[10px] text-[#9A9A9A] leading-relaxed">Publicare/ștergere sunt doar pentru admin.</p>
        )}

        {isDraftCopy ? (
          <>
            <button type="button" onClick={onPublishChanges} disabled={!isAdmin || pending}
              className="btn-champagne w-full text-[13px] py-2.5 inline-flex items-center justify-center gap-2 disabled:opacity-30">
              <Upload className="w-4 h-4" />
              {pending ? "Se publică…" : "Publică modificările"}
            </button>
            <button type="button" onClick={onDiscard} disabled={pending}
              className="btn-glass w-full text-[12px] py-2 inline-flex items-center justify-center gap-2 disabled:opacity-30">
              <X className="w-3.5 h-3.5" />
              Renunță la modificări
            </button>
          </>
        ) : !isPublished ? (
          <button type="button" onClick={onPublish} disabled={!isAdmin || pending}
            className="btn-champagne w-full text-[13px] py-2.5 inline-flex items-center justify-center gap-2 disabled:opacity-30">
            <CheckCircle2 className="w-4 h-4" />
            {pending ? "Se publică…" : "Publică"}
          </button>
        ) : (
          <>
            <button type="button" onClick={onEditDraft} disabled={pending}
              className="btn-champagne w-full text-[13px] py-2.5 inline-flex items-center justify-center gap-2 disabled:opacity-30">
              <Pencil className="w-4 h-4" />
              {pending ? "Se pregătește…" : hasDraft ? "Continuă ciorna" : "Editează (ciornă)"}
            </button>
            <button type="button" onClick={onUnpublish} disabled={!isAdmin || pending}
              className="btn-glass w-full text-[12px] py-2 inline-flex items-center justify-center gap-2 disabled:opacity-30">
              <RotateCcw className="w-3.5 h-3.5" />
              Mută pe draft
            </button>
          </>
        )}

        <button type="button" onClick={onSaveDraft} disabled={!canEdit}
          className="btn-glass w-full text-[12px] py-2 disabled:opacity-40">
          {saved ? "Salvat ✓" : "Salvează draft"}
        </button>

        <button type="button" onClick={onDelete} disabled={!isAdmin || pending}
          className="w-full h-9 rounded-lg text-[11px] font-semibold border border-rose-300 text-rose-600 bg-rose-50 hover:bg-rose-100 transition disabled:opacity-30 inline-flex items-center justify-center gap-2">
          <Trash2 className="w-3.5 h-3.5" />
          Șterge
        </button>

        {error && <p className="text-[11px] text-rose-600 leading-relaxed">{error}</p>}
      </div>
    </div>
  );
}
