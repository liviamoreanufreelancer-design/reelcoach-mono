/**
 * favorites — template-urile (idei de reel) salvate de stilista.
 * Persistat in localStorage. Bookmark-urile din Explore/Home scriu aici,
 * iar tab-ul Favorite le citeste.
 */
const KEY = "reelcoach:favorites";

function read(): Set<string> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr as string[]) : new Set();
  } catch {
    return new Set();
  }
}

function write(set: Set<string>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...set]));
  } catch { /* ignore */ }
}

export function getFavorites(): string[] {
  return [...read()];
}

export function isFavorite(id: string): boolean {
  return read().has(id);
}

export function toggleFavorite(id: string): boolean {
  const set = read();
  if (set.has(id)) {
    set.delete(id);
    write(set);
    return false;
  }
  set.add(id);
  write(set);
  return true;
}
