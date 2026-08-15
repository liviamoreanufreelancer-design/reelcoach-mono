import type { ShotRow } from "./db-types";

/**
 * Câte un moment per etichetă, din tot catalogul.
 *
 * Variantele din bibliotecă nu aparțin niciunui șablon: sunt compoziții peste
 * NUME de momente. Deci întrebarea „ce filmare are momentul «before»?" trebuie
 * să aibă un răspuns fără să știi din ce serviciu vorbim.
 *
 * Aceeași etichetă apare în mai multe șabloane (balayage și tuns au amândouă
 * un „before"). Alegem exemplarul cel mai util pentru proiectare, în ordinea
 * asta: are clip → are imagine → orice. Fără regula asta, o variantă ar putea
 * pica pe un moment gol dintr-un șablon neterminat și partenera n-ar avea ce
 * edita, deși footage-ul există în altă parte.
 */
export function oneShotPerSlot(shots: ShotRow[]): ShotRow[] {
  const best = new Map<string, ShotRow>();
  for (const shot of shots) {
    const key = shot.slot_key;
    if (!key) continue;
    const current = best.get(key);
    if (!current || rank(shot) > rank(current)) best.set(key, shot);
  }
  return Array.from(best.values()).sort((a, b) =>
    (a.slot_key ?? "").localeCompare(b.slot_key ?? ""),
  );
}

function rank(s: ShotRow): number {
  if (s.sample_video_url) return 2;
  if (s.example_image_url) return 1;
  return 0;
}
