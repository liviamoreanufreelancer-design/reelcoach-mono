"use client";
/**
 * MediaLibrary — gospodăria bibliotecii: ce avem, ce e prea mare, ce se scoate.
 *
 * Alegerea unui material se face din editor (MediaPicker). Aici se urcă în
 * masă, se redenumesc și se șterg.
 *
 * Redenumirea nu e cosmetică: „IMG_4821" nu se poate căuta, „mișcare păr, plan
 * mediu" da. Cu o bibliotecă de câteva sute de fișiere, numele e singura cale
 * de a găsi ceva.
 */
import { useRef, useState, useTransition } from "react";
import { Upload, Trash2, AlertTriangle } from "lucide-react";
import { uploadToLibrary } from "@/lib/media-upload";
import { renameMediaAsset, deleteMediaAsset } from "@/lib/template-actions";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { MediaAsset } from "@/lib/db-types";
import { isOversized, tileAspect } from "@/lib/media-display";
import MediaViewer from "./MediaViewer";

export default function MediaLibrary({ initial }: { initial: MediaAsset[] }) {
  const [assets, setAssets] = useState<MediaAsset[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  /** Ce material e deschis la mărime. null = niciunul. */
  const [viewing, setViewing] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const reload = async () => {
    const sb = getSupabaseBrowserClient();
    const { data } = await sb
      .from("media_assets").select("*").order("created_at", { ascending: false });
    setAssets((data ?? []) as MediaAsset[]);
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const total = files.length;
    let i = 0;
    for (const file of Array.from(files)) {
      i += 1;
      setBusy(`Urc ${i}/${total} — ${file.name}`);
      const res = await uploadToLibrary(file);
      if (!res.ok) { setError(`„${file.name}" nu s-a urcat: ${res.error}`); break; }
    }
    setBusy(null);
    await reload();
  };

  const oversized = assets.filter(isOversized).length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-5">
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
          disabled={!!busy}
          className="btn-champagne inline-flex items-center gap-2"
        >
          <Upload className="w-4 h-4" /> Urcă materiale
        </button>
        <span className="text-[12.5px] text-[#9A9A9A]">
          {assets.length} {assets.length === 1 ? "material" : "materiale"}
        </span>
        {oversized > 0 && (
          <span className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1 inline-flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            {oversized} {oversized === 1 ? "filmare peste" : "filmări peste"} 1080 — încetinesc randarea
          </span>
        )}
      </div>

      {busy && <p className="text-[12.5px] text-[#5B34FF] mb-3">{busy}</p>}
      {error && (
        <p className="text-[12px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
          {error}
        </p>
      )}

      {assets.length === 0 ? (
        <div className="card px-6 py-10 text-center">
          <p className="text-[14px] font-medium text-[#1F1F1F]">Nimic urcat încă.</p>
          <p className="text-[13px] text-[#6B6B6B] mt-1.5 leading-relaxed max-w-[440px] mx-auto">
            Urcă filmările de probă o dată, aici. Apoi le alegi din editor de
            câte ori ai nevoie, fără să le mai urci.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-4">
          {assets.map((a, i) => (
            <Tile
              key={a.id}
              asset={a}
              onOpen={() => setViewing(i)}
              onRename={(name) => startTransition(async () => {
                await renameMediaAsset(a.id, name);
                setAssets((cur) => cur.map((x) => (x.id === a.id ? { ...x, name } : x)));
              })}
              onDelete={() => {
                if (!confirm(`Ștergi „${a.name}"? Cadrele care îl folosesc rămân fără filmare.`)) return;
                startTransition(async () => {
                  const res = await deleteMediaAsset(a.id, a.storage_path);
                  if (!res.ok) { setError(res.error); return; }
                  setAssets((cur) => cur.filter((x) => x.id !== a.id));
                });
              }}
            />
          ))}
        </div>
      )}

      <MediaViewer
        assets={assets}
        index={viewing}
        onIndex={setViewing}
        onClose={() => setViewing(null)}
      />
    </div>
  );
}

function Tile({
  asset, onOpen, onRename, onDelete,
}: {
  asset: MediaAsset;
  onOpen: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const tooBig = isOversized(asset);
  const mb = asset.size_bytes ? asset.size_bytes / (1024 * 1024) : null;

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } }}
        title="Deschide materialul"
        style={{ aspectRatio: `${tileAspect(asset)}` }}
        className="relative w-full rounded-lg overflow-hidden bg-[#EFECF8] group cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#5B34FF]"
      >
        {asset.kind === "video" ? (
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
            title={`${asset.width}×${asset.height}. Reel-ul final e 1080×1920, deci pixelii în plus se aruncă după ce ai plătit pentru ei.`}
            className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 text-[9.5px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/90 text-white"
          >
            <AlertTriangle className="w-2.5 h-2.5" /> prea mare
          </span>
        )}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="Șterge materialul"
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/55 backdrop-blur-sm text-white grid place-items-center opacity-0 group-hover:opacity-100 transition"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      <input
        defaultValue={asset.name}
        onBlur={(e) => {
          const v = e.target.value.trim();
          if (v && v !== asset.name) onRename(v);
        }}
        aria-label="Numele materialului"
        className="mt-1.5 w-full bg-transparent text-[11.5px] text-[#1F1F1F] leading-tight outline-none focus:bg-white focus:rounded focus:px-1"
      />
      <div className="text-[10px] text-[#9A9A9A] tabular-nums">
        {asset.width ? `${asset.width}×${asset.height}` : "—"}
        {asset.duration_sec ? ` · ${asset.duration_sec.toFixed(1)}s` : ""}
        {mb ? ` · ${mb.toFixed(1)} MB` : ""}
      </div>
    </div>
  );
}
