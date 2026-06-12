"use client";

/**
 * Actions card — publish/unpublish (admin only), delete (admin only).
 * Confirmation prompts for destructive actions.
 */

import { useState, useTransition } from "react";
import { CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import {
  publishTemplate,
  unpublishTemplate,
  deleteTemplate,
} from "@/lib/template-actions";
import type { TemplateStatus } from "@/lib/db-types";

export default function TemplateActionsCard({
  templateId,
  status,
  isAdmin,
}: {
  templateId: string;
  status: TemplateStatus;
  isAdmin: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onPublish = () => {
    setError(null);
    startTransition(async () => {
      try {
        await publishTemplate(templateId);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  const onUnpublish = () => {
    if (!window.confirm("Sigur vrei să muți acest șablon înapoi pe draft? Nu va mai apărea în appul mobile.")) return;
    setError(null);
    startTransition(async () => {
      try {
        await unpublishTemplate(templateId);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });
  };

  const onDelete = () => {
    if (!window.confirm("Sigur vrei să ștergi complet acest șablon? Acțiunea NU poate fi anulată.")) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteTemplate(templateId);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        if (message.includes("NEXT_REDIRECT")) return;
        setError(message);
      }
    });
  };

  return (
    <div className="card p-5">
      <h2 className="text-[10px] tracking-[0.32em] uppercase text-[#E8D5B5]/85 font-bold mb-3">
        Acțiuni
      </h2>

      {!isAdmin && (
        <p className="text-[11px] text-white/45 leading-relaxed mb-3">
          Publicare și ștergere sunt doar pentru admin. Cere unui admin să facă review.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {status === "draft" ? (
          <button
            type="button"
            onClick={onPublish}
            disabled={!isAdmin || pending}
            className="btn-champagne inline-flex items-center justify-center gap-2 disabled:opacity-30"
          >
            <CheckCircle2 className="w-4 h-4" />
            {pending ? "Se publică…" : "Publică"}
          </button>
        ) : (
          <button
            type="button"
            onClick={onUnpublish}
            disabled={!isAdmin || pending}
            className="btn-glass inline-flex items-center justify-center gap-2 disabled:opacity-30"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Mută pe draft
          </button>
        )}

        <button
          type="button"
          onClick={onDelete}
          disabled={!isAdmin || pending}
          className="h-11 px-6 rounded-full text-[12px] tracking-[0.16em] uppercase font-semibold border border-rose-400/40 text-rose-300 bg-rose-400/[0.06] hover:bg-rose-400/[0.12] active:scale-[0.98] transition disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Șterge șablonul
        </button>
      </div>

      {error && (
        <p className="text-[11px] text-rose-300 mt-3 leading-relaxed">{error}</p>
      )}
    </div>
  );
}
