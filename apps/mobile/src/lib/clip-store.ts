import { get, set, del, keys } from "idb-keyval";

export type StoredClip = {
  scenarioId: string;
  sceneIdx: number;
  blob: Blob;
  mimeType: string;
  /** Recorded length of the clip, in seconds. */
  duration: number;
  /**
   * Auto-trim target: how many seconds of this clip the renderer keeps in
   * the final reel. The renderer extracts these from the MIDDLE of the
   * recording (start has setup wobble, end has stop-anxiety). If absent,
   * the whole clip is used (legacy behaviour, zero regression).
   */
  finalUsageDuration?: number;
  createdAt: number;
};

const k = (scenarioId: string, sceneIdx: number) =>
  `clip:${scenarioId}:${sceneIdx}`;

/**
 * Cheia pozei unui moment. Separata de cea a filmarii pentru ca un moment
 * poate cere AMANDOUA (before, after, detaliu culoare): filmarea intra in
 * reel, poza devine postare separata. Doua fisiere, acelasi moment.
 */
const pk = (scenarioId: string, sceneIdx: number) =>
  `photo:${scenarioId}:${sceneIdx}`;

export async function saveClip(c: StoredClip): Promise<void> {
  await set(k(c.scenarioId, c.sceneIdx), c);
  // Best-effort persistence request (so the browser doesn't evict our data).
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {
    // ignore
  }
}

/** O poza capturata la un moment. Mult mai simpla decat un clip: n-are durata. */
export type StoredPhoto = {
  scenarioId: string;
  sceneIdx: number;
  blob: Blob;
  mimeType: string;
  createdAt: number;
};

export async function savePhoto(p: StoredPhoto): Promise<void> {
  await set(pk(p.scenarioId, p.sceneIdx), p);
  try {
    if (navigator.storage?.persist) await navigator.storage.persist();
  } catch {
    // ignore
  }
}

export async function getPhoto(
  scenarioId: string,
  sceneIdx: number,
): Promise<StoredPhoto | undefined> {
  return (await get(pk(scenarioId, sceneIdx))) as StoredPhoto | undefined;
}

export async function listPhotos(scenarioId: string): Promise<StoredPhoto[]> {
  const allKeys = await keys();
  const prefix = `photo:${scenarioId}:`;
  const matching = allKeys.filter(
    (key) => typeof key === "string" && key.startsWith(prefix),
  );
  const photos = await Promise.all(
    matching.map((key) => get(key) as Promise<StoredPhoto | undefined>),
  );
  return photos
    .filter((p): p is StoredPhoto => !!p)
    .sort((a, b) => a.sceneIdx - b.sceneIdx);
}

export async function getClip(
  scenarioId: string,
  sceneIdx: number,
): Promise<StoredClip | undefined> {
  return (await get(k(scenarioId, sceneIdx))) as StoredClip | undefined;
}

export async function listClips(scenarioId: string): Promise<StoredClip[]> {
  const allKeys = await keys();
  const prefix = `clip:${scenarioId}:`;
  const matching = allKeys.filter(
    (key) => typeof key === "string" && key.startsWith(prefix),
  );
  const clips = await Promise.all(
    matching.map((key) => get(key) as Promise<StoredClip | undefined>),
  );
  return clips
    .filter((c): c is StoredClip => !!c)
    .sort((a, b) => a.sceneIdx - b.sceneIdx);
}

export async function clearScenario(scenarioId: string): Promise<void> {
  const allKeys = await keys();
  // Sterge SI filmarile, SI pozele. Altfel pozele ar ramane orfane dupa
  // "Reia filmarile" / "Sterge reel" si ar reaparea la o sesiune noua.
  const prefixes = [`clip:${scenarioId}:`, `photo:${scenarioId}:`];
  await Promise.all(
    allKeys
      .filter((key) => typeof key === "string" && prefixes.some((p) => key.startsWith(p)))
      .map((key) => del(key)),
  );
}

/**
 * Find an in-progress reel for the Home screen "Continuă" card.
 *
 * Scans all saved clips, groups them by scenarioId, and returns the most
 * recently worked-on scenario along with how many scenes have clips.
 * Returns null if there are no saved clips at all.
 */
export async function findInProgressReel(): Promise<{
  scenarioId: string;
  sceneCount: number;
  lastUpdated: number;
} | null> {
  const allKeys = await keys();
  const clipKeys = allKeys.filter(
    (key) => typeof key === "string" && key.startsWith("clip:"),
  );
  if (clipKeys.length === 0) return null;

  const clips = await Promise.all(
    clipKeys.map((key) => get(key) as Promise<StoredClip | undefined>),
  );

  // Group by scenarioId and track the most recent createdAt per scenario.
  const byScenario = new Map<string, { count: number; lastUpdated: number }>();
  for (const clip of clips) {
    if (!clip) continue;
    const cur = byScenario.get(clip.scenarioId) ?? { count: 0, lastUpdated: 0 };
    cur.count += 1;
    if (clip.createdAt > cur.lastUpdated) cur.lastUpdated = clip.createdAt;
    byScenario.set(clip.scenarioId, cur);
  }

  if (byScenario.size === 0) return null;

  // Return the scenario most recently touched.
  let winner: { scenarioId: string; sceneCount: number; lastUpdated: number } | null = null;
  for (const [scenarioId, info] of byScenario.entries()) {
    if (!winner || info.lastUpdated > winner.lastUpdated) {
      winner = { scenarioId, sceneCount: info.count, lastUpdated: info.lastUpdated };
    }
  }
  return winner;
}

export async function getStorageEstimate(): Promise<{
  usageMB: number;
  quotaMB: number;
} | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const e = await navigator.storage.estimate();
    return {
      usageMB: Math.round(((e.usage ?? 0) / 1024 / 1024) * 10) / 10,
      quotaMB: Math.round((e.quota ?? 0) / 1024 / 1024),
    };
  } catch {
    return null;
  }
}
