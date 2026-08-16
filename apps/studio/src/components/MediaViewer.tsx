"use client";
/**
 * MediaViewer — materialul, la mărime, cu tot ce știm despre el.
 *
 * Miniaturile arată un cadru; ca să decizi dacă o filmare e bună îți trebuie
 * mișcarea ei. De asta video-ul pornește singur și se reia: la 3 secunde de
 * material, un buton de play e un pas în plus pentru nimic.
 *
 * Săgețile trec prin materiale fără să închizi fereastra. Când te uiți peste
 * douăzeci de filmări ca să alegi una, închis-deschis de douăzeci de ori e
 * exact genul de fricțiune care te face să nu te mai uiți.
 */
import { useCallback, useEffect } from "react";
import { X, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { MEDIA_MAX_WIDTH, type MediaAsset } from "@/lib/db-types";

export default function MediaViewer({
  assets,
  index,
  onIndex,
  onClose,
}: {
  assets: MediaAsset[];
  /** Ce material e deschis. null = fereastra e închisă. */
  index: number | null;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const go = useCallback(
    (delta: number) => {
      if (index === null || assets.length === 0) return;
      // Se învârte în cerc: la ultimul, „înainte" duce la primul. Altfel te
      // oprești într-un capăt fără să înțelegi de ce nu mai merge.
      onIndex((index + delta + assets.length) % assets.length);
    },
    [index, assets.length, onIndex],
  );

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, onClose]);

  if (index === null) return null;
  const asset = assets[index];
  if (!asset) return null;

  const tooBig = (asset.width ?? 0) > MEDIA_MAX_WIDTH;
  const mb = asset.size_bytes ? asset.size_bytes / (1024 * 1024) : null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex flex-col"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="flex items-center gap-3 px-5 py-3 text-white/85 shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium truncate">{asset.name}</p>
          <p className="text-[11.5px] text-white/50 tabular-nums">
            {asset.width ? `${asset.width}×${asset.height}` : "dimensiune necunoscută"}
            {asset.duration_sec ? ` · ${asset.duration_sec.toFixed(1)}s` : ""}
            {mb ? ` · ${mb.toFixed(1)} MB` : ""}
            {assets.length > 1 ? ` · ${index + 1} din ${assets.length}` : ""}
          </p>
        </div>
        {tooBig && (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-1 rounded-full bg-amber-500/90 text-white shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
            Peste 1080 — încetinește randarea
          </span>
        )}
        <button
          onClick={onClose}
          aria-label="Închide"
          className="w-9 h-9 rounded-full bg-white/10 grid place-items-center shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div
        className="flex-1 min-h-0 flex items-center justify-center gap-2 px-2 pb-5"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {assets.length > 1 && (
          <button
            onClick={() => go(-1)}
            aria-label="Materialul anterior"
            className="w-10 h-10 rounded-full bg-white/10 text-white grid place-items-center shrink-0 hover:bg-white/20 transition"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}

        {asset.kind === "video" ? (
          <video
            key={asset.id}
            src={asset.url}
            controls
            autoPlay
            loop
            muted
            playsInline
            className="max-h-full max-w-full rounded-xl bg-black"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={asset.id}
            src={asset.url}
            alt={asset.name}
            className="max-h-full max-w-full rounded-xl object-contain"
          />
        )}

        {assets.length > 1 && (
          <button
            onClick={() => go(1)}
            aria-label="Materialul următor"
            className="w-10 h-10 rounded-full bg-white/10 text-white grid place-items-center shrink-0 hover:bg-white/20 transition"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
