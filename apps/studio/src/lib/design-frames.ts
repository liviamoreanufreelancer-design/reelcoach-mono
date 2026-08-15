import type { OutputSlot, ShotLike } from "./db-types";

/**
 * Cadrele unei variante, văzute ca momente.
 *
 * O variantă din bibliotecă nu compune momente existente — ea le DEFINEȘTE.
 * Fiecare cadru are un nume („before", „aplicare") și o filmare de probă
 * urcată de parteneră. Mai târziu, filmarea stilistei umple cadrul: numele e
 * cerința, filmarea de probă e doar materialul pe care se proiectează.
 *
 * Editorul și preview-ul cer o listă de momente. Aici o fabricăm din sloturi,
 * ca să meargă neschimbate pe ambele lumi. Alternativa era un al doilea editor
 * copiat, care ar fi început să difere de primul din prima săptămână.
 */
export function framesAsShots(slots: OutputSlot[]): ShotLike[] {
  return slots.map((s) => ({
    slot_key: s.slot,
    title: s.label || s.slot,
    sample_video_url: s.demoUrl ?? null,
    example_image_url: null,
    effect: "none",
    recording_duration: 4,
    final_usage_duration: s.sec ?? 2,
    playback_speed: s.speed ?? 1,
    motion_blur: s.motionBlur ?? false,
    overlay_text: null,
    caption_preset: "hookBold",
    caption_position: "bottom",
  }));
}

/**
 * Cheia stabilă a unui cadru.
 *
 * Se generează din nume, dar NU se reface când numele se schimbă: cheia e
 * identitatea cadrului, iar sloturile deja legate de ea (durată, text, stil)
 * s-ar rupe la fiecare redenumire. Numele e pentru om, cheia e pentru sistem.
 */
export function newFrameKey(existing: OutputSlot[]): string {
  const used = new Set(existing.map((s) => s.slot));
  let n = existing.length + 1;
  while (used.has(`cadru-${n}`)) n += 1;
  return `cadru-${n}`;
}
