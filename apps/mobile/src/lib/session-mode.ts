/**
 * Modul sesiunii: Ghidat sau Rapid.
 *
 * NU e despre cât știe stilista — e despre ce zi are. Poate fi ghidată la un
 * serviciu nou și rapidă la al sutălea balayage. Dacă numele ar sugera nivel,
 * „Rapid" ar deveni laudă și „Ghidat" recunoașterea unei slăbiciuni, iar
 * alegerea ar înceta să fie liberă.
 *
 * Diferența e una singură: în Ghidat, demonstrația unui tip de cadru nou se
 * arată înainte de filmare. În Rapid nu se impune — dar NU dispare: butonul
 * „vezi cum" rămâne pe ecranul camerei. Dacă appul ar opri-o oricum după ce a
 * ales Rapid, modul ar fi o minciună.
 *
 * Alegerea se ține minte între sesiuni, fiindcă de obicei nu se schimbă.
 */

export type SessionMode = "ghidat" | "rapid";

const KEY = "reelcoach:sessionMode";

export function getSessionMode(): SessionMode {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === "rapid" || raw === "ghidat") return raw;
  } catch {
    /* stocarea poate fi blocată; implicitul rămâne valid */
  }
  // Prima dată e Ghidat: demonstrațiile apar o dată per tip de cadru, iar
  // tipurile se repetă între servicii, deci după câteva sesiuni nu mai apar
  // oricum. Costul alegerii greșite e mic într-o direcție și mare în cealaltă.
  return "ghidat";
}

export function setSessionMode(mode: SessionMode): void {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* ignorăm: modul rămâne valabil pentru sesiunea curentă */
  }
}
