/**
 * ════════════════════════════════════════════════════════════════════
 *  DIAGNOSTIC TEMPORAR — de șters după măsurătorile de pe device
 * ════════════════════════════════════════════════════════════════════
 *
 *  Răspunde la necunoscutele din CLAUDE.md, SARCINI IMEDIATE §4:
 *    - mărimea reală a unui clip (bitrate MediaRecorder e implicit)
 *    - totalul per sesiune la 8-10 clipuri
 *    - dacă navigator.storage.persist() întoarce true în Capacitor
 *    - dacă datele supraviețuiesc peste noapte (compară `filmat` / `vechime`)
 *    - dacă video/mp4;codecs=avc1,mp4a e suportat în WKWebView
 *
 *  Zero UI. Se folosește din Safari Web Inspector conectat la iPhone:
 *
 *    __diag()           raportul complet + JSON de copiat
 *    __diag.persist()   cere activ persistența (nu doar o citește)
 *
 *  CUM SE ȘTERGE: acest fișier + linia `import "@/lib/diag";` din __root.tsx.
 * ════════════════════════════════════════════════════════════════════
 */
import { get, keys } from "idb-keyval";
import { getStorageEstimate, type StoredClip } from "./clip-store";
import { pickRecorderMime } from "@/hooks/useCamera";

const mb = (bytes: number) => Math.round((bytes / 1048576) * 100) / 100;

function age(ts: number): string {
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 60) return `${min} min`;
  const h = min / 60;
  if (h < 24) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} zile`;
}

async function readAllClips(): Promise<StoredClip[]> {
  const allKeys = await keys();
  const clipKeys = allKeys.filter(
    (k): k is string => typeof k === "string" && k.startsWith("clip:"),
  );
  const raw = await Promise.all(
    clipKeys.map((k) => get(k) as Promise<StoredClip | undefined>),
  );
  return raw.filter((c): c is StoredClip => !!c);
}

async function readPersisted(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persisted) return null;
    return await navigator.storage.persisted();
  } catch {
    return null;
  }
}

async function diag() {
  const [estimate, clips, persisted] = await Promise.all([
    getStorageEstimate(),
    readAllClips(),
    readPersisted(),
  ]);

  const rows = [...clips]
    .sort((a, b) => a.scenarioId.localeCompare(b.scenarioId) || a.sceneIdx - b.sceneIdx)
    .map((c) => ({
      sesiune: c.scenarioId,
      scena: c.sceneIdx,
      MB: mb(c.blob?.size ?? 0),
      sec: Math.round(c.duration * 10) / 10,
      mime: c.mimeType,
      filmat: new Date(c.createdAt).toLocaleString(),
      vechime: age(c.createdAt),
    }));

  const totalBytes = clips.reduce((s, c) => s + (c.blob?.size ?? 0), 0);
  const totalSec = clips.reduce((s, c) => s + c.duration, 0);

  const perSesiune: Record<string, { clipuri: number; MB: number; celMaiVechi: string }> = {};
  for (const c of clips) {
    const g = perSesiune[c.scenarioId] ?? { clipuri: 0, MB: 0, celMaiVechi: age(c.createdAt) };
    g.clipuri += 1;
    g.MB = Math.round((g.MB + mb(c.blob?.size ?? 0)) * 100) / 100;
    if (Date.now() - c.createdAt > 0) g.celMaiVechi = age(Math.min(c.createdAt, Date.now()));
    perSesiune[c.scenarioId] = g;
  }

  const sumar = {
    acum: new Date().toLocaleString(),
    codecAles: pickRecorderMime() || "(niciunul)",
    persistenta: persisted === null ? "(API indisponibil)" : persisted,
    spatiu: estimate ? `${estimate.usageMB} / ${estimate.quotaMB} MB` : "(Storage API indisponibil)",
    clipuri: clips.length,
    totalMB: mb(totalBytes),
    mediaMBperClip: clips.length ? Math.round((mb(totalBytes) / clips.length) * 100) / 100 : 0,
    mediaMBperSecunda: totalSec ? Math.round((mb(totalBytes) / totalSec) * 100) / 100 : 0,
  };

  console.log("%c─── ReelCoach diagnostic ───", "font-weight:bold");
  console.table(sumar);
  console.table(perSesiune);
  console.table(rows);
  console.log("JSON (copiază):\n" + JSON.stringify({ sumar, perSesiune, clipuri: rows }, null, 2));

  return { sumar, perSesiune, clipuri: rows };
}

/** Cere activ persistența (spre deosebire de citirea din raport). */
async function requestPersist(): Promise<boolean | null> {
  try {
    if (!navigator.storage?.persist) {
      console.warn("[diag] navigator.storage.persist() indisponibil pe acest device");
      return null;
    }
    const ok = await navigator.storage.persist();
    console.log("[diag] navigator.storage.persist() →", ok);
    return ok;
  } catch (err) {
    console.error("[diag] persist() a aruncat:", err);
    return null;
  }
}

if (typeof window !== "undefined") {
  (window as unknown as Record<string, unknown>).__diag = Object.assign(diag, {
    persist: requestPersist,
  });
  console.log("[diag] gata — rulează __diag() în consolă");
}
