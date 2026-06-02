import { PROFESSIONS, type Profession } from "@/data/scenarios";

const KEY = "reelcoach:profession";

const isProfession = (v: string | null): v is Profession =>
  !!v && PROFESSIONS.some((p) => p.id === v);

export function setProfession(p: Profession) {
  try { localStorage.setItem(KEY, p); } catch { /* ignore */ }
}

export function getProfessionId(): Profession | null {
  try {
    const v = localStorage.getItem(KEY);
    return isProfession(v) ? v : null;
  } catch {
    return null;
  }
}
