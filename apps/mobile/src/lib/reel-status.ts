/**
 * reel-status — store IndexedDB pentru statusul "postat" al unui reel.
 * Paralel cu clip-store. clip-store stie ce s-a filmat (done/total);
 * acest store retine doar daca stilista a marcat reel-ul ca postat.
 */
import { get, set, del, keys } from "idb-keyval";

const POSTED_PREFIX = "posted:";
const pk = (scenarioId: string) => `${POSTED_PREFIX}${scenarioId}`;

export async function markPosted(scenarioId: string): Promise<void> {
  await set(pk(scenarioId), Date.now());
}

export async function unmarkPosted(scenarioId: string): Promise<void> {
  await del(pk(scenarioId));
}

/** Map scenarioId -> timestamp postare, pentru toate reel-urile postate. */
export async function getPostedMap(): Promise<Map<string, number>> {
  const allKeys = await keys();
  const map = new Map<string, number>();
  await Promise.all(
    allKeys
      .filter((k): k is string => typeof k === "string" && k.startsWith(POSTED_PREFIX))
      .map(async (k) => {
        const ts = (await get(k)) as number | undefined;
        if (typeof ts === "number") map.set(k.slice(POSTED_PREFIX.length), ts);
      }),
  );
  return map;
}
