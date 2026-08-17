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
 * Cheia unui cadru NU se mai generează — e slug-ul tipului din catalog.
 *
 * Înainte se numerota după poziția în variantă (`cadru-1`, `cadru-2`), ceea ce
 * producea o coliziune tăcută și gravă: primul cadru al fiecărei variante
 * primea aceeași cheie, deși una era „before" și alta „aplicare". Importate în
 * același șablon, derivarea le unea într-un singur moment — stilista filma un
 * singur lucru, iar a doua variantă randa altceva decât voia. Fără eroare.
 *
 * Cheile trebuie să însemne ceva GLOBAL, deci vin dintr-un vocabular comun.
 * Funcția rămâne doar pentru cadrele vechi, care încă au chei numerotate.
 */
export function isLegacyFrameKey(slot: string): boolean {
  return /^cadru-\d+$/.test(slot);
}
