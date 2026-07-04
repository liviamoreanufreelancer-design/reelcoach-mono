"use client";

/**
 * Cover image upload card. Shows current cover + upload button. After upload,
 * the page revalidates and the new image appears.
 */

import { useRef, useState, useTransition } from "react";
import { Upload, ImageIcon } from "lucide-react";
import { uploadCover } from "@/lib/template-actions";

export default function CoverUploadCard({
  templateId,
  coverUrl,
  disabled,
}: {
  templateId: string;
  coverUrl: string | null;
  disabled: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.set("cover", file);
    setError(null);
    startTransition(async () => {
      try {
        await uploadCover(templateId, fd);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        // Reset input so the same file can be re-uploaded.
        if (inputRef.current) inputRef.current.value = "";
      }
    });
  };

  return (
    <div className="card p-5">
      <h2 className="text-[10px] tracking-[0.32em] uppercase text-[#5B34FF]/85 font-bold mb-3">
        Cover image
      </h2>

      <div
        className="relative w-full rounded-xl overflow-hidden bg-white/[0.04] border border-[#5B34FF]/15 mb-3"
        style={{ aspectRatio: "16 / 10" }}
      >
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverUrl}
            alt="Cover curent"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-[#9A9A9A]">
            <ImageIcon className="w-8 h-8" />
            <span className="text-[11px] tracking-[0.18em] uppercase">Fără imagine</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={onChange}
        disabled={disabled || pending}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || pending}
        className="btn-glass w-full inline-flex items-center justify-center gap-2 disabled:opacity-40"
      >
        <Upload className="w-3.5 h-3.5" />
        {pending ? "Se urcă…" : coverUrl ? "Schimbă imaginea" : "Urcă imaginea"}
      </button>

      <p className="text-[10px] text-[#9A9A9A] mt-2 leading-relaxed">
        JPG, PNG sau WEBP. Max 5 MB. Recomandat 16:13 (lățime mai mare ca înălțime).
      </p>

      {error && (
        <p className="text-[11px] text-rose-300 mt-2">{error}</p>
      )}
    </div>
  );
}
