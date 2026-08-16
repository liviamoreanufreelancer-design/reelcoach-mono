import { getSupabaseBrowserClient } from "./supabase-browser";
import { createMediaAsset } from "./template-actions";

/**
 * Ce am aflat despre fișier ÎNAINTE să-l urcăm.
 *
 * Rezoluția se citește aici, nu se descoperă la randare. Sursele 4K au dus
 * randarea la 9fps din 24 (măsurat), iar reel-ul final e oricum 1080×1920 —
 * deci pixelii în plus se aruncă după ce ai plătit pentru ei. Până acum asta
 * ieșea la iveală abia când randarea era sacadată, adică după ce materialul
 * fusese deja folosit în mai multe variante.
 */
export interface MediaProbe {
  width: number | null;
  height: number | null;
  durationSec: number | null;
}

export function probeMedia(file: File): Promise<MediaProbe> {
  const empty: MediaProbe = { width: null, height: null, durationSec: null };
  if (typeof document === "undefined") return Promise.resolve(empty);

  const url = URL.createObjectURL(file);
  const isVideo = file.type.startsWith("video/");

  return new Promise<MediaProbe>((resolve) => {
    // Măsurarea n-are voie să blocheze urcarea: dacă browserul nu poate citi
    // metadatele (codec exotic, fișier trunchiat), urcăm oricum și rămânem
    // fără cifre. Un material fără dimensiuni e mai bun decât unul pierdut.
    const done = (r: MediaProbe) => { URL.revokeObjectURL(url); resolve(r); };
    const guard = window.setTimeout(() => done(empty), 6000);

    if (isVideo) {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      v.onloadedmetadata = () => {
        window.clearTimeout(guard);
        done({
          width: v.videoWidth || null,
          height: v.videoHeight || null,
          durationSec: Number.isFinite(v.duration) ? v.duration : null,
        });
      };
      v.onerror = () => { window.clearTimeout(guard); done(empty); };
      v.src = url;
      return;
    }

    const img = new Image();
    img.onload = () => {
      window.clearTimeout(guard);
      done({ width: img.naturalWidth || null, height: img.naturalHeight || null, durationSec: null });
    };
    img.onerror = () => { window.clearTimeout(guard); done(empty); };
    img.src = url;
  });
}

/** Numele fișierului fără extensie — punct de plecare pentru numele din catalog. */
function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").slice(0, 80) || "material";
}

/**
 * Urcă un fișier în bibliotecă și întoarce adresa lui.
 *
 * Urcarea merge DIRECT din browser: footage real de telefon depășește body-ul
 * unei server action (413). Prin acțiune trece doar rândul de catalog.
 */
export async function uploadToLibrary(
  file: File,
): Promise<{ ok: true; url: string; id: string } | { ok: false; error: string }> {
  const probe = await probeMedia(file);
  const kind: "video" | "image" = file.type.startsWith("image/") ? "image" : "video";

  const sb = getSupabaseBrowserClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || (kind === "image" ? "jpg" : "mp4");
  // Prefix `library/` în bucketul existent: un bucket nou ar fi însemnat un
  // pas manual în Supabase înainte ca ceva să funcționeze.
  const path = `library/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error: upErr } = await sb.storage
    .from("samples")
    .upload(path, file, { contentType: file.type || undefined, upsert: false });
  if (upErr) return { ok: false, error: upErr.message };

  const { data: pub } = sb.storage.from("samples").getPublicUrl(path);

  const res = await createMediaAsset({
    name: baseName(file.name),
    kind,
    url: pub.publicUrl,
    storagePath: path,
    width: probe.width,
    height: probe.height,
    durationSec: probe.durationSec,
    sizeBytes: file.size,
  });

  if (!res.ok) {
    // Rândul n-a intrat, deci materialul n-ar apărea nicăieri — dar fișierul
    // ar rămâne pe disc. Îl scoatem, ca să nu se adune fișiere orfane.
    await sb.storage.from("samples").remove([path]).catch(() => {});
    return { ok: false, error: res.error };
  }

  return { ok: true, url: pub.publicUrl, id: res.id };
}
