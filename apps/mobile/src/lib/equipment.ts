/**
 * equipment — ce echipament de lumina/setup are stilista.
 * Colectat la onboarding, folosit in viitor pentru a recomanda idei de
 * reel potrivite echipamentului (DE FACUT: filtru recomandari).
 */
const KEY = "reelcoach:equipment";

export type EquipmentId = "window" | "ring" | "led" | "studio";

export function setEquipment(ids: EquipmentId[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids));
  } catch { /* ignore */ }
}

export function getEquipment(): EquipmentId[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as EquipmentId[]) : [];
  } catch {
    return [];
  }
}
