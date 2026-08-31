import type { CaptureKind, OutputKind, OutputSlot } from "./db-types";
import { isImageUrl } from "./media-display";

/**
 * Ce momente CER rezultatele — calculat, nu citit.
 *
 * Aceeași socoteală o face și `syncShotsFromOutputs` când scrie în bază.
 * Trăiește aici ca funcție pură ca s-o poată face și interfața, fără să
 * scrie nimic: așa se poate compara ce E cu ce AR TREBUI SĂ FIE, și se poate
 * spune partenerei când cele două nu mai corespund.
 *
 * De ce e nevoie: derivarea rulează la import. Dacă un rezultat a fost
 * importat înainte ca o regulă să existe — cum s-a întâmplat cu „ce se
 * captureaza" — momentele rămân cum au fost create, tăcut. O derivare care
 * poate rămâne în urmă fără să se vadă e la fel de rea ca o listă scrisă de
 * mână.
 */
export interface PlannedShot {
  slot: string;
  label: string;
  /** Cât se filmează: maximul cerut de vreun rezultat. */
  sec: number;
  /** Filmare, poză, sau ambele — după felul rezultatelor care îl cer. */
  capture: CaptureKind;
}

export function planShots(
  outputs: { slots: OutputSlot[]; kind: OutputKind }[],
): Map<string, PlannedShot> {
  const out = new Map<string, PlannedShot>();

  for (const o of outputs) {
    for (const slot of Array.isArray(o.slots) ? o.slots : []) {
      if (!slot?.slot) continue;
      /**
       * Caruselul cere mereu imagine. La POVEȘTI decizia e per moment: dacă
       * partenera a proiectat momentul ăla cu o poză, stilista trebuie să
       * facă o poză — altfel ar filma un video pentru o poveste gândită ca
       * imagine, iar rezultatul n-ar semăna cu ce a construit ea.
       *
       * Se citește din materialul de probă: tipul lui E decizia.
       */
      const wantsPhoto =
        o.kind === "carousel" || (o.kind === "stories" && isImageUrl(slot.demoUrl));
      const sec = slot.sec ?? 2;
      const cur = out.get(slot.slot);

      if (!cur) {
        out.set(slot.slot, {
          slot: slot.slot,
          label: slot.label?.trim() || slot.slot,
          sec,
          capture: wantsPhoto ? "photo" : "video",
        });
        continue;
      }

      cur.sec = Math.max(cur.sec, sec);
      if (cur.label === cur.slot && slot.label?.trim()) cur.label = slot.label.trim();
      // Un moment cerut și de un reel, și de un carusel se filmează ȘI se
      // fotografiază — la aceeași oprire.
      const needsPhoto = cur.capture === "photo" || cur.capture === "both" || wantsPhoto;
      const needsVideo = cur.capture === "video" || cur.capture === "both" || !wantsPhoto;
      cur.capture = needsVideo && needsPhoto ? "both" : needsPhoto ? "photo" : "video";
    }
  }

  return out;
}

/**
 * Momentele salvate mai corespund rezultatelor?
 *
 * Compară doar ce se DERIVĂ — lista, durata, ce se capturează. Instrucțiunile
 * scrise de parteneră nu intră în comparație: ele nu se deduc, deci n-au cum
 * să fie „în urmă".
 */
export function shotsAreStale(
  shots: { slot_key: string | null; recording_duration: number; capture_kind: CaptureKind }[],
  planned: Map<string, PlannedShot>,
): boolean {
  const withKey = shots.filter((s) => s.slot_key);
  if (withKey.length !== planned.size) return true;

  for (const s of withKey) {
    const want = planned.get(s.slot_key as string);
    if (!want) return true;
    if (s.capture_kind !== want.capture) return true;
    // Aceeași rezervă ca la scriere (vezi syncShotsFromOutputs).
    if (s.recording_duration !== Math.max(3, Math.ceil(want.sec + 2))) return true;
  }
  return false;
}
