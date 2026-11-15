/**
 * frame-vision — unde e subiectul în cadru, din Vision.
 *
 * Puntea spre pluginul nativ. Trimite un cadru mic, primește o casetă.
 *
 * DE CE DOUĂ CADRE PE SECUNDĂ, nu la framerate video: nu urmărim o minge, ci
 * răspundem la „e destul de aproape?". Întrebarea se schimbă când ea mișcă
 * telefonul, adică de câteva ori per moment. Notele de produs resping analiza
 * la framerate în WKWebView, și au dreptate — asta nu e aia.
 *
 * DE CE CADRUL E MIC: 192 px pe latura lungă. Vision nu are nevoie de mai mult
 * pentru o casetă grosieră, iar puntea JS↔Swift transportă atunci ~10-15 KB,
 * nu un megabyte. Costul punții e singura necunoscută reală din tot designul.
 *
 * Degradează în gol: fără plugin (web, simulator vechi) toate apelurile dau
 * `null` și appul se comportă ca înainte.
 */
import { registerPlugin, Capacitor } from "@capacitor/core";

export interface SubjectBox {
  /** Normalizat 0-1, origine stânga-sus — deja convertit din Vision. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** `face` e precis; `salient` e grosier, pentru cadrele fără om. */
  source: "face" | "salient";
}

interface FrameVisionPlugin {
  analyzeFrame(options: { image: string }): Promise<{
    found: boolean;
    source?: "face" | "salient";
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  }>;
}

const FrameVision = registerPlugin<FrameVisionPlugin>("FrameVision");

/** Latura lungă a cadrului trimis. Mic cât să fie ieftin, mare cât să fie util. */
const SAMPLE_LONG_EDGE = 192;

export const frameVisionAvailable = () => Capacitor.isNativePlatform();

/**
 * Un cadru din elementul video, micșorat, ca JPEG base64.
 * Canvas-ul se refolosește: unul nou la fiecare apel ar aloca de două ori pe
 * secundă, fără motiv.
 */
let canvas: HTMLCanvasElement | null = null;

function grabFrame(video: HTMLVideoElement): string | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return null;

  const scale = SAMPLE_LONG_EDGE / Math.max(vw, vh);
  const w = Math.max(1, Math.round(vw * scale));
  const h = Math.max(1, Math.round(vh * scale));

  if (!canvas) canvas = document.createElement("canvas");
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(video, 0, 0, w, h);
  // Calitate joasă intenționat: Vision caută forme, nu detalii, iar fiecare
  // kilobyte în plus trece prin punte de două ori pe secundă.
  return canvas.toDataURL("image/jpeg", 0.5);
}

/**
 * Rezultatul căutării, cu MOTIVUL când n-a ieșit nimic.
 *
 * Prima versiune întorcea doar `SubjectBox | null`, și a fost o greșeală care
 * m-a costat o rundă: pluginul nu era înregistrat în Capacitor, fiecare apel
 * arunca, iar `catch` înghițea totul și întorcea `null`. Pe ecran: nimic. În
 * consolă: nimic. Indistingibil de „n-a găsit subiectul".
 *
 * Un eșec tăcut într-o funcție de diagnostic e mai rău decât o eroare.
 */
export type SubjectResult =
  | { status: "ok"; box: SubjectBox }
  | { status: "none" }
  | { status: "unavailable" }
  | { status: "error"; message: string };

export async function findSubject(video: HTMLVideoElement): Promise<SubjectResult> {
  if (!frameVisionAvailable()) return { status: "unavailable" };
  const image = grabFrame(video);
  if (!image) return { status: "error", message: "cadru gol" };
  try {
    const r = await FrameVision.analyzeFrame({ image });
    if (!r.found || r.height == null) return { status: "none" };
    return {
      status: "ok",
      box: {
        x: r.x ?? 0,
        y: r.y ?? 0,
        width: r.width ?? 0,
        height: r.height,
        source: r.source ?? "salient",
      },
    };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : String(e) };
  }
}
