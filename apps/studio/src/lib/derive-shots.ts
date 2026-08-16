import type { ReelDesignRow, OutputSlot } from "./db-types";

/**
 * ════════════════════════════════════════════════════════════════════
 *  Ce trebuie filmat, dedus din ce s-a construit
 * ════════════════════════════════════════════════════════════════════
 *
 * DIRECȚIA S-A INVERSAT. Până acum momentele erau sursa adevărului, iar
 * rezultatele le refereau — două liste ținute sincron cu mâna, cu două feluri
 * de greșeală posibile: momente filmate pe care nu le folosește nimeni, și
 * rezultate care cer momente inexistente.
 *
 * Aici lista de filmat NU se scrie, se calculează: e reuniunea cadrelor cerute
 * de variante. Ambele greșeli devin imposibile prin construcție, nu prin
 * grijă — la fel cum registry-ul de efecte a făcut imposibilă a doua listă de
 * efecte.
 *
 * ── DURATA E UN MAXIM, NU O SUMĂ ────────────────────────────────────
 *
 * Varianta A vrea „before" 2 secunde, varianta B îl vrea 3,5. Stilista
 * filmează O SINGURĂ dată. Deci trebuie să filmeze cât cere cea mai
 * pretențioasă, iar fiecare variantă taie din el cât îi trebuie — mecanismul
 * de auto-trim există deja. O sumă ar cere 5,5 secunde degeaba; un minim ar
 * lăsa varianta B fără material.
 *
 * ── CE LIPSEȘTE ÎNCĂ, ȘI E INTENȚIONAT ──────────────────────────────
 *
 * ORDINEA. Aici cadrele ies în ordinea primei apariții. Stilista însă filmează
 * în ordinea SERVICIULUI (before → aplicare → dezvăluire), care nu e ordinea
 * din nicio variantă anume. Ordinea aparține tipului de cadru, deci vine odată
 * cu catalogul global — nu se poate deduce din variante.
 *
 * La fel: ce se capturează (video/poză/ambele) și instrucțiunile de filmare.
 * Toate trei sunt proprietăți ale TIPULUI de cadru, nu ale variantei care îl
 * folosește. Funcția asta arată exact ce se poate deduce și se oprește acolo.
 */

export interface DerivedShot {
  /** slot_key — identitatea cadrului. */
  slot: string;
  /** Numele dat de parteneră, primul găsit. */
  label: string;
  /** Câte variante îl cer. Unu = cadru filmat pentru o singură postare. */
  usedBy: number;
  /** Cât trebuie filmat: maximul cerut de vreo variantă. */
  maxSec: number;
  /** Numele variantelor care îl folosesc — ca să se vadă de ce e în listă. */
  designs: string[];
}

export function deriveShots(designs: ReelDesignRow[]): DerivedShot[] {
  const bySlot = new Map<string, DerivedShot>();

  for (const d of designs) {
    // Un cadru folosit de două ori în ACEEAȘI variantă se filmează tot o dată.
    const seenHere = new Set<string>();
    for (const slot of d.slots as OutputSlot[]) {
      if (!slot.slot) continue;
      const existing = bySlot.get(slot.slot);
      const sec = slot.sec ?? 2;

      if (!existing) {
        bySlot.set(slot.slot, {
          slot: slot.slot,
          label: slot.label?.trim() || slot.slot,
          usedBy: 1,
          maxSec: sec,
          designs: [d.name],
        });
        seenHere.add(slot.slot);
        continue;
      }

      existing.maxSec = Math.max(existing.maxSec, sec);
      if (!existing.label || existing.label === existing.slot) {
        existing.label = slot.label?.trim() || existing.label;
      }
      if (!seenHere.has(slot.slot)) {
        existing.usedBy += 1;
        existing.designs.push(d.name);
        seenHere.add(slot.slot);
      }
    }
  }

  return Array.from(bySlot.values());
}

/** Cât durează filmarea, cu rezerva de pornit/oprit telefonul. */
export function estimateFilmingMinutes(shots: DerivedShot[]): number {
  const SETUP_SEC = 25; // așezat telefonul, verificat, refilmat la nevoie
  const total = shots.reduce((s, x) => s + x.maxSec + SETUP_SEC, 0);
  return Math.max(1, Math.round(total / 60));
}
