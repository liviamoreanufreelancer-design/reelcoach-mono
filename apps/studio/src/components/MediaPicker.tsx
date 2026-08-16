"use client";
/**
 * MediaPicker — alege un material din bibliotecă, sau urcă unul nou.
 *
 * Se deschide de oriunde e nevoie de o filmare: cadrele variantelor, momentele
 * șabloanelor. Materialul se urcă o dată și se refolosește — înainte, aceeași
 * „mișcare de păr" în zece variante însemna zece urcări.
 *
 * Ordinea contează: LISTA e prima, urcarea e a doua. Dacă butonul de urcare ar
 * fi primul lucru pe care îl vezi, ai urca din nou fără să te uiți — și
 * biblioteca ar rămâne un depozit, nu o unealtă.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Upload, Search, X, AlertTriangle, Maximize2 } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { uploadToLibrary } from "@/lib/media-upload";
import type { MediaAsset } from "@/lib/db-types";
import { isOversized, tileAspect } from "@/lib/media-display";
import MediaKindFilter, { filterByKind, type MediaKindFilterValue } from "./MediaKindFilter";
import MediaViewer from "./MediaViewer";

export default function MediaPicker({
  open,
  onClose,
  onPick,
  prefer = "all",
}: {
  open: boolean;
  onClose: () => void;
  onPick: (asset: MediaAsset) => void;
  /**
   * Ce fel de material caută locul de unde s-a deschis. Cadrele variantelor
   * cer filmări, deci se deschide direct pe ele — un filtru pe care oricum
   * l-ai apăsa e o apăsare irosită.
   */
  prefer?: MediaKindFilterValue;
}) {
  const [assets, setAssets] = useState<MediaAsset[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Ce material se privește la mărime, fără să-l alegi. */
  const [viewing, setViewing] = useState<number | null>(null);
  const [kind, setKind] = useState<MediaKindFilterValue>(prefer);
  const fileRef = useRef<HTMLInputElement>(null);

  // Citim din browser, nu printr-o pagină de server: dialogul se deschide
  // peste editor, iar o navigare l-ar închide.
  const load = async () => {
    const sb = getSupabaseBrowserClient();
    const { data, error: e } = await sb
      .from("media_assets").select("*").order("created_at", { ascending: false });
    if (e) { setError(e.message); return; }
    setAssets((data ?? []) as MediaAsset[]);
  };

  useEffect(() => {
    if (open) { setError(null); setKind(prefer); void load(); }
  }, [open, prefer]);

  const shown = useMemo(() => {
    const base = filterByKind(assets ?? [], kind);
    const needle = q.trim().toLowerCase();
    if (!needle) return base;
    return base.filter(
      (a) => a.name.toLowerCase().includes(needle) ||
             a.tags.some((t) => t.toLowerCase().includes(needle)),
    );
  }, [assets, q, kind]);

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    for (const file of Array.from(files)) {
      const res = await uploadToLibrary(file);
      if (!res.ok) { setError(`„${file.name}" nu s-a urcat: ${res.error}`); break; }
    }
    await load();
    setBusy(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="card w-full max-w-[760px] max-h-[82vh] flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#E7E3F5]">
          <p className="eyebrow flex-1">Bibliotecă de materiale</p>
          <button
            onClick={onClose}
            aria-label="Închide"
            className="w-8 h-8 rounded-full bg-white/[0.06] grid place-items-center text-[#6B6B6B]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-[#E7E3F5] flex gap-2 items-center flex-wrap">
          <MediaKindFilter
            assets={assets ?? []}
            value={kind}
            onChange={(v) => { setKind(v); setViewing(null); }}
          />
          <div className="relative flex-1 min-w-[160px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9A9A9A]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Caută după nume…"
              className="input !mb-0 !pl-9 text-[13px]"
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="video/*,image/*"
            multiple
            hidden
            onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="btn-glass shrink-0 inline-flex items-center gap-1.5 text-[12.5px] !px-3.5 !py-2"
          >
            <Upload className="w-3.5 h-3.5" />
            {busy ? "urc…" : "Urcă"}
          </button>
        </div>

        {error && (
          <p className="mx-5 mt-3 text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {assets === null ? (
            <p className="text-[13px] text-[#9A9A9A] py-8 text-center">Se încarcă…</p>
          ) : shown.length === 0 ? (
            <p className="text-[13px] text-[#6B6B6B] py-8 text-center leading-relaxed">
              {q ? "Niciun material cu numele ăsta." : "Biblioteca e goală. Urcă primul material."}
            </p>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-3">
              {shown.map((a, i) => (
                <AssetTile
                  key={a.id}
                  asset={a}
                  onPick={() => { onPick(a); onClose(); }}
                  onView={() => setViewing(i)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Privitul la mărime nu alege nimic: la 3 secunde de material,
          miniatura nu-ți spune dacă filmarea e bună. */}
      <MediaViewer
        assets={shown}
        index={viewing}
        onIndex={setViewing}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}

function AssetTile({
  asset, onPick, onView,
}: {
  asset: MediaAsset;
  onPick: () => void;
  onView: () => void;
}) {
  // Semnalul se dă AICI, la alegere, nu la randare: o filmare peste 1080 e
  // randare mai lentă fără niciun câștig, fiindcă reel-ul final e 1080×1920.
  // La poze nu se aplică — vezi lib/media-display.ts.
  const tooBig = isOversized(asset);

  return (
    <div className="text-left group relative">
      <button
        type="button"
        onClick={onView}
        aria-label="Vezi materialul la mărime"
        title="Vezi la mărime"
        className="absolute z-10 top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/55 backdrop-blur-sm text-white grid place-items-center opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
      >
        <Maximize2 className="w-3 h-3" />
      </button>
      <button type="button" onClick={onPick} className="w-full text-left">
      <div
        style={{ aspectRatio: `${tileAspect(asset)}` }}
        className="relative w-full rounded-lg overflow-hidden bg-[#EFECF8] border-2 border-transparent group-hover:border-[#5B34FF] transition"
      >
        {asset.kind === "video" ? (
          // `preload="metadata"` + `#t=0.5`: browserul aduce doar începutul și
          // arată un cadru, în loc să descarce tot fișierul pentru o miniatură.
          <video
            src={`${asset.url}#t=0.5`}
            preload="metadata"
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
        )}
        {tooBig && (
          <span
            title={`${asset.width}×${asset.height} — mai mare decât 1080 lățime. Randarea încetinește, iar reel-ul final e oricum 1080×1920.`}
            className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 text-[9.5px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/90 text-white"
          >
            <AlertTriangle className="w-2.5 h-2.5" /> prea mare
          </span>
        )}
      </div>
      <div className="mt-1.5 text-[11.5px] text-[#1F1F1F] leading-tight truncate">{asset.name}</div>
      <div className="text-[10px] text-[#9A9A9A] tabular-nums">
        {asset.width ? `${asset.width}×${asset.height}` : "—"}
        {asset.duration_sec ? ` · ${asset.duration_sec.toFixed(1)}s` : ""}
      </div>
      </button>
    </div>
  );
}
