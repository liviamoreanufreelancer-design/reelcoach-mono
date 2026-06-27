import { get, set } from "idb-keyval";

export type Vibe = "luxury" | "soft" | "bold";

export interface BrandProfile {
  name: string;
  handle: string;          // without leading "@"
  primary: string;         // hex e.g. "#5B34FF"
  accent: string;          // hex
  vibe: Vibe;
  phone?: string;
  location?: string;
  logoBlob?: Blob;         // PNG (rasterized at upload time, max 512x512)
  updatedAt: number;
}

const KEY = "brand:profile";
const SKIP_KEY = "reelcoach:onboardingSkipped";
const DONE_KEY = "reelcoach:onboardingDone";

export async function loadBrand(): Promise<BrandProfile | null> {
  try {
    return ((await get(KEY)) as BrandProfile | undefined) ?? null;
  } catch {
    return null;
  }
}

export async function saveBrand(p: BrandProfile): Promise<void> {
  await set(KEY, { ...p, updatedAt: Date.now() });
  try {
    localStorage.setItem(DONE_KEY, "1");
    localStorage.removeItem(SKIP_KEY);
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch { /* ignore */ }
}

export function isOnboardingDone(): boolean {
  try {
    return localStorage.getItem(DONE_KEY) === "1"
      || localStorage.getItem(SKIP_KEY) === "1";
  } catch {
    return true;
  }
}

export function markOnboardingSkipped(): void {
  try { localStorage.setItem(SKIP_KEY, "1"); } catch { /* ignore */ }
}

/** Marcheaza onboarding-ul terminat fara a depinde de salvarea brandului.
 *  Folosit de noul onboarding (welcome/specialitate/echipament/gata). */
export function markOnboardingDone(): void {
  try {
    localStorage.setItem(DONE_KEY, "1");
    localStorage.removeItem(SKIP_KEY);
  } catch { /* ignore */ }
}

export const DEFAULT_BRAND: BrandProfile = {
  name: "",
  handle: "",
  primary: "#5B34FF",
  accent: "#F4E2B8",
  vibe: "luxury",
  updatedAt: 0,
};

// Suggested palette per profession (hex). Used by onboarding "suggest".
export const PROFESSION_PALETTE: Record<string, { primary: string; accent: string }> = {
  par:       { primary: "#B68A4E", accent: "#F4E2B8" },
  machiaj:   { primary: "#C2185B", accent: "#F8BBD0" },
  unghii:    { primary: "#D81B60", accent: "#F8BBD0" },
  gene:      { primary: "#6A1B9A", accent: "#E1BEE7" },
  sprancene: { primary: "#5D4037", accent: "#D7CCC8" },
};

/**
 * Rasterize an arbitrary image File (PNG/JPG/SVG) to a square PNG Blob,
 * max `size`x`size`, preserving aspect ratio with transparent padding.
 */
export async function rasterizeLogo(file: File, size = 512): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const ratio = Math.min(size / img.width, size / img.height);
  const w = img.width * ratio;
  const h = img.height * ratio;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}
